'use client';

import React, { useEffect, useState } from 'react';
import { Sidebar, Topbar } from '@/components/DashboardShell';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { supabase, type Business, type Mall } from '@/lib/supabase';
import { 
  Building2, PlusCircle, Search, Loader2, X, Trash2, Edit3, 
  Store, Filter, ChevronRight, LayoutGrid, CheckCircle2
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
      <main className="flex-1 lg:ml-72 transition-all duration-500">
        <Topbar title="Tüm İşletmeler" subtitle="AVM dükkanları ve bağımsız işletmelerin yönetimi" />

        <div className="p-6 lg:p-8 space-y-6 max-w-[1400px] mx-auto">
          {/* Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Dükkanlar & Müşteriler</h1>
              <p className="text-sm text-muted-foreground mt-0.5">Sistemdeki tüm kayıtlı noktaları buradan yönetin</p>
            </div>
            <button 
              onClick={() => { setEditingBiz(null); setBizForm({ name: '', category: '', mall_id: '' }); setShowModal(true); }}
              className="btn-primary h-12 px-6 rounded-2xl flex items-center gap-2 text-sm font-bold"
            >
              <PlusCircle size={18} /> Yeni İşletme Ekle
            </button>
          </div>

          {/* Controls */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="md:col-span-2 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input 
                type="text" value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Dükkan veya işletme ismi ile ara..."
                className="w-full input-premium pl-11 py-3"
              />
            </div>
            <div className="relative">
              <Filter className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <select 
                value={filterMall} 
                onChange={e => setFilterMall(e.target.value)}
                className="w-full input-premium pl-11 py-3 appearance-none"
              >
                <option value="all">Tüm Konumlar</option>
                <option value="none">Bağımsız İşletmeler</option>
                {malls.map(m => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Grid List */}
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredBiz.map((biz, i) => (
                <div key={biz.id} className="glass rounded-3xl p-6 card-hover animate-fade-in flex flex-col justify-between group" style={{ animationDelay: `${i * 0.03}s` }}>
                  <div>
                    <div className="flex items-start justify-between mb-4">
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-red-500/15 to-orange-500/10 border border-primary/10 flex items-center justify-center text-primary">
                        <Store size={22} className="text-red-400" />
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => { setEditingBiz(biz); setBizForm({ name: biz.name, category: biz.category || '', mall_id: biz.mall_id || '' }); setShowModal(true); }}
                          className="p-2 rounded-xl hover:bg-white/[0.05] text-muted-foreground hover:text-red-400"
                        >
                          <Edit3 size={14} />
                        </button>
                        <button 
                          onClick={() => handleDelete(biz.id)}
                          className="p-2 rounded-xl hover:bg-white/[0.05] text-muted-foreground hover:text-red-400"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                    <h3 className="font-bold text-lg mb-1 leading-tight">{biz.name}</h3>
                    <p className="text-xs text-muted-foreground line-clamp-1 mb-4">{biz.category || 'Kategori belirtilmemiş'}</p>
                  </div>

                  <div className="space-y-3 pt-4 border-t border-white/[0.04]">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground flex items-center gap-1.5"><Building2 size={12} /> Konum</span>
                      <span className="font-semibold text-right max-w-[120px] truncate">
                        {(biz as any).malls?.name || <span className="text-amber-400">Bağımsız</span>}
                      </span>
                    </div>
                    <Link 
                      href={`/client/businesses/${biz.id}`}
                      className="w-full py-2.5 rounded-xl border border-white/[0.05] bg-white/[0.02] hover:bg-white/[0.05] transition-colors text-[10px] uppercase font-bold tracking-widest flex items-center justify-center gap-2"
                    >
                      Kayıtları Gör <ChevronRight size={12} />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Empty State */}
          {!loading && filteredBiz.length === 0 && (
            <div className="glass rounded-3xl py-32 flex flex-col items-center justify-center text-center px-6">
              <Store className="w-12 h-12 text-muted-foreground/20 mb-4" />
              <h3 className="text-lg font-bold">Sonuç bulunamadı</h3>
              <p className="text-sm text-muted-foreground max-w-xs mt-1">Arama kriterlerinizi değiştirerek tekrar deneyin veya yeni bir dükkan ekleyin.</p>
            </div>
          )}
        </div>

        {/* MODAL */}
        {showModal && (
          <div className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowModal(false)}>
            <div className="glass-strong rounded-3xl p-8 w-full max-w-md animate-fade-in" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold">{editingBiz ? 'İşletmeyi Düzenle' : 'Yeni İşletme Ekle'}</h3>
                <button onClick={() => setShowModal(false)} className="p-2 rounded-xl hover:bg-white/[0.05] transition-colors">
                  <X size={20} />
                </button>
              </div>
              
              <form onSubmit={handleSave} className="space-y-4">
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">İşletme Adı *</label>
                  <input 
                    value={bizForm.name} onChange={e => setBizForm({...bizForm, name: e.target.value})} 
                    required placeholder="Örn: Burger King veya Akaryakıt İstasyonu" 
                    className="w-full input-premium mt-1.5" 
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Kategori</label>
                  <input 
                    value={bizForm.category} onChange={e => setBizForm({...bizForm, category: e.target.value})} 
                    placeholder="Örn: Mutfak / Baca" 
                    className="w-full input-premium mt-1.5" 
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Bağlı Olduğu AVM (Opsiyonel)</label>
                  <select 
                    value={bizForm.mall_id} onChange={e => setBizForm({...bizForm, mall_id: e.target.value})} 
                    className="w-full input-premium mt-1.5"
                  >
                    <option value="">Bağımsız (AVM Dışı)</option>
                    {malls.map(m => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                  </select>
                </div>

                <div className="pt-4">
                  <button 
                    disabled={saving} 
                    type="submit" 
                    className="w-full btn-primary h-14 rounded-2xl flex items-center justify-center gap-2 font-bold"
                  >
                    {saving ? <Loader2 size={18} className="animate-spin" /> : <><CheckCircle2 size={18} /> {editingBiz ? 'Güncelle' : 'Kaydet'}</>}
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
  return <BusinessesContent />;
}
