'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Sidebar, Topbar } from '@/components/DashboardShell';
import RouteGuard from '@/components/RouteGuard';
import { useAuth } from '@/context/AuthContext';
import { supabase, type Business, type Mall } from '@/lib/supabase';
import { 
  PlusCircle, Search, Loader2, X, Trash2, Edit3, 
  Store, Filter, ChevronRight, CheckCircle2,
  MapPin, Activity, Zap, RefreshCw, ShieldAlert
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/useIsMobile';
import { MobileBottomSheet } from '@/components/MobileBottomSheet';

function BusinessesContent() {
  const isMobile = useIsMobile();
  const { profile } = useAuth();
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [malls, setMalls] = useState<Mall[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filterMall, setFilterMall] = useState<string>('all');

  // Add/Edit Modals
  const [showModal, setShowModal] = useState(false);
  const [editingBiz, setEditingBiz] = useState<Business | null>(null);
  const [bizForm, setBizForm] = useState({ name: '', category: '', mall_id: '' });
  const [saving, setSaving] = useState(false);

  const initialLoadDone = useRef(false);
  const subscriptionRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  /**
   * ENHANCED FAILSAFE FETCH PATTERN
   */
  const fetchData = useCallback(async (isRefresh = false) => {
    if (!initialLoadDone.current) setLoading(true);
    if (isRefresh) {
      setIsRefreshing(true);
      setFetchError(null);
    }
    
    try {
      const [bizRes, mallsRes] = await Promise.all([
        supabase.from('businesses').select('*, malls(name)').order('name'),
        supabase.from('malls').select('*').order('name'),
      ]);
      
      if (bizRes.error) throw bizRes.error;
      if (mallsRes.error) throw mallsRes.error;
      
      setBusinesses(bizRes.data || []);
      setMalls(mallsRes.data || []);
      initialLoadDone.current = true;
    } catch (err: any) {
      console.error('Error fetching admin businesses:', err);
      setFetchError(`Kayıtlar alınamıyor: ${err.message || 'Bilinmeyen hata'}`);
    } finally {
      setLoading(false);
      if (isRefresh) setIsRefreshing(false);
    }
  }, []);

  const setupSubscription = useCallback(() => {
    if (subscriptionRef.current) {
      supabase.removeChannel(subscriptionRef.current);
      subscriptionRef.current = null;
    }

    const sub = supabase.channel('admin-biz-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'businesses' }, () => fetchData(true))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'malls' }, () => fetchData(true))
      .subscribe((status: string) => {
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.warn('Admin Businesses realtime error, retrying...');
          setTimeout(() => setupSubscription(), 3000);
        }
      });

    subscriptionRef.current = sub;
    return sub;
  }, [fetchData]);

  const visibilityTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    fetchData();
    setupSubscription();

    const handleVisibility = () => {
      if (visibilityTimeoutRef.current) clearTimeout(visibilityTimeoutRef.current);

      if (document.visibilityState === 'visible') {
        visibilityTimeoutRef.current = setTimeout(() => {
          fetchData(true);
          setupSubscription();
        }, 500); 
      } else {
        if (subscriptionRef.current) {
          supabase.removeChannel(subscriptionRef.current);
          subscriptionRef.current = null;
        }
      }
    };
    
    window.addEventListener('focus', handleVisibility);
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      if (visibilityTimeoutRef.current) clearTimeout(visibilityTimeoutRef.current);
      window.removeEventListener('focus', handleVisibility);
      document.removeEventListener('visibilitychange', handleVisibility);
      if (subscriptionRef.current) {
        supabase.removeChannel(subscriptionRef.current);
        subscriptionRef.current = null;
      }
    };
  }, [fetchData, setupSubscription]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    
    try {
      if (editingBiz) {
        await supabase.from('businesses').update({
          name: bizForm.name,
          category: bizForm.category,
          mall_id: bizForm.mall_id === '' ? null : bizForm.mall_id
        }).eq('id', editingBiz.id);
      } else {
        await supabase.from('businesses').insert([{
          name: bizForm.name,
          category: bizForm.category,
          mall_id: bizForm.mall_id === '' ? null : bizForm.mall_id
        }]);
      }

      setBizForm({ name: '', category: '', mall_id: '' });
      setEditingBiz(null);
      setShowModal(false);
      fetchData(true);
    } catch (err: any) {
      console.error('Save error:', err);
      alert(`Hata: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Bu dükkanı/işletmeyi silmek istediğinizden emin misiniz?')) return;
    await supabase.from('businesses').delete().eq('id', id);
    fetchData(true);
  };

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const toggleSelect = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const handleBulkDelete = async () => {
    if (!confirm(`${selectedIds.length} işletmeyi silmek istediğinizden emin misiniz?`)) return;
    setSaving(true);
    try {
      await Promise.all(selectedIds.map(id => supabase.from('businesses').delete().eq('id', id)));
      setSelectedIds([]);
      fetchData(true);
    } catch (err) {
      console.error('Bulk delete error:', err);
    } finally {
      setSaving(false);
    }
  };

  const filteredBiz = businesses.filter(b => {
    const matchesSearch = b.name.toLowerCase().includes(search.toLowerCase());
    const matchesMall = filterMall === 'all' ? true : 
                       filterMall === 'none' ? !b.mall_id :
                       b.mall_id === filterMall;
    return matchesSearch && matchesMall;
  });

  return (
    <div className="min-h-screen flex bg-amoled lg:bg-transparent">
      <Sidebar role="admin" />
      <main className="flex-1 lg:ml-72 pb-24 lg:pb-0 transition-all duration-500 w-full overflow-x-hidden">
        <Topbar 
          title="Tüm İşletmeler" 
          subtitle={isRefreshing ? 'Yenileniyor...' : 'Müşteri şubeleri ve dükkan envanteri'} 
        />

        <div className="p-4 sm:p-6 lg:p-8 space-y-4 sm:space-y-6 max-w-[1400px] mx-auto">
          {/* Error Banner */}
          {fetchError && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 flex items-center justify-between gap-4 animate-fade-in shadow-lg shadow-red-500/5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center text-red-500">
                  <ShieldAlert size={20} />
                </div>
                <div>
                  <p className="text-sm font-bold text-red-400">Veri Hatası</p>
                  <p className="text-xs text-red-400/70">{fetchError}</p>
                </div>
              </div>
              <button 
                onClick={() => fetchData(true)}
                className="px-4 py-2 bg-red-500 text-white rounded-xl text-xs font-bold hover:bg-red-600 transition-colors shadow-lg shadow-red-500/20"
              >
                Tekrar Dene
              </button>
            </div>
          )}

          {/* Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight">İşletme Yönetimi</h1>
              <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">Sistemdeki tüm kayıtlı birimler</p>
            </div>
            <div className="flex items-center gap-2.5 w-full sm:w-auto">
              <button 
                onClick={() => fetchData(true)}
                className="p-3 rounded-xl sm:rounded-2xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06] transition-colors text-muted-foreground"
                title="Yenile"
              >
                <RefreshCw size={16} className={cn("transition-transform duration-500", isRefreshing && "animate-spin")} />
              </button>
              <button 
                onClick={() => { setEditingBiz(null); setBizForm({ name: '', category: '', mall_id: '' }); setShowModal(true); }}
                className="btn-primary h-11 px-4 sm:px-6 rounded-xl sm:rounded-2xl flex items-center justify-center gap-2 text-xs sm:text-sm font-bold shadow-lg shadow-red-500/20 active:scale-95 transition-transform flex-1 sm:flex-none"
              >
                <PlusCircle size={16} /> Yeni İşletme
              </button>
            </div>
          </div>

          {/* Bulk Action Bar */}
          {selectedIds.length > 0 && (
            <div className={cn("rounded-xl p-4 border flex items-center justify-between animate-scale-up shadow-xl shadow-primary/5", isMobile ? "bg-amoled-card border-border" : "glass border-primary/20 bg-primary/5")}>
               <div className="flex items-center gap-3 sm:gap-4">
                  <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-primary/20 flex items-center justify-center text-primary">
                    <CheckCircle2 size={18} />
                  </div>
                  <div>
                    <p className="text-xs sm:text-sm font-black uppercase tracking-tight text-primary">{selectedIds.length} İşletme Seçildi</p>
                    <button onClick={() => setSelectedIds([])} className="text-[9px] sm:text-[10px] font-bold text-muted-foreground hover:text-foreground uppercase tracking-widest mt-0.5">Seçimi Kaldır</button>
                  </div>
               </div>
               <div className="flex gap-2">
                  <button onClick={handleBulkDelete} className="px-4 py-2.5 sm:px-5 sm:py-3 rounded-xl bg-red-500 text-white text-xs font-black uppercase tracking-widest hover:bg-red-600 transition-all shadow-lg shadow-red-500/20 active:scale-95">
                    <Trash2 size={14} className="inline mr-1.5" /> Sil
                  </button>
               </div>
            </div>
          )}

          {/* Controls */}
          <div className={cn("rounded-xl p-2 flex flex-col md:flex-row gap-2 border", isMobile ? "bg-amoled-card border-border" : "glass border-border")}>
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input 
                type="text" value={search} onChange={e => setSearch(e.target.value)}
                placeholder="İşletme adı veya kategori ara..."
                className="w-full bg-transparent border-none focus:ring-0 pl-11 py-3 text-sm outline-none text-foreground"
              />
            </div>
            <div className="w-px bg-border hidden md:block my-2" />
            <div className="relative w-full md:w-64 shrink-0 px-2">
              <Filter className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <select 
                value={filterMall} 
                onChange={e => setFilterMall(e.target.value)}
                className="w-full bg-transparent border-none focus:ring-0 pl-10 pr-8 py-3 text-xs font-bold uppercase tracking-widest appearance-none outline-none cursor-pointer text-foreground/80"
              >
                <option value="all">Tüm Konumlar</option>
                <option value="none">Bağımsız İşletmeler</option>
                {malls.map(m => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Business Grid */}
          {loading && !initialLoadDone.current ? (
            <div className="flex flex-col items-center justify-center py-24 gap-4">
              <Loader2 className="w-10 h-10 animate-spin text-primary" />
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground italic">Veritabanı Okunuyor</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
              {filteredBiz.map((biz, i) => (
                <div 
                  key={biz.id} 
                  onClick={() => toggleSelect(biz.id)}
                  className={cn(
                    "group hover:bg-white/[0.03] transition-all duration-500 rounded-xl p-4 border flex flex-col justify-between shadow-lg relative overflow-hidden",
                    isMobile ? "bg-amoled-card border-border" : "glass border-border",
                    selectedIds.includes(biz.id) && "ring-2 ring-primary bg-primary/5"
                  )} 
                  style={{ animationDelay: `${i * 0.03}s` }}
                >
                  {selectedIds.includes(biz.id) && (
                    <div className="absolute top-4 right-4 bg-primary text-white p-1 rounded-full shadow-lg z-10 animate-scale-up">
                      <CheckCircle2 size={16} />
                    </div>
                  )}

                  <div className="absolute -top-4 -right-4 opacity-[0.02] group-hover:scale-125 group-hover:rotate-12 transition-transform duration-700">
                    <Store size={100} />
                  </div>

                  <div className="relative">
                    <div className="flex items-start justify-between mb-4">
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-red-500/20 to-orange-500/10 border border-border flex items-center justify-center text-primary group-hover:scale-110 transition-transform shrink-0">
                        <Store size={20} />
                      </div>
                      
                      <div className={cn("flex items-center gap-1.5 transition-opacity", isMobile ? "opacity-100" : "opacity-0 group-hover:opacity-100")}>
                        <button 
                          onClick={(e) => { e.stopPropagation(); setEditingBiz(biz); setBizForm({ name: biz.name, category: biz.category || '', mall_id: biz.mall_id || '' }); setShowModal(true); }}
                          className="p-2 rounded-lg bg-secondary border border-border hover:bg-primary/20 hover:text-foreground transition-all text-muted-foreground"
                          title="Düzenle"
                        >
                          <Edit3 size={14} />
                        </button>
                        <button 
                          onClick={(e) => handleDelete(biz.id, e)}
                          className="p-2 rounded-lg bg-secondary border border-border hover:bg-red-500/20 hover:text-red-400 transition-all text-muted-foreground"
                          title="Sil"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                    <h3 className="font-black text-sm sm:text-base tracking-tight uppercase group-hover:text-red-500 transition-colors truncate text-foreground">{biz.name}</h3>
                    <p className="text-[9px] sm:text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-0.5">{biz.category || 'Sınıflandırılmamış'}</p>
                  </div>

                  <div className="relative mt-4 pt-3 border-t border-border flex items-center justify-between" onClick={e => e.stopPropagation()}>
                    <div className="flex items-center gap-1.5 text-[9px] sm:text-[10px] font-bold text-muted-foreground uppercase tracking-wider max-w-[60%]">
                      <MapPin size={11} className="shrink-0 text-primary" />
                      <span className="truncate">{(biz as any).malls?.name || 'Bağımsız'}</span>
                    </div>
                    <Link 
                      href={`/admin/history?bizId=${biz.id}`}
                      className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-primary hover:text-white bg-primary/10 hover:bg-primary px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 border border-primary/20"
                    >
                      Servis Kartı <ChevronRight size={12} />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Empty State */}
          {!loading && filteredBiz.length === 0 && (
            <div className={cn("rounded-xl py-24 flex flex-col items-center justify-center text-center px-6 border shadow-2xl", isMobile ? "bg-amoled-card border-border" : "glass border-border")}>
              <Store className="w-16 h-16 text-muted-foreground/20 mb-4" />
              <h3 className="text-base sm:text-lg font-black uppercase tracking-tight text-foreground">İşletme Bulunamadı</h3>
              <p className="text-[10px] sm:text-xs text-muted-foreground mt-1 max-w-xs font-bold uppercase tracking-widest leading-relaxed">
                Arama kriterlerinize uygun aktif bir birim bulunamadı.
              </p>
              <button 
                onClick={() => { setEditingBiz(null); setBizForm({ name: '', category: '', mall_id: '' }); setShowModal(true); }}
                className="mt-6 btn-primary h-11 px-6 rounded-xl font-black uppercase tracking-widest text-[10px] shadow-xl shadow-red-500/20 active:scale-95 transition-transform"
              >
                Yeni Kayıt Oluştur
              </button>
            </div>
          )}
        </div>

        {/* Add/Edit Business Sheet / Modal */}
        <MobileBottomSheet
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          title={editingBiz ? 'Firma Bilgilerini Düzenle' : 'Yeni İşletme Tanımla'}
        >
          <form onSubmit={handleSave} className="space-y-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-widest text-white/40 ml-1">İşletme Ticari Ünvanı *</label>
              <input 
                value={bizForm.name} onChange={e => setBizForm({...bizForm, name: e.target.value})} 
                required placeholder="Örn: X Global Mağazacılık" 
                className="w-full h-11 bg-white/5 border border-white/10 rounded-xl px-4 text-sm text-white" 
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-widest text-white/40 ml-1">Hizmet Alanı / Kategori</label>
              <input 
                value={bizForm.category} onChange={e => setBizForm({...bizForm, category: e.target.value})} 
                placeholder="Örn: Restoran, İmalathane..." 
                className="w-full h-11 bg-white/5 border border-white/10 rounded-xl px-4 text-sm text-white" 
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-widest text-white/40 ml-1">Bağlı Olduğu Kompleks</label>
              <select 
                value={bizForm.mall_id} onChange={e => setBizForm({...bizForm, mall_id: e.target.value})} 
                className="w-full h-11 bg-white/5 border border-white/10 rounded-xl px-4 text-sm text-white select-premium"
              >
                <option value="">Bağımsız (AVM Dışı)</option>
                {malls.map(m => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </div>

            <div className="pt-4 border-t border-white/5">
              <button 
                disabled={saving} 
                type="submit" 
                className="w-full bg-red-500 text-white h-12 rounded-xl flex items-center justify-center gap-2 font-black uppercase tracking-widest text-xs shadow-xl shadow-red-500/20 active:scale-[0.98] transition-all cursor-pointer"
              >
                {saving ? <Loader2 size={16} className="animate-spin" /> : <><CheckCircle2 size={16} /> {editingBiz ? 'Güncelle' : 'Kayıt Oluştur'}</>}
              </button>
            </div>
          </form>
        </MobileBottomSheet>
      </main>
    </div>
  );
}

export default function AdminBusinessesPage() {
  return (
    <RouteGuard requiredRole="admin">
      <BusinessesContent />
    </RouteGuard>
  );
}

