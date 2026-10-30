'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { PanelLayout } from '@/components/DashboardShell';
import {
  Button, IconButton, Card, PageHeader, StatCard, Badge, Field, Input, Select, Textarea,
  SearchInput, LoadingState, EmptyState, ErrorBanner, Sheet, Segmented,
} from '@/components/ui';
import { supabase, type MaintenanceRecord } from '@/lib/supabase';
import {
  ChevronRight, MapPin, Printer, ArrowLeft, Flame, Trash2, Edit3, Upload, Clock,
  RefreshCw, ShieldAlert, CheckCircle2, Download, TrendingUp, Package, UserCheck, ImageIcon, FileText, X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

const statusTone = (status: string) => (status === 'Tamamlandı' ? 'success' : 'info');

export interface ParsedDescription {
  text: string;
  technician: string;
  materials: string;
  status: string;
  cost: string;
}

const parseDescription = (desc: string): ParsedDescription => {
  try {
    const parsed = JSON.parse(desc);
    return {
      text: parsed.text || '',
      technician: parsed.technician || '',
      materials: parsed.materials || '',
      status: parsed.status || 'Tamamlandı',
      cost: parsed.cost || ''
    };
  } catch (e) {
    return { text: desc, technician: '', materials: '', status: 'Tamamlandı', cost: '' };
  }
};

interface ServiceHistoryBaseProps {
  role: 'admin' | 'client';
  businessId?: string;
  targetId?: string | null;
  mallId?: string;
}

export default function ServiceHistoryBase({ role, businessId, targetId, mallId }: ServiceHistoryBaseProps) {
  const [viewingRecordMobile, setViewingRecordMobile] = useState<MaintenanceRecord | null>(null);
  const [mobilePhotos, setMobilePhotos] = useState<any[]>([]);
  const [activePrintRecordId, setActivePrintRecordId] = useState<string | null>(null);

  const [records, setRecords] = useState<MaintenanceRecord[]>([]);
  const [photos, setPhotos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [selectedMall, setSelectedMall] = useState<string>('all');
  const [selectedBusiness, setSelectedBusiness] = useState<string>('all');
  const [malls, setMalls] = useState<any[]>([]);
  const [allBusinesses, setAllBusinesses] = useState<any[]>([]);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('table');

  const [showEditRecord, setShowEditRecord] = useState(false);
  const [editingRecord, setEditingRecord] = useState<MaintenanceRecord | null>(null);
  const [existingPhotos, setExistingPhotos] = useState<any[]>([]);
  const [recordPhotos, setRecordPhotos] = useState<File[]>([]);
  const [saving, setSaving] = useState(false);
  
  const [editRecordForm, setEditRecordForm] = useState({ 
    service_type: '', text: '', technician: '', materials: '', status: 'Tamamlandı', cost: ''
  });

  const router = useRouter();

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
      console.log('Fetching history data, role:', role, 'businessId:', businessId, 'targetId:', targetId, 'mallId:', mallId);
      
      let query = supabase.from('maintenance_records')
        .select('*, businesses!inner(name, mall_id, mall:mall_id(name))')
        .order('created_at', { ascending: false });
      
      if (businessId) query = query.eq('business_id', businessId);
      if (role === 'client' && mallId) {
        query = query.eq('businesses.mall_id', mallId);
      }
      
      const [recRes, mallRes, bizRes] = await Promise.all([
        query,
        supabase.from('malls').select('id, name').order('name'),
        supabase.from('businesses').select('id, name, mall_id').order('name')
      ]);
      
      if (recRes.error) throw recRes.error;
      if (mallRes.error) throw mallRes.error;
      if (bizRes.error) throw bizRes.error;
      
      let recordsData = recRes.data || [];
      
      // If we have a targetId but it's not in the regular list, fetch it specifically
      if (targetId && !recordsData.find((r: MaintenanceRecord) => r.id === targetId)) {
        let singleQuery = supabase
          .from('maintenance_records')
          .select('*, businesses!inner(name, mall_id, mall:mall_id(name))')
          .eq('id', targetId);
          
        if (role === 'client' && mallId) {
          singleQuery = singleQuery.eq('businesses.mall_id', mallId);
        }
        
        const { data: singleRec, error: singleError } = await singleQuery.single();
          
        if (!singleError && singleRec) {
          recordsData = [singleRec, ...recordsData];
        } else if (singleError) {
          console.warn('Single record fetch failed, maybe it belongs to someone else or was deleted:', singleError);
        }
      }
      
      setRecords(recordsData);
      setMalls(mallRes.data || []);
      setAllBusinesses(bizRes.data || []);

      if (targetId) {
        const { data: photoData, error: photoError } = await supabase.from('maintenance_photos').select('*').eq('record_id', targetId);
        if (photoError) console.error('Photos fetch error:', photoError);
        setPhotos(photoData || []);
      }
      initialLoadDone.current = true;
    } catch (err: any) { 
      console.error('History fetch error:', err); 
      setFetchError(`Kayıt Arşivi Yüklenemiyor: ${err.message || 'Bilinmeyen hata'}`);
    } finally { 
      setLoading(false);
      if (isRefresh) setIsRefreshing(false);
    }
  }, [role, businessId, targetId, mallId]);

  const setupSubscription = useCallback(() => {
    if (subscriptionRef.current) {
      supabase.removeChannel(subscriptionRef.current);
      subscriptionRef.current = null;
    }

    const sub = supabase.channel('history-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'maintenance_records' }, () => fetchData(true))
      .subscribe((status: string) => {
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.warn('History Realtime error, retrying...');
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

  const handleViewMobileRecord = async (rec: MaintenanceRecord) => {
    setViewingRecordMobile(rec);
    setMobilePhotos([]);
    const { data } = await supabase.from('maintenance_photos').select('*').eq('record_id', rec.id);
    setMobilePhotos(data || []);
  };

  const handleMobilePrint = (rec: MaintenanceRecord) => {
    setPhotos(mobilePhotos);
    setActivePrintRecordId(rec.id);
    setTimeout(() => {
      window.print();
      setActivePrintRecordId(null);
    }, 250);
  };

  const handleEditClick = async (rec: any) => {
    const p = parseDescription(rec.description);
    setEditRecordForm({ service_type: rec.service_type || '', text: p.text, technician: p.technician, materials: p.materials, status: p.status, cost: p.cost });
    setEditingRecord(rec);
    setShowEditRecord(true);
    
    const { data } = await supabase.from('maintenance_photos').select('*').eq('record_id', rec.id);
    setExistingPhotos(data || []);
  };

  const handleUpdateRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRecord) return;
    setSaving(true);
    const packed = JSON.stringify({ text: editRecordForm.text, technician: editRecordForm.technician, materials: editRecordForm.materials, status: editRecordForm.status, cost: editRecordForm.cost });
    try {
      await supabase.from('maintenance_records').update({ description: packed, service_type: editRecordForm.service_type }).eq('id', editingRecord.id);
      
      if (recordPhotos.length > 0) {
        await Promise.all(recordPhotos.map(async (file) => {
          const fileName = `${editingRecord.id}/${Date.now()}_${file.name}`;
          const { data: uploadData } = await supabase.storage.from('maintenance-photos').upload(fileName, file);
          if (uploadData) {
            const { data: { publicUrl } } = supabase.storage.from('maintenance-photos').getPublicUrl(uploadData.path);
            await supabase.from('maintenance_photos').insert([{ record_id: editingRecord.id, photo_url: publicUrl }]);
          }
        }));
      }
      
      setShowEditRecord(false); 
      setEditingRecord(null); 
      setRecordPhotos([]); 
      fetchData(true);
    } catch (err) { 
      console.error(err); 
    } finally { 
      setSaving(false); 
    }
  };

  const handleDeleteRecord = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Bu operasyon kaydı silinsin mi?')) return;
    await supabase.from('maintenance_records').delete().eq('id', id);
    fetchData(true);
  };

  const handleDeletePhoto = async (photoId: string, url: string) => {
    if (!confirm('Bu fotoğraf silinsin mi?')) return;
    await supabase.from('maintenance_photos').delete().eq('id', photoId);
    const parts = url.split('/');
    const fileName = parts[parts.length - 1];
    if (editingRecord) {
       await supabase.storage.from('maintenance-photos').remove([`${editingRecord.id}/${fileName}`]);
    }
    setExistingPhotos(prev => prev.filter(p => p.id !== photoId));
    if (targetId) fetchData(true); 
  };

  const filteredRecords = records.filter(r => {
    if (targetId) return r.id === targetId;
    const p = parseDescription(r.description);
    
    const matchesMall = role === 'client' || selectedMall === 'all' || (r as any).businesses?.mall_id === selectedMall;
    const matchesBusiness = role === 'client' || selectedBusiness === 'all' || r.business_id === selectedBusiness;
    
    const searchTerm = search.toLowerCase();
    return matchesMall && matchesBusiness && (
      p.text.toLowerCase().includes(searchTerm) || 
      (r as any).businesses?.name?.toLowerCase().includes(searchTerm) ||
      r.service_type?.toLowerCase().includes(searchTerm)
    );
  });

  const handleExportCSV = () => {
    if (filteredRecords.length === 0) return;
    
    const headers = ['Tarih', 'İşletme', 'Konum', 'Tür', 'Durum', 'Teknisyen', 'Malzemeler', 'Açıklama'];
    const csvContent = [
      headers.join(','),
      ...filteredRecords.map(r => {
        const p = parseDescription(r.description);
        return [
          `"${new Date(r.created_at).toLocaleDateString('tr-TR')}"`,
          `"${(r as any).businesses?.name || ''}"`,
          `"${(r as any).businesses?.mall?.name || ''}"`,
          `"${r.service_type || ''}"`,
          `"${p.status || ''}"`,
          `"${p.technician || ''}"`,
          `"${p.materials || ''}"`,
          `"${p.text.replace(/"/g, '""')}"`
        ].join(',');
      })
    ].join('\n');

    const blob = new Blob([`\ufeff${csvContent}`], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', `ziva_arşiv_${new Date().toISOString().substring(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const hasActiveFilters = search !== '' || selectedMall !== 'all' || selectedBusiness !== 'all';
  const archiveHref = role === 'admin' ? '/admin/history' : '/client/history';

  return (
    <PanelLayout
      role={role}
      width="wide"
      title={targetId ? 'Servis raporu' : 'Servis arşivi'}
      subtitle={isRefreshing ? 'Yenileniyor…' : (role === 'admin' ? 'Tüm zamanların servis kayıtları' : 'Hizmet dökümünüz')}
    >
      <div className="space-y-6">
        {targetId ? (
          <PageHeader
            className="mb-0 print:hidden"
            title="Servis raporu"
            description="Raporu inceleyin, yazdırın veya PDF olarak kaydedin."
            actions={
              <>
                <Link href={archiveHref} className="p-btn p-btn-secondary">
                  <ArrowLeft size={16} /> Arşive dön
                </Link>
                {role === 'admin' && filteredRecords[0] && (
                  <Button variant="secondary" icon={Edit3} onClick={() => handleEditClick(filteredRecords[0])}>Düzenle</Button>
                )}
                <Button icon={Printer} onClick={() => window.print()}>PDF rapor al</Button>
              </>
            }
          />
        ) : (
          <PageHeader
            className="mb-0 print:hidden"
            title="Servis arşivi"
            description={role === 'admin' ? 'Tüm işletmelerin servis kayıtlarını filtreleyin, inceleyin ve dışa aktarın.' : 'İşletmenize yapılan tüm servislerin dijital kaydı.'}
            actions={
              <>
                <IconButton icon={RefreshCw} label="Yenile" variant="secondary" onClick={() => fetchData(true)} className={cn(isRefreshing && '[&_svg]:animate-spin')} />
                <Button variant="secondary" icon={Download} onClick={handleExportCSV} disabled={filteredRecords.length === 0}>CSV indir</Button>
              </>
            }
          />
        )}

        {fetchError && <ErrorBanner message={fetchError} onRetry={() => fetchData(true)} className="print:hidden" />}

        {!targetId && (
          <div className="space-y-6 print:hidden">
            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              <StatCard label="Toplam iş" value={filteredRecords.length} icon={Package} tone="neutral" />
              <StatCard
                label="Tamamlanan"
                value={filteredRecords.filter(r => parseDescription(r.description).status === 'Tamamlandı').length}
                icon={UserCheck}
                tone="success"
              />
              <StatCard
                label="Tamamlanma oranı"
                value={filteredRecords.length > 0
                  ? `%${Math.round((filteredRecords.filter(r => parseDescription(r.description).status === 'Completed' || parseDescription(r.description).status === 'Tamamlandı').length / filteredRecords.length) * 100)}`
                  : '%0'}
                icon={TrendingUp}
                tone="primary"
              />
              <StatCard
                label="Son 30 gün"
                value={filteredRecords.filter(r => {
                  const thirtyDaysAgo = new Date();
                  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
                  return new Date(r.created_at) > thirtyDaysAgo;
                }).length}
                icon={Clock}
                tone="info"
              />
            </div>

            {/* Filters */}
            <Card className="p-4 sm:p-5">
              <div className="flex flex-col lg:flex-row lg:items-center gap-3">
                <SearchInput
                  value={search}
                  onChange={setSearch}
                  placeholder="İşletme, servis türü veya açıklama ara…"
                  className="flex-1 min-w-0"
                />
                {role === 'admin' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 lg:w-[26rem] shrink-0">
                    <Select
                      aria-label="AVM"
                      value={selectedMall}
                      onChange={e => { setSelectedMall(e.target.value); setSelectedBusiness('all'); }}
                    >
                      <option value="all">Tüm AVM’ler</option>
                      {malls.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                    </Select>
                    <Select
                      aria-label="İşletme"
                      value={selectedBusiness}
                      onChange={e => setSelectedBusiness(e.target.value)}
                    >
                      <option value="all">Tüm işletmeler</option>
                      {allBusinesses
                        .filter(b => selectedMall === 'all' || b.mall_id === selectedMall)
                        .map(b => <option key={b.id} value={b.id}>{b.name}</option>)
                      }
                    </Select>
                  </div>
                )}
              </div>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm text-muted-foreground">
                  <span className="font-semibold text-foreground tabular-nums">{filteredRecords.length}</span> kayıt listeleniyor
                </p>
                <div className="flex items-center gap-2">
                  {hasActiveFilters && (
                    <Button
                      variant="ghost"
                      size="sm"
                      icon={X}
                      onClick={() => { setSearch(''); setSelectedMall('all'); setSelectedBusiness('all'); }}
                    >
                      Filtreleri temizle
                    </Button>
                  )}
                  <Segmented
                    className="hidden md:inline-flex"
                    value={viewMode}
                    onChange={setViewMode}
                    options={[{ value: 'table', label: 'Tablo' }, { value: 'grid', label: 'Kartlar' }]}
                  />
                </div>
              </div>
            </Card>
          </div>
        )}

        {loading && !initialLoadDone.current ? (
          <LoadingState label="Arşiv yükleniyor…" className="print:hidden" />
        ) : (
          <div className="animate-fade-in">
            {!targetId && filteredRecords.length === 0 && (
              <Card className="print:hidden">
                <EmptyState
                  icon={ShieldAlert}
                  title={hasActiveFilters ? 'Eşleşen kayıt yok' : 'Henüz servis kaydı yok'}
                  description={hasActiveFilters ? 'Filtreleri değiştirmeyi veya temizlemeyi deneyin.' : 'Yapılan servisler burada listelenecek.'}
                />
              </Card>
            )}

            {/* Desktop table */}
            {!targetId && filteredRecords.length > 0 && viewMode === 'table' && (
              <Card className="hidden md:block overflow-hidden print:hidden">
                <div className="overflow-x-auto">
                  <table className="p-table">
                    <thead>
                      <tr>
                        <th>Tarih</th>
                        <th>AVM</th>
                        <th>İşletme</th>
                        <th>Hizmet türü</th>
                        <th>Durum</th>
                        <th>Teknisyen / not</th>
                        <th className="text-right">İşlemler</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredRecords.map(rec => {
                        const p = parseDescription(rec.description);
                        return (
                          <tr key={rec.id} className="cursor-pointer" onClick={() => router.push(`?id=${rec.id}`)}>
                            <td className="whitespace-nowrap tabular-nums text-muted-foreground">{new Date(rec.created_at).toLocaleDateString('tr-TR')}</td>
                            <td className="text-muted-foreground max-w-[10rem] truncate">{(rec as any).businesses?.mall?.name || '—'}</td>
                            <td className="font-medium text-foreground max-w-[12rem] truncate">{(rec as any).businesses?.name}</td>
                            <td><Badge tone="primary" className="whitespace-nowrap">{rec.service_type || 'Periyodik'}</Badge></td>
                            <td><Badge tone={statusTone(p.status)} className="whitespace-nowrap">{p.status}</Badge></td>
                            <td className="max-w-[16rem]">
                              <p className="truncate text-foreground">{p.technician || 'Ziva teknik birimi'}</p>
                              {p.text && <p className="truncate text-xs text-muted-foreground">{p.text}</p>}
                            </td>
                            <td>
                              <div className="flex justify-end items-center gap-1">
                                {role === 'admin' && (
                                  <>
                                    <IconButton icon={Edit3} label="Kaydı düzenle" size="sm" onClick={(e) => { e.stopPropagation(); handleEditClick(rec); }} />
                                    <IconButton icon={Trash2} label="Kaydı sil" size="sm" className="hover:!text-destructive" onClick={(e) => handleDeleteRecord(rec.id, e)} />
                                  </>
                                )}
                                <ChevronRight size={16} className="text-muted-foreground ml-1" />
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}

            {/* Desktop card grid */}
            {!targetId && filteredRecords.length > 0 && viewMode === 'grid' && (
              <div className="hidden md:grid grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4 print:hidden">
                {filteredRecords.map(rec => {
                  const p = parseDescription(rec.description);
                  return (
                    <Card
                      key={rec.id}
                      interactive
                      className="p-4 sm:p-5 cursor-pointer flex flex-col gap-3"
                      onClick={() => router.push(`?id=${rec.id}`)}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-[15px] font-semibold text-foreground truncate">{(rec as any).businesses?.name}</p>
                          <p className="mt-0.5 text-xs text-muted-foreground flex items-center gap-1.5 truncate">
                            <MapPin size={12} className="shrink-0" /> {(rec as any).businesses?.mall?.name || 'AVM belirtilmemiş'}
                          </p>
                        </div>
                        {role === 'admin' && (
                          <div className="flex items-center gap-0.5 -mr-1.5 -mt-1 shrink-0">
                            <IconButton icon={Edit3} label="Kaydı düzenle" size="sm" onClick={(e) => { e.stopPropagation(); handleEditClick(rec); }} />
                            <IconButton icon={Trash2} label="Kaydı sil" size="sm" className="hover:!text-destructive" onClick={(e) => handleDeleteRecord(rec.id, e)} />
                          </div>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2 flex-1">{p.text || 'Açıklama girilmemiş.'}</p>
                      <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-border">
                        <Badge tone="primary">{rec.service_type || 'Periyodik'}</Badge>
                        <Badge tone={statusTone(p.status)}>{p.status}</Badge>
                        <span className="ml-auto text-xs text-muted-foreground tabular-nums">
                          {new Date(rec.created_at).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}

            {/* Mobile cards */}
            {!targetId && filteredRecords.length > 0 && (
              <div className="md:hidden space-y-2.5 print:hidden">
                {filteredRecords.map(rec => {
                  const p = parseDescription(rec.description);
                  return (
                    <Card
                      key={rec.id}
                      interactive
                      role="button"
                      tabIndex={0}
                      onClick={() => handleViewMobileRecord(rec)}
                      className="p-4 flex items-center gap-3 cursor-pointer"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <Badge tone="primary">{rec.service_type || 'Periyodik'}</Badge>
                          <Badge tone={statusTone(p.status)}>{p.status}</Badge>
                        </div>
                        <p className="mt-2 font-semibold text-foreground truncate">{(rec as any).businesses?.name}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground flex items-center gap-1.5 truncate">
                          <MapPin size={12} className="shrink-0" />
                          <span className="truncate">{(rec as any).businesses?.mall?.name || 'AVM belirtilmemiş'}</span>
                          <span aria-hidden>·</span>
                          <span className="tabular-nums shrink-0">{new Date(rec.created_at).toLocaleDateString('tr-TR')}</span>
                        </p>
                        {p.text && <p className="mt-1.5 text-sm text-muted-foreground truncate">{p.text}</p>}
                      </div>
                      <ChevronRight size={16} className="text-muted-foreground shrink-0" />
                    </Card>
                  );
                })}
              </div>
            )}

              {/* SINGLE REPORT / PDF VIEW */}
              {(targetId || activePrintRecordId) && filteredRecords.filter(rec => targetId ? rec.id === targetId : rec.id === activePrintRecordId).map(rec => {
                const p = parseDescription(rec.description);
                return (
                  <div key={rec.id} className="mx-auto space-y-10 print:m-0 bg-white text-slate-950 print:bg-white print:text-black" id="print-area" style={{ maxWidth: '900px' }}>
                    <div className="bg-white text-slate-950 p-6 sm:p-20 border-4 sm:border-8 border-slate-900 print:text-black print:border-none print:p-0 min-h-[1100px] flex flex-col relative shadow-2xl">
                      <div className="flex justify-between items-end border-b-4 border-slate-900 pb-8 sm:pb-12 mb-10 sm:mb-16">
                        <div className="flex items-center gap-4 sm:gap-6">
                           <div className="w-16 h-16 sm:w-20 sm:h-20 bg-slate-900 rounded-2xl sm:rounded-3xl flex items-center justify-center text-white p-3 sm:p-4 shadow-xl select-none">
                            <Flame size={36} className="text-red-500" />
                           </div>
                           <div>
                             <h1 className="text-2xl sm:text-4xl font-black tracking-tighter uppercase leading-none italic text-black">ZIVA <span className="text-red-600">FIRE</span></h1>
                             <p className="text-[8px] sm:text-[10px] uppercase font-black tracking-[0.4em] text-slate-400 mt-2">TECHNICAL SOLUTIONS BUREAU</p>
                           </div>
                        </div>
                        <div className="text-right">
                          <p className="text-[8px] sm:text-[10px] font-black text-slate-400 mb-1 sm:mb-2 tracking-[0.2em] uppercase">MÜDAHALE RAPORU</p>
                          <p className="text-sm sm:text-xl font-black text-slate-900 uppercase tabular-nums">{new Date(rec.created_at).toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' })}</p>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 sm:gap-16 mb-10 sm:mb-16 py-6 sm:py-8 border-b border-slate-100">
                        <div className="space-y-2 sm:space-y-4">
                          <p className="text-[8px] sm:text-[9px] font-black uppercase text-red-600 tracking-[0.2em]">İŞLETME REFERANS</p>
                          <h3 className="text-xl sm:text-2xl font-black uppercase italic leading-tight underline decoration-slate-200 underline-offset-8 text-black">{(rec as any).businesses?.name}</h3>
                          <div className="flex items-center gap-2 text-xs font-black text-slate-500 uppercase tracking-widest">
                            <MapPin size={14} className="text-red-600" /> {(rec as any).businesses?.mall?.name || 'SİSTEM KAYDI'}
                          </div>
                        </div>
                        <div className="text-left sm:text-right space-y-2 sm:space-y-4">
                          <p className="text-[8px] sm:text-[9px] font-black uppercase text-red-600 tracking-[0.2em]">SERVİS KATEGORİ</p>
                          <p className="text-base sm:text-lg font-black text-slate-900 uppercase mb-2">{rec.service_type || 'PERİYODİK KONTROL'}</p>
                          <span className="text-[9px] sm:text-[10px] font-black uppercase bg-slate-900 text-white px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg">{p.status}</span>
                        </div>
                      </div>

                      <div className="flex-1 space-y-10 sm:space-y-16">
                         <div className="space-y-4 sm:space-y-6">
                            <div className="flex items-center gap-3">
                              <div className="w-2 h-6 bg-red-600" />
                              <h4 className="text-[10px] sm:text-[11px] font-black uppercase text-slate-900 tracking-[0.3em]">OPERASYONEL ÖZET</h4>
                            </div>
                            <div className="p-6 sm:p-10 bg-slate-50 border border-slate-100 text-base sm:text-lg leading-relaxed text-slate-900 font-serif italic whitespace-pre-wrap shadow-inner relative">
                               <div className="absolute top-0 left-0 p-2 opacity-[0.03] select-none text-7xl sm:text-9xl font-black leading-none">"</div>
                               "{p.text || 'DETAYLI RAPOR GİRİLMEMİŞTİR.'}"
                               <div className="absolute bottom-0 right-0 p-2 opacity-[0.03] select-none text-7xl sm:text-9xl font-black leading-none rotate-180">"</div>
                            </div>
                         </div>
                         
                         <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 sm:gap-12">
                           <div className="space-y-3 sm:space-y-4">
                              <div className="flex items-center gap-3">
                                <div className="w-1.5 h-4 bg-slate-400" />
                                <h4 className="text-[8px] sm:text-[9px] font-black text-slate-500 tracking-widest uppercase">SARF MALZEME / EKİPMAN</h4>
                              </div>
                              <div className="bg-slate-50 p-4 sm:p-6 border border-slate-100 text-xs font-bold uppercase tracking-wide leading-relaxed text-black">
                                {p.materials || 'STANDART OPERASYON KİTİ'}
                              </div>
                           </div>
                           <div className="space-y-3 sm:space-y-4">
                              <div className="flex items-center gap-3">
                                <div className="w-1.5 h-4 bg-slate-400" />
                                <h4 className="text-[8px] sm:text-[9px] font-black text-slate-500 tracking-widest uppercase">TEKNİSYEN / SORUMLU</h4>
                              </div>
                              <div className="bg-slate-50 p-4 sm:p-6 border border-slate-100 text-xs font-bold uppercase tracking-wide flex items-center gap-3 italic text-black">
                                <div className="w-8 h-8 bg-slate-900 rounded-full flex items-center justify-center text-[10px] text-white not-italic shrink-0">Z</div>
                                {p.technician || 'ZİVA TEKNİK BİRİMİ'}
                              </div>
                           </div>
                         </div>
                      </div>

                      <div className="mt-16 sm:mt-20 pt-8 sm:pt-10 border-t border-slate-100 flex justify-between items-center opacity-40">
                         <p className="text-[7px] sm:text-[8px] font-black uppercase tracking-[0.4em]">ZIVA CRM • SMART FIRE SAFETY SYSTEMS • {new Date().getFullYear()}</p>
                         <p className="text-[7px] sm:text-[8px] font-black uppercase tracking-[0.4em]">BELGE NO: {rec.id.toUpperCase()}</p>
                      </div>
                    </div>
                    {photos.length > 0 && (
                      <div className="space-y-6 sm:space-y-8 pt-6 sm:pt-10 break-inside-avoid print:pt-20 bg-white text-slate-950 print:bg-white print:text-black">
                        <div className="flex items-center justify-center gap-4">
                          <div className="h-px flex-1 bg-slate-200" />
                          <h4 className="text-[8px] sm:text-[10px] font-black uppercase text-slate-400 tracking-[0.4em] text-center">GÖRSEL EK / EKSPERTİZ DOSYALARI</h4>
                          <div className="h-px flex-1 bg-slate-200" />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                          {photos.map((ph, i) => (
                            <div key={i} className="aspect-video border-4 border-slate-900 overflow-hidden bg-white shadow-2xl relative group">
                              <img src={ph.photo_url} className="w-full h-full object-cover" />
                              <div className="absolute bottom-0 left-0 bg-slate-900 text-white text-[8px] font-black px-3 py-1.5 uppercase tracking-widest">FOTO_{i+1}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}

            {targetId && filteredRecords.length === 0 && !loading && (
              <Card className="print:hidden">
                <EmptyState
                  icon={ShieldAlert}
                  title="Kayıt bulunamadı"
                  description={`Bu kayda erişilemiyor veya kayıt silinmiş olabilir. (ID: ${targetId})`}
                  action={<Button variant="secondary" icon={ArrowLeft} onClick={() => router.push(archiveHref)}>Arşive dön</Button>}
                />
              </Card>
            )}
          </div>
        )}
      </div>

      {/* Edit record */}
      <Sheet
        isOpen={showEditRecord}
        onClose={() => { setShowEditRecord(false); setEditingRecord(null); }}
        title="Kaydı düzenle"
        description={(editingRecord as any)?.businesses?.name}
        size="lg"
      >
        <form onSubmit={handleUpdateRecord} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Hizmet türü">
              <Input value={editRecordForm.service_type} onChange={e => setEditRecordForm({...editRecordForm, service_type: e.target.value})} />
            </Field>
            <Field label="Teknisyen">
              <Input value={editRecordForm.technician} onChange={e => setEditRecordForm({...editRecordForm, technician: e.target.value})} />
            </Field>
          </div>

          <Field label="Detaylı rapor">
            <Textarea value={editRecordForm.text} onChange={e => setEditRecordForm({...editRecordForm, text: e.target.value})} rows={4} className="resize-none leading-relaxed" />
          </Field>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Malzemeler">
              <Input value={editRecordForm.materials} onChange={e => setEditRecordForm({...editRecordForm, materials: e.target.value})} />
            </Field>
            <Field label="Maliyet">
              <Input value={editRecordForm.cost} onChange={e => setEditRecordForm({...editRecordForm, cost: e.target.value})} />
            </Field>
          </div>

          <div>
            <span className="p-label">Durum</span>
            <div className="grid grid-cols-3 gap-2">
              {['Tamamlandı', 'Devam Ediyor', 'İptal / Ertelendi'].map(s => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setEditRecordForm({...editRecordForm, status: s})}
                  aria-pressed={editRecordForm.status === s}
                  className={cn(
                    'min-h-10 px-2 py-2 rounded-[10px] border text-xs sm:text-sm font-medium transition-colors',
                    editRecordForm.status === s
                      ? 'bg-primary/10 border-primary/40 text-primary'
                      : 'bg-card border-border text-muted-foreground hover:bg-surface hover:text-foreground'
                  )}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <Field label="Fotoğraf ekle">
            <label className="flex flex-col items-center gap-2 p-6 rounded-xl border border-dashed border-border-strong bg-surface/40 cursor-pointer hover:border-primary/40 hover:bg-primary/5 transition-colors text-muted-foreground hover:text-primary">
              <Upload size={22} />
              <span className="text-sm font-medium">{recordPhotos.length > 0 ? `${recordPhotos.length} dosya hazır` : 'Fotoğraf seçin'}</span>
              <input type="file" multiple accept="image/*" className="hidden" onChange={e => setRecordPhotos(Array.from(e.target.files || []))} />
            </label>
          </Field>

          {existingPhotos.length > 0 && (
            <div className="pt-4 border-t border-border">
              <p className="mb-2 text-xs text-muted-foreground">Mevcut fotoğraflar</p>
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                {existingPhotos.map(ph => (
                  <div key={ph.id} className="relative aspect-square rounded-xl border border-border overflow-hidden bg-muted">
                    <img src={ph.photo_url} alt="" className="w-full h-full object-cover" />
                    <IconButton
                      icon={Trash2}
                      label="Fotoğrafı sil"
                      variant="danger"
                      size="sm"
                      className="absolute top-1 right-1 bg-card/90"
                      onClick={() => handleDeletePhoto(ph.id, ph.photo_url)}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => { setShowEditRecord(false); setEditingRecord(null); }}>Vazgeç</Button>
            <Button type="submit" icon={CheckCircle2} loading={saving}>Değişiklikleri kaydet</Button>
          </div>
        </form>
      </Sheet>

      {/* Record detail (phones) */}
      {viewingRecordMobile && (
        <Sheet
          isOpen={!!viewingRecordMobile}
          onClose={() => setViewingRecordMobile(null)}
          title={(viewingRecordMobile as any).businesses?.name || 'Servis detayı'}
          description={
            <span className="inline-flex items-center gap-1.5">
              <MapPin size={13} className="shrink-0" />
              {(viewingRecordMobile as any).businesses?.mall?.name || 'AVM belirtilmemiş'}
              <span aria-hidden>·</span>
              <span className="tabular-nums">{new Date(viewingRecordMobile.created_at).toLocaleDateString('tr-TR')}</span>
            </span>
          }
          size="lg"
          footer={
            <div className="w-full flex flex-wrap gap-2 sm:justify-end">
              {role === 'admin' && (
                <>
                  <Button
                    variant="danger"
                    icon={Trash2}
                    className="flex-1 sm:flex-none"
                    onClick={(e) => {
                      setViewingRecordMobile(null);
                      handleDeleteRecord(viewingRecordMobile.id, e);
                    }}
                  >
                    Sil
                  </Button>
                  <Button
                    variant="secondary"
                    icon={Edit3}
                    className="flex-1 sm:flex-none"
                    onClick={() => {
                      setViewingRecordMobile(null);
                      handleEditClick(viewingRecordMobile);
                    }}
                  >
                    Düzenle
                  </Button>
                </>
              )}
              <Button icon={Printer} className="w-full sm:w-auto" onClick={() => handleMobilePrint(viewingRecordMobile)}>PDF rapor al</Button>
            </div>
          }
        >
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-1.5">
              <Badge tone="primary">{viewingRecordMobile.service_type || 'Servis'}</Badge>
              <Badge tone={statusTone(parseDescription(viewingRecordMobile.description).status)}>
                {parseDescription(viewingRecordMobile.description).status}
              </Badge>
            </div>

            <div>
              <p className="p-label flex items-center gap-1.5"><FileText size={14} /> Yapılan müdahale</p>
              <div className="rounded-xl border border-border bg-surface/50 p-3.5 text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                {parseDescription(viewingRecordMobile.description).text || 'Detaylı açıklama bulunmuyor.'}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="rounded-xl border border-border bg-surface/50 p-3">
                <p className="text-xs text-muted-foreground">Teknisyen</p>
                <p className="mt-0.5 text-sm font-medium text-foreground truncate">{parseDescription(viewingRecordMobile.description).technician || 'Ziva teknik birimi'}</p>
              </div>
              <div className="rounded-xl border border-border bg-surface/50 p-3">
                <p className="text-xs text-muted-foreground">Malzemeler</p>
                <p className="mt-0.5 text-sm font-medium text-foreground truncate">{parseDescription(viewingRecordMobile.description).materials || 'Standart ekipman'}</p>
              </div>
              {role === 'admin' && parseDescription(viewingRecordMobile.description).cost && (
                <div className="rounded-xl border border-border bg-surface/50 p-3 sm:col-span-2">
                  <p className="text-xs text-muted-foreground">Operasyon maliyeti</p>
                  <p className="mt-0.5 text-sm font-medium text-foreground tabular-nums">{parseDescription(viewingRecordMobile.description).cost}</p>
                </div>
              )}
            </div>

            <div>
              <p className="p-label flex items-center gap-1.5"><ImageIcon size={14} /> Fotoğraflar</p>
              {mobilePhotos.length === 0 ? (
                <p className="py-5 text-center text-sm text-muted-foreground border border-dashed border-border rounded-xl">Fotoğraf bulunmuyor.</p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {mobilePhotos.map((ph, idx) => (
                    <a
                      key={idx}
                      href={ph.photo_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="relative block aspect-video rounded-xl border border-border overflow-hidden bg-muted"
                    >
                      <img src={ph.photo_url} alt={`Fotoğraf ${idx + 1}`} className="w-full h-full object-cover" />
                      <span className="absolute bottom-1 left-1"><Badge tone="neutral" className="bg-card/90">Fotoğraf {idx + 1}</Badge></span>
                    </a>
                  ))}
                </div>
              )}
            </div>
          </div>
        </Sheet>
      )}

      <style jsx global>{`
        @media print {
          html, body, .min-h-screen, main, #print-area, .max-w-\[1400px\], .mx-auto, .animate-fade-in { 
            background: white !important; 
            background-color: white !important;
            color: black !important;
            margin: 0 !important; 
            padding: 0 !important;
            display: block !important;
            -webkit-print-color-adjust: exact;
            color-adjust: exact;
            border: none !important;
          }
          .print\:hidden, aside, nav, button, header, .fixed { 
            display: none !important; 
          }
          main { 
            margin: 0 !important; 
            padding: 0 !important; 
            width: 100vw !important; 
            background: white !important;
            background-color: white !important;
            border: none !important;
            box-shadow: none !important;
          }
          .p-20 { padding: 1.5cm !important; }
          .min-h-\[1100px\] { min-height: auto !important; }
          #print-area { 
            display: block !important; 
            visibility: visible !important;
            margin: 0 !important;
            width: 100% !important;
            background: white !important;
            background-color: white !important;
          }
          .break-inside-avoid { break-inside: avoid; page-break-inside: avoid; }
          .shadow-2xl { box-shadow: none !important; }
          .glass-strong, .glass { background: white !important; border: 1px solid #eee !important; box-shadow: none !important; }
        }
      `}</style>
    </PanelLayout>
  );
}
