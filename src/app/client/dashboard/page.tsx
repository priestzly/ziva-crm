'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { Sidebar, Topbar } from '@/components/DashboardShell';
import RouteGuard from '@/components/RouteGuard';
import { useAuth } from '@/context/AuthContext';
import { supabase, type Business, type MaintenanceRecord, type Mall } from '@/lib/supabase';
import { 
  Building2, ClipboardCheck, Search, ChevronRight, Calendar,
  Loader2, Users, MapPin, Activity, Store, History
} from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';

function ClientContent() {
  const { profile } = useAuth();
  const [mall, setMall] = useState<Mall | null>(null);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [records, setRecords] = useState<MaintenanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchData = useCallback(async () => {
    if (!profile?.mall_id) {
      setLoading(false);
      return;
    }

    setLoading(true);

    const runQuery = async () => {
      const [mallRes, bizRes, recsRes] = await Promise.all([
        supabase.from('malls').select('*').eq('id', profile.mall_id).single(),
        supabase.from('businesses').select('*').eq('mall_id', profile.mall_id).order('name'),
        supabase.from('maintenance_records').select('*, businesses!inner(name, mall_id)')
          .eq('businesses.mall_id', profile.mall_id)
          .order('created_at', { ascending: false })
          .limit(50),
      ]);
      return { mallRes, bizRes, recsRes };
    };

    let results = await runQuery();

    // Retry once if empty (race condition check)
    if (!results.bizRes.data?.length && !results.recsRes?.data?.length) {
      console.log('Client fetch empty - retrying token sync...');
      await new Promise(r => setTimeout(r, 1000));
      results = await runQuery();
    }

    setMall(results.mallRes.data);
    setBusinesses(results.bizRes.data || []);
    setRecords(results.recsRes.data || []);
    setLoading(false);
  }, [profile]);

  useEffect(() => {
    if (profile?.mall_id) {
      fetchData();
    }
  }, [fetchData, profile?.mall_id]);

  useEffect(() => {
    if (!profile?.mall_id) return;

    const sub = supabase.channel('client-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'maintenance_records' }, () => fetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'businesses' }, () => fetchData())
      .subscribe();

    return () => { supabase.removeChannel(sub); };
  }, [profile?.mall_id, fetchData]);

  const filteredBiz = businesses.filter(b => b.name.toLowerCase().includes(search.toLowerCase()));

  const getRecordCount = (bizId: string) => records.filter(r => r.business_id === bizId).length;
  
  const getLastService = (bizId: string) => {
    const rec = records.find(r => r.business_id === bizId);
    return rec ? new Date(rec.created_at).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Kayıt Yok';
  };

  const getServiceStatusText = (count: number) => {
    if (count > 5) return { text: 'Yoğun İşlem', color: 'text-blue-500 bg-blue-500/10 border-blue-500/20' };
    if (count > 0) return { text: 'Sağlıklı', color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20' };
    return { text: 'Veri Bekleniyor', color: 'text-amber-500 bg-amber-500/10 border-amber-500/20' };
  };

  const stats = [
    { label: 'Sorumlu Lokasyon Sayısı', value: businesses.length, icon: Store, border: 'border-[hsl(var(--border))] text-primary' },
    { label: 'Sistemdeki İş Emirleri', value: records.length, icon: ClipboardCheck, border: 'border-[hsl(var(--border))] text-emerald-500' },
    { label: 'Bu Ayki Operasyonlar', value: records.filter(r => new Date(r.created_at).getMonth() === new Date().getMonth()).length, icon: Activity, border: 'border-[hsl(var(--border))] text-blue-500' },
  ];

  return (
    <div className="min-h-screen flex">
      <Sidebar role="client" />
      <main className="flex-1 lg:ml-72 transition-all duration-500 bg-[hsl(var(--background))]">
        <Topbar title={mall?.name || 'Yükleniyor...'} subtitle="AVM Yönetim Ekranı" />

        <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1400px] mx-auto">
          {/* Welcome Banner */}
          <div className="glass rounded-xl p-5 sm:p-6 lg:p-8 border-l-4 border-l-primary flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight mb-1">Müşteri Portalına Hoş Geldiniz</h1>
              <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1.5 font-medium">
                <MapPin size={14} className="text-primary" /> {mall?.address || 'Konum bilgisi yok'}
              </p>
            </div>
            <Link href="/client/history" className="glass px-4 py-2 rounded-md hover:bg-[hsl(var(--muted))] transition-colors text-xs font-semibold flex items-center gap-2 border border-[hsl(var(--border))] w-full md:w-auto justify-center">
              <History size={14} /> Tüm Servis Akışını Gör
            </Link>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 lg:gap-6">
            {stats.map((stat, i) => {
              const Icon = stat.icon;
              return (
                <div key={i} className="glass rounded-xl p-5 animate-fade-in flex flex-col" style={{ animationDelay: `${i * 0.05}s` }}>
                  <div className="flex items-center gap-3 mb-4">
                    <div className={cn("p-2 rounded-md bg-[hsl(var(--card))] border", stat.border)}>
                      <Icon size={16} />
                    </div>
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-widest leading-tight">{stat.label}</span>
                  </div>
                  <p className="text-3xl font-semibold tracking-tight">{loading ? '—' : stat.value}</p>
                </div>
              );
            })}
          </div>

          {/* Main Content Area */}
          <div className="glass rounded-xl overflow-hidden border border-[hsl(var(--border))] flex flex-col h-full shadow-sm">
            {/* Header & Search */}
            <div className="p-4 sm:p-5 border-b border-[hsl(var(--border))] bg-[hsl(var(--card))] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-semibold">Tesis Noktaları</h3>
                <p className="text-[11px] text-muted-foreground mt-0.5">Kompleks içerisindeki tüm işletmelerin anlık durumu.</p>
              </div>
              <div className="relative w-full sm:w-72 mt-2 sm:mt-0">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input 
                  type="text" value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="İşletme adı ara..." 
                  className="input-premium text-sm pl-10 py-2.5 w-full bg-[hsl(var(--background))]"
                />
              </div>
            </div>

            {/* List View Details */}
            <div className="p-4 bg-[hsl(var(--background))]">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-20 gap-3">
                  <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                  <p className="text-xs text-muted-foreground font-semibold">İşletmeler Yükleniyor...</p>
                </div>
              ) : filteredBiz.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 gap-3 text-center px-4">
                  <Building2 className="w-10 h-10 text-muted-foreground/30" />
                  <p className="text-sm font-semibold">İşletme eşleşmedi.</p>
                  <p className="text-xs text-muted-foreground">Arama kriterinize uygun dükkan/işletme bulunamadı.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse font-medium">
                    <thead className="bg-slate-50 dark:bg-slate-900 text-slate-400 font-black uppercase tracking-tighter border-b border-[hsl(var(--border))]">
                      <tr>
                        <th className="py-4 px-4 border-r border-[hsl(var(--border))]">Birim / Mağaza</th>
                        <th className="py-4 px-4 border-r border-[hsl(var(--border))]">Kategori</th>
                        <th className="py-4 px-4 border-r border-[hsl(var(--border))]">Son İşlem</th>
                        <th className="py-4 px-4 border-r border-[hsl(var(--border))]">Kayıt Sayısı</th>
                        <th className="py-4 px-4 border-r border-[hsl(var(--border))]">Durum</th>
                        <th className="py-4 px-4 text-center">İşlem</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[hsl(var(--border))]">
                      {filteredBiz.map((biz) => {
                        const count = getRecordCount(biz.id);
                        const statusConfig = getServiceStatusText(count);
                        return (
                          <tr key={biz.id} className="hover:bg-primary/5 transition-colors group">
                            <td className="py-3 px-4 border-r border-[hsl(var(--border))] font-black uppercase tracking-tight group-hover:text-primary">{biz.name}</td>
                            <td className="py-3 px-4 border-r border-[hsl(var(--border))] text-slate-500">{biz.category || 'GENEL'}</td>
                            <td className="py-3 px-4 border-r border-[hsl(var(--border))]">{getLastService(biz.id)}</td>
                            <td className="py-3 px-4 border-r border-[hsl(var(--border))]">{count > 0 ? `${count} İşlem` : 'Kayıt Yok'}</td>
                            <td className="py-3 px-4 border-r border-[hsl(var(--border))]">
                               <span className={cn("px-2 py-0.5 rounded text-[9px] font-black border uppercase tracking-wider", statusConfig.color)}>{statusConfig.text}</span>
                            </td>
                            <td className="py-3 px-4 text-center">
                               <Link href={`/client/businesses/${biz.id}`} className="inline-flex items-center gap-1 text-primary font-black uppercase text-[10px] hover:underline">Servis Kartı <ChevronRight size={14} /></Link>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function ClientDashboard() {
  return (
    <RouteGuard requiredRole="client">
      <ClientContent />
    </RouteGuard>
  );
}
