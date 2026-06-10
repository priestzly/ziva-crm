'use client';

import React, { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { Sidebar, Topbar } from '@/components/DashboardShell';
import RouteGuard from '@/components/RouteGuard';
import { useAuth } from '@/context/AuthContext';
import { supabase, type Business, type MaintenanceRecord, type Mall } from '@/lib/supabase';
import { 
  Building2, Search, ChevronRight, ChevronLeft,
  Loader2, MapPin, Store, Clock, RefreshCw, ShieldAlert,
  ArrowUpRight, CheckCircle2, AlertCircle, Timer, Sparkles
} from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { useIsMobile } from '@/hooks/useIsMobile';

const PAGE_SIZE = 12;

const parseDesc = (desc: string) => {
  try { return JSON.parse(desc); } catch { return { text: desc, status: 'Tamamlandı', technician: '' }; }
};

function ClientContent() {
  const { profile } = useAuth();
  const isMobile = useIsMobile();
  const [mall, setMall] = useState<Mall | null>(null);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [records, setRecords] = useState<MaintenanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'none'>('all');
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);

  const initialLoadDone = useRef(false);
  const subscriptionRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

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
    if (!rec) return null;
    const date = new Date(rec.created_at);
    return date.toLocaleDateString('tr-TR', { day: '2-digit', month: 'short', year: 'numeric' });
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
  const pendingCount = records.filter(r => parseDesc(r.description).status !== 'Tamamlandı').length;

  return (
    <div className={cn("min-h-screen flex", isMobile ? "bg-black text-white" : "bg-[#0a0a0f]")}>
      <Sidebar role="client" />
      
      {isMobile ? (
        <main className="flex-1 pb-28 w-full overflow-x-hidden relative bg-black pb-safe">
          <Topbar 
            title={mall?.name || (loading ? 'Yükleniyor...' : 'Panel')} 
            subtitle="Müşteri Portalı"
          />

          {/* Error Banner */}
          {fetchError && (
            <div className="m-4 bg-red-500/10 border border-red-500/20 rounded-2xl p-4 flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center text-red-500">
                  <ShieldAlert size={20} />
                </div>
                <div>
                  <p className="text-xs font-bold text-red-400">Bağlantı Kesildi</p>
                  <p className="text-[10px] text-red-400/70 mt-0.5">{fetchError}</p>
                </div>
              </div>
              <button 
                onClick={() => fetchData(true)}
                className="w-full py-2.5 bg-red-500 text-white rounded-xl text-xs font-bold active:scale-95 transition-all"
              >
                Tekrar Dene
              </button>
            </div>
          )}

          {/* Mobile Stats Panel */}
          <div className="p-4 grid grid-cols-2 gap-2.5">
            {[
              { val: businesses.length, label: 'İşletme', icon: Store, color: 'text-red-400 bg-red-500/10 border-red-500/10' },
              { val: records.length, label: 'İş Emri', icon: CheckCircle2, color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/10' },
              { val: thisMonth, label: 'Bu Ay', icon: Timer, color: 'text-blue-400 bg-blue-500/10 border-blue-500/10' },
              { val: pendingCount, label: 'Bekleyen', icon: AlertCircle, color: 'text-amber-400 bg-amber-500/10 border-amber-500/10' },
            ].map((s, i) => (
              <div key={i} className="bg-card border border-border rounded-xl p-3 flex items-center gap-3">
                <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center border", s.color)}>
                  <s.icon size={16} />
                </div>
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider leading-none mb-1">{s.label}</p>
                  <p className="text-lg font-black text-foreground leading-none tabular-nums">{loading && !initialLoadDone.current ? '—' : s.val}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Section Header */}
          <div className="px-4 pt-3 flex items-center justify-between">
            <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/50">İşletme Rehberi ({filtered.length})</h2>
            <button 
              onClick={() => fetchData(true)}
              className="p-2 rounded-xl bg-secondary border border-border text-muted-foreground active:scale-90 transition-all"
            >
              <RefreshCw size={14} className={isRefreshing ? "animate-spin" : ""} />
            </button>
          </div>

          {/* Filters Row */}
          <div className="px-4 pt-2.5 flex items-center justify-between gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
              <input
                type="text" 
                value={search} 
                onChange={e => setSearch(e.target.value)}
                placeholder="İşletme ara..."
                className="w-full h-10 pl-10 pr-4 rounded-xl bg-card border border-border text-xs outline-none text-foreground focus:border-primary/40 transition-all"
              />
            </div>
            
            <div className="flex bg-secondary p-1 rounded-lg border border-border shrink-0">
              {(['all', 'active', 'none'] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setFilterStatus(f)}
                  className={cn(
                    'px-2.5 py-1.5 rounded-lg text-[9px] uppercase font-black tracking-widest transition-all',
                    filterStatus === f
                      ? 'bg-red-500 text-white shadow-md shadow-red-500/20'
                      : 'text-muted-foreground'
                  )}
                >
                  {f === 'all' ? 'Tümü' : f === 'active' ? 'Kayıtlı' : 'Yeni'}
                </button>
              ))}
            </div>
          </div>

          {/* Business List */}
          {loading && !initialLoadDone.current ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/50">Veriler Çekiliyor</p>
            </div>
          ) : paginated.length === 0 ? (
            <div className="mx-4 mt-4 bg-card border border-border rounded-xl py-16 flex flex-col items-center text-center gap-3">
              <Store size={28} className="text-muted-foreground/20" />
              <div>
                <p className="font-black text-sm uppercase tracking-wider text-foreground/80">Bulunamadı</p>
                <p className="text-[10px] text-muted-foreground mt-1 max-w-[200px] mx-auto leading-normal">Arama kriterlerinize uygun aktif bir işletme kaydı yok.</p>
              </div>
            </div>
          ) : (
            <div className="px-4 pt-4 space-y-2">
              {paginated.map((biz) => {
                const count = getRecordCount(biz.id);
                return (
                  <Link
                    key={biz.id}
                    href={`/client/businesses/${biz.id}`}
                    className="flex items-center justify-between p-3 bg-card border border-border rounded-xl active:scale-[0.98] transition-all"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-red-500/10 to-orange-500/5 border border-border flex items-center justify-center text-primary shrink-0">
                        <Store size={18} />
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-black text-xs uppercase tracking-tight text-foreground truncate">
                          {biz.name}
                        </h3>
                        <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider mt-0.5">
                          {biz.category || 'Genel Ticari'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3.5 shrink-0">
                      <div className="text-right">
                        <p className="text-xs font-black text-red-500 leading-none">{count}</p>
                        <p className="text-[7px] font-bold text-muted-foreground/50 uppercase tracking-widest leading-none mt-0.5">Operasyon</p>
                      </div>
                      <div className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center text-muted-foreground">
                        <ChevronRight size={14} />
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}

          {/* Mobile Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-3 pt-6 pb-4">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="w-10 h-10 rounded-lg bg-card border border-border flex items-center justify-center disabled:opacity-20 disabled:cursor-not-allowed hover:bg-secondary text-foreground"
              >
                <ChevronLeft size={16} />
              </button>
              
              <div className="flex items-center gap-1.5 bg-card p-1 rounded-lg border border-border">
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter(n => n === 1 || n === totalPages || Math.abs(n - page) <= 1)
                  .reduce<(number | '...')[]>((acc, n, i, arr) => {
                    if (i > 0 && n - (arr[i - 1] as number) > 1) acc.push('...');
                    acc.push(n);
                    return acc;
                    }, [])
                  .map((n, i) => n === '...' ? (
                    <span key={`e-${i}`} className="w-7 h-7 flex items-center justify-center text-[9px] font-black text-muted-foreground/40">•••</span>
                  ) : (
                    <button
                      key={n}
                      onClick={() => setPage(n as number)}
                      className={cn(
                        'w-7 h-7 rounded-lg text-[9px] font-black transition-all',
                        page === n
                          ? 'bg-red-500 text-white'
                          : 'text-muted-foreground hover:bg-secondary'
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
                className="w-10 h-10 rounded-lg bg-card border border-border flex items-center justify-center disabled:opacity-20 disabled:cursor-not-allowed hover:bg-secondary text-foreground"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          )}
        </main>
      ) : (
        <main className="flex-1 lg:ml-72 pb-24 lg:pb-0 transition-all duration-500 w-full overflow-x-hidden relative">
          
          {/* Background Gradient Orbs */}
          <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-gradient-to-br from-red-500/10 via-orange-500/5 to-transparent rounded-full blur-3xl pointer-events-none -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-gradient-to-tr from-blue-500/5 to-transparent rounded-full blur-3xl pointer-events-none translate-y-1/2 -translate-x-1/2" />
          
          <Topbar 
            title={mall?.name || (loading ? 'Yükleniyor...' : 'Panel')} 
            subtitle={isRefreshing ? 'Veriler Yenileniyor...' : 'Servis Takip Merkezi'} 
          />

          <div className="p-4 sm:p-6 lg:p-8 space-y-8 max-w-[1600px] mx-auto relative z-10">
            
            {/* Error Banner */}
            {fetchError && (
              <div className="group bg-gradient-to-r from-red-500/10 via-red-500/5 to-transparent border border-red-500/20 rounded-2xl p-5 flex items-center justify-between gap-4 backdrop-blur-xl shadow-[0_0_40px_rgba(239,68,68,0.1)] animate-fade-in">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-red-500/15 flex items-center justify-center text-red-500 group-hover:rotate-12 transition-transform duration-500">
                    <ShieldAlert size={22} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-red-400">Bağlantı Kesildi</p>
                    <p className="text-xs text-red-400/70 mt-0.5">{fetchError}</p>
                  </div>
                </div>
                <button 
                  onClick={() => fetchData(true)}
                  className="px-5 py-2.5 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl text-xs font-bold hover:from-red-600 hover:to-red-700 transition-all shadow-[0_8px_30px_rgba(239,68,68,0.3)] hover:shadow-[0_8px_40px_rgba(239,68,68,0.4)] hover:-translate-y-0.5"
                >
                  Tekrar Dene
                </button>
              </div>
            )}

            {/* ✨ HERO HEADER SECTION */}
            <div className="relative rounded-[2rem] overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-br from-red-600 via-red-500 to-orange-500" />
              <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wMyI+PHBhdGggZD0iTTM2IDM0aDR2MWgtNHYtMXptMC0yaDF2NGgtMXYtNHptLTItMmgxdjZoLTF2LTZ6bTItMmgxdjg4LTF2LTh6bTItMmgxdjEwaC0xdi0xMHptLTItMmgxdjEyaC0ydi0xMnoiLz48L2c+PC9nPjwvc3ZnPg==')] opacity-40" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
              
              <div className="relative p-8 md:p-10 lg:p-12">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8">
                  <div className="space-y-5">
                    <div className="flex items-center gap-4">
                      <div className="p-4 bg-white/15 backdrop-blur-2xl rounded-2xl shadow-xl shadow-black/10 group-hover:scale-110 transition-transform duration-700">
                        <Building2 size={28} strokeWidth={1.8} />
                      </div>
                      <div>
                        <h1 className="text-[clamp(1.5rem,5vw,2.5rem)] font-black tracking-tight">
                          {mall?.name || 'Müşteri Paneli'}
                        </h1>
                        {mall?.address && (
                          <p className="text-white/70 text-sm font-medium flex items-center gap-2 mt-1">
                            <MapPin size={14} /> {mall.address}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="px-3 py-1.5 bg-green-500/20 border border-green-500/30 rounded-full flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                        <span className="text-[11px] font-bold text-green-300 uppercase tracking-wider">Canlı Sistem</span>
                      </div>
                      <div className="px-3 py-1.5 bg-white/10 rounded-full text-[11px] font-bold text-white/60 uppercase tracking-wider">
                        Son güncelleme şimdi
                      </div>
                    </div>
                  </div>

                  {/* STATS CARDS */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {[
                      { val: businesses.length, label: 'İşletme', icon: Store, color: 'from-white/15 to-white/5' },
                      { val: records.length, label: 'İş Emri', icon: CheckCircle2, color: 'from-emerald-500/20 to-emerald-500/5' },
                      { val: thisMonth, label: 'Bu Ay', icon: Timer, color: 'from-blue-500/20 to-blue-500/5' },
                      { val: pendingCount, label: 'Bekleyen', icon: AlertCircle, color: 'from-amber-500/20 to-amber-500/5' },
                    ].map((s, i) => (
                      <div key={i} className="bg-white/10 backdrop-blur-xl rounded-2xl p-4 border border-white/10 hover:bg-white/15 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl shadow-black/10">
                        <div className="flex items-center gap-2 mb-2">
                          <div className={`w-8 h-8 rounded-xl bg-gradient-to-br ${s.color} flex items-center justify-center`}>
                            <s.icon size={14} />
                          </div>
                        </div>
                        <p className="text-2xl font-black tabular-nums">{loading && !initialLoadDone.current ? '—' : s.val}</p>
                        <p className="text-[10px] font-bold uppercase text-white/50 tracking-widest mt-0.5">{s.label}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* TOOLBAR SECTION */}
            <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-5">
              <div>
                <h2 className="text-xl font-bold tracking-tight flex items-center gap-2">
                  <Sparkles size={18} className="text-amber-400" />
                  İşletme Rehberi
                </h2>
                <p className="text-sm text-muted-foreground mt-1">AVM dökümantasyonu ve aktif servis biletleri.</p>
              </div>
              
              <div className="flex items-center gap-3 w-full xl:w-auto">
                <button 
                  onClick={() => fetchData(true)}
                  className="p-3 rounded-xl bg-card border border-border hover:bg-accent/50 transition-all duration-300 text-muted-foreground hover:text-foreground group"
                  title="Yenile"
                >
                  <RefreshCw size={18} className={cn("transition-transform duration-700", isRefreshing && "animate-spin")} />
                </button>

                <div className="flex gap-1.5 bg-card p-1.5 rounded-xl border border-border flex-1 xl:flex-none justify-center">
                  {(['all', 'active', 'none'] as const).map(f => (
                    <button
                      key={f}
                      onClick={() => setFilterStatus(f)}
                      className={cn(
                        'px-4 py-2 rounded-lg text-[11px] uppercase font-bold tracking-widest transition-all duration-300 whitespace-nowrap',
                        filterStatus === f
                          ? 'bg-gradient-to-r from-red-500 to-red-600 text-white shadow-[0_8px_20px_rgba(239,68,68,0.25)]'
                          : 'text-muted-foreground hover:text-foreground'
                      )}
                    >
                      {f === 'all' ? 'Tümü' : f === 'active' ? 'Kayıtlı' : 'Kayıtsız'}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Search Input */}
            <div className="relative group">
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
              <input
                type="text" 
                value={search} 
                onChange={e => setSearch(e.target.value)}
                placeholder={`${businesses.length} birim içinde ara...`}
                className="w-full h-14 pl-14 pr-6 rounded-2xl bg-card border border-border focus:border-primary/30 focus:bg-accent/30 transition-all duration-300 text-sm outline-none"
              />
            </div>

            {loading && !initialLoadDone.current ? (
              <div className="flex flex-col items-center justify-center py-24 gap-4">
                <Loader2 className="w-10 h-10 animate-spin text-primary" />
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Sistem Yükleniyor</p>
              </div>
            ) : paginated.length === 0 ? (
              <div className="bg-card rounded-3xl py-24 flex flex-col items-center text-center gap-4 border border-border">
                <div className="w-20 h-20 rounded-3xl bg-muted flex items-center justify-center text-muted-foreground/20">
                  <Store size={32} />
                </div>
                <div>
                  <p className="font-black text-lg tracking-tight uppercase">Sonuç Bulunamadı</p>
                  <p className="text-xs text-muted-foreground mt-1 max-w-[200px]">Arama kriterlerinize uygun aktif bir işletme kaydı yok.</p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {paginated.map((biz, idx) => {
                  const count = getRecordCount(biz.id);
                  const lastRec = getLastRecord(biz.id);
                  const lastDate = getLastService(biz.id);

                  return (
                    <Link
                      key={biz.id}
                      href={`/client/businesses/${biz.id}`}
                      onMouseEnter={() => setHoveredCard(biz.id)}
                      onMouseLeave={() => setHoveredCard(null)}
                      className="group bg-card rounded-[1.5rem] p-6 border border-border hover:border-primary/20 transition-all duration-500 hover:-translate-y-1 hover:shadow-[0_20px_60px_rgba(0,0,0,0.15)] relative overflow-hidden"
                      style={{ animationDelay: `${idx * 0.05}s` }}
                    >
                      <div className="absolute top-0 right-0 p-4 opacity-[0.03] group-hover:opacity-[0.07] transition-opacity">
                        <Store size={80} />
                      </div>
                      
                      <div className="relative space-y-5">
                        <div className="flex items-start justify-between">
                          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-red-500/20 to-orange-500/10 border border-border flex items-center justify-center text-primary group-hover:scale-110 transition-transform duration-500">
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

                        <div className="pt-4 border-t border-border flex items-center justify-between">
                          <div className="flex flex-col">
                            <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/50">Son Operasyon</span>
                            <span className="text-[10px] font-bold mt-0.5 flex items-center gap-1.5">
                              <Clock size={10} className="text-primary" />
                              {lastDate || 'Kayıt Yok'}
                            </span>
                          </div>
                          <div className={cn(
                            "w-8 h-8 rounded-full bg-muted flex items-center justify-center transition-all duration-300",
                            hoveredCard === biz.id && "bg-primary text-white scale-110"
                          )}>
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
                  className="w-12 h-12 rounded-2xl bg-card border border-border flex items-center justify-center disabled:opacity-20 disabled:cursor-not-allowed hover:bg-accent/50 transition-all"
                >
                  <ChevronLeft size={20} />
                </button>
                
                <div className="flex items-center gap-2 bg-card p-1.5 rounded-2xl border border-border">
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
                            ? 'bg-gradient-to-r from-red-500 to-red-600 text-white shadow-lg shadow-red-500/30'
                            : 'text-muted-foreground hover:bg-accent/50'
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
                  className="w-12 h-12 rounded-2xl bg-card border border-border flex items-center justify-center disabled:opacity-20 disabled:cursor-not-allowed hover:bg-accent/50 transition-all"
                >
                  <ChevronRight size={20} />
                </button>
              </div>
            )}

          </div>
        </main>
      )}
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
