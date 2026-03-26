'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { Sidebar, Topbar } from '@/components/DashboardShell';
import RouteGuard from '@/components/RouteGuard';
import { useAuth } from '@/context/AuthContext';
import { supabase, type MaintenanceRecord } from '@/lib/supabase';
import { 
  ClipboardList, Search, Loader2, Calendar, Store, 
  ChevronRight, Clock, Activity, MapPin, 
  LayoutList, ShieldCheck, UserCircle, Wrench, Building2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';

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

const getStatusColor = (status: string) => {
  switch (status) {
    case 'Tamamlandı': return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
    case 'Devam Ediyor': return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
    case 'İptal / Ertelendi': return 'bg-red-500/10 text-red-500 border-red-500/20';
    default: return 'bg-[hsl(var(--muted))] text-muted-foreground border-[hsl(var(--border))]';
  }
};

function ClientHistoryContent() {
  const { profile } = useAuth();
  const [records, setRecords] = useState<MaintenanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchData = useCallback(async () => {
    if (!profile || !profile.mall_id) {
      setLoading(false);
      return;
    }
    setLoading(true);

    const { data: bizData } = await supabase
      .from('businesses')
      .select('id')
      .eq('mall_id', profile.mall_id);
    
    const bizIds = bizData?.map(b => b.id) || [];

    if (bizIds.length > 0) {
      const { data: recData } = await supabase
        .from('maintenance_records')
        .select('*, businesses(name, category)')
        .in('business_id', bizIds)
        .order('created_at', { ascending: false });
      
      setRecords(recData || []);
    }
    
    setLoading(false);
  }, [profile]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filteredRecords = records.filter(r => {
    const parsed = parseDescription(r.description);
    return parsed.text.toLowerCase().includes(search.toLowerCase()) ||
           (r as any).businesses?.name?.toLowerCase().includes(search.toLowerCase()) ||
           r.service_type?.toLowerCase().includes(search.toLowerCase());
  });

  return (
    <div className="min-h-screen flex">
      <Sidebar role="client" />
      <main className="flex-1 lg:ml-72 transition-all duration-500 bg-[hsl(var(--background))]">
        <Topbar title="Servis Geçmişi" subtitle="AVM genelindeki tüm servis ve iş emri kayıtları" />

        <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1200px] mx-auto">
          {/* Header & Stats Banner */}
          <div className="glass rounded-xl p-6 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 border-l-4 border-l-primary">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight mb-2">Tüm Operasyonlar</h1>
              <p className="text-sm text-muted-foreground max-w-lg">
                Gerçekleşen servis kayıtlarını, parça değişimlerini ve iş emirlerini kronolojik olarak buradan takip edebilirsiniz.
              </p>
            </div>
            
            <div className="flex flex-wrap gap-4 lg:gap-6 w-full lg:w-auto mt-2 lg:mt-0">
              <div className="flex items-center gap-3 bg-[hsl(var(--muted))] px-4 py-2.5 rounded-lg border border-[hsl(var(--border))]">
                <ShieldCheck className="text-emerald-500" size={20} />
                <div>
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Toplam Kayıt</p>
                  <p className="text-lg font-bold leading-none mt-0.5">{records.length}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 bg-[hsl(var(--muted))] px-4 py-2.5 rounded-lg border border-[hsl(var(--border))]">
                <Store className="text-blue-500" size={20} />
                <div>
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Aktif Lokasyon</p>
                  <p className="text-lg font-bold leading-none mt-0.5">{new Set(records.map(r => r.business_id)).size}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Controls */}
          <div className="glass rounded-xl p-2">
            <div className="relative w-full">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input 
                type="text" value={search} onChange={e => setSearch(e.target.value)}
                placeholder="İşlem detayı, dükkan adı veya servis türü ile ara..."
                className="w-full bg-transparent border-none focus:ring-0 pl-11 py-3 text-sm outline-none"
              />
            </div>
          </div>

          {/* Ticket List View */}
          <div className="min-h-[400px]">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 gap-4">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                <p className="text-xs font-semibold text-muted-foreground">Kayıtlar Yükleniyor...</p>
              </div>
            ) : filteredRecords.length === 0 ? (
              <div className="glass rounded-xl py-24 flex flex-col items-center justify-center text-center px-6">
                <div className="w-16 h-16 rounded-full bg-[hsl(var(--card))] border border-[hsl(var(--border))] flex items-center justify-center mb-4">
                  <ClipboardList className="w-8 h-8 text-muted-foreground/40" />
                </div>
                <h3 className="text-lg font-semibold">Kayıt Bulunamadı</h3>
                <p className="text-sm text-muted-foreground max-w-sm mt-1">Arama kriterlerinize uygun geçmiş servis kaydı bulunmuyor.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-6 animate-fade-in">
                {filteredRecords.map((rec, i) => {
                  const parsed = parseDescription(rec.description);
                  return (
                    <div key={rec.id} className="glass rounded-xl border border-[hsl(var(--border))] p-5 sm:p-6 shadow-sm flex flex-col justify-between group">
                      
                      {/* Ticket Header */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 pb-5 border-b border-[hsl(var(--border))]">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 shrink-0 rounded-lg bg-[hsl(var(--muted))] border border-[hsl(var(--border))] flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                            <Wrench size={18} className="text-muted-foreground group-hover:text-primary transition-colors" />
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-muted-foreground">Hizmet No: <span className="text-foreground">TKT-{rec.id.substring(0, 6).toUpperCase()}</span></p>
                            <p className="text-sm font-semibold flex items-center gap-1.5 mt-0.5">
                              {rec.service_type || 'Genel Bakım'}
                            </p>
                          </div>
                        </div>
                        <span className={cn("text-[10px] font-bold px-2.5 py-1 rounded-md border w-fit", getStatusColor(parsed.status))}>
                          {parsed.status}
                        </span>
                      </div>

                      {/* Ticket Body / Content */}
                      <div className="space-y-4 flex-1">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Müşteri / İşletme</p>
                            <p className="text-sm font-semibold flex items-center gap-1.5">
                              <Building2 size={14} className="text-muted-foreground" />
                              {(rec as any).businesses?.name || 'Bilinmeyen'}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Tarih</p>
                            <p className="text-sm font-medium flex items-center justify-end gap-1.5">
                              <Calendar size={14} className="text-muted-foreground" />
                              {new Date(rec.created_at).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </p>
                          </div>
                        </div>

                        <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] p-4 rounded-lg">
                          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Servis Detayı</p>
                          <p className="text-sm text-foreground/90 leading-relaxed shadow-sm">
                            {parsed.text || 'Açıklama belirtilmemiş.'}
                          </p>
                        </div>

                        {parsed.materials && (
                          <div>
                            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Değişen Parça / Kullanılan Malzeme</p>
                            <p className="text-sm text-muted-foreground">{parsed.materials}</p>
                          </div>
                        )}
                        
                        {(parsed.technician || parsed.cost) && (
                          <div className="grid grid-cols-2 gap-4 border-t border-[hsl(var(--border))] pt-4 mt-2">
                            {parsed.technician && (
                              <div>
                                <p className="text-[10px] uppercase font-semibold text-muted-foreground mb-0.5">Görevli</p>
                                <p className="text-xs flex items-center gap-1 font-medium"><UserCircle size={12} className="text-muted-foreground"/> {parsed.technician}</p>
                              </div>
                            )}
                            {parsed.cost && (
                              <div className="text-right">
                                <p className="text-[10px] uppercase font-semibold text-muted-foreground mb-0.5">Tutar</p>
                                <p className="text-xs font-semibold">{parsed.cost}</p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Action */}
                      <div className="pt-4 mt-4 text-center">
                        <Link 
                          href={`/client/businesses/${rec.business_id}`}
                          className="w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] hover:bg-[hsl(var(--muted))] transition-colors text-xs font-semibold"
                        >
                          İşletme Detayına Git <ChevronRight size={14} />
                        </Link>
                      </div>

                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

export default function ClientHistoryPage() {
  return (
    <RouteGuard requiredRole="client">
      <ClientHistoryContent />
    </RouteGuard>
  );
}
