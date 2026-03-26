'use client';

import React, { useEffect, useState } from 'react';
import { Sidebar, Topbar } from '@/components/DashboardShell';
import RouteGuard from '@/components/RouteGuard';
import { useAuth } from '@/context/AuthContext';
import { supabase, type Business, type Mall } from '@/lib/supabase';
import { 
  Building2, PlusCircle, Search, Loader2, X, Trash2, Edit3, 
  Store, Filter, ChevronRight, LayoutGrid, CheckCircle2,
  Calendar, Clock, Zap, MapPin, Activity
} from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';

function BusinessesContent() {
  const { profile } = useAuth();
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [malls, setMalls] = useState<Mall[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterMall, setFilterMall] = useState<string>('all');

  // Add/Edit Modals
  const [showModal, setShowModal] = useState(false);
  const [editingBiz, setEditingBiz] = useState<Business | null>(null);
  const [bizForm, setBizForm] = useState({ name: '', category: '', mall_id: '' });
  const [saving, setSaving] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    const [bizRes, mallsRes] = await Promise.all([
      supabase.from('businesses').select('*, malls(name)').order('name'),
      supabase.from('malls').select('*').order('name'),
    ]);
    setBusinesses(bizRes.data || []);
    setMalls(mallsRes.data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    
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
    setSaving(false);
    fetchData();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Bu dükkanı/işletmeyi silmek istediğinizden emin misiniz?')) return;
    await supabase.from('businesses').delete().eq('id', id);
    fetchData();
  };

  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const handleBulkDelete = async () => {
    if (!confirm(`${selectedIds.length} işletmeyi silmek istediğinizden emin misiniz?`)) return;
    setSaving(true);
    await Promise.all(selectedIds.map(id => supabase.from('businesses').delete().eq('id', id)));
    setSelectedIds([]);
    setSaving(false);
    fetchData();
  };

  const filteredBiz = businesses.filter(b => {
    const matchesSearch = b.name.toLowerCase().includes(search.toLowerCase());
    const matchesMall = filterMall === 'all' ? true : 
                       filterMall === 'none' ? !b.mall_id :
                       b.mall_id === filterMall;
    return matchesSearch && matchesMall;
  });

  return (
    <div className="min-h-screen flex">
      <Sidebar role="admin" />
      <main className="flex-1 lg:ml-72 transition-all duration-500 bg-[hsl(var(--background))]">
        <Topbar title="Tüm İşletmeler" subtitle="Müşteri şubeleri ve dükkan envanteri" />

        <div className="p-6 lg:p-8 space-y-6 max-w-[1400px] mx-auto">
          {/* Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">İşletme Yönetimi</h1>
              <p className="text-sm text-muted-foreground mt-0.5">Sistemdeki tüm işletmeleri görüntüleyin veya yeni ekleyin.</p>
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
              <button 
                onClick={() => { setEditingBiz(null); setBizForm({ name: '', category: '', mall_id: '' }); setShowModal(true); }}
                className="btn-primary h-11 px-6 rounded-lg flex items-center justify-center gap-2 text-sm flex-1 sm:flex-none"
              >
                <PlusCircle size={16} /> Yeni İşletme
              </button>
            </div>
          </div>

          {/* Bulk Action Bar */}
          {selectedIds.length > 0 && (
            <div className="glass rounded-xl p-4 border-l-4 border-l-primary flex items-center justify-between bg-primary/5 animate-scale-up">
               <div className="flex items-center gap-4">
                  <span className="text-sm font-bold">{selectedIds.length} İşletme Seçildi</span>
                  <div className="w-px h-5 bg-[hsl(var(--border))]" />
                  <button onClick={() => setSelectedIds([])} className="text-xs font-semibold text-muted-foreground hover:text-foreground">Seçimi Kaldır</button>
               </div>
               <div className="flex gap-2">
                  <button onClick={handleBulkDelete} className="px-4 py-2 rounded-lg bg-red-500 text-white text-xs font-bold hover:shadow-lg hover:shadow-red-500/20 transition-all flex items-center gap-2">
                    <Trash2 size={14} /> Seçilenleri Sil
                  </button>
               </div>
            </div>
          )}

          {/* Controls */}
          <div className="glass rounded-xl p-2 flex flex-col md:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input 
                type="text" value={search} onChange={e => setSearch(e.target.value)}
                placeholder="İşletme adı veya kategori ara..."
                className="w-full bg-transparent border-none focus:ring-0 pl-10 py-2.5 text-sm outline-none"
              />
            </div>
            <div className="w-px bg-[hsl(var(--border))] hidden md:block" />
            <div className="relative w-full md:w-64 shrink-0">
              <Filter className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <select 
                value={filterMall} 
                onChange={e => setFilterMall(e.target.value)}
                className="w-full bg-transparent border-none focus:ring-0 pl-10 pr-8 py-2.5 text-sm appearance-none outline-none cursor-pointer"
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
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredBiz.map((biz, i) => (
                <div 
                  key={biz.id} 
                  onClick={() => toggleSelect(biz.id)}
                  className={cn(
                    "glass rounded-xl p-5 card-hover animate-fade-in flex flex-col justify-between group cursor-pointer relative",
                    selectedIds.includes(biz.id) && "ring-2 ring-primary bg-primary/5"
                  )} 
                  style={{ animationDelay: `${i * 0.03}s` }}
                >
                  {selectedIds.includes(biz.id) && (
                    <div className="absolute -top-2 -right-2 bg-primary text-white p-1 rounded-full shadow-lg">
                      <CheckCircle2 size={14} />
                    </div>
                  )}

                  <div>
                    <div className="flex items-start justify-between mb-3">
                      <div className="w-10 h-10 rounded-lg bg-[hsl(var(--muted))] border border-[hsl(var(--border))] flex items-center justify-center shrink-0">
                        <Store size={18} className="text-muted-foreground" />
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {/* QR Code Simulation Badge */}
                        <div className="px-2 py-1 rounded border border-[hsl(var(--border))] bg-[hsl(var(--background))] text-[10px] font-semibold flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors" onClick={e => e.stopPropagation()}>
                          <Zap size={10} className="text-yellow-500" />
                          QR KOD
                        </div>

                        <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity ml-2">
                          <button 
                            onClick={(e) => { e.stopPropagation(); setEditingBiz(biz); setBizForm({ name: biz.name, category: biz.category || '', mall_id: biz.mall_id || '' }); setShowModal(true); }}
                            className="p-1.5 rounded-md hover:bg-[hsl(var(--muted))] text-muted-foreground hover:text-foreground transition-colors"
                          >
                            <Edit3 size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                    <h3 className="font-semibold text-base mb-0.5 group-hover:text-primary transition-colors">{biz.name}</h3>
                    <p className="text-sm text-muted-foreground">{biz.category || 'Kategori Yok'}</p>
                  </div>

                  <div className="mt-6 pt-4 border-t border-[hsl(var(--border))] flex items-center justify-between" onClick={e => e.stopPropagation()}>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground max-w-[60%]">
                      <MapPin size={12} className="shrink-0" />
                      <span className="truncate">{(biz as any).malls?.name || 'Bağımsız Lokasyon'}</span>
                    </div>
                    <Link 
                      href={`/client/businesses/${biz.id}`}
                      className="text-[11px] font-semibold text-primary hover:text-primary/80 transition-colors flex items-center gap-1 bg-primary/10 px-2.5 py-1.5 rounded-md"
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
            <div className="glass rounded-xl py-24 flex flex-col items-center justify-center text-center px-6">
              <Store className="w-10 h-10 text-muted-foreground/30 mb-3" />
              <h3 className="text-base font-semibold">İşletme Bulunamadı</h3>
              <p className="text-sm text-muted-foreground mt-1 max-w-sm">
                Arama kriterlerinize uygun işletme bulunamadı veya henüz sisteme kayıt eklenmemiş.
              </p>
            </div>
          )}
        </div>

        {/* MODAL */}
        {showModal && (
          <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 min-h-[100dvh]" onClick={() => setShowModal(false)}>
            <div className="glass-strong rounded-xl p-6 w-full max-w-md animate-scale-up" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold">{editingBiz ? 'İşletmeyi Düzenle' : 'Yeni İşletme Kaydı'}</h3>
                <button onClick={() => setShowModal(false)} className="p-2 rounded-lg hover:bg-[hsl(var(--muted))] transition-colors text-muted-foreground">
                  <X size={18} />
                </button>
              </div>
              
              <form onSubmit={handleSave} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">İşletme Adı <span className="text-primary">*</span></label>
                  <input 
                    value={bizForm.name} onChange={e => setBizForm({...bizForm, name: e.target.value})} 
                    required placeholder="Örn: X Mağazası" 
                    className="w-full input-premium py-2.5" 
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Sektör / Kategori</label>
                  <input 
                    value={bizForm.category} onChange={e => setBizForm({...bizForm, category: e.target.value})} 
                    placeholder="Örn: Restoran, Giyim..." 
                    className="w-full input-premium py-2.5" 
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Bağlı Olduğu Kompleks</label>
                  <select 
                    value={bizForm.mall_id} onChange={e => setBizForm({...bizForm, mall_id: e.target.value})} 
                    className="w-full input-premium py-2.5 cursor-pointer"
                  >
                    <option value="">Bağımsız (AVM Dışı)</option>
                    {malls.map(m => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                  </select>
                </div>

                <div className="pt-2">
                  <button 
                    disabled={saving} 
                    type="submit" 
                    className="w-full btn-primary h-11 rounded-lg flex items-center justify-center gap-2"
                  >
                    {saving ? <Loader2 size={16} className="animate-spin" /> : <><CheckCircle2 size={16} /> {editingBiz ? 'Değişiklikleri Kaydet' : 'Sisteme Ekle'}</>}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
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
