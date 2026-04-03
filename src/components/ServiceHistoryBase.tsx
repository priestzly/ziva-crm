'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Sidebar, Topbar } from '@/components/DashboardShell';
import { supabase, type MaintenanceRecord } from '@/lib/supabase';
import { 
  Search, Loader2, Calendar, ChevronRight, MapPin, 
  Printer, ArrowLeft, Flame, LayoutGrid, List, Trash2, Edit3, Upload, X, Clock, Store,
  RefreshCw, ShieldAlert, CheckCircle2, Download, TrendingUp, Package, UserCheck
} from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

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
}

export default function ServiceHistoryBase({ role, businessId, targetId }: ServiceHistoryBaseProps) {
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
  const [includePhotos, setIncludePhotos] = useState(true);

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
      console.log('Fetching history data, role:', role, 'businessId:', businessId, 'targetId:', targetId);
      
      let query = supabase.from('maintenance_records').select('*, businesses:business_id(name, mall_id, mall:mall_id(name))').order('created_at', { ascending: false });
      if (businessId) query = query.eq('business_id', businessId);
      
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
        const { data: singleRec, error: singleError } = await supabase
          .from('maintenance_records')
          .select('*, businesses:business_id(name, mall_id, mall:mall_id(name))')
          .eq('id', targetId)
          .single();
          
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
  }, [role, businessId, targetId]);

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

  return (
    <div className="min-h-screen flex bg-[hsl(var(--background))] print:bg-white print:text-black">
      <Sidebar role={role} />
      <main className="flex-1 lg:ml-72 w-full overflow-x-hidden pb-20 sm:pb-8 transition-all duration-500">
        <div className="print:hidden">
          <Topbar 
            title={role === 'admin' ? "Operasyon Arşivi" : "Hizmet Dökümü"} 
            subtitle={isRefreshing ? 'Yenileniyor...' : (role === 'admin' ? "Tüm zamanların servis kayıtları" : "Sistemdeki dijital karneniz")} 
          />
        </div>

        <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1400px] mx-auto print:p-0">
          {/* Error Banner */}
          {fetchError && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 flex items-center justify-between gap-4 animate-fade-in shadow-lg shadow-red-500/5 print:hidden">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center text-red-500">
                  <ShieldAlert size={20} />
                </div>
                <div>
                  <p className="text-sm font-bold text-red-400 font-black uppercase tracking-tight">Veri Arşivi Modu</p>
                  <p className="text-xs text-red-400/70">{fetchError}</p>
                </div>
              </div>
              <button 
                onClick={() => fetchData(true)}
                className="px-4 py-2 bg-red-500 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-red-600 transition-colors shadow-lg shadow-red-500/20 active:scale-95"
              >
                Tekrar Dene
              </button>
            </div>
          )}

          {!targetId && (
            <div className="space-y-6">
              <div className="flex flex-col xl:flex-row items-center gap-4 print:hidden">
                  <div className="flex-1 relative w-full">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Tarih, işletme veya servis türü ara..." className="w-full h-12 input-premium pl-11 pr-4 text-sm" />
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto">
                    {role === 'admin' && (
                      <>
                        <select 
                          value={selectedMall} 
                          onChange={e => { setSelectedMall(e.target.value); setSelectedBusiness('all'); }} 
                          className="h-12 bg-white/[0.03] border border-white/[0.06] rounded-2xl px-4 text-[10px] font-black uppercase tracking-widest focus:ring-0 outline-none cursor-pointer flex-1 sm:flex-none min-w-[140px]"
                        >
                          <option value="all">Tüm Konumlar</option>
                          {malls.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                        </select>

                        <select 
                          value={selectedBusiness} 
                          onChange={e => setSelectedBusiness(e.target.value)} 
                          className="h-12 bg-white/[0.03] border border-white/[0.06] rounded-2xl px-4 text-[10px] font-black uppercase tracking-widest focus:ring-0 outline-none cursor-pointer flex-1 sm:flex-none min-w-[140px]"
                        >
                          <option value="all">Tüm İşletmeler</option>
                          {allBusinesses
                            .filter(b => selectedMall === 'all' || b.mall_id === selectedMall)
                            .map(b => <option key={b.id} value={b.id}>{b.name}</option>)
                          }
                        </select>
                      </>
                    )}
                    
                    <div className="flex bg-white/[0.03] border border-white/[0.06] rounded-2xl p-1 gap-1 shrink-0 h-12">
                      <button onClick={() => setViewMode('grid')} className={cn("px-4 rounded-xl transition-all", viewMode === 'grid' ? "bg-primary text-white shadow-lg shadow-red-500/20" : "text-muted-foreground")}><LayoutGrid size={18} /></button>
                      <button onClick={() => setViewMode('table')} className={cn("px-4 rounded-xl transition-all", viewMode === 'table' ? "bg-primary text-white shadow-lg shadow-red-500/20" : "text-muted-foreground")}><List size={18} /></button>
                    </div>

                    <button 
                      onClick={handleExportCSV}
                      className="h-12 px-5 rounded-2xl bg-white/[0.03] border border-white/[0.06] hover:bg-emerald-500/10 hover:border-emerald-500/20 hover:text-emerald-500 transition-all text-muted-foreground flex items-center gap-2 group"
                      title="CSV İşle"
                    >
                      <Download size={18} className="group-hover:-translate-y-0.5 transition-transform" />
                      <span className="text-[10px] font-black uppercase tracking-widest hidden sm:inline">CSV İndir</span>
                    </button>

                    <button 
                      onClick={() => fetchData(true)}
                      className="p-3 rounded-2xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06] transition-colors text-muted-foreground h-12 w-12 flex items-center justify-center"
                      title="Yenile"
                    >
                      <RefreshCw size={20} className={cn("transition-transform duration-500", isRefreshing && "animate-spin")} />
                    </button>
                  </div>
              </div>

              {/* STATS BAR */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 print:hidden">
                <div className="glass p-5 rounded-2xl border border-white/[0.04] relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                    <Package size={40} />
                  </div>
                  <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Toplam İş</p>
                  <p className="text-2xl font-black tabular-nums">{filteredRecords.length}</p>
                </div>
                
                <div className="glass p-5 rounded-2xl border border-white/[0.04] relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity text-emerald-500">
                    <UserCheck size={40} />
                  </div>
                  <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Tamamlanan</p>
                  <p className="text-2xl font-black tabular-nums text-emerald-500">
                    {filteredRecords.filter(r => parseDescription(r.description).status === 'Tamamlandı').length}
                  </p>
                </div>

                <div className="glass p-5 rounded-2xl border border-white/[0.04] relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity text-primary">
                    <TrendingUp size={40} />
                  </div>
                  <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Tamamlanma Oranı</p>
                  <p className="text-2xl font-black tabular-nums">
                    {filteredRecords.length > 0 
                      ? `%${Math.round((filteredRecords.filter(r => parseDescription(r.description).status === 'Completed' || parseDescription(r.description).status === 'Tamamlandı').length / filteredRecords.length) * 100)}` 
                      : '-%0'
                    }
                  </p>
                </div>

                <div className="glass p-5 rounded-2xl border border-white/[0.04] relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity text-blue-500">
                    <Clock size={40} />
                  </div>
                  <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Son 30 Gün</p>
                  <p className="text-2xl font-black tabular-nums">
                    {filteredRecords.filter(r => {
                      const thirtyDaysAgo = new Date();
                      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
                      return new Date(r.created_at) > thirtyDaysAgo;
                    }).length}
                  </p>
                </div>
              </div>
            </div>
          )}

          {targetId && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-8 print:hidden">
              <Link href={role === 'admin' ? "/admin/history" : "/client/history"} className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground hover:text-primary transition-colors flex items-center gap-2 group">
                <div className="p-2.5 rounded-xl border border-white/[0.06] bg-white/[0.02] group-hover:bg-primary/10 group-hover:border-primary/20">
                  <ArrowLeft size={16} />
                </div>
                Arşive Dön
              </Link>
              <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                <label className="flex items-center gap-2 px-4 h-12 rounded-2xl bg-white/5 border border-white/10 cursor-pointer hover:bg-white/10 transition-colors select-none group">
                  <input 
                    type="checkbox" 
                    checked={includePhotos} 
                    onChange={e => setIncludePhotos(e.target.checked)}
                    className="w-4 h-4 rounded border-white/20 bg-transparent text-primary focus:ring-0 focus:ring-offset-0"
                  />
                  <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground group-hover:text-white transition-colors">Fotoğrafları Dahil Et</span>
                </label>

                {role === 'admin' && filteredRecords[0] && (
                  <button onClick={() => handleEditClick(filteredRecords[0])} className="h-12 px-6 rounded-2xl bg-blue-600 text-white font-black uppercase tracking-widest text-[10px] flex items-center gap-2 shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition-all active:scale-95">
                    <Edit3 size={16} /> Güncelle
                  </button>
                )}
                <button onClick={() => window.print()} className="h-12 px-6 rounded-2xl bg-slate-900 text-white font-black uppercase tracking-widest text-[10px] flex items-center gap-2 shadow-xl hover:bg-black transition-all active:scale-95">
                  <Printer size={16} /> PDF Rapor Al
                </button>
              </div>
            </div>
          )}
          
          {loading && !initialLoadDone.current ? (
            <div className="flex flex-col items-center justify-center py-24 gap-4">
              <Loader2 className="w-10 h-10 animate-spin text-primary" />
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground italic">Arşiv Taranıyor</p>
            </div>
          ) : (
            <div className="animate-fade-in">
              {/* TABLE VIEW */}
              {!targetId && viewMode === 'table' && (
                <div className="glass rounded-3xl overflow-hidden border border-white/[0.04] shadow-2xl print:hidden">
                   <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead className="bg-black/40 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">
                        <tr>
                          <th className="p-5">Tarih</th>
                          <th className="p-5">İşletme / Kurum</th>
                          <th className="p-5">Hizmet Türü</th>
                          <th className="p-5">Durum</th>
                          <th className="p-5 text-right">Erişim</th>
                        </tr>
                      </thead>
                      <tbody className="text-xs font-bold divide-y divide-white/[0.04]">
                        {filteredRecords.map(rec => {
                          const p = parseDescription(rec.description);
                          return (
                            <tr key={rec.id} className="hover:bg-white/[0.02] transition-colors cursor-pointer group" onClick={() => router.push(`?id=${rec.id}`)}>
                              <td className="p-5 tabular-nums text-muted-foreground group-hover:text-primary transition-colors">{new Date(rec.created_at).toLocaleDateString('tr-TR')}</td>
                              <td className="p-5 uppercase tracking-tight text-sm font-black group-hover:translate-x-1 transition-transform">{(rec as any).businesses?.name}</td>
                              <td className="p-5"><span className="bg-primary/10 text-primary px-3 py-1 rounded-lg border border-primary/20 text-[10px] font-black uppercase tracking-widest">{rec.service_type}</span></td>
                              <td className="p-5">
                                <span className={cn(
                                  "px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border",
                                  p.status === 'Tamamlandı' ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" : "bg-blue-500/10 text-blue-500 border-blue-500/20"
                                )}>
                                  {p.status}
                                </span>
                              </td>
                              <td className="p-5">
                                <div className="flex justify-end gap-3">
                                  {role === 'admin' && (
                                    <button onClick={(e) => { e.stopPropagation(); handleEditClick(rec); }} className="p-2 rounded-xl hover:bg-white/5 text-muted-foreground hover:text-white transition-colors">
                                      <Edit3 size={16} />
                                    </button>
                                  )}
                                  <div className="p-2 rounded-xl bg-white/5 opacity-40 group-hover:opacity-100 group-hover:bg-primary/20 group-hover:text-primary transition-all">
                                    <ChevronRight size={16} />
                                  </div>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                   </div>
                </div>
              )}

              {/* GRID VIEW */}
              {!targetId && viewMode === 'grid' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 print:hidden">
                   {filteredRecords.map((rec, i) => {
                     const p = parseDescription(rec.description);
                     return (
                       <div 
                         key={rec.id} 
                         className="glass group hover:bg-white/[0.03] transition-all duration-500 rounded-3xl p-8 border border-white/[0.04] shadow-xl cursor-pointer relative overflow-hidden" 
                         style={{ animationDelay: `${i * 0.04}s` }}
                         onClick={() => router.push(`?id=${rec.id}`)}
                       >
                          <div className="absolute -top-4 -right-4 opacity-[0.02] group-hover:scale-125 group-hover:rotate-12 transition-transform duration-700">
                            <Store size={100} />
                          </div>

                          <div className="flex justify-between items-start mb-6">
                             <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-red-500/20 to-orange-500/10 border border-white/[0.06] flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                              <Flame size={24} />
                             </div>
                             <div className="text-right">
                                <p className="text-[10px] font-black text-muted-foreground/30 uppercase tracking-[0.2em] mb-1">DOC_ID: #{rec.id.substring(0,6).toUpperCase()}</p>
                                <p className="text-xs font-black uppercase tracking-widest">{new Date(rec.created_at).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                             </div>
                          </div>
                          <div className="space-y-1 mb-6">
                             <h4 className="font-black uppercase text-lg tracking-tight group-hover:text-red-500 transition-colors line-clamp-1">{(rec as any).businesses?.name}</h4>
                             <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2"><MapPin size={12} className="text-primary" /> {(rec as any).businesses?.mall?.name || 'VİZYON ARŞİV'}</p>
                          </div>
                          <div className="py-4 border-y border-white/[0.04] mb-6">
                             <p className="text-xs font-medium text-foreground/70 line-clamp-2 leading-relaxed">
                               "{p.text || 'Operasyonel detay bulunmuyor.'}"
                             </p>
                          </div>
                          <div className="flex justify-between items-center">
                             <span className="text-[9px] font-black uppercase tracking-widest text-primary bg-primary/10 px-3 py-1.5 rounded-xl border border-primary/20">{rec.service_type}</span>
                             <span className={cn(
                               "text-[9px] font-black uppercase tracking-widest",
                               p.status === 'Tamamlandı' ? "text-emerald-500" : "text-blue-500"
                             )}>
                              {p.status}
                             </span>
                          </div>
                          {role === 'admin' && (
                            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2 p-2">
                               <button onClick={(e) => { e.stopPropagation(); handleEditClick(rec); }} className="p-2.5 rounded-xl bg-white/10 backdrop-blur-md border border-white/10 hover:bg-blue-600 transition-all"><Edit3 size={14} /></button>
                               <button onClick={(e) => handleDeleteRecord(rec.id, e)} className="p-2.5 rounded-xl bg-white/10 backdrop-blur-md border border-white/10 hover:bg-red-600 transition-all"><Trash2 size={14} /></button>
                            </div>
                          )}
                       </div>
                     );
                   })}
                </div>
              )}

              {/* SINGLE REPORT / PDF VIEW */}
              {targetId && filteredRecords.map(rec => {
                const p = parseDescription(rec.description);
                return (
                    <div key={rec.id} className="mx-auto space-y-8 print:m-0" id="print-area" style={{ maxWidth: '900px' }}>
                    <div className="bg-white text-slate-950 p-10 sm:p-16 border-4 border-slate-900 print:text-black print:border-none print:p-0 min-h-[1100px] flex flex-col relative shadow-2xl">
                      <div className="flex justify-between items-end border-b-2 border-slate-900 pb-8 mb-12">
                        <div className="flex items-center gap-4">
                           <div className="w-16 h-16 bg-white overflow-hidden rounded-2xl flex items-center justify-center p-1 select-none">
                            <img src="/logo.png" className="w-full h-full object-contain" alt="Logo" />
                           </div>
                           <div>
                             <h1 className="text-2xl font-black tracking-tighter uppercase leading-none italic">ZIVA <span className="text-red-600">FIRE</span></h1>
                             <p className="text-[8px] uppercase font-black tracking-[0.3em] text-slate-400 mt-1">TECHNICAL SOLUTIONS BUREAU</p>
                           </div>
                        </div>
                        <div className="text-right">
                          <p className="text-[8px] font-black text-slate-400 mb-1 tracking-[0.2em] uppercase">MÜDAHALE RAPORU</p>
                          <p className="text-base font-black text-slate-900 uppercase tabular-nums">{new Date(rec.created_at).toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' })}</p>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-10 mb-10 py-6 border-b border-slate-100">
                        <div className="space-y-2">
                          <p className="text-[8px] font-black uppercase text-red-600 tracking-[0.2em]">İŞLETME REFERANS</p>
                          <h3 className="text-lg font-black uppercase italic leading-tight">{(rec as any).businesses?.name}</h3>
                          <div className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-widest">
                            <MapPin size={12} className="text-red-600" /> {(rec as any).businesses?.mall?.name || 'SİSTEM KAYDI'}
                          </div>
                        </div>
                        <div className="text-right space-y-2">
                          <p className="text-[8px] font-black uppercase text-red-600 tracking-[0.2em]">SERVİS KATEGORİ</p>
                          <p className="text-sm font-black text-slate-900 uppercase mb-1">{rec.service_type || 'PERİYODİK KONTROL'}</p>
                          <span className="text-[8px] font-black uppercase bg-slate-900 text-white px-3 py-1 rounded">{p.status}</span>
                        </div>
                      </div>

                      <div className="flex-1 space-y-10">
                         <div className="space-y-4">
                            <div className="flex items-center gap-3">
                              <div className="w-1.5 h-5 bg-red-600" />
                              <h4 className="text-[9px] font-black uppercase text-slate-900 tracking-[0.3em]">OPERASYONEL ÖZET</h4>
                            </div>
                            <div className="py-4 text-sm leading-relaxed text-slate-900 font-serif italic whitespace-pre-wrap">
                               "{p.text || 'DETAYLI RAPOR GİRİLMEMİŞTİR.'}"
                            </div>
                         </div>
                         
                         <div className="grid grid-cols-1 gap-8">
                           <div className="space-y-2">
                              <div className="flex items-center gap-3">
                                <div className="w-1 h-3 bg-slate-400" />
                                <h4 className="text-[8px] font-black uppercase text-slate-500 tracking-widest">SARF MALZEME / EKİPMAN</h4>
                              </div>
                              <div className="text-[10px] font-bold uppercase tracking-wide leading-relaxed text-slate-700">
                                {p.materials || 'STANDART OPERASYON KİTİ'}
                              </div>
                           </div>

                         </div>
                      </div>

                      <div className="mt-20 pt-10 border-t-2 border-slate-100 flex justify-between items-center opacity-40">
                         <p className="text-[8px] font-black uppercase tracking-[0.4em]">ZIVA CRM • SMART FIRE SAFETY SYSTEMS • {new Date().getFullYear()}</p>
                         <p className="text-[8px] font-black uppercase tracking-[0.4em]">BELGE NO: {rec.id.toUpperCase()}</p>
                      </div>
                    </div>
                    {includePhotos && photos.length > 0 && (
                      <div className="space-y-8 pt-10 break-before-page print:pt-20">
                        <div className="flex items-center justify-center gap-4">
                          <div className="h-px flex-1 bg-slate-200" />
                          <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-[0.4em]">GÖRSEL EK / EKSPERTİZ DOSYALARI</h4>
                          <div className="h-px flex-1 bg-slate-200" />
                        </div>
                        <div className="grid grid-cols-2 gap-6">
                          {photos.map((ph, i) => (
                            <div key={i} className="aspect-video border-2 border-slate-900 overflow-hidden bg-white shadow-2xl relative group">
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
                <div className="flex flex-col items-center justify-center py-32 bg-white/[0.02] rounded-3xl border-2 border-dashed border-white/5">
                  <ShieldAlert size={48} className="text-muted-foreground mb-4 opacity-20" />
                  <p className="text-sm font-black uppercase tracking-widest text-muted-foreground">Kayıt Bulunamadı</p>
                  <p className="text-[10px] text-muted-foreground/50 mt-2 font-bold uppercase tracking-widest">ID: {targetId}</p>
                  <button onClick={() => router.push(role === 'admin' ? '/admin/history' : '/client/history')} className="mt-8 px-6 h-10 bg-white/5 hover:bg-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all">Arşive Dön</button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* EDIT MODAL */}
        {showEditRecord && (
          <div className="fixed inset-0 z-[200] bg-black/90 backdrop-blur-xl flex items-center justify-center p-4 animate-fade-in" onClick={() => setShowEditRecord(false)}>
            <div className="glass-strong rounded-3xl p-8 w-full max-w-2xl border-4 border-white/10 animate-scale-up shadow-2xl overflow-y-auto max-h-[90vh]" onClick={e => e.stopPropagation()}>
               <div className="flex justify-between items-center mb-8 border-b-2 border-white/10 pb-6">
                <h3 className="font-black uppercase tracking-tight text-xl">Arşiv Kaydı Güncelleme SEANSI</h3>
                <button onClick={() => setShowEditRecord(false)} className="p-3 rounded-2xl hover:bg-white/10 transition-all"><X size={24} /></button>
               </div>
               
               <form onSubmit={handleUpdateRecord} className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Hizmet Sınıfı</label>
                      <input value={editRecordForm.service_type} onChange={e => setEditRecordForm({...editRecordForm, service_type: e.target.value})} className="w-full h-12 input-premium px-4" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Sorumlu Teknisyen</label>
                      <input value={editRecordForm.technician} onChange={e => setEditRecordForm({...editRecordForm, technician: e.target.value})} className="w-full h-12 input-premium px-4" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Detaylı Operasyon Raporu</label>
                    <textarea value={editRecordForm.text} onChange={e => setEditRecordForm({...editRecordForm, text: e.target.value})} rows={5} className="w-full input-premium p-4 font-serif text-base leading-relaxed resize-none" />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Kullanılan Malzemeler</label>
                      <input value={editRecordForm.materials} onChange={e => setEditRecordForm({...editRecordForm, materials: e.target.value})} className="w-full h-12 input-premium px-4" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Operasyon Maliyeti</label>
                      <input value={editRecordForm.cost} onChange={e => setEditRecordForm({...editRecordForm, cost: e.target.value})} className="w-full h-12 input-premium px-4" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Durum Güncelleme</label>
                    <div className="flex gap-4">
                      {['Tamamlandı', 'Devam Ediyor', 'İptal / Ertelendi'].map(s => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => setEditRecordForm({...editRecordForm, status: s})}
                          className={cn(
                            "flex-1 h-12 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all",
                            editRecordForm.status === s ? "bg-primary text-white border-primary shadow-lg shadow-red-500/20" : "bg-white/5 border-white/10 text-muted-foreground hover:bg-white/10"
                          )}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Opsiyonel Görsel Kanıtlar</label>
                    <label className="flex flex-col items-center p-8 border-4 border-dashed border-white/10 rounded-3xl cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-all group">
                      <Upload size={32} className="mb-3 text-muted-foreground group-hover:text-primary transition-colors" />
                      <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground group-hover:text-primary">{recordPhotos.length > 0 ? `${recordPhotos.length} Dosya Hazır` : 'Dosyaları Sürükle veya Seç'}</span>
                      <input type="file" multiple accept="image/*" className="hidden" onChange={e => setRecordPhotos(Array.from(e.target.files || []))} />
                    </label>
                  </div>
                  
                  {existingPhotos.length > 0 && (
                     <div className="pt-6 border-t border-white/10">
                        <p className="mb-4 text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground/30">MEVCUT ARŞİV GÖRSELLERİ (SİLMEK İÇİN TIKLAYIN)</p>
                        <div className="flex gap-3 overflow-x-auto pb-4">
                           {existingPhotos.map(ph => (
                              <div key={ph.id} className="relative shrink-0 w-24 h-24 rounded-2xl border-2 border-white/10 group overflow-hidden bg-black shadow-xl">
                                 <img src={ph.photo_url} className="w-full h-full object-cover transition-transform group-hover:scale-110 duration-700" />
                                 <button type="button" onClick={() => handleDeletePhoto(ph.id, ph.photo_url)} className="absolute inset-0 bg-red-600/90 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-[2px]"><Trash2 size={24}/></button>
                              </div>
                           ))}
                        </div>
                     </div>
                  )}

                  <div className="flex justify-end gap-3 pt-8 border-t-2 border-white/10">
                    <button type="submit" disabled={saving} className="bg-primary text-white px-10 h-14 rounded-2xl font-black uppercase tracking-[0.2em] text-xs shadow-xl shadow-red-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-3">
                      {saving ? <Loader2 className="animate-spin" size={20} /> : <><CheckCircle2 size={20} /> Arşivi Güncelle</>}
                    </button>
                  </div>
               </form>
            </div>
          </div>
        )}
      </main>

      <style jsx global>{`
        @media print {
          html, body, .min-h-screen, main { 
            background: white !important; 
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
            background: transparent !important;
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
          }
          .break-inside-avoid { break-inside: avoid; page-break-inside: avoid; }
          .shadow-2xl { box-shadow: none !important; }
          .glass-strong, .glass { background: white !important; border: 1px solid #eee !important; box-shadow: none !important; }
        }
      `}</style>
    </div>
  );
}
