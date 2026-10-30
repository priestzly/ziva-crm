'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { PanelLayout } from '@/components/DashboardShell';
import {
  Button, IconButton, Card, PageHeader, IconTile, Badge, Field, Input, Select,
  SearchInput, LoadingState, EmptyState, ErrorBanner, Sheet,
} from '@/components/ui';
import RouteGuard from '@/components/RouteGuard';
import { useAuth } from '@/context/AuthContext';
import { supabase, type Mall, type Business } from '@/lib/supabase';
import {
  Building2, PlusCircle, Trash2, Edit3, ChevronDown, CheckCircle2, MapPin, User, Store, RefreshCw,
} from 'lucide-react';
import { cn } from '@/lib/utils';

function MallsContent() {
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
    <PanelLayout role="admin" title="AVM’ler" subtitle={isRefreshing ? 'Yenileniyor…' : `${malls.length} AVM · ${businesses.length} işletme`}>
      <PageHeader
        title="AVM’ler ve işletmeler"
        description="Müşteri lokasyonlarını ve içlerindeki işletmeleri yönetin."
        actions={
          <>
            <IconButton icon={RefreshCw} label="Yenile" variant="secondary" onClick={() => fetchData(true)} className={cn(isRefreshing && '[&_svg]:animate-spin')} />
            <Button icon={PlusCircle} onClick={() => setShowAddBiz(true)}>İşletme ekle</Button>
          </>
        }
      />

      {fetchError && <ErrorBanner message={fetchError} onRetry={() => fetchData(true)} className="mb-4" />}

      <SearchInput value={search} onChange={setSearch} placeholder="AVM adına göre ara…" className="mb-4 sm:max-w-sm" />

      {loading && !initialLoadDone.current ? (
        <LoadingState />
      ) : filteredMalls.length === 0 ? (
        <Card>
          <EmptyState icon={Building2} title={search ? 'Eşleşen AVM yok' : 'Henüz AVM yok'} description={search ? 'Farklı bir arama deneyin.' : 'AVM’ler Özet sayfasından eklenebilir.'} />
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredMalls.map(mall => {
            const isOpen = expandedMall === mall.id;
            const mallBiz = getMallBiz(mall.id);
            return (
              <Card key={mall.id} className="overflow-hidden">
                <div className="flex items-center gap-1 pr-3">
                  <button
                    type="button"
                    onClick={() => setExpandedMall(isOpen ? null : mall.id)}
                    aria-expanded={isOpen}
                    className="flex-1 min-w-0 flex items-center gap-4 px-4 sm:px-5 py-4 text-left"
                  >
                    <IconTile icon={Building2} />
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-foreground truncate">{mall.name}</p>
                      <p className="mt-0.5 text-sm text-muted-foreground flex items-center gap-1.5 truncate">
                        <MapPin size={13} className="shrink-0" /> {mall.address || 'Adres girilmemiş'}
                      </p>
                    </div>
                    <Badge icon={Store} className="hidden sm:inline-flex">{getBizCount(mall.id)} işletme</Badge>
                    <ChevronDown size={18} className={cn('text-muted-foreground transition-transform shrink-0', isOpen && 'rotate-180')} />
                  </button>
                  <IconButton
                    icon={Edit3}
                    label="AVM’yi düzenle"
                    size="sm"
                    onClick={() => { setEditingMall(mall); setEditMallForm({ name: mall.name, address: mall.address || '', contact_person: mall.contact_person || '' }); setShowEditMall(true); }}
                  />
                  <IconButton icon={Trash2} label="AVM’yi sil" size="sm" className="hover:!text-destructive" onClick={() => handleDeleteMall(mall.id)} />
                </div>

                {isOpen && (
                  <div className="border-t border-border bg-surface/40 p-4 sm:p-5">
                    {mall.contact_person && (
                      <p className="mb-3 text-sm text-muted-foreground flex items-center gap-1.5"><User size={14} /> Yetkili: <span className="text-foreground">{mall.contact_person}</span></p>
                    )}
                    {mallBiz.length === 0 ? (
                      <p className="py-6 text-center text-sm text-muted-foreground border border-dashed border-border rounded-xl">Bu AVM’de kayıtlı işletme yok.</p>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {mallBiz.map(biz => (
                          <div key={biz.id} className="flex items-center gap-2 pl-3.5 pr-1.5 py-2 rounded-xl bg-card border border-border">
                            <span className="w-1.5 h-1.5 rounded-full bg-success shrink-0" />
                            <div className="min-w-0 flex-1 ml-1">
                              <p className="text-sm font-medium text-foreground truncate">{biz.name}</p>
                              <p className="text-xs text-muted-foreground truncate">{biz.category || 'Kategori yok'}</p>
                            </div>
                            <IconButton
                              icon={Edit3}
                              label="İşletmeyi düzenle"
                              size="sm"
                              onClick={() => { setEditingBiz(biz); setEditBizForm({ name: biz.name, category: biz.category || '' }); setShowEditBiz(true); }}
                            />
                            <IconButton icon={Trash2} label="İşletmeyi sil" size="sm" className="hover:!text-destructive" onClick={() => handleDeleteBiz(biz.id)} />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* Add business */}
      <Sheet isOpen={showAddBiz} onClose={() => setShowAddBiz(false)} title="İşletme ekle" description="Bir AVM’ye yeni işletme kaydedin.">
        <form onSubmit={handleAddBiz} className="space-y-4">
          <Field label="AVM" required>
            <Select value={bizForm.mall_id} onChange={e => setBizForm({ ...bizForm, mall_id: e.target.value })} required>
              <option value="">AVM seçin</option>
              {malls.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </Select>
          </Field>
          <Field label="İşletme adı" required>
            <Input value={bizForm.name} onChange={e => setBizForm({ ...bizForm, name: e.target.value })} required placeholder="Örn: Burger King" />
          </Field>
          <Field label="Kategori">
            <Input value={bizForm.category} onChange={e => setBizForm({ ...bizForm, category: e.target.value })} placeholder="Örn: Gıda / Mutfak" />
          </Field>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setShowAddBiz(false)}>Vazgeç</Button>
            <Button type="submit" icon={CheckCircle2} loading={saving}>Kaydet</Button>
          </div>
        </form>
      </Sheet>

      {/* Edit mall */}
      <Sheet isOpen={showEditMall} onClose={() => setShowEditMall(false)} title="AVM’yi düzenle">
        <form onSubmit={handleUpdateMall} className="space-y-4">
          <Field label="AVM adı"><Input value={editMallForm.name} onChange={e => setEditMallForm({ ...editMallForm, name: e.target.value })} /></Field>
          <Field label="Adres"><Input value={editMallForm.address} onChange={e => setEditMallForm({ ...editMallForm, address: e.target.value })} /></Field>
          <Field label="Yetkili kişi"><Input value={editMallForm.contact_person} onChange={e => setEditMallForm({ ...editMallForm, contact_person: e.target.value })} /></Field>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setShowEditMall(false)}>Vazgeç</Button>
            <Button type="submit" loading={saving}>Değişiklikleri kaydet</Button>
          </div>
        </form>
      </Sheet>

      {/* Edit business */}
      <Sheet isOpen={showEditBiz} onClose={() => setShowEditBiz(false)} title="İşletmeyi düzenle">
        <form onSubmit={handleUpdateBiz} className="space-y-4">
          <Field label="İşletme adı"><Input value={editBizForm.name} onChange={e => setEditBizForm({ ...editBizForm, name: e.target.value })} /></Field>
          <Field label="Kategori"><Input value={editBizForm.category} onChange={e => setEditBizForm({ ...editBizForm, category: e.target.value })} /></Field>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setShowEditBiz(false)}>Vazgeç</Button>
            <Button type="submit" loading={saving}>Güncelle</Button>
          </div>
        </form>
      </Sheet>
    </PanelLayout>
  );
}

export default function AdminMalls() {
  return <RouteGuard requiredRole="admin"><MallsContent /></RouteGuard>;
}

