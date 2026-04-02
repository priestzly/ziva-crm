'use client';

import React, { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { Sidebar, Topbar, PageHeader, StatCard } from '@/components/DashboardShell';
import RouteGuard from '@/components/RouteGuard';
import { useAuth } from '@/context/AuthContext';
import { supabase, type Business, type MaintenanceRecord, type Mall } from '@/lib/supabase';
import { 
  Building2, Search, ChevronRight, ChevronLeft,
  Loader2, MapPin, Store, History, CheckCircle2,
  Clock, AlertCircle, Wrench, RefreshCw, ShieldAlert
} from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';

const PAGE_SIZE = 12;

const parseDesc = (desc: string) => {
  try { return JSON.parse(desc); } catch { return { text: desc, status: 'Tamamlandı', technician: '' }; }
};

function ClientContent() {
  const { profile } = useAuth();
  const [mall, setMall] = useState<Mall | null>(null);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [records, setRecords] = useState<MaintenanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'none'>('all');

  const initialLoadDone = useRef(false);
  const subscriptionRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  /**
   * ENHANCED FAILSAFE FETCH PATTERN
   */
  const fetchData = useCallback(async (isRefresh = false) => {
    if (!profile?.mall_id) { 
      setLoading(false); 
      return; 
    }
    
    if (!initialLoadDone.current) setLoading(true);
    if (isRefresh) {
      setIsRefreshing(true);
      setFetchError(null);
    }
    
    try {
      console.log('Fetching client dashboard data for mall:', profile.mall_id);
      
      const [mallRes, bizRes, recsRes] = await Promise.all([
        supabase.from('malls').select('*').eq('id', profile.mall_id).single(),
        supabase.from('businesses').select('*').eq('mall_id', profile.mall_id).order('name'),
        supabase.from('maintenance_records').select('*, businesses!inner(name, mall_id)')
          .eq('businesses.mall_id', profile.mall_id)
          .order('created_at', { ascending: false })
          .limit(200),
      ]);
      
      if (recsRes.error) throw recsRes.error;
      
      setMall(mallRes.data);
      setBusinesses(bizRes.data || []);
      setRecords(recsRes.data || []);
      initialLoadDone.current = true;
    } catch (error: any) {
      console.error('Error fetching data:', error);
      setFetchError(`Veri bağlantı hatası: ${error.message || 'Bilinmeyen hata'}`);
    } finally {
      setLoading(false);
      if (isRefresh) setIsRefreshing(false);
    }
  }, [profile?.mall_id]);

  const setupSubscription = useCallback(() => {
    if (!profile?.mall_id) return;
    
    if (subscriptionRef.current) {
      supabase.removeChannel(subscriptionRef.current);
      subscriptionRef.current = null;
    }
    
    const sub = supabase.channel('client-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'maintenance_records' }, () => fetchData(true))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'businesses' }, () => fetchData(true))
      .subscribe((status: string) => {
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.warn('Dashboard subscription error, retrying...');
          setTimeout(() => setupSubscription(), 3000);
        }
      });
    
    subscriptionRef.current = sub;
    return sub;
  }, [profile?.mall_id, fetchData]);

  useEffect(() => { 
    if (profile?.mall_id) {
      fetchData();
      setupSubscription();
    }
  }, [fetchData, setupSubscription, profile?.mall_id]);

  const visibilityTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!profile?.mall_id) return;
    
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
  }, [profile?.mall_id, fetchData, setupSubscription]);

  const getRecordCount = (bizId: string) => records.filter(r => r.business_id === bizId).length;
  const getLastRecord = (bizId: string) => records.find(r => r.business_id === bizId);
  const getLastService = (bizId: string) => {
    const rec = getLastRecord(bizId);
    return rec ? new Date(rec.created_at).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' }) : null;
  };

  const filtered = useMemo(() => {
    let list = businesses.filter(b => b.name.toLowerCase().includes(search.toLowerCase()));
    if (filterStatus === 'active') list = list.filter(b => getRecordCount(b.id) > 0);
    if (filterStatus === 'none') list = list.filter(b => getRecordCount(b.id) === 0);
    return list;
  }, [businesses, search, filterStatus, records]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  useEffect(() => setPage(1), [search, filterStatus]);

  const thisMonth = records.filter(r => new Date(r.created_at).getMonth() === new Date().getMonth()).length;
  const completedAll = records.filter(r => parseDesc(r.description).status === 'Tamamlandı').length;

  return (
    <div className="min-h-screen flex">
      <Sidebar role="client" />
      <main className="flex-1 lg:ml-72 transition-all duration-300 w-full overflow-x-hidden">
        <Topbar 
          title={mall?.name || (loading ? 'Yükleniyor...' : 'Panel')} 
          subtitle={isRefreshing ? 'Veriler Yenileniyor...' : 'Servis Takip Merkezi'} 
        />

        <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
          {/* Error Banner */}
          {fetchError && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 flex items-center justify-between gap-4 animate-fade-in shadow-lg shadow-red-500/5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center text-red-500">
                  <ShieldAlert size={20} />
                </div>
                <div>
                  <p className="text-sm font-bold text-red-400">Bağlantı Kesildi</p>
                  <p className="text-xs text-red-400/70">{fetchError}</p>
                </div>
              </div>
              <button 
                onClick={() => fetchData(true)}
                className="px-4 py-2 bg-red-500 text-white rounded-xl text-xs font-bold hover:bg-red-600 transition-colors shadow-lg shadow-red-500/20"
              >
                Tekrar Dene
              </button>
            </div>
          )}

          {/* ── HERO SECTION ── */}
          <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-red-600 via-red-500 to-orange-500 shadow-2xl text-white">
            <div className="absolute inset-0 opacity-10" style={{backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 1px)', backgroundSize: '24px 24px'}} />
            
            <div className="relative p-8">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8">
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-white/20 backdrop-blur-md rounded-2xl">
                      <Building2 size={24} />
                    </div>
                    <div>
                      <h1 className="text-2xl sm:text-3xl font-black tracking-tight uppercase">
                        {mall?.name || 'Müşteri Paneli'}
                      </h1>
                      {mall?.address && (
                        <p className="text-white/80 text-xs font-bold flex items-center gap-1.5 uppercase tracking-wider">
                          <MapPin size={12} /> {mall.address}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4 sm:gap-6 flex-wrap bg-black/10 backdrop-blur-md p-6 rounded-3xl border border-white/10">
                  {[
                    { val: businesses.length, label: 'İşletme' },
                    { val: records.length, label: 'İş Emri' },
                    { val: thisMonth, label: 'Bu Ay' },
                    { val: completedAll, label: 'Tamamlanan' },
                  ].map((s, i) => (
                    <React.Fragment key={i}>
                      {i > 0 && <div className="w-px h-8 bg-white/10 hidden sm:block" />}
                      <div className="text-center px-2 min-w-[70px]">
                        <p className="text-2xl font-black tabular-nums">{loading && !initialLoadDone.current ? '—' : s.val}</p>
                        <p className="text-[9px] font-black uppercase text-white/50 tracking-widest mt-1">{s.label}</p>
                      </div>
                    </React.Fragment>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <PageHeader 
              title="İşletme Rehberi"
              description="AVM dökümantasyonu ve aktif servis biletleri."
            />
            <div className="flex items-center gap-3">
              <button 
                onClick={() => fetchData(true)}
                className="p-3 rounded-2xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06] transition-colors text-muted-foreground group"
                title="Yenile"
              >
                <RefreshCw size={18} className={cn("transition-transform duration-500", isRefreshing && "animate-spin")} />
              </button>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text" 
                value={search} 
                onChange={e => setSearch(e.target.value)}
                placeholder={`${businesses.length} birim içinde ara...`}
                className="input-premium pl-11 h-12"
              />
            </div>
            <div className="flex gap-2 shrink-0 bg-white/[0.03] p-1 rounded-2xl border border-white/[0.06]">
              {(['all', 'active', 'none'] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setFilterStatus(f)}
                  className={cn(
                    'px-5 py-2 rounded-xl text-[10px] uppercase font-black tracking-widest transition-all whitespace-nowrap h-10',
                    filterStatus === f
                      ? 'bg-red-500 text-white shadow-lg shadow-red-500/20'
                      : 'text-muted-foreground hover:text-white'
                  )}
                >
                  {f === 'all' ? 'Tümü' : f === 'active' ? 'Kayıtlı' : 'Kayıtsız'}
                </button>
              ))}
            </div>
          </div>

          {loading && !initialLoadDone.current ? (
            <div className="flex flex-col items-center justify-center py-24 gap-4">
              <Loader2 className="w-10 h-10 animate-spin text-primary" />
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Sistem Yükleniyor</p>
            </div>
          ) : paginated.length === 0 ? (
            <div className="glass rounded-3xl py-24 flex flex-col items-center text-center gap-4 border border-white/[0.04]">
              <div className="w-20 h-20 rounded-3xl bg-[hsl(var(--muted))] flex items-center justify-center text-muted-foreground/20">
                <Store size={32} />
              </div>
              <div>
                <p className="font-black text-lg tracking-tight uppercase">Sonuç Bulunamadı</p>
                <p className="text-xs text-muted-foreground mt-1 max-w-[200px]">Arama kriterlerinize uygun aktif bir işletme kaydı yok.</p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {paginated.map((biz, idx) => {
                const count = getRecordCount(biz.id);
                const lastRec = getLastRecord(biz.id);
                const lastDate = getLastService(biz.id);
                const p = lastRec ? parseDesc(lastRec.description) : null;

                return (
                  <Link
                    key={biz.id}
                    href={`/client/businesses/${biz.id}`}
                    className="glass group hover:bg-white/[0.03] transition-all duration-500 rounded-3xl p-6 border border-white/[0.04] relative overflow-hidden"
                    style={{ animationDelay: `${idx * 0.05}s` }}
                  >
                    <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-110 transition-transform">
                      <Store size={80} />
                    </div>
                    
                    <div className="relative space-y-4">
                      <div className="flex items-start justify-between">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-red-500/20 to-orange-500/10 border border-white/[0.06] flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                          <Store size={20} />
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-black tabular-nums group-hover:text-red-500 transition-colors leading-none">{count}</p>
                          <p className="text-[8px] font-black uppercase tracking-widest text-muted-foreground mt-1">Saha Kaydı</p>
                        </div>
                      </div>

                      <div>
                        <h3 className="font-black text-lg tracking-tight uppercase group-hover:translate-x-1 transition-transform inline-block">
                          {biz.name}
                        </h3>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-1">
                          {biz.category || 'Genel Ticari'}
                        </p>
                      </div>

                      <div className="pt-4 border-t border-white/[0.04] flex items-center justify-between">
                        <div className="flex flex-col">
                          <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/50">Son Operasyon</span>
                          <span className="text-[10px] font-bold mt-0.5 flex items-center gap-1.5">
                            <Clock size={10} className="text-primary" />
                            {lastDate || 'Kayıt Yok'}
                          </span>
                        </div>
                        <div className="w-8 h-8 rounded-full bg-white/[0.03] flex items-center justify-center group-hover:bg-primary transition-colors text-muted-foreground group-hover:text-white">
                          <ChevronRight size={16} />
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-3 pt-8 pb-4">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="w-12 h-12 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center disabled:opacity-20 disabled:cursor-not-allowed hover:bg-white/[0.06] transition-all"
              >
                <ChevronLeft size={20} />
              </button>
              
              <div className="flex items-center gap-2 bg-white/[0.03] p-1.5 rounded-2xl border border-white/[0.06]">
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter(n => n === 1 || n === totalPages || Math.abs(n - page) <= 1)
                  .reduce<(number | '...')[]>((acc, n, i, arr) => {
                    if (i > 0 && n - (arr[i - 1] as number) > 1) acc.push('...');
                    acc.push(n);
                    return acc;
                  }, [])
                  .map((n, i) => n === '...' ? (
                    <span key={`e-${i}`} className="w-9 h-9 flex items-center justify-center text-[10px] font-black text-muted-foreground/30 px-2">•••</span>
                  ) : (
                    <button
                      key={n}
                      onClick={() => setPage(n as number)}
                      className={cn(
                        'w-9 h-9 rounded-xl text-[10px] font-black transition-all',
                        page === n
                          ? 'bg-red-500 text-white shadow-lg shadow-red-500/30'
                          : 'text-muted-foreground hover:bg-white/[0.05]'
                      )}
                    >
                      {n}
                    </button>
                  ))
                }
              </div>
              
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="w-12 h-12 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center disabled:opacity-20 disabled:cursor-not-allowed hover:bg-white/[0.06] transition-all"
              >
                <ChevronRight size={20} />
              </button>
            </div>
          )}

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