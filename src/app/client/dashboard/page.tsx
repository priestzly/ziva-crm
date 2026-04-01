'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { Sidebar, Topbar, PageHeader, StatCard } from '@/components/DashboardShell';
import RouteGuard from '@/components/RouteGuard';
import { useAuth } from '@/context/AuthContext';
import { supabase, type Business, type MaintenanceRecord, type Mall } from '@/lib/supabase';
import { 
  Building2, Search, ChevronRight, ChevronLeft,
  Loader2, MapPin, Store, History, CheckCircle2,
  Clock, AlertCircle, Wrench, Flame
} from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';

const PAGE_SIZE = 12;

const parseDesc = (desc: string) => {
  try { return JSON.parse(desc); } catch { return { text: desc, status: 'Tamamlandı', technician: '' }; }
};

function ClientContent() {
  const { profile, loading: authLoading } = useAuth();
  const [mall, setMall] = useState<Mall | null>(null);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [records, setRecords] = useState<MaintenanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'none'>('all');

  const fetchData = useCallback(async () => {
    if (!profile?.mall_id) { setLoading(false); return; }
    setLoading(true);
    const runQuery = async () => {
      const [mallRes, bizRes, recsRes] = await Promise.all([
        supabase.from('malls').select('*').eq('id', profile.mall_id).single(),
        supabase.from('businesses').select('*').eq('mall_id', profile.mall_id).order('name'),
        supabase.from('maintenance_records').select('*, businesses!inner(name, mall_id)')
          .eq('businesses.mall_id', profile.mall_id)
          .order('created_at', { ascending: false })
          .limit(200),
      ]);
      return { mallRes, bizRes, recsRes };
    };
    let results = await runQuery();
    if (!results.bizRes.data?.length && !results.recsRes?.data?.length) {
      await new Promise(r => setTimeout(r, 1000));
      results = await runQuery();
    }
    setMall(results.mallRes.data);
    setBusinesses(results.bizRes.data || []);
    setRecords(results.recsRes.data || []);
    setLoading(false);
  }, [profile]);

  useEffect(() => { 
    if (profile?.mall_id && !authLoading) fetchData(); 
  }, [fetchData, profile?.mall_id, authLoading]);

  useEffect(() => {
    if (!profile?.mall_id) return;
    const sub = supabase.channel('client-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'maintenance_records' }, fetchData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'businesses' }, fetchData)
      .subscribe();
    return () => { supabase.removeChannel(sub); };
  }, [profile?.mall_id, fetchData]);

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
        <Topbar title={mall?.name || 'Yükleniyor...'} subtitle="Servis Takip Merkezi" />

        <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">

          {/* ── HERO SECTION ── */}
          <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-primary via-primary/90 to-primary/70 shadow-xl text-white">
            {/* Decorative pattern */}
            <div className="absolute inset-0 opacity-10" style={{backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 1px)', backgroundSize: '24px 24px'}} />
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />
            
            <div className="relative p-6 sm:p-8">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                {/* Left - Info */}
                <div className="space-y-3">
                  <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm px-3 py-1.5 rounded-full text-xs font-semibold">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    Canlı Sistem
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
                    {mall?.name || 'AVM'}
                    <span className="block text-lg font-normal opacity-80 mt-1">Servis Takip Merkezi</span>
                  </h1>
                  {mall?.address && (
                    <p className="text-white/70 text-sm flex items-center gap-1.5">
                      <MapPin size={14} /> {mall.address}
                    </p>
                  )}
                </div>

                {/* Right - Stats */}
                <div className="flex items-center gap-4 sm:gap-6 flex-wrap">
                  {[
                    { val: businesses.length, label: 'İşletme' },
                    { val: records.length, label: 'İş Emri' },
                    { val: thisMonth, label: 'Bu Ay' },
                    { val: completedAll, label: 'Tamamlanan' },
                  ].map((s, i) => (
                    <React.Fragment key={i}>
                      {i > 0 && <div className="w-px h-10 bg-white/20 hidden sm:block" />}
                      <div className="text-center px-2 sm:px-4">
                        <p className="text-2xl sm:text-3xl font-bold tabular-nums">{loading ? '—' : s.val}</p>
                        <p className="text-[10px] font-semibold uppercase text-white/60 mt-0.5">{s.label}</p>
                      </div>
                    </React.Fragment>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* ── PAGE HEADER ── */}
          <PageHeader 
            title="İşletmeler"
            description="AVM'nizdeki tüm işletmeleri ve servis kayıtlarını görüntüleyin."
          />

          {/* ── CONTROLS ── */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text" 
                value={search} 
                onChange={e => setSearch(e.target.value)}
                placeholder={`${businesses.length} işletme içinde ara...`}
                className="input-premium pl-10"
              />
            </div>
            <div className="flex gap-2 shrink-0">
              {(['all', 'active', 'none'] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setFilterStatus(f)}
                  className={cn(
                    'px-3 sm:px-4 py-2 rounded-lg text-xs font-semibold border transition-all whitespace-nowrap',
                    filterStatus === f
                      ? 'bg-primary text-white border-primary shadow-md'
                      : 'bg-[hsl(var(--card))] border-[hsl(var(--border))] text-muted-foreground hover:border-primary/40'
                  )}
                >
                  {f === 'all' ? 'Tümü' : f === 'active' ? 'Kayıtlı' : 'Kayıtsız'}
                </button>
              ))}
            </div>
          </div>

          {/* ── RESULT INFO ── */}
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              <span className="font-semibold text-foreground">{filtered.length}</span> işletme bulundu
            </p>
            <Link href="/client/history" className="text-xs font-semibold text-primary hover:underline flex items-center gap-1">
              <History size={14} /> Tüm Geçmiş
            </Link>
          </div>

          {/* ── BUSINESS LIST ── */}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-24 gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-sm font-medium text-muted-foreground">Veriler Yükleniyor...</p>
            </div>
          ) : paginated.length === 0 ? (
            <div className="glass rounded-xl py-20 flex flex-col items-center text-center gap-3">
              <div className="w-14 h-14 rounded-xl bg-[hsl(var(--muted))] flex items-center justify-center">
                <Building2 className="w-6 h-6 text-muted-foreground/40" />
              </div>
              <div>
                <p className="font-semibold text-sm">Sonuç bulunamadı</p>
                <p className="text-xs text-muted-foreground mt-1">Arama kriterlerinize uygun işletme yok.</p>
              </div>
            </div>
          ) : (
            <div className="glass rounded-xl overflow-hidden">
              {paginated.map((biz, idx) => {
                const count = getRecordCount(biz.id);
                const lastRec = getLastRecord(biz.id);
                const lastDate = getLastService(biz.id);
                const p = lastRec ? parseDesc(lastRec.description) : null;
                const isLast = idx === paginated.length - 1;

                const statusIcon = !p ? (
                  <AlertCircle size={14} className="text-amber-400" />
                ) : p.status === 'Devam Ediyor' ? (
                  <Clock size={14} className="text-blue-400" />
                ) : p.status === 'Tamamlandı' ? (
                  <CheckCircle2 size={14} className="text-emerald-400" />
                ) : (
                  <AlertCircle size={14} className="text-red-400" />
                );

                return (
                  <div
                    key={biz.id}
                    className={cn(
                      'flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 sm:px-5 py-4 hover:bg-[hsl(var(--primary))]/5 transition-colors group',
                      !isLast && 'border-b border-[hsl(var(--border))]'
                    )}
                  >
                    {/* Left - Business Info */}
                    <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
                      <div className="w-10 h-10 rounded-lg bg-[hsl(var(--primary))]/10 flex items-center justify-center text-primary shrink-0 group-hover:bg-primary group-hover:text-white transition-all duration-200">
                        <Store size={18} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold truncate group-hover:text-primary transition-colors">{biz.name}</p>
                        <div className="flex items-center gap-2 sm:gap-3 mt-0.5">
                          <span className="text-[10px] sm:text-xs text-muted-foreground">{biz.category || 'Genel'}</span>
                          {p?.text && (
                            <span className="text-[10px] text-muted-foreground italic truncate max-w-[140px] sm:max-w-xs hidden sm:block">
                              "{p.text.substring(0, 50)}{p.text.length > 50 ? '…' : ''}"
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right - Actions & Status */}
                    <div className="flex items-center gap-3 sm:gap-4 shrink-0 sm:ml-4">
                      <div className="hidden md:flex items-center gap-1.5 text-xs text-muted-foreground">
                        {statusIcon}
                        <span className="text-xs">{lastDate || 'Kayıt yok'}</span>
                      </div>
                      <div className="text-center">
                        <p className="text-lg font-bold tabular-nums leading-none">{count}</p>
                        <p className="text-[9px] text-muted-foreground uppercase font-semibold">İşlem</p>
                      </div>
                      <Link
                        href={`/client/businesses/${biz.id}`}
                        className="btn-primary h-9 px-3 text-xs"
                      >
                        <Wrench size={12} /> Detay
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* ── PAGINATION ── */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="btn-icon disabled:opacity-30"
              >
                <ChevronLeft size={16} />
              </button>
              
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(n => n === 1 || n === totalPages || Math.abs(n - page) <= 1)
                .reduce<(number | '...')[]>((acc, n, i, arr) => {
                  if (i > 0 && n - (arr[i - 1] as number) > 1) acc.push('...');
                  acc.push(n);
                  return acc;
                }, [])
                .map((n, i) => n === '...' ? (
                  <span key={`e-${i}`} className="w-9 h-9 flex items-center justify-center text-xs text-muted-foreground">…</span>
                ) : (
                  <button
                    key={n}
                    onClick={() => setPage(n as number)}
                    className={cn(
                      'w-9 h-9 rounded-lg text-xs font-bold transition-all',
                      page === n
                        ? 'bg-primary text-white shadow-md'
                        : 'bg-[hsl(var(--card))] border border-[hsl(var(--border))] hover:border-primary/50 text-muted-foreground'
                    )}
                  >
                    {n}
                  </button>
                ))
              }
              
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="btn-icon disabled:opacity-30"
              >
                <ChevronRight size={16} />
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