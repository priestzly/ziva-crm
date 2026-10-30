'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { PanelLayout } from '@/components/DashboardShell';
import {
  Button, IconButton, Card, PageHeader, IconTile, Badge, Field, Input, Select,
  SearchInput, LoadingState, EmptyState, ErrorBanner, Sheet,
} from '@/components/ui';
import RouteGuard from '@/components/RouteGuard';
import { useAuth } from '@/context/AuthContext';
import { supabase, type Business, type Mall } from '@/lib/supabase';
import {
  PlusCircle, Trash2, Edit3, Store, ChevronRight, CheckCircle2, Check, MapPin, RefreshCw,
} from 'lucide-react';
import { cn } from '@/lib/utils';

function BusinessesContent() {
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

  const openCreate = () => { setEditingBiz(null); setBizForm({ name: '', category: '', mall_id: '' }); setShowModal(true); };
  const openEdit = (biz: Business) => { setEditingBiz(biz); setBizForm({ name: biz.name, category: biz.category || '', mall_id: biz.mall_id || '' }); setShowModal(true); };
  const mallName = (biz: Business) => (biz as any).malls?.name as string | undefined;

  return (
    <PanelLayout role="admin" title="İşletmeler" subtitle={isRefreshing ? 'Yenileniyor…' : `${businesses.length} işletme · ${malls.length} AVM`}>
      <PageHeader
        title="İşletmeler"
        description="Sistemdeki tüm müşteri şubeleri ve dükkanlar."
        actions={
          <>
            <IconButton icon={RefreshCw} label="Yenile" variant="secondary" onClick={() => fetchData(true)} className={cn(isRefreshing && '[&_svg]:animate-spin')} />
            <Button icon={PlusCircle} onClick={openCreate}>Yeni işletme</Button>
          </>
        }
      />

      {fetchError && <ErrorBanner message={fetchError} onRetry={() => fetchData(true)} className="mb-4" />}

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <SearchInput value={search} onChange={setSearch} placeholder="İşletme adına göre ara…" className="flex-1 sm:max-w-sm" />
        <Select value={filterMall} onChange={e => setFilterMall(e.target.value)} className="sm:w-60" aria-label="Konuma göre filtrele">
          <option value="all">Tüm konumlar</option>
          <option value="none">Bağımsız işletmeler</option>
          {malls.map(m => (
            <option key={m.id} value={m.id}>{m.name}</option>
          ))}
        </Select>
      </div>

      {selectedIds.length > 0 && (
        <Card className="mb-4 flex items-center justify-between gap-3 px-4 py-3 border-primary/25 bg-primary/5">
          <div className="flex items-center gap-3 min-w-0">
            <IconTile icon={CheckCircle2} size="sm" />
            <p className="text-sm font-medium text-foreground tabular-nums">{selectedIds.length} işletme seçildi</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button variant="ghost" size="sm" onClick={() => setSelectedIds([])}>Seçimi kaldır</Button>
            <Button variant="danger" size="sm" icon={Trash2} loading={saving} onClick={handleBulkDelete}>Sil</Button>
          </div>
        </Card>
      )}

      {loading && !initialLoadDone.current ? (
        <LoadingState />
      ) : filteredBiz.length === 0 ? (
        <Card>
          <EmptyState
            icon={Store}
            title={search || filterMall !== 'all' ? 'Eşleşen işletme yok' : 'Henüz işletme yok'}
            description={search || filterMall !== 'all' ? 'Arama veya filtre kriterlerini değiştirmeyi deneyin.' : 'İlk işletmeyi ekleyerek başlayın.'}
            action={<Button icon={PlusCircle} onClick={openCreate}>Yeni işletme</Button>}
          />
        </Card>
      ) : (
        <>
          {/* Desktop table */}
          <Card className="hidden md:block overflow-x-auto">
            <table className="p-table">
              <thead>
                <tr>
                  <th className="w-12"><span className="sr-only">Seç</span></th>
                  <th>İşletme</th>
                  <th>Kategori</th>
                  <th>Konum</th>
                  <th className="text-right">İşlemler</th>
                </tr>
              </thead>
              <tbody>
                {filteredBiz.map(biz => {
                  const selected = selectedIds.includes(biz.id);
                  return (
                    <tr key={biz.id} onClick={() => toggleSelect(biz.id)} className={cn('cursor-pointer', selected && 'bg-primary/5')}>
                      <td><SelectMark selected={selected} /></td>
                      <td>
                        <div className="flex items-center gap-3 min-w-0">
                          <IconTile icon={Store} size="sm" />
                          <span className="font-medium text-foreground truncate">{biz.name}</span>
                        </div>
                      </td>
                      <td className="text-muted-foreground">{biz.category || 'Kategori yok'}</td>
                      <td>
                        {mallName(biz) ? (
                          <span className="inline-flex items-center gap-1.5 text-foreground"><MapPin size={13} className="text-muted-foreground shrink-0" />{mallName(biz)}</span>
                        ) : (
                          <Badge>Bağımsız</Badge>
                        )}
                      </td>
                      <td onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          <Link href={`/admin/history?bizId=${biz.id}`} className="p-btn p-btn-secondary p-btn-sm">
                            Servis kartı <ChevronRight size={14} />
                          </Link>
                          <IconButton icon={Edit3} label="Düzenle" size="sm" onClick={(e) => { e.stopPropagation(); openEdit(biz); }} />
                          <IconButton icon={Trash2} label="Sil" size="sm" className="hover:!text-destructive" onClick={(e) => handleDelete(biz.id, e)} />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Card>

          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {filteredBiz.map(biz => {
              const selected = selectedIds.includes(biz.id);
              return (
                <Card key={biz.id} onClick={() => toggleSelect(biz.id)} className={cn('p-4 cursor-pointer', selected && 'border-primary/40 bg-primary/5')}>
                  <div className="flex items-start gap-3">
                    <IconTile icon={Store} />
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-foreground truncate">{biz.name}</p>
                      <p className="mt-0.5 text-sm text-muted-foreground truncate">{biz.category || 'Kategori yok'}</p>
                    </div>
                    <SelectMark selected={selected} />
                  </div>
                  <div className="mt-3 pt-3 border-t border-border flex items-center justify-between gap-2" onClick={e => e.stopPropagation()}>
                    <span className="min-w-0 flex items-center gap-1.5 text-xs text-muted-foreground">
                      <MapPin size={13} className="shrink-0" />
                      <span className="truncate">{mallName(biz) || 'Bağımsız'}</span>
                    </span>
                    <div className="flex items-center gap-1 shrink-0">
                      <IconButton icon={Edit3} label="Düzenle" size="sm" onClick={(e) => { e.stopPropagation(); openEdit(biz); }} />
                      <IconButton icon={Trash2} label="Sil" size="sm" className="hover:!text-destructive" onClick={(e) => handleDelete(biz.id, e)} />
                      <Link href={`/admin/history?bizId=${biz.id}`} className="p-btn p-btn-secondary p-btn-sm">
                        Servis kartı <ChevronRight size={14} />
                      </Link>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </>
      )}

      {/* Add / edit business */}
      <Sheet
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editingBiz ? 'İşletmeyi düzenle' : 'Yeni işletme'}
        description={editingBiz ? 'Firma bilgilerini güncelleyin.' : 'Sisteme yeni bir işletme tanımlayın.'}
      >
        <form onSubmit={handleSave} className="space-y-4">
          <Field label="İşletme ticari unvanı" required>
            <Input value={bizForm.name} onChange={e => setBizForm({ ...bizForm, name: e.target.value })} required placeholder="Örn: X Global Mağazacılık" />
          </Field>
          <Field label="Hizmet alanı / kategori">
            <Input value={bizForm.category} onChange={e => setBizForm({ ...bizForm, category: e.target.value })} placeholder="Örn: Restoran, imalathane…" />
          </Field>
          <Field label="Bağlı olduğu AVM">
            <Select value={bizForm.mall_id} onChange={e => setBizForm({ ...bizForm, mall_id: e.target.value })}>
              <option value="">Bağımsız (AVM dışı)</option>
              {malls.map(m => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </Select>
          </Field>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setShowModal(false)}>Vazgeç</Button>
            <Button type="submit" icon={CheckCircle2} loading={saving}>{editingBiz ? 'Güncelle' : 'Kaydet'}</Button>
          </div>
        </form>
      </Sheet>
    </PanelLayout>
  );
}

function SelectMark({ selected }: { selected: boolean }) {
  return (
    <span
      aria-hidden
      className={cn(
        'w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition-colors',
        selected ? 'bg-primary border-primary text-primary-foreground' : 'border-border-strong bg-card'
      )}
    >
      {selected && <Check size={13} strokeWidth={3} />}
    </span>
  );
}

export default function AdminBusinessesPage() {
  return (
    <RouteGuard requiredRole="admin">
      <BusinessesContent />
    </RouteGuard>
  );
}
