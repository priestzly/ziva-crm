'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Sidebar, Topbar } from '@/components/DashboardShell';
import RouteGuard from '@/components/RouteGuard';
import { useAuth } from '@/context/AuthContext';
import { supabase, type Mall, type Business } from '@/lib/supabase';
import { 
  Building2, PlusCircle, Search, Loader2, X, Trash2, Edit3, Users, ChevronDown,
  CheckCircle2, MapPin, User, Store, RefreshCw, ShieldAlert
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/useIsMobile';
import { MobileBottomSheet } from '@/components/MobileBottomSheet';

function MallsContent() {
  const isMobile = useIsMobile();
  const { profile } = useAuth();
  const [malls, setMalls] = useState<Mall[]>([]);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [expandedMall, setExpandedMall] = useState<string | null>(null);

  // Modals - ADD
  const [showAddBiz, setShowAddBiz] = useState(false);
  const [bizForm, setBizForm] = useState({ name: '', category: '', mall_id: '' });
  const [saving, setSaving] = useState(false);

  // Modals - EDIT Mall
  const [editingMall, setEditingMall] = useState<Mall | null>(null);
  const [showEditMall, setShowEditMall] = useState(false);
  const [editMallForm, setEditMallForm] = useState({ name: '', address: '', contact_person: '' });

  // Modals - EDIT Business
  const [editingBiz, setEditingBiz] = useState<Business | null>(null);
  const [showEditBiz, setShowEditBiz] = useState(false);
  const [editBizForm, setEditBizForm] = useState({ name: '', category: '' });

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
      const [mallRes, bizRes] = await Promise.all([
        supabase.from('malls').select('*').order('name'),
        supabase.from('businesses').select('*').order('name'),
      ]);

      if (mallRes.error) throw mallRes.error;
      if (bizRes.error) throw bizRes.error;

      setMalls(mallRes.data || []);
      setBusinesses(bizRes.data || []);
      initialLoadDone.current = true;
    } catch (err: any) {
      console.error('Fetch Error:', err);
      setFetchError(`Bağlantı sorunu: ${err.message || 'Bilinmeyen hata'}`);
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

    const sub = supabase.channel('malls-biz-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'malls' }, () => fetchData(true))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'businesses' }, () => fetchData(true))
      .subscribe((status: string) => {
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.warn('Malls Realtime error, retrying...');
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

  const handleAddBiz = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    await supabase.from('businesses').insert([bizForm]);
    setBizForm({ name: '', category: '', mall_id: '' });
    setShowAddBiz(false);
    setSaving(false);
    fetchData(true);
  };

  const handleUpdateMall = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMall) return;
    setSaving(true);
    await supabase.from('malls').update(editMallForm).eq('id', editingMall.id);
    setShowEditMall(false);
    setEditingMall(null);
    setSaving(false);
    fetchData(true);
  };

  const handleUpdateBiz = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBiz) return;
    setSaving(true);
    await supabase.from('businesses').update(editBizForm).eq('id', editingBiz.id);
    setShowEditBiz(false);
    setEditingBiz(null);
    setSaving(false);
    fetchData(true);
  };

  const handleDeleteMall = async (id: string) => {
    if (!confirm('Bu AVM\'yi ve içindeki tüm işletmeleri silmek istediğinizden emin misiniz?')) return;
    await supabase.from('malls').delete().eq('id', id);
    fetchData(true);
  };

  const handleDeleteBiz = async (id: string) => {
    if (!confirm('Bu işletmeyi silmek istediğinize emin misiniz?')) return;
    await supabase.from('businesses').delete().eq('id', id);
    fetchData(true);
  };

  const filteredMalls = malls.filter(m => m.name.toLowerCase().includes(search.toLowerCase()));
  const getBizCount = (mallId: string) => businesses.filter(b => b.mall_id === mallId).length;
  const getMallBiz = (mallId: string) => businesses.filter(b => b.mall_id === mallId);

  return (
    <div className="min-h-screen flex bg-amoled lg:bg-transparent">
      <Sidebar role="admin" />
      <main className="flex-1 lg:ml-72 pb-24 lg:pb-0 transition-all duration-500 w-full overflow-x-hidden">
        <Topbar 
          title="AVM & İşletme Yönetimi" 
          subtitle={isRefreshing ? 'Yenileniyor...' : 'Müşteri şubelerini ve dükkan listelerini düzenleyin'} 
        />

        <div className="p-4 sm:p-6 lg:p-8 space-y-4 sm:space-y-6 max-w-[1200px] mx-auto">
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

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight">AVM & Şubeler</h1>
              <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">Sistemdeki tüm kayıtlı lokasyonlar</p>
            </div>
            <div className="flex items-center gap-2.5">
              <button 
                onClick={() => fetchData(true)}
                className="p-3 rounded-xl sm:rounded-2xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06] transition-colors text-muted-foreground"
                title="Yenile"
              >
                <RefreshCw size={16} className={cn("transition-transform duration-500", isRefreshing && "animate-spin")} />
              </button>
              <button onClick={() => setShowAddBiz(true)} className="btn-primary h-11 px-4 sm:px-6 rounded-xl sm:rounded-2xl flex items-center gap-2 text-xs sm:text-sm font-bold shadow-lg shadow-red-500/20 active:scale-95 transition-transform">
                <PlusCircle size={16} /> İşletme Ekle
              </button>
            </div>
          </div>

          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
            <input 
              type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="AVM ismine göre filtrele..."
              className={cn("w-full pl-11 py-3 bg-white/5 border text-sm text-white rounded-xl focus:border-red-500/50 focus:ring-0 outline-none", isMobile ? "bg-amoled-card border-white/5" : "input-premium")}
            />
          </div>

          {loading && !initialLoadDone.current ? (
            <div className="flex items-center justify-center py-24">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : filteredMalls.length === 0 ? (
            <div className={cn("rounded-3xl flex flex-col items-center justify-center py-20 gap-3 border", isMobile ? "bg-amoled-card border-white/5" : "glass border-white/[0.04]")}>
              <Building2 className="w-12 h-12 text-muted-foreground/20" />
              <p className="text-sm text-muted-foreground">Kayıtlı AVM bulunamadı.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredMalls.map((mall, i) => {
                const isOpen = expandedMall === mall.id;
                const mallBiz = getMallBiz(mall.id);
                return (
                  <div key={mall.id} className={cn("rounded-2xl sm:rounded-3xl overflow-hidden card-hover animate-fade-in group/card border", isMobile ? "bg-amoled-card border-white/5" : "glass border-white/[0.04]")} style={{ animationDelay: `${i * 0.04}s` }}>
                    <div className="flex items-center justify-between pr-3">
                      <button 
                        onClick={() => setExpandedMall(isOpen ? null : mall.id)}
                        className="flex-1 px-4 sm:px-6 py-4 sm:py-5 flex items-center gap-4 sm:gap-6 text-left"
                      >
                        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-gradient-to-br from-red-500/15 to-orange-500/10 border border-primary/10 flex items-center justify-center text-primary group-hover/card:scale-110 transition-transform">
                          <Building2 size={20} className="sm:hidden" /><Building2 size={24} className="hidden sm:block" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="font-bold text-sm sm:text-base leading-tight group-hover:text-red-400 transition-colors uppercase tracking-tight truncate">{mall.name}</h3>
                          <p className="text-[10px] sm:text-xs text-muted-foreground flex items-center gap-1 mt-1 font-medium truncate"><MapPin size={10} className="text-red-400/60" /> {mall.address || 'Adres bilgisi yok'}</p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <div className="hidden sm:flex items-center gap-2 px-2.5 py-1 rounded-lg bg-white/[0.03] border border-white/[0.06] text-[9px] uppercase font-bold tracking-widest text-white/50">
                            <Store size={10} /> {getBizCount(mall.id)} Birim
                          </div>
                          <ChevronDown size={18} className={cn("text-white/40 transition-transform duration-300", isOpen && "rotate-180")} />
                        </div>
                      </button>
                      <div className="flex items-center gap-1 opacity-0 group-hover/card:opacity-100 transition-all shrink-0">
                        <button 
                          onClick={() => { setEditingMall(mall); setEditMallForm({ name: mall.name, address: mall.address || '', contact_person: mall.contact_person || '' }); setShowEditMall(true); }}
                          className="p-2 rounded-lg hover:bg-white/5 text-white/50 hover:text-white"
                        >
                          <Edit3 size={14} />
                        </button>
                        <button 
                          onClick={() => handleDeleteMall(mall.id)}
                          className="p-2 rounded-lg hover:bg-white/5 text-white/50 hover:text-red-500"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>

                    {isOpen && (
                      <div className="border-t border-white/5 p-4 sm:p-6 pt-2 bg-gradient-to-b from-white/[0.01] to-transparent">
                        {mallBiz.length === 0 ? (
                          <div className="py-6 text-center bg-white/[0.01] rounded-xl border border-dashed border-white/5">
                            <Store className="w-6 h-6 text-white/10 mx-auto mb-1.5" />
                            <p className="text-[10px] text-white/40 font-bold uppercase tracking-wider">Boş Mağaza Listesi</p>
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                            {mallBiz.map(biz => (
                              <div key={biz.id} className={cn("flex items-center justify-between px-4 py-3.5 rounded-xl border transition-all group/biz", isMobile ? "bg-black/40 border-white/5" : "bg-white/[0.02] border-white/[0.04] hover:bg-white/[0.04]")}>
                                <div className="flex items-center gap-3 min-w-0">
                                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.3)] shrink-0" />
                                  <div className="min-w-0">
                                    <p className="text-xs font-black text-white uppercase tracking-tight truncate">{biz.name}</p>
                                    <p className="text-[9px] text-white/30 font-bold uppercase tracking-wider mt-0.5">{biz.category || 'Dükkan'}</p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-1 opacity-0 group-hover/biz:opacity-100 transition-all shrink-0">
                                  <button 
                                    onClick={() => { setEditingBiz(biz); setEditBizForm({ name: biz.name, category: biz.category || '' }); setShowEditBiz(true); }}
                                    className="p-1.5 rounded hover:bg-white/5 text-white/40 hover:text-white"
                                  >
                                    <Edit3 size={12} />
                                  </button>
                                  <button 
                                    onClick={() => handleDeleteBiz(biz.id)}
                                    className="p-1.5 rounded hover:bg-white/5 text-white/40 hover:text-red-500"
                                  >
                                    <Trash2 size={12} />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Add Business Sheet / Modal */}
        <MobileBottomSheet
          isOpen={showAddBiz}
          onClose={() => setShowAddBiz(false)}
          title="İşletme Ekle"
        >
          <form onSubmit={handleAddBiz} className="space-y-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-widest text-white/40 ml-1">Konum (AVM) *</label>
              <select value={bizForm.mall_id} onChange={e => setBizForm({...bizForm, mall_id: e.target.value})} required className="w-full h-11 bg-white/5 border border-white/10 rounded-xl px-4 text-sm text-white select-premium">
                <option value="">AVM Seçin</option>
                {malls.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-widest text-white/40 ml-1">İşletme Adı *</label>
              <input value={bizForm.name} onChange={e => setBizForm({...bizForm, name: e.target.value})} required className="w-full h-11 bg-white/5 border border-white/10 rounded-xl px-4 text-sm text-white" placeholder="Örn: Burger King" />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-widest text-white/40 ml-1">Kategori</label>
              <input value={bizForm.category} onChange={e => setBizForm({...bizForm, category: e.target.value})} className="w-full h-11 bg-white/5 border border-white/10 rounded-xl px-4 text-sm text-white" placeholder="Gıda / Mutfak" />
            </div>
            <button type="submit" disabled={saving} className="w-full bg-red-500 text-white h-12 rounded-xl font-black uppercase tracking-[0.2em] text-xs shadow-lg shadow-red-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 mt-4 cursor-pointer">
              {saving ? <Loader2 size={18} className="animate-spin" /> : <><CheckCircle2 size={18} /> Kaydet</>}
            </button>
          </form>
        </MobileBottomSheet>

        {/* Edit Mall Sheet / Modal */}
        <MobileBottomSheet
          isOpen={showEditMall}
          onClose={() => setShowEditMall(false)}
          title="AVM Bilgilerini Güncelle"
        >
          <form onSubmit={handleUpdateMall} className="space-y-4">
            <div className="space-y-1"><label className="text-[10px] font-bold uppercase text-white/40 ml-1">AVM İsim</label><input value={editMallForm.name} onChange={e => setEditMallForm({...editMallForm, name: e.target.value})} className="w-full h-11 bg-white/5 border border-white/10 rounded-xl px-4 text-sm text-white" /></div>
            <div className="space-y-1"><label className="text-[10px] font-bold uppercase text-white/40 ml-1">Adres</label><input value={editMallForm.address} onChange={e => setEditMallForm({...editMallForm, address: e.target.value})} className="w-full h-11 bg-white/5 border border-white/10 rounded-xl px-4 text-sm text-white" /></div>
            <div className="space-y-1"><label className="text-[10px] font-bold uppercase text-white/40 ml-1">Yetkili</label><input value={editMallForm.contact_person} onChange={e => setEditMallForm({...editMallForm, contact_person: e.target.value})} className="w-full h-11 bg-white/5 border border-white/10 rounded-xl px-4 text-sm text-white" /></div>
            <button type="submit" disabled={saving} className="w-full bg-red-500 text-white h-12 rounded-xl font-black uppercase tracking-[0.2em] text-xs shadow-lg shadow-red-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 mt-4 cursor-pointer">{saving ? <Loader2 size={18} className="animate-spin" /> : 'Değişiklikleri Kaydet'}</button>
          </form>
        </MobileBottomSheet>

        {/* Edit Business Sheet / Modal */}
        <MobileBottomSheet
          isOpen={showEditBiz}
          onClose={() => setShowEditBiz(false)}
          title="İşletmeyi Düzenle"
        >
          <form onSubmit={handleUpdateBiz} className="space-y-4">
            <div className="space-y-1"><label className="text-[10px] font-bold uppercase text-white/40 ml-1">İşletme Adı</label><input value={editBizForm.name} onChange={e => setEditBizForm({...editBizForm, name: e.target.value})} className="w-full h-11 bg-white/5 border border-white/10 rounded-xl px-4 text-sm text-white" /></div>
            <div className="space-y-1"><label className="text-[10px] font-bold uppercase text-white/40 ml-1">Kategori</label><input value={editBizForm.category} onChange={e => setEditBizForm({...editBizForm, category: e.target.value})} className="w-full h-11 bg-white/5 border border-white/10 rounded-xl px-4 text-sm text-white" /></div>
            <button type="submit" disabled={saving} className="w-full bg-red-500 text-white h-12 rounded-xl font-black uppercase tracking-[0.2em] text-xs shadow-lg shadow-red-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 mt-4 cursor-pointer">{saving ? <Loader2 size={18} className="animate-spin" /> : 'Güncelle'}</button>
          </form>
        </MobileBottomSheet>
      </main>
    </div>
  );
}

export default function AdminMalls() {
  return <RouteGuard requiredRole="admin"><MallsContent /></RouteGuard>;
}

