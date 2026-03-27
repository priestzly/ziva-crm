'use client';

import React, { useEffect, useState, useCallback, Suspense } from 'react';
import { Sidebar, Topbar } from '@/components/DashboardShell';
import RouteGuard from '@/components/RouteGuard';
import { useAuth } from '@/context/AuthContext';
import { supabase, type MaintenanceRecord } from '@/lib/supabase';
import { 
  ClipboardList, Search, Loader2, Calendar, Store, 
  ChevronRight, Clock, Activity, MapPin, 
  LayoutList, ShieldCheck, UserCircle, Wrench, Building2,
  Printer, FileText, Download, ArrowLeft, Flame, LayoutGrid, List
} from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

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
    return { text: desc, technician: '', materials: '', status: 'Bilinmiyor', cost: '' };
  }
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'Tamamlandı': return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
    case 'Devam Ediyor': return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
    case 'İptal / Ertelendi': return 'bg-red-500/10 text-red-500 border-red-500/20';
    default: return 'bg-[hsl(var(--muted))] text-muted-foreground border-[hsl(var(--border))]';
  }
};

function AdminHistoryContent() {
  const { profile } = useAuth();
  const searchParams = useSearchParams();
  const targetId = searchParams.get('id');

  const [records, setRecords] = useState<MaintenanceRecord[]>([]);
  const [photos, setPhotos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedMall, setSelectedMall] = useState<string>('all');
  const [malls, setMalls] = useState<any[]>([]);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('table');

  const fetchData = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from('maintenance_records')
      .select(`
        *, 
        businesses:business_id(
          name, 
          category, 
          mall:mall_id(id, name)
        )
      `)
      .order('created_at', { ascending: false });
    
    const { data: recData } = await query;
    const { data: mallData } = await supabase.from('malls').select('id, name');

    setRecords(recData || []);
    setMalls(mallData || []);
    // Fetch Photos if targeting a specific record
    if (targetId) {
      const { data: photoData } = await supabase
        .from('maintenance_photos')
        .select('*')
        .eq('record_id', targetId);
      setPhotos(photoData || []);
    } else {
      setPhotos([]);
    }
    
    setLoading(false);
  }, [targetId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filteredRecords = records.filter(r => {
    if (targetId) return r.id === targetId;

    const parsed = parseDescription(r.description);
    const biz = (r as any).businesses;
    const matchesMall = selectedMall === 'all' || biz?.mall?.id === selectedMall || biz?.mall_id === selectedMall;

    return matchesMall && (
      parsed.text.toLowerCase().includes(search.toLowerCase()) ||
      biz?.name?.toLowerCase().includes(search.toLowerCase()) ||
      r.service_type?.toLowerCase().includes(search.toLowerCase())
    );
  });

  const handlePrint = () => {
    window.print();
  };

  const exportToCSV = () => {
    const headers = ["No", "Tarih", "İşletme", "AVM", "Hizmet Türü", "Açıklama", "Teknisyen", "Malzemeler", "Durum", "Maliyet"];
    const rows = filteredRecords.map(r => {
      const p = parseDescription(r.description);
      const biz = (r as any).businesses;
      return [
        `TKT-${r.id.substring(0,6).toUpperCase()}`,
        new Date(r.created_at).toLocaleDateString('tr-TR'),
        biz?.name || '',
        biz?.mall?.name || '',
        r.service_type || 'BAKIM',
        p.text.replace(/,/g, "."), // Prevent CSV column breakage
        p.technician,
        p.materials.replace(/,/g, "."),
        p.status,
        p.cost
      ];
    });

    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Ziva_Rapor_Arsivi_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen flex bg-[hsl(var(--background))]">
      <Sidebar role="admin" />
      <main className="flex-1 lg:ml-72 transition-all duration-500 w-full overflow-x-hidden pb-20 sm:pb-8">
        <div className="print:hidden">
            <Topbar title={targetId ? "Servis Raporu" : "Raporlama Merkezi"} subtitle="Sistem kayıtları ve profesyonel arşiv" />
        </div>

        <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1400px] mx-auto print:p-0 print:m-0 print:max-w-none">
          
          {/* Controls - Optimized for Mobile */}
          {!targetId && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4 print:hidden animate-fade-in px-1">
                <div className="sm:col-span-2 lg:col-span-2 relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input 
                        type="text" value={search} onChange={e => setSearch(e.target.value)}
                        placeholder="İşlem, dükkan veya teknisyen ara..."
                        className="w-full input-premium pl-11 py-2.5 sm:py-3 text-sm"
                    />
                </div>
                <select 
                    value={selectedMall} 
                    onChange={e => setSelectedMall(e.target.value)}
                    className="input-premium text-sm h-[42px] sm:h-auto"
                >
                    <option value="all">Tüm AVM'ler</option>
                    {malls.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>

                <div className="flex bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl p-1 gap-1 shrink-0 h-[42px] sm:h-auto">
                    <button 
                      onClick={() => setViewMode('grid')}
                      className={cn("flex-1 flex items-center justify-center rounded-lg transition-all", viewMode === 'grid' ? "bg-primary text-white shadow-sm" : "text-muted-foreground hover:bg-[hsl(var(--muted))]")}
                      title="Izgara Görünümü"
                    >
                      <LayoutGrid size={16} />
                    </button>
                    <button 
                      onClick={() => setViewMode('table')}
                      className={cn("flex-1 flex items-center justify-center rounded-lg transition-all", viewMode === 'table' ? "bg-primary text-white shadow-sm" : "text-muted-foreground hover:bg-[hsl(var(--muted))]")}
                      title="Tablo Görünümü"
                    >
                      <List size={16} />
                    </button>
                </div>

                <div className="flex gap-2 h-[42px] sm:h-auto">
                  <button 
                      onClick={exportToCSV}
                      className="flex-1 glass border-[hsl(var(--border))] rounded-xl flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-tight hover:bg-emerald-500/10 hover:text-emerald-500 transition-all active:scale-95"
                  >
                      <Download size={14} /> CSV
                  </button>
                  <button 
                      onClick={handlePrint}
                      className="flex-[2] btn-primary rounded-xl flex items-center justify-center gap-2 text-xs font-black uppercase tracking-tight shadow-lg shadow-primary/20 active:scale-95"
                  >
                      <Printer size={16} /> PDF
                  </button>
                </div>
            </div>
          )}

          {targetId && (
            <div className="flex items-center justify-between print:hidden mb-4">
                <Link href="/admin/history" className="inline-flex items-center gap-2 text-sm font-bold text-primary hover:underline">
                    <ArrowLeft size={16} /> Rapor Listesine Dön
                </Link>
                <button 
                    onClick={handlePrint}
                    className="btn-primary px-6 py-2.5 rounded-xl flex items-center gap-2 shadow-lg shadow-primary/20"
                >
                    <Download size={18} /> Raporu PDF Kaydet
                </button>
            </div>
          )}

          {/* Quick Stats Summary - Responsive Grid */}
          {!targetId && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 print:hidden animate-fade-in delay-75">
                <div className="glass p-3 sm:p-4 rounded-xl border-l-4 border-l-primary shadow-sm">
                    <p className="text-[9px] sm:text-[10px] font-black text-muted-foreground uppercase opacity-60 mb-0.5 sm:mb-1">Toplam Kayıt</p>
                    <p className="text-lg sm:text-xl font-black tabular-nums">{filteredRecords.length}</p>
                </div>
                <div className="glass p-3 sm:p-4 rounded-xl border-l-4 border-l-emerald-500 shadow-sm">
                    <p className="text-[9px] sm:text-[10px] font-black text-muted-foreground uppercase opacity-60 mb-0.5 sm:mb-1">Tamamlanan</p>
                    <p className="text-lg sm:text-xl font-black text-emerald-500 tabular-nums">
                        {filteredRecords.filter(r => parseDescription(r.description).status === 'Tamamlandı').length}
                    </p>
                </div>
                <div className="glass p-3 sm:p-4 rounded-xl border-l-4 border-l-blue-500 shadow-sm">
                    <p className="text-[9px] sm:text-[10px] font-black text-muted-foreground uppercase opacity-60 mb-0.5 sm:mb-1">Devam Eden</p>
                    <p className="text-lg sm:text-xl font-black text-blue-500 tabular-nums">
                        {filteredRecords.filter(r => parseDescription(r.description).status === 'Devam Ediyor').length}
                    </p>
                </div>
                <div className="glass p-3 sm:p-4 rounded-xl border-l-4 border-l-amber-500 shadow-sm">
                    <p className="text-[9px] sm:text-[10px] font-black text-muted-foreground uppercase opacity-60 mb-0.5 sm:mb-1">Maliyet</p>
                    <p className="text-lg sm:text-xl font-black text-amber-500 tabular-nums">
                        {filteredRecords.reduce((acc, curr) => {
                            const costMatch = parseDescription(curr.description).cost.match(/\d+/);
                            return acc + (costMatch ? parseInt(costMatch[0]) : 0);
                        }, 0).toLocaleString()} <span className="text-[10px]">TL</span>
                    </p>
                </div>
            </div>
          )}

          {/* Record Rendering */}
          <div className="space-y-10">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 gap-4 text-[hsl(var(--foreground))]">
                <Loader2 className="w-10 h-10 animate-spin text-primary" />
                <p className="text-sm font-black">Sistem Arşivi Taranıyor...</p>
              </div>
            ) : filteredRecords.length === 0 ? (
              <div className="glass rounded-3xl py-32 flex flex-col items-center justify-center text-center">
                <ClipboardList className="w-12 h-12 text-muted-foreground/20 mb-4" />
                <h3 className="text-xl font-bold">Kayıt Bulunamadı</h3>
                <p className="text-sm text-muted-foreground mt-1">Seçilen kriterlere uygun operasyon kaydı yok.</p>
              </div>
            ) : (
              <div className={cn(
                !targetId && viewMode === 'grid' ? "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6" : "space-y-10",
                "animate-fade-in print:block"
              )}>
                
                {/* A. TABLE VIEW */}
                {!targetId && viewMode === 'table' && (
                  <div className="glass rounded-2xl overflow-hidden border border-[hsl(var(--border))] print:border-slate-300 print:shadow-none bg-[hsl(var(--card))]">
                    <div className="hidden print:block p-8 bg-slate-50 border-b border-slate-200">
                      <div className="flex justify-between items-center">
                        <h1 className="text-xl font-black tracking-tighter text-slate-900 uppercase italic">ZIVA FIRE <span className="text-primary tracking-normal">GÜVENLİK SİSTEMLERİ</span></h1>
                        <div className="text-right text-[10px] font-black text-slate-400">TARİH: {new Date().toLocaleDateString('tr-TR')}</div>
                      </div>
                    </div>
                    {/* Card-row list — sıfır yatay kaydırma */}
                    <div className="divide-y divide-[hsl(var(--border))]">
                      {/* Header */}
                      <div className="hidden sm:grid grid-cols-[80px_1fr_120px_100px_70px] gap-4 px-5 py-3 bg-[hsl(var(--muted))] text-[9px] font-black uppercase tracking-widest text-muted-foreground">
                        <span>No / Tarih</span>
                        <span>İşletme & Açıklama</span>
                        <span>Tür</span>
                        <span>Durum</span>
                        <span className="text-right">Rapor</span>
                      </div>
                      {filteredRecords.map((rec) => {
                        const p = parseDescription(rec.description);
                        return (
                          <div key={rec.id} className="grid grid-cols-1 sm:grid-cols-[80px_1fr_120px_100px_70px] gap-2 sm:gap-4 px-5 py-4 hover:bg-primary/5 transition-colors group items-center">
                            <div>
                              <p className="text-[10px] font-black text-primary/60 group-hover:text-primary transition-colors font-mono">#{rec.id.substring(0,6).toUpperCase()}</p>
                              <p className="text-[9px] text-muted-foreground mt-0.5">{new Date(rec.created_at).toLocaleDateString('tr-TR')}</p>
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-black uppercase tracking-tight truncate">{(rec as any).businesses?.name || '—'}</p>
                              <p className="text-[10px] text-muted-foreground italic line-clamp-1 mt-0.5">{p.text || '—'}</p>
                            </div>
                            <div>
                              <span className="inline-block text-[9px] font-black uppercase bg-primary/8 text-primary px-2 py-0.5 rounded-md">{rec.service_type || 'BAKIM'}</span>
                            </div>
                            <div>
                              <span className={cn('inline-block text-[9px] font-black border uppercase px-2 py-0.5 rounded-md', getStatusColor(p.status))}>
                                {p.status === 'Tamamlandı' ? '✓' : p.status === 'Devam Ediyor' ? '◑' : '✕'} {p.status}
                              </span>
                            </div>
                            <div className="text-right">
                              <Link href={`/admin/history?id=${rec.id}`} className="inline-flex items-center gap-1 text-[10px] font-black text-primary hover:underline">
                                Aç <ChevronRight size={11} />
                              </Link>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* B. GRID & SINGLE VIEW */}
                {(targetId || (!targetId && viewMode === 'grid')) && filteredRecords.map((rec) => {
                  const parsed = parseDescription(rec.description);
                  const bizName = (rec as any).businesses?.name || 'Bilinmeyen İşletme';
                  const mallName = (rec as any).businesses?.mall?.name || '—';
                  
                  return (
                    <React.Fragment key={rec.id}>
                      {/* Grid Card View */}
                      {!targetId && viewMode === 'grid' && (
                        <div className="glass rounded-2xl border border-[hsl(var(--border))] p-5 shadow-sm hover:shadow-md transition-all group flex flex-col justify-between print:hidden bg-[hsl(var(--card))]">
                            <div className="flex items-start justify-between mb-4">
                               <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                                  <Wrench size={18} />
                               </div>
                               <div className={cn("px-2 py-0.5 rounded-md text-[10px] font-black border uppercase", getStatusColor(parsed.status))}>
                                 {parsed.status}
                               </div>
                            </div>

                            <div className="space-y-1 mb-4">
                               <h3 className="text-sm font-black text-[hsl(var(--foreground))] uppercase tracking-tight line-clamp-1">{bizName}</h3>
                               <p className="text-[11px] text-muted-foreground flex items-center gap-1 font-bold italic">
                                  <MapPin size={12} className="text-primary/40" /> {mallName}
                               </p>
                            </div>

                            <div className="bg-[hsl(var(--muted))] p-3 rounded-xl mb-4 border border-[hsl(var(--border))]">
                               <p className="text-[11px] font-black text-primary uppercase tracking-tight mb-1">{rec.service_type || 'Genel Bakım'}</p>
                               <p className="text-xs text-[hsl(var(--foreground))] opacity-80 line-clamp-2 leading-relaxed">
                                  {parsed.text || 'Açıklama belirtilmemiş.'}
                                </p>
                            </div>

                            <div className="flex items-center justify-between pt-4 border-t border-[hsl(var(--border))]">
                               <div className="text-[10px] font-black text-muted-foreground flex items-center gap-1">
                                  <Calendar size={12} /> {new Date(rec.created_at).toLocaleDateString('tr-TR')}
                               </div>
                               <Link 
                                 href={`/admin/history?id=${rec.id}`}
                                 className="text-[10px] font-black uppercase text-primary hover:tracking-widest transition-all flex items-center gap-1"
                               >
                                 Tam Rapor <ChevronRight size={12} />
                               </Link>
                            </div>
                        </div>
                      )}

                      {/* ═══ PREMIUM REPORT DOCUMENT ═══ */}
                      <div
                        className={cn(
                          'bg-white text-slate-900 relative mx-auto print:m-0 print:shadow-none',
                          !targetId ? 'hidden print:block mb-20' : 'block'
                        )}
                        style={{ maxWidth: '780px', minHeight: targetId ? '1050px' : 'auto', fontFamily: 'system-ui, sans-serif' }}
                      >
                        {/* Accent top bar */}
                        <div className="h-2 w-full flex">
                          <div className="flex-1 bg-primary" />
                          <div className="w-1/4 bg-slate-900" />
                        </div>

                        {/* Header */}
                        <div className="px-10 pt-8 pb-6 flex justify-between items-start border-b border-slate-100">
                          <div className="space-y-3">
                            <div className="flex items-center gap-3">
                              <div className="w-11 h-11 rounded-xl bg-primary flex items-center justify-center text-white shadow-md shadow-primary/30">
                                <Flame size={22} fill="currentColor" />
                              </div>
                              <div className="leading-tight">
                                <h1 className="text-xl font-black tracking-tighter text-slate-900 uppercase">ZIVA <span className="text-primary">YANGIN</span></h1>
                                <p className="text-[9px] uppercase font-bold tracking-[0.25em] text-slate-400">Teknik Servis & Yangın Güvenliği</p>
                              </div>
                            </div>
                            <p className="text-[9px] font-bold text-slate-400">Ümraniye / İstanbul &nbsp;·&nbsp; +90 (216) 123 45 67 &nbsp;·&nbsp; www.zivayangin.com</p>
                          </div>
                          <div className="text-right space-y-1">
                            <div className="inline-block text-[8px] font-black uppercase tracking-widest border border-primary/30 text-primary px-3 py-1 rounded-full mb-1">SERVİS RAPORU</div>
                            <p className="text-[22px] font-black text-slate-200 tracking-tighter">#TKT-{rec.id.substring(0,6).toUpperCase()}</p>
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{new Date(rec.created_at).toLocaleDateString('tr-TR', {day: 'numeric', month: 'long', year: 'numeric'})}</p>
                          </div>
                        </div>

                        {/* Info grid */}
                        <div className="px-10 py-6 grid grid-cols-3 gap-6 border-b border-slate-100 bg-slate-50/50">
                          <div className="col-span-2">
                            <p className="text-[8px] font-black uppercase tracking-[0.3em] text-primary mb-1">Müşteri / Lokasyon</p>
                            <p className="text-base font-black text-slate-900 uppercase tracking-tight">{bizName}</p>
                            <p className="text-[10px] font-medium text-slate-400 mt-0.5">{mallName}</p>
                          </div>
                          <div className="text-right space-y-2">
                            <div>
                              <p className="text-[8px] font-black uppercase tracking-[0.25em] text-slate-400">Hizmet Türü</p>
                              <p className="text-xs font-black text-slate-800 uppercase mt-0.5">{rec.service_type || 'Genel Bakım'}</p>
                            </div>
                            <div>
                              <p className="text-[8px] font-black uppercase tracking-[0.25em] text-slate-400">Durum</p>
                              <p className="text-xs font-black text-emerald-600 uppercase mt-0.5">{parsed.status}</p>
                            </div>
                          </div>
                        </div>

                        {/* Body */}
                        <div className="px-10 py-8 space-y-8">

                          {/* Photos */}
                          {photos.length > 0 && (
                            <div>
                              <div className="flex items-center gap-3 mb-4">
                                <div className="h-px flex-1 bg-slate-100" />
                                <p className="text-[8px] font-black uppercase tracking-[0.25em] text-slate-400">Servis Kanıt Fotoğrafları</p>
                                <div className="h-px flex-1 bg-slate-100" />
                              </div>
                              <div className="grid grid-cols-3 gap-3">
                                {photos.map((ph: any, idx: number) => (
                                  <div key={idx} className="aspect-[4/3] rounded-lg overflow-hidden border border-slate-100">
                                    <img src={ph.photo_url} alt="Servis kanıtı" className="w-full h-full object-cover" />
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Description */}
                          <div>
                            <div className="flex items-center gap-3 mb-4">
                              <div className="h-px flex-1 bg-slate-100" />
                              <p className="text-[8px] font-black uppercase tracking-[0.25em] text-slate-400">Müdahale Detayı</p>
                              <div className="h-px flex-1 bg-slate-100" />
                            </div>
                            <div className="bg-slate-50 border border-slate-100 rounded-xl p-6 min-h-[100px]">
                              <p className="text-sm text-slate-700 leading-relaxed">
                                {parsed.text || 'Bu servis kaydı için detaylı açıklama girilmemiştir.'}
                              </p>
                            </div>
                          </div>

                          {/* Materials & Cost */}
                          <div>
                            <div className="flex items-center gap-3 mb-4">
                              <div className="h-px flex-1 bg-slate-100" />
                              <p className="text-[8px] font-black uppercase tracking-[0.25em] text-slate-400">Malzeme & Maliyet</p>
                              <div className="h-px flex-1 bg-slate-100" />
                            </div>
                            <div className="border border-slate-100 rounded-xl overflow-hidden">
                              <div className="grid grid-cols-[1fr_auto] text-[9px] font-black uppercase tracking-widest bg-slate-900 text-white">
                                <div className="px-5 py-3 border-r border-slate-700">Kullanılan Malzeme / Yapılan İşlem</div>
                                <div className="px-5 py-3 text-right w-32">Tutar (TL)</div>
                              </div>
                              <div className="grid grid-cols-[1fr_auto] border-t border-slate-100 bg-white text-xs font-medium">
                                <div className="px-5 py-4 border-r border-slate-100 text-slate-700">{parsed.materials || 'Standart Periyodik Bakım'}</div>
                                <div className="px-5 py-4 text-right font-black text-slate-900 w-32">{parsed.cost || 'Sözleşme Kapsamı'}</div>
                              </div>
                            </div>
                          </div>

                          {/* Technician */}
                          {parsed.technician && (
                            <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl border border-slate-100">
                              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                              </div>
                              <div>
                                <p className="text-[8px] font-black uppercase tracking-widest text-slate-400">Görevli Teknisyen</p>
                                <p className="text-xs font-black text-slate-800">{parsed.technician}</p>
                              </div>
                            </div>
                          )}

                          {/* Signatures */}
                          <div className="pt-10 grid grid-cols-2 gap-16">
                            {['Ziva Teknik Yetkili', 'Müşteri / Mağaza Yetkilisi'].map(label => (
                              <div key={label} className="space-y-8">
                                <div className="h-16 border-b-2 border-dashed border-slate-200" />
                                <div className="text-center">
                                  <p className="text-[8px] font-black uppercase tracking-[0.25em] text-slate-500">{label}</p>
                                  <p className="text-[8px] text-slate-300 mt-1">Ad Soyad / İmza / Tarih</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Footer */}
                        <div className="mx-10 mb-8 pt-4 border-t border-slate-100 flex justify-between items-center">
                          <p className="text-[7px] font-black uppercase tracking-widest text-slate-300">ZIVA CRM · Doğrulanmış Servis Belgesi</p>
                          <p className="text-[7px] font-black uppercase tracking-widest text-slate-300">{rec.id.substring(0,24).toUpperCase()}</p>
                        </div>
                      </div>
                    </React.Fragment>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </main>

      <style jsx global>{`
        @media print {
          html, body { background: white !important; color: #0f172a !important; margin: 0 !important; }
          main { margin-left: 0 !important; padding: 0 !important; }
          .lg\\:ml-72 { margin-left: 0 !important; }
          .print\\:hidden, aside, header, nav, button, select { display: none !important; }
          .shadow-2xl, .shadow-md, .shadow-lg { box-shadow: none !important; }
          @page { size: A4; margin: 1cm; }
        }
      `}</style>
    </div>
  );
}

export default function AdminHistoryPage() {
  return (
    <RouteGuard requiredRole="admin">
      <Suspense fallback={<div className="p-20 text-center"><Loader2 className="animate-spin inline mr-2 text-primary" /> Hazırlanıyor...</div>}>
        <AdminHistoryContent />
      </Suspense>
    </RouteGuard>
  );
}
