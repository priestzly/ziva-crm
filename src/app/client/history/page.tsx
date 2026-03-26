'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { Sidebar, Topbar } from '@/components/DashboardShell';
import RouteGuard from '@/components/RouteGuard';
import { useAuth } from '@/context/AuthContext';
import { supabase, type MaintenanceRecord, type Business } from '@/lib/supabase';
import { 
  ClipboardList, Search, Loader2, Calendar, Store, 
  ExternalLink, ChevronRight, Clock, Activity, MapPin, 
  LayoutGrid, List, CheckCircle2, Zap
} from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';

function ClientHistoryContent() {
  const { profile } = useAuth();
  const [records, setRecords] = useState<MaintenanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [viewType, setViewType] = useState<'timeline' | 'table'>('timeline');

  const fetchData = useCallback(async () => {
    if (!profile || !profile.mall_id) {
      setLoading(false);
      return;
    }
    setLoading(true);

    // 1. Get all businesses in this mall
    const { data: bizData } = await supabase
      .from('businesses')
      .select('id')
      .eq('mall_id', profile.mall_id);
    
    const bizIds = bizData?.map(b => b.id) || [];

    if (bizIds.length > 0) {
      // 2. Get all records for those businesses
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

  const filteredRecords = records.filter(r => 
    r.description.toLowerCase().includes(search.toLowerCase()) ||
    (r as any).businesses?.name?.toLowerCase().includes(search.toLowerCase()) ||
    r.service_type?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen flex">
      <Sidebar role="client" />
      <main className="flex-1 lg:ml-72 transition-all duration-500">
        <Topbar title="Servis Geçmişi" subtitle="AVM genelindeki tüm bakım ve onarım kayıtları" />

        <div className="p-6 lg:p-8 space-y-6 max-w-[1200px] mx-auto">
          {/* Stats Bar */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="glass rounded-3xl p-6 border border-white/[0.04] relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-red-500/[0.05] to-transparent rounded-bl-full" />
              <p className="text-[10px] text-muted-foreground uppercase font-black tracking-[0.2em] mb-3 flex items-center gap-2">
                <Clock size={14} className="text-red-400" /> Toplam İşlem
              </p>
              <p className="text-3xl font-black text-white group-hover:scale-110 transition-transform origin-left duration-500">{records.length}</p>
            </div>
            <div className="glass rounded-3xl p-6 border border-white/[0.04] relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-emerald-500/[0.05] to-transparent rounded-bl-full" />
              <p className="text-[10px] text-muted-foreground uppercase font-black tracking-[0.2em] mb-3 flex items-center gap-2">
                <Calendar size={14} className="text-emerald-400" /> Son 30 Gün
              </p>
              <p className="text-3xl font-black text-white group-hover:scale-110 transition-transform origin-left duration-500">
                {records.filter(r => Date.now() - new Date(r.created_at).getTime() < 30 * 86400000).length}
              </p>
            </div>
            <div className="glass rounded-3xl p-6 border border-white/[0.04] relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-blue-500/[0.05] to-transparent rounded-bl-full" />
              <p className="text-[10px] text-muted-foreground uppercase font-black tracking-[0.2em] mb-3 flex items-center gap-2">
                <Activity size={14} className="text-blue-400" /> Aktif İşletme
              </p>
              <p className="text-3xl font-black text-white group-hover:scale-110 transition-transform origin-left duration-500">
                {new Set(records.map(r => r.business_id)).size}
              </p>
            </div>
          </div>

          {/* Controls */}
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-white/[0.02] p-2 rounded-2xl border border-white/[0.04]">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input 
                type="text" value={search} onChange={e => setSearch(e.target.value)}
                placeholder="İşlem veya dükkan ismi ile ara..."
                className="w-full input-premium pl-11 py-2.5 bg-transparent border-0 focus:ring-0"
              />
            </div>
            <div className="flex items-center gap-1 bg-black/20 p-1 rounded-xl">
              <button 
                onClick={() => setViewType('timeline')}
                className={cn("p-2 rounded-lg transition-all", viewType === 'timeline' ? "bg-red-500 text-white shadow-lg shadow-red-500/20" : "text-muted-foreground hover:text-white")}
              >
                <List size={18} />
              </button>
              <button 
                onClick={() => setViewType('table')}
                className={cn("p-2 rounded-lg transition-all", viewType === 'table' ? "bg-red-500 text-white shadow-lg shadow-red-500/20" : "text-muted-foreground hover:text-white")}
              >
                <LayoutGrid size={18} />
              </button>
            </div>
          </div>

          {/* Records View */}
          <div className="min-h-[400px]">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 gap-4">
                <Loader2 className="w-10 h-10 animate-spin text-red-500" />
                <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Kayıtlar Hazırlanıyor...</p>
              </div>
            ) : filteredRecords.length === 0 ? (
              <div className="glass rounded-3xl py-32 flex flex-col items-center justify-center text-center px-6 border-2 border-dashed border-white/[0.05]">
                <div className="w-20 h-20 rounded-full bg-white/[0.02] flex items-center justify-center mb-6">
                  <ClipboardList className="w-10 h-10 text-muted-foreground/20" />
                </div>
                <h3 className="text-xl font-bold">Kayıt Bulunamadı</h3>
                <p className="text-sm text-muted-foreground max-w-xs mt-2 font-medium">Bu kriterlere uygun herhangi bir servis kaydı mevcut değil.</p>
              </div>
            ) : viewType === 'timeline' ? (
              <div className="space-y-4 animate-fade-in px-4">
                {filteredRecords.map((rec, i) => (
                  <div key={rec.id} className="relative pl-8 pb-4 group">
                    {/* Vertical Line */}
                    {i < filteredRecords.length - 1 && (
                      <div className="absolute left-[11px] top-7 bottom-0 w-px bg-gradient-to-b from-red-500/30 to-transparent" />
                    )}
                    
                    {/* Circle Dot */}
                    <div className="absolute left-0 top-1.5 w-6 h-6 rounded-full glass border border-red-500/30 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                      <div className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]" />
                    </div>

                    <Link href={`/client/businesses/${rec.business_id}`} className="block">
                      <div className="glass rounded-2xl p-5 border border-white/[0.04] group-hover:border-red-500/30 group-hover:bg-white/[0.03] transition-all duration-300">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                          <div>
                            <div className="flex items-center gap-3 mb-2">
                              <span className="text-[10px] font-black uppercase tracking-[0.15em] text-red-400 px-2 py-0.5 rounded-md bg-red-500/10">
                                {rec.service_type || 'Genel Bakım'}
                              </span>
                              <span className="text-[10px] font-mono text-muted-foreground italic flex items-center gap-1">
                                <Clock size={10} /> {new Date(rec.created_at).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                            <h4 className="font-bold text-lg group-hover:text-red-400 transition-colors">{(rec as any).businesses?.name}</h4>
                            <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed italic">"{rec.description}"</p>
                          </div>
                          <div className="flex items-center gap-2 self-end md:self-center">
                            <span className="text-[10px] font-bold text-muted-foreground px-3 py-1 rounded-full border border-white/[0.1]">Detaylar</span>
                            <div className="p-2 rounded-xl bg-red-500/10 text-red-400 group-hover:translate-x-1 transition-transform">
                              <ChevronRight size={16} />
                            </div>
                          </div>
                        </div>
                      </div>
                    </Link>
                  </div>
                ))}
              </div>
            ) : (
              /* Table View */
              <div className="glass rounded-3xl overflow-hidden shadow-2xl animate-fade-in">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="text-[10px] uppercase font-black tracking-widest text-muted-foreground bg-white/[0.02]">
                        <th className="text-left px-6 py-5">Tarih</th>
                        <th className="text-left px-6 py-5">İşletme</th>
                        <th className="text-left px-6 py-5">İşlem</th>
                        <th className="text-right px-6 py-5">İncele</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.04]">
                      {filteredRecords.map((rec, i) => (
                        <tr key={rec.id} className="hover:bg-white/[0.015] transition-colors group">
                          <td className="px-6 py-4">
                            <p className="text-xs font-bold">{new Date(rec.created_at).toLocaleDateString('tr-TR')}</p>
                            <p className="text-[10px] text-muted-foreground font-mono">{new Date(rec.created_at).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</p>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center text-red-400">
                                <Store size={14} />
                              </div>
                              <span className="text-sm font-bold">{(rec as any).businesses?.name}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-white/[0.04] text-muted-foreground border border-white/[0.06]">
                              {rec.service_type || 'Bakım'}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <Link 
                              href={`/client/businesses/${rec.business_id}`}
                              className="p-2.5 rounded-xl bg-white/[0.03] hover:bg-red-500/10 text-muted-foreground hover:text-red-400 transition-all inline-flex"
                            >
                              <ExternalLink size={14} />
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
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
