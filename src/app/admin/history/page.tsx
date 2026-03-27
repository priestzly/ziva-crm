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
    setLoading(false);
  }, []);

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

  return (
    <div className="min-h-screen flex bg-[hsl(var(--background))]">
      <Sidebar role="admin" />
      <main className="flex-1 lg:ml-72 transition-all duration-500">
        <div className="print:hidden">
            <Topbar title={targetId ? "Servis Raporu" : "Raporlama Merkezi"} subtitle="Sistem kayıtları ve profesyonel arşiv" />
        </div>

        <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1400px] mx-auto print:p-0 print:m-0 print:max-w-none">
          
          {/* Controls - Hidden on Print */}
          {!targetId && (
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 print:hidden animate-fade-in">
                <div className="md:col-span-2 relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input 
                        type="text" value={search} onChange={e => setSearch(e.target.value)}
                        placeholder="İşlem, dükkan veya teknisyen ara..."
                        className="w-full input-premium pl-11 py-3"
                    />
                </div>
                <select 
                    value={selectedMall} 
                    onChange={e => setSelectedMall(e.target.value)}
                    className="input-premium"
                >
                    <option value="all">Tüm AVM'ler</option>
                    {malls.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>

                <div className="flex bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl p-1 gap-1">
                    <button 
                      onClick={() => setViewMode('grid')}
                      className={cn("flex-1 flex items-center justify-center py-2 rounded-lg transition-all", viewMode === 'grid' ? "bg-primary text-white" : "text-muted-foreground hover:bg-[hsl(var(--muted))]")}
                      title="Izgara Görünümü"
                    >
                      <LayoutGrid size={18} />
                    </button>
                    <button 
                      onClick={() => setViewMode('table')}
                      className={cn("flex-1 flex items-center justify-center py-2 rounded-lg transition-all", viewMode === 'table' ? "bg-primary text-white" : "text-muted-foreground hover:bg-[hsl(var(--muted))]")}
                      title="Tablo Görünümü"
                    >
                      <List size={18} />
                    </button>
                </div>

                <button 
                    onClick={handlePrint}
                    className="btn-primary rounded-xl flex items-center justify-center gap-2"
                >
                    <Printer size={18} /> Rapor Al / PDF
                </button>
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
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead className="bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))] font-black uppercase tracking-tighter border-b border-[hsl(var(--border))] print:bg-slate-100 print:text-slate-900">
                          <tr>
                            <th className="py-4 px-4 border-r border-[hsl(var(--border))] print:border-slate-200">No</th>
                            <th className="py-4 px-4 border-r border-[hsl(var(--border))] print:border-slate-200">Tarih</th>
                            <th className="py-4 px-4 border-r border-[hsl(var(--border))] print:border-slate-200">İşletme Bilgisi</th>
                            <th className="py-4 px-4 border-r border-[hsl(var(--border))] print:border-slate-200">Hizmet Türü</th>
                            <th className="py-4 px-4 border-r border-[hsl(var(--border))] print:border-slate-200 w-1/3">Operasyon Detayı</th>
                            <th className="py-4 px-4 border-r border-[hsl(var(--border))] print:border-slate-200 text-right">Maliyet</th>
                            <th className="py-4 px-4 text-center print:hidden">Detay</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[hsl(var(--border))] print:divide-slate-200 font-medium text-[hsl(var(--foreground))]">
                          {filteredRecords.map((rec) => {
                            const p = parseDescription(rec.description);
                            return (
                              <tr key={rec.id} className="hover:bg-primary/5 transition-colors group print:hover:bg-transparent">
                                <td className="py-3 px-4 border-r border-[hsl(var(--border))] print:border-slate-200 font-bold text-muted-foreground group-hover:text-primary transition-colors">#{rec.id.substring(0,6).toUpperCase()}</td>
                                <td className="py-3 px-4 border-r border-[hsl(var(--border))] print:border-slate-200">{new Date(rec.created_at).toLocaleDateString('tr-TR')}</td>
                                <td className="py-3 px-4 border-r border-[hsl(var(--border))] print:border-slate-200">
                                   <div className="font-black uppercase">{(rec as any).businesses?.name}</div>
                                   <div className="text-[10px] opacity-60">{(rec as any).businesses?.mall?.name}</div>
                                </td>
                                <td className="py-3 px-4 border-r border-[hsl(var(--border))] print:border-slate-200 font-black text-primary/70 uppercase">{rec.service_type || 'BAKIM'}</td>
                                <td className="py-3 px-4 border-r border-[hsl(var(--border))] print:border-slate-200 italic text-[hsl(var(--muted-foreground))] line-clamp-2 max-w-xs">{p.text}</td>
                                <td className="py-3 px-4 border-r border-[hsl(var(--border))] print:border-slate-200 text-right font-black">{p.cost || '—'}</td>
                                <td className="py-3 px-4 text-center print:hidden">
                                   <Link href={`/admin/history?id=${rec.id}`} className="text-primary font-black uppercase text-[10px] hover:underline">Aç Raporu</Link>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
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

                      {/* Professional Print Preview */}
                      <div 
                        className={cn(
                          "bg-white text-slate-900 shadow-2xl rounded-sm overflow-hidden relative mx-auto print:m-0 print:border print:border-slate-200 print:shadow-none",
                          !targetId ? "hidden print:block mb-20" : "block"
                        )}
                        style={{ maxWidth: '850px', minHeight: targetId ? '1100px' : 'auto' }}
                      >
                         {/* Resmi Belge İçeriği (Her Zaman Beyaz Olmalı Çünkü Kağıt Formatı) */}
                         <div className="p-10 border-b-2 border-slate-100 flex flex-col sm:flex-row justify-between items-start gap-8 bg-slate-50/50">
                             <div className="space-y-4">
                                <div className="flex items-center gap-3">
                                   <div className="w-12 h-12 rounded-2xl bg-primary flex items-center justify-center text-white shadow-lg">
                                      <Flame size={24} fill="currentColor" />
                                   </div>
                                   <div className="leading-tight">
                                      <h1 className="text-2xl font-black tracking-tighter text-slate-900 uppercase">ZIVA <span className="text-primary italic">FIRE</span></h1>
                                      <p className="text-[10px] uppercase font-bold tracking-[0.2em] text-slate-400">Teknik Servis & Güvenlik</p>
                                   </div>
                                </div>
                                <div className="text-[10px] text-slate-500 font-bold border-l-2 border-primary pl-3">
                                   Ümraniye / İstanbul <br />
                                   www.zivayangin.com | +90 (216) 123 45 67
                                </div>
                             </div>
                             <div className="text-right space-y-1 sm:pt-2">
                                <div className="inline-block px-3 py-1 bg-primary/10 text-primary border border-primary/20 rounded-full text-[10px] font-black uppercase mb-2">Resmi Servis Raporu</div>
                                <h2 className="text-3xl font-light text-slate-300 tracking-tighter">#TKT-{rec.id.substring(0,6).toUpperCase()}</h2>
                                <p className="text-xs font-black text-slate-500 uppercase tracking-widest">Tarih: {new Date(rec.created_at).toLocaleDateString('tr-TR')}</p>
                             </div>
                         </div>

                         <div className="px-10 py-8 grid grid-cols-2 gap-12 border-b border-slate-50">
                            <div className="space-y-4">
                               <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">Müşteri / Lokasyon</p>
                               <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight leading-tight">{bizName}</h3>
                               <p className="text-xs font-bold text-slate-400 italic">{mallName}</p>
                            </div>
                            <div className="space-y-4 text-right">
                               <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Hizmet Detayı</p>
                               <div className="grid grid-cols-1 gap-1">
                                  <p className="text-xs font-black text-slate-700 uppercase tracking-tight">{rec.service_type || 'Genel Bakım'}</p>
                                  <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-tight">{parsed.status}</p>
                               </div>
                            </div>
                         </div>

                         <div className="px-10 py-10 space-y-12">
                            <div className="space-y-4">
                               <h4 className="text-xs font-black uppercase tracking-[0.2em] text-slate-900 border-b-2 border-primary/20 pb-2">Operasyonel Müdahale Raporu</h4>
                               <div className="p-8 bg-slate-50/50 rounded-2xl border-2 border-dashed border-slate-100 min-h-[160px]">
                                 <p className="text-sm leading-relaxed text-slate-700 font-medium italic italic font-serif">
                                   &ldquo;{parsed.text || 'Bu servis kaydı için detaylı açıklama girilmemiştir.'}&rdquo;
                                 </p>
                               </div>
                            </div>

                            <div className="space-y-4">
                               <h4 className="text-xs font-black uppercase tracking-[0.2em] text-slate-900 pb-2 border-b">Yedek Parça & Sarfiyat Bedeli</h4>
                               <table className="w-full text-left text-xs border border-slate-100 rounded-xl overflow-hidden shadow-sm">
                                  <thead>
                                     <tr className="bg-slate-900 text-white font-black uppercase tracking-widest">
                                        <th className="py-4 px-6 border-r border-slate-800">Cinsi & Açıklama</th>
                                        <th className="py-4 px-6 text-right w-1/4">Tutar (TL)</th>
                                     </tr>
                                  </thead>
                                  <tbody className="font-bold">
                                     <tr className="border-b border-slate-50 text-slate-700">
                                        <td className="py-4 px-6 border-r border-slate-50 bg-slate-50/30">{parsed.materials || 'Standart Bakım Sarfiyatı'}</td>
                                        <td className="py-4 px-6 text-right bg-slate-50/10 font-black">{parsed.cost || 'Dahil'}</td>
                                     </tr>
                                  </tbody>
                               </table>
                            </div>

                            <div className="pt-24 grid grid-cols-2 gap-24">
                               <div className="text-center space-y-6">
                                  <div className="w-full h-[1px] bg-slate-200" />
                                  <p className="text-[10px] font-black uppercase text-slate-900 tracking-[0.2em]">Ziva Teknik Onayı</p>
                               </div>
                               <div className="text-center space-y-6">
                                  <div className="w-full h-[1px] bg-slate-200" />
                                  <p className="text-[10px] font-black uppercase text-slate-900 tracking-[0.2em]">Mağaza Sorumlu İmzası</p>
                               </div>
                            </div>
                         </div>

                         <div className="bg-slate-900 p-5 mt-auto flex justify-between items-center text-[8px] font-black tracking-widest text-slate-500 uppercase">
                            <span>ZIVA CRM AUTHENTICATED SYSTEM DOCUMENT</span>
                            <span>ID: {rec.id.substring(0,24).toUpperCase()}</span>
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
