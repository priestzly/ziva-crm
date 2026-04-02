'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useSafeFetch } from '@/hooks/useSafeFetch';
import { Sidebar, Topbar } from '@/components/DashboardShell';
import RouteGuard from '@/components/RouteGuard';
import { useAuth } from '@/context/AuthContext';
import { supabase, type Mall, type Business } from '@/lib/supabase';
import { 
  Building2, PlusCircle, Search, Loader2, X, Trash2, Edit3, Users, ChevronDown,
  CheckCircle2, MapPin, User, Store
} from 'lucide-react';
import { cn } from '@/lib/utils';

function MallsContent() {
  const { profile } = useAuth();
  const [malls, setMalls] = useState<Mall[]>([]);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);
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

  const fetchData = async (signal: AbortSignal) => {
    try {
      if (!initialLoadDone.current) setLoading(true);
      const [mallRes, bizRes] = await Promise.all([
        supabase.from('malls').select('*').order('name').abortSignal(signal),
        supabase.from('businesses').select('*').order('name').abortSignal(signal),
      ]);
      if (signal.aborted) return;
      setMalls(mallRes.data || []);
      setBusinesses(bizRes.data || []);
      initialLoadDone.current = true;
    } catch (err: any) {
      if (err?.name === 'AbortError') return;
      console.error('Fetch Error:', err);
    } finally {
      if (!signal.aborted) setLoading(false);
    }
  };

  const { safeFetch } = useSafeFetch(fetchData);

  useEffect(() => {
    safeFetch();
    const sub = supabase.channel('malls-biz-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'malls' }, () => safeFetch())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'businesses' }, () => safeFetch())
      .subscribe();
    return () => { supabase.removeChannel(sub); };
  }, [safeFetch]);

  const handleAddBiz = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    await supabase.from('businesses').insert([bizForm]);
    setBizForm({ name: '', category: '', mall_id: '' });
    setShowAddBiz(false);
    setSaving(false);
    safeFetch();
  };

  const handleUpdateMall = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMall) return;
    setSaving(true);
    await supabase.from('malls').update(editMallForm).eq('id', editingMall.id);
    setShowEditMall(false);
    setEditingMall(null);
    setSaving(false);
    safeFetch();
  };

  const handleUpdateBiz = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBiz) return;
    setSaving(true);
    await supabase.from('businesses').update(editBizForm).eq('id', editingBiz.id);
    setShowEditBiz(false);
    setEditingBiz(null);
    setSaving(false);
    safeFetch();
  };

  const handleDeleteMall = async (id: string) => {
    if (!confirm('Bu AVM\'yi ve içindeki tüm işletmeleri silmek istediğinizden emin misiniz?')) return;
    // Sub-businesses might need cascade delete in SQL or manual delete here
    await supabase.from('malls').delete().eq('id', id);
    safeFetch();
  };

  const handleDeleteBiz = async (id: string) => {
    if (!confirm('Bu işletmeyi silmek istediğinize emin misiniz?')) return;
    await supabase.from('businesses').delete().eq('id', id);
    safeFetch();
  };

  const filteredMalls = malls.filter(m => m.name.toLowerCase().includes(search.toLowerCase()));
  const getBizCount = (mallId: string) => businesses.filter(b => b.mall_id === mallId).length;
  const getMallBiz = (mallId: string) => businesses.filter(b => b.mall_id === mallId);

  return (
    <div className="min-h-screen flex">
      <Sidebar role="admin" />
      <main className="flex-1 lg:ml-72 transition-all duration-500">
        <Topbar title="AVM & İşletme Yönetimi" subtitle="Müşteri şubelerini ve dükkan listelerini düzenleyin" />

        <div className="p-6 lg:p-8 space-y-6 max-w-[1200px] mx-auto">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">AVM & Şubeler</h1>
              <p className="text-sm text-muted-foreground mt-0.5">Sistemdeki tüm kayıtlı lokasyonlar</p>
            </div>
            <button onClick={() => setShowAddBiz(true)} className="btn-primary h-12 px-6 rounded-2xl flex items-center gap-2 text-sm font-bold shadow-lg shadow-red-500/20 active:scale-95 transition-transform">
              <PlusCircle size={18} /> İşletme Ekle
            </button>
          </div>

          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input 
              type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="AVM ismine göre filtrele..."
              className="w-full input-premium pl-11 py-3"
            />
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredMalls.length === 0 ? (
            <div className="glass rounded-3xl flex flex-col items-center justify-center py-20 gap-3 border border-white/[0.04]">
              <Building2 className="w-12 h-12 text-muted-foreground/20" />
              <p className="text-sm text-muted-foreground">Kayıtlı AVM bulunamadı.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredMalls.map((mall, i) => {
                const isOpen = expandedMall === mall.id;
                const mallBiz = getMallBiz(mall.id);
                return (
                  <div key={mall.id} className="glass rounded-3xl overflow-hidden card-hover animate-fade-in group/card" style={{ animationDelay: `${i * 0.04}s` }}>
                    <div className="flex items-center justify-between">
                      <button 
                        onClick={() => setExpandedMall(isOpen ? null : mall.id)}
                        className="flex-1 px-6 py-5 flex items-center gap-6 text-left"
                      >
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-red-500/15 to-orange-500/10 border border-primary/10 flex items-center justify-center text-primary group-hover/card:scale-110 transition-transform">
                          <Building2 size={24} />
                        </div>
                        <div>
                          <h3 className="font-bold text-lg leading-tight group-hover:text-red-400 transition-colors uppercase tracking-tight">{mall.name}</h3>
                          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1 font-medium"><MapPin size={12} className="text-red-400/60" /> {mall.address || 'Adres bilgisi yok'}</p>
                        </div>
                        <div className="ml-auto flex items-center gap-4">
                          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/[0.03] border border-white/[0.06] text-[10px] uppercase font-bold tracking-widest text-muted-foreground">
                            <Store size={12} /> {getBizCount(mall.id)} Kayıtlı Birim
                          </div>
                          <ChevronDown size={20} className={cn("text-muted-foreground transition-transform duration-300", isOpen && "rotate-180")} />
                        </div>
                      </button>
                      <div className="pr-6 flex items-center gap-1 opacity-0 group-hover/card:opacity-100 transition-all">
                        <button 
                          onClick={() => { setEditingMall(mall); setEditMallForm({ name: mall.name, address: mall.address || '', contact_person: mall.contact_person || '' }); setShowEditMall(true); }}
                          className="p-2.5 rounded-xl hover:bg-white/[0.05] text-muted-foreground hover:text-red-400"
                        >
                          <Edit3 size={16} />
                        </button>
                        <button 
                          onClick={() => handleDeleteMall(mall.id)}
                          className="p-2.5 rounded-xl hover:bg-white/[0.05] text-muted-foreground hover:text-red-400"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>

                    {isOpen && (
                      <div className="border-t border-white/[0.04] p-6 pt-2 bg-gradient-to-b from-white/[0.02] to-transparent">
                        {mallBiz.length === 0 ? (
                          <div className="py-8 text-center bg-white/[0.01] rounded-2xl border border-dashed border-white/[0.06]">
                            <Store className="w-8 h-8 text-muted-foreground/10 mx-auto mb-2" />
                            <p className="text-xs text-muted-foreground font-medium">Bu AVM henüz boş görünüyor</p>
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
                            {mallBiz.map(biz => (
                              <div key={biz.id} className="flex items-center justify-between px-5 py-4 rounded-2xl bg-white/[0.02] border border-white/[0.04] hover:bg-white/[0.04] transition-all group/biz">
                                <div className="flex items-center gap-4">
                                  <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.3)]" />
                                  <div>
                                    <p className="text-sm font-bold text-foreground/90">{biz.name}</p>
                                    <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">{biz.category || 'Dükkan'}</p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-1 opacity-0 group-hover/biz:opacity-100 transition-all">
                                  <button 
                                    onClick={() => { setEditingBiz(biz); setEditBizForm({ name: biz.name, category: biz.category || '' }); setShowEditBiz(true); }}
                                    className="p-2 rounded-lg hover:bg-white/[0.05] text-muted-foreground hover:text-red-400"
                                  >
                                    <Edit3 size={13} />
                                  </button>
                                  <button 
                                    onClick={() => handleDeleteBiz(biz.id)}
                                    className="p-2 rounded-lg hover:bg-white/[0.05] text-muted-foreground hover:text-red-400"
                                  >
                                    <Trash2 size={13} />
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

        {/* MODALS (Add/Edit Mall/Biz) */}
        {/* ... (Modals implementation below) ... */}
        {showAddBiz && (
          <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-xl flex items-center justify-center p-4" onClick={() => setShowAddBiz(false)}>
            <div className="glass-strong rounded-3xl p-8 w-full max-w-md animate-scale-up" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-xl font-bold tracking-tight">İşletme Ekle</h3>
                <button onClick={() => setShowAddBiz(false)} className="p-2.5 rounded-2xl hover:bg-white/[0.05] transition-colors"><X size={20} /></button>
              </div>
              <form onSubmit={handleAddBiz} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Konum (AVM) *</label>
                  <select value={bizForm.mall_id} onChange={e => setBizForm({...bizForm, mall_id: e.target.value})} required className="w-full input-premium py-3">
                    <option value="">AVM Seçin</option>
                    {malls.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">İşletme Adı *</label>
                  <input value={bizForm.name} onChange={e => setBizForm({...bizForm, name: e.target.value})} required className="w-full input-premium py-3" placeholder="Örn: Burger King" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Kategori</label>
                  <input value={bizForm.category} onChange={e => setBizForm({...bizForm, category: e.target.value})} className="w-full input-premium py-3" placeholder="Gıda / Mutfak" />
                </div>
                <button type="submit" disabled={saving} className="w-full btn-primary h-14 rounded-2xl font-bold flex items-center justify-center gap-2 mt-4">
                  {saving ? <Loader2 size={18} className="animate-spin" /> : <><CheckCircle2 size={18} /> Kaydet</>}
                </button>
              </form>
            </div>
          </div>
        )}

        {showEditMall && (
          <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-xl flex items-center justify-center p-4" onClick={() => setShowEditMall(false)}>
            <div className="glass-strong rounded-3xl p-8 w-full max-w-md animate-scale-up" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-xl font-bold tracking-tight">AVM Bilgilerini Güncelle</h3>
                <button onClick={() => setShowEditMall(false)} className="p-2.5 rounded-2xl hover:bg-white/[0.05] transition-colors"><X size={20} /></button>
              </div>
              <form onSubmit={handleUpdateMall} className="space-y-4">
                <div className="space-y-1.5"><label className="text-xs font-bold uppercase text-muted-foreground">İsim</label><input value={editMallForm.name} onChange={e => setEditMallForm({...editMallForm, name: e.target.value})} className="w-full input-premium py-3" /></div>
                <div className="space-y-1.5"><label className="text-xs font-bold uppercase text-muted-foreground">Adres</label><input value={editMallForm.address} onChange={e => setEditMallForm({...editMallForm, address: e.target.value})} className="w-full input-premium py-3" /></div>
                <div className="space-y-1.5"><label className="text-xs font-bold uppercase text-muted-foreground">Yetkili</label><input value={editMallForm.contact_person} onChange={e => setEditMallForm({...editMallForm, contact_person: e.target.value})} className="w-full input-premium py-3" /></div>
                <button type="submit" disabled={saving} className="w-full btn-primary h-14 rounded-2xl font-bold flex items-center justify-center gap-2 mt-4">{saving ? <Loader2 size={18} /> : 'Değişiklikleri Kaydet'}</button>
              </form>
            </div>
          </div>
        )}

        {showEditBiz && (
          <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-xl flex items-center justify-center p-4" onClick={() => setShowEditBiz(false)}>
            <div className="glass-strong rounded-3xl p-8 w-full max-w-md animate-scale-up" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-xl font-bold tracking-tight">İşletmeyi Düzenle</h3>
                <button onClick={() => setShowEditBiz(false)} className="p-2.5 rounded-2xl hover:bg-white/[0.05] transition-colors"><X size={20} /></button>
              </div>
              <form onSubmit={handleUpdateBiz} className="space-y-4">
                <div className="space-y-1.5"><label className="text-xs font-bold uppercase text-muted-foreground">İşletme Adı</label><input value={editBizForm.name} onChange={e => setEditBizForm({...editBizForm, name: e.target.value})} className="w-full input-premium py-3" /></div>
                <div className="space-y-1.5"><label className="text-xs font-bold uppercase text-muted-foreground">Kategori</label><input value={editBizForm.category} onChange={e => setEditBizForm({...editBizForm, category: e.target.value})} className="w-full input-premium py-3" /></div>
                <button type="submit" disabled={saving} className="w-full btn-primary h-14 rounded-2xl font-bold flex items-center justify-center gap-2 mt-4">{saving ? <Loader2 size={18} /> : 'Güncelle'}</button>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default function AdminMalls() {
  return <RouteGuard requiredRole="admin"><MallsContent /></RouteGuard>;
}
