'use client';

import React, { useEffect, useState } from 'react';
import { Sidebar, Topbar } from '@/components/DashboardShell';
import RouteGuard from '@/components/RouteGuard';
import { useAuth } from '@/context/AuthContext';
import { supabase, type Business, type MaintenanceRecord, type Mall } from '@/lib/supabase';
import { 
  Building2, ClipboardCheck, Search, ChevronRight, Calendar,
  ImageIcon, Loader2, Users, MapPin, Zap, TrendingUp
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

  const fetchData = async () => {
    if (!profile?.mall_id) {
      setLoading(false);
      return;
    }

    setLoading(true);

    const [mallRes, bizRes, recsRes] = await Promise.all([
      supabase.from('malls').select('*').eq('id', profile.mall_id).single(),
      supabase.from('businesses').select('*').eq('mall_id', profile.mall_id).order('name'),
      supabase.from('maintenance_records').select('*, businesses!inner(name, mall_id)')
        .eq('businesses.mall_id', profile.mall_id)
        .order('created_at', { ascending: false })
        .limit(50),
    ]);

    setMall(mallRes.data);
    setBusinesses(bizRes.data || []);
    setRecords(recsRes.data || []);
    setLoading(false);
  };

  useEffect(() => {
    if (profile) fetchData();
  }, [profile]);

  useEffect(() => {
    if (!profile?.mall_id) return;

    const sub = supabase.channel('client-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'maintenance_records' }, () => fetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'businesses' }, () => fetchData())
      .subscribe();

    return () => { supabase.removeChannel(sub); };
  }, [profile?.mall_id]);

  const filteredBiz = businesses.filter(b => b.name.toLowerCase().includes(search.toLowerCase()));

  const getRecordCount = (bizId: string) => records.filter(r => r.business_id === bizId).length;
  const getLastService = (bizId: string) => {
    const rec = records.find(r => r.business_id === bizId);
    return rec ? new Date(rec.created_at).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
  };

  const stats = [
    { label: 'İşletme Sayısı', value: businesses.length, icon: Users, color: 'from-red-500/20 to-red-600/5 text-red-400', border: 'border-red-500/10' },
    { label: 'Toplam Bakım', value: records.length, icon: ClipboardCheck, color: 'from-emerald-500/20 to-emerald-600/5 text-emerald-400', border: 'border-emerald-500/10' },
    { label: 'Bu Ay', value: records.filter(r => new Date(r.created_at).getMonth() === new Date().getMonth()).length, icon: Calendar, color: 'from-blue-500/20 to-blue-600/5 text-blue-400', border: 'border-blue-500/10' },
  ];

  return (
    <div className="min-h-screen flex">
      <Sidebar role="client" />
      <main className="flex-1 lg:ml-72 transition-all duration-500">
        <Topbar title={mall?.name || 'Yükleniyor...'} subtitle="Bakım ve onarım durumlarını takip edin" />

        <div className="p-6 lg:p-8 space-y-8 max-w-[1400px] mx-auto">
          {/* Welcome */}
          <div className="glass rounded-2xl p-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-bl from-red-500/[0.08] to-transparent rounded-bl-full pointer-events-none" />
            <div className="relative z-10">
              <h1 className="text-xl font-bold tracking-tight">Hoş Geldiniz</h1>
              <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1.5">
                <MapPin size={13} /> {mall?.address || 'Konum bilgisi yok'}
              </p>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {stats.map((stat, i) => {
              const Icon = stat.icon;
              return (
                <div key={i} className="card-hover glass rounded-2xl p-5 animate-fade-in" style={{ animationDelay: `${i * 0.05}s` }}>
                  <div className="flex items-center gap-4">
                    <div className={cn("p-2.5 rounded-xl bg-gradient-to-br border", stat.color, stat.border)}>
                      <Icon size={18} />
                    </div>
                    <div>
                      <p className="text-2xl font-bold tracking-tight">{loading ? '—' : stat.value}</p>
                      <p className="text-xs text-muted-foreground font-medium">{stat.label}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Business Table */}
          <div className="glass rounded-2xl overflow-hidden">
            <div className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.04]">
              <h3 className="text-base font-bold">Dükkan Bazlı Bakım Durumu</h3>
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <input 
                  type="text" value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="İşletme Ara..." 
                  className="input-premium text-sm pl-10 py-2 w-full sm:w-72"
                />
              </div>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : filteredBiz.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3">
                <Building2 className="w-10 h-10 text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground">İşletme bulunamadı</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold border-b border-white/[0.04]">
                      <th className="text-left px-5 py-3">İşletme</th>
                      <th className="text-left px-5 py-3">Kategori</th>
                      <th className="text-left px-5 py-3">Son Bakım</th>
                      <th className="text-left px-5 py-3">Kayıt</th>
                      <th className="text-right px-5 py-3">Eylem</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.04]">
                    {filteredBiz.map((biz, i) => {
                      const count = getRecordCount(biz.id);
                      return (
                        <tr key={biz.id} className="hover:bg-white/[0.02] transition-colors group animate-fade-in" style={{ animationDelay: `${i * 0.03}s` }}>
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-red-500/10 to-orange-500/5 border border-red-500/10 flex items-center justify-center text-red-400 shrink-0">
                                <Building2 size={14} />
                              </div>
                              <span className="font-semibold text-sm">{biz.name}</span>
                            </div>
                          </td>
                          <td className="px-5 py-4 text-xs text-muted-foreground">{biz.category || '—'}</td>
                          <td className="px-5 py-4 text-xs text-muted-foreground">{getLastService(biz.id)}</td>
                          <td className="px-5 py-4">
                            <span className={cn(
                              "text-xs font-bold px-2 py-0.5 rounded-full",
                              count > 0 ? "bg-emerald-500/10 text-emerald-400" : "bg-orange-500/10 text-orange-400"
                            )}>
                              {count} rapor
                            </span>
                          </td>
                          <td className="px-5 py-4 text-right">
                            <Link 
                              href={`/client/businesses/${biz.id}`}
                              className="inline-flex items-center gap-1.5 text-xs font-bold text-red-400 hover:text-red-300 transition-colors group-hover:translate-x-0.5"
                            >
                              Detay <ChevronRight size={14} />
                            </Link>
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
