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
  Printer, FileText, Download, ArrowLeft
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

  const fetchData = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from('maintenance_records')
      .select('*, businesses(name, category)')
      .order('created_at', { ascending: false });
    
    const { data } = await query;
    setRecords(data || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filteredRecords = records.filter(r => {
    if (targetId) return r.id === targetId;

    const parsed = parseDescription(r.description);
    return parsed.text.toLowerCase().includes(search.toLowerCase()) ||
           (r as any).businesses?.name?.toLowerCase().includes(search.toLowerCase()) ||
           r.service_type?.toLowerCase().includes(search.toLowerCase());
  });

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen flex">
      <Sidebar role="admin" />
      <main className="flex-1 lg:ml-72 transition-all duration-500 bg-[hsl(var(--background))]">
        <Topbar title={targetId ? "Rapor Görüntüleme" : "Operasyon Arşivi"} subtitle={targetId ? "Seçili servis fişi detayları" : "Tüm servis kayıtları ve iş emirleri"} />

        <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1200px] mx-auto print:p-0">
          
          {targetId && (
            <Link href="/admin/history" className="inline-flex items-center gap-2 text-sm font-bold text-primary hover:underline print:hidden mb-2">
               <ArrowLeft size={16} /> Tüm Arşive Dön
            </Link>
          )}

          {/* Header & Stats Banner */}
          <div className="glass rounded-xl p-6 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 border-l-4 border-l-primary print:hidden">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight mb-2">
                {targetId ? 'Servis Fişi Raporu' : 'Hizmet Kayıt Arşivi'}
              </h1>
              <p className="text-sm text-muted-foreground max-w-lg">
                {targetId 
                 ? "Bu servis işleminin detaylı raporunu PDF olarak kaydedebilir veya çıktı alabilirsiniz."
                 : "Ziva Yangın sistemindeki tüm geçmiş müdahaleleri, parça değişimlerini ve saha raporlarını buradan inceleyebilir ve çıktı alabilirsiniz."}
              </p>
            </div>
            
            <button 
              onClick={handlePrint}
              className="px-6 py-2.5 rounded-lg bg-primary text-white hover:shadow-lg hover:shadow-primary/20 transition-all text-sm font-bold flex items-center gap-2"
            >
              <Printer size={16} /> PDF / Yazdır
            </button>
          </div>

          {!targetId && (
            <div className="glass rounded-xl p-2 print:hidden">
              <div className="relative w-full">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input 
                  type="text" value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="İşlem detayı, dükkan veya teknisyen ara..."
                  className="w-full bg-transparent border-none focus:ring-0 pl-11 py-3 text-sm outline-none"
                />
              </div>
            </div>
          )}

          {/* Ticket List View */}
          <div className="min-h-[400px]">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 gap-4">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                <p className="text-xs font-semibold text-muted-foreground">Arşiv Yükleniyor...</p>
              </div>
            ) : filteredRecords.length === 0 ? (
              <div className="glass rounded-xl py-24 flex flex-col items-center justify-center text-center px-6">
                <div className="w-16 h-16 rounded-full bg-[hsl(var(--card))] border border-[hsl(var(--border))] flex items-center justify-center mb-4">
                  <ClipboardList className="w-8 h-8 text-muted-foreground/40" />
                </div>
                <h3 className="text-lg font-semibold">Kayıt Bulunamadı</h3>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 animate-fade-in print:block">
                {filteredRecords.map((rec, i) => {
                  const parsed = parseDescription(rec.description);
                  return (
                    <div key={rec.id} className="glass rounded-xl border border-[hsl(var(--border))] p-5 sm:p-6 shadow-sm flex flex-col justify-between group print:border-black print:mb-8 print:shadow-none print:break-inside-avoid print:bg-white print:text-black">
                      
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 pb-5 border-b border-[hsl(var(--border))] print:border-black">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 shrink-0 rounded-lg bg-[hsl(var(--muted))] border border-[hsl(var(--border))] flex items-center justify-center print:border-black">
                            <Wrench size={18} className="text-muted-foreground print:text-black" />
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-muted-foreground print:text-black">Hizmet No: <span className="text-foreground print:text-black font-bold">TKT-{rec.id.substring(0, 6).toUpperCase()}</span></p>
                            <h2 className="text-sm font-bold mt-0.5 print:text-black">
                              {rec.service_type || 'Genel Bakım'}
                            </h2>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                            <span className={cn("text-[10px] font-bold px-2.5 py-1 rounded-md border print:border-black print:text-black", getStatusColor(parsed.status))}>
                                {parsed.status}
                            </span>
                            <span className="text-xs font-medium print:text-black">{new Date(rec.created_at).toLocaleDateString('tr-TR')}</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="md:col-span-2 space-y-4">
                            <div className="flex items-start justify-between gap-4">
                                <div>
                                    <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1 print:text-black">Müşteri / İşletme</p>
                                    <p className="text-sm font-bold flex items-center gap-1.5 print:text-black">
                                        <Building2 size={14} className="text-muted-foreground print:text-black" />
                                        {(rec as any).businesses?.name || 'Bilinmeyen'}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1 print:text-black">Teknisyen / Görevli</p>
                                    <p className="text-sm font-semibold flex items-center gap-1.5 print:text-black">
                                        <UserCircle size={14} className="text-muted-foreground print:text-black" />
                                        {parsed.technician || 'Belirtilmedi'}
                                    </p>
                                </div>
                            </div>
                            <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] p-4 rounded-lg print:border-black print:bg-white text-foreground print:text-black">
                                <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5 print:text-black">Yapılan İşlem Detayı</p>
                                <p className="text-sm leading-relaxed">
                                    {parsed.text || 'Açıklama belirtilmemiş.'}
                                </p>
                            </div>
                        </div>
                        <div className="space-y-4 border-l border-[hsl(var(--border))] pl-6 print:border-black">
                            <div>
                                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1 print:text-black">Kullanılan Malzeme</p>
                                <p className="text-sm font-medium print:text-black">{parsed.materials || 'Değişim Yapılmadı'}</p>
                            </div>
                            <div>
                                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1 print:text-black">İşlem Maliyeti</p>
                                <p className="text-sm font-bold text-primary print:text-black">{parsed.cost || '—'}</p>
                            </div>
                        </div>
                      </div>

                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Printer CSS */}
      <style jsx global>{`
        @media print {
          body { background: white !important; color: black !important; }
          .lg\\:ml-72 { margin-left: 0 !important; }
          aside, header, nav, .print\\:hidden { display: none !important; }
          .glass { background: white !important; border: 1px solid black !important; color: black !important; box-shadow: none !important; border-radius: 0 !important; }
          .text-muted-foreground { color: black !important; }
          .text-primary { color: black !important; }
          * { overflow: visible !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          @page { margin: 2cm; }
        }
      `}</style>
    </div>
  );
}

export default function AdminHistoryPage() {
  return (
    <RouteGuard requiredRole="admin">
      <Suspense fallback={<div className="p-20 text-center">Yükleniyor...</div>}>
        <AdminHistoryContent />
      </Suspense>
    </RouteGuard>
  );
}
