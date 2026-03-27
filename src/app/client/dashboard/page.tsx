'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { Sidebar, Topbar } from '@/components/DashboardShell';
import RouteGuard from '@/components/RouteGuard';
import { useAuth } from '@/context/AuthContext';
import { supabase, type Business, type MaintenanceRecord, type Mall } from '@/lib/supabase';
import { 
  Building2, ClipboardCheck, Search, ChevronRight, ChevronLeft,
  Loader2, MapPin, Activity, Store, History, CheckCircle2,
  Clock, AlertCircle, Wrench
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

  useEffect(() => { if (profile?.mall_id) fetchData(); }, [fetchData, profile?.mall_id]);

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

  // Filtered + paginated
  const filtered = useMemo(() => {
    let list = businesses.filter(b => b.name.toLowerCase().includes(search.toLowerCase()));
    if (filterStatus === 'active') list = list.filter(b => getRecordCount(b.id) > 0);
    if (filterStatus === 'none') list = list.filter(b => getRecordCount(b.id) === 0);
    return list;
  }, [businesses, search, filterStatus, records]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // Reset page on filter change
  useEffect(() => setPage(1), [search, filterStatus]);

  const thisMonth = records.filter(r => new Date(r.created_at).getMonth() === new Date().getMonth()).length;
  const completedAll = records.filter(r => parseDesc(r.description).status === 'Tamamlandı').length;

  return (
    <div className="min-h-screen flex">
      <Sidebar role="client" />
      <main className="flex-1 lg:ml-72 transition-all duration-500 bg-[hsl(var(--background))] w-full overflow-x-hidden pb-20 sm:pb-8">
        <Topbar title={mall?.name || 'Yükleniyor...'} subtitle="Servis Takip Merkezi" />

        <div className="p-4 sm:p-6 lg:p-8 max-w-[1400px] mx-auto space-y-6">

          {/* ── HERO ── */}
          <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-primary via-primary/90 to-primary/70 shadow-2xl shadow-primary/30 text-white">
            <div className="absolute inset-0 opacity-10" style={{backgroundImage: 'radial-gradient(circle at 80% 50%, white 1px, transparent 1px)', backgroundSize: '24px 24px'}} />
            <div className="relative p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Canlı Sistem
                  </span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-black tracking-tighter">{mall?.name || 'AVM'}<br/><span className="font-light opacity-80 text-lg">Servis Takip Merkezi</span></h1>
                <p className="text-white/60 text-xs flex items-center gap-1.5">
                  <MapPin size={11} /> {mall?.address || '—'}
                </p>
              </div>
              <div className="flex items-center gap-1 sm:gap-6 flex-wrap">
                {[
                  { val: businesses.length, label: 'İşletme', color: 'text-white' },
                  { val: records.length, label: 'İş Emri', color: 'text-emerald-300' },
                  { val: thisMonth, label: 'Bu Ay', color: 'text-blue-300' },
                  { val: completedAll, label: 'Tamamlanan', color: 'text-amber-300' },
                ].map((s, i) => (
                  <React.Fragment key={i}>
                    {i > 0 && <div className="w-px h-10 bg-white/20 hidden sm:block" />}
                    <div className="text-center px-2 sm:px-0">
                      <p className={cn('text-2xl sm:text-3xl font-black tabular-nums', s.color)}>{loading ? '—' : s.val}</p>
                      <p className="text-[9px] font-black uppercase text-white/50 mt-0.5">{s.label}</p>
                    </div>
                  </React.Fragment>
                ))}
              </div>
            </div>
          </div>

          {/* ── CONTROLS ── */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text" value={search} onChange={e => setSearch(e.target.value)}
                placeholder={`${businesses.length} işletme içinde ara...`}
                className="input-premium pl-11 py-3 w-full text-sm"
              />
            </div>
            <div className="flex gap-2 shrink-0">
              {(['all', 'active', 'none'] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setFilterStatus(f)}
                  className={cn(
                    'px-4 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-wide border transition-all',
                    filterStatus === f
                      ? 'bg-primary text-white border-primary shadow-lg shadow-primary/20'
                      : 'glass border-[hsl(var(--border))] text-muted-foreground hover:border-primary/40'
                  )}
                >
                  {f === 'all' ? 'Tümü' : f === 'active' ? '✓ Kayıtlı' : '○ Kayıtsız'}
                </button>
              ))}
            </div>
          </div>

          {/* ── RESULT INFO ── */}
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground font-medium">
              <span className="font-black text-foreground">{filtered.length}</span> işletme · Sayfa <span className="font-black text-foreground">{page}/{totalPages || 1}</span>
            </p>
            <Link href="/client/history" className="text-[11px] font-black text-primary uppercase tracking-wide hover:underline flex items-center gap-1">
              <History size={13} /> Tüm Arşiv
            </Link>
          </div>

          {/* ── BUSINESS LIST ── */}
          {loading ? (
            <div className="flex items-center justify-center py-32 gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-sm font-bold text-muted-foreground">Veriler Hazırlanıyor...</p>
            </div>
          ) : paginated.length === 0 ? (
            <div className="glass rounded-2xl py-24 flex flex-col items-center text-center gap-3">
              <Building2 className="w-10 h-10 text-muted-foreground/20" />
              <p className="text-sm font-bold">Sonuç bulunamadı</p>
            </div>
          ) : (
            <div className="glass rounded-2xl border border-[hsl(var(--border))] overflow-hidden">
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
                      'flex items-center justify-between px-5 py-4 hover:bg-primary/5 transition-colors group',
                      !isLast && 'border-b border-[hsl(var(--border))]'
                    )}
                  >
                    {/* Left */}
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-primary/8 flex items-center justify-center text-primary shrink-0 group-hover:bg-primary group-hover:text-white transition-all duration-200">
                        <Store size={16} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-black uppercase tracking-tight truncate group-hover:text-primary transition-colors">{biz.name}</p>
                        <div className="flex items-center gap-3 mt-0.5">
                          <span className="text-[10px] text-muted-foreground font-medium">{biz.category || 'Genel'}</span>
                          {p?.text && (
                            <span className="text-[10px] text-muted-foreground italic truncate max-w-[160px] sm:max-w-xs hidden sm:block">
                              "{p.text.substring(0, 60)}{p.text.length > 60 ? '…' : ''}"
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right */}
                    <div className="flex items-center gap-3 sm:gap-6 shrink-0 ml-4">
                      <div className="hidden md:flex items-center gap-1.5 text-[10px] text-muted-foreground">
                        {statusIcon}
                        <span className="font-medium">{lastDate || 'Kayıt yok'}</span>
                      </div>
                      <div className="text-right hidden sm:block">
                        <p className="text-base font-black tabular-nums">{count}</p>
                        <p className="text-[9px] text-muted-foreground uppercase font-bold">İşlem</p>
                      </div>
                      <Link
                        href={`/client/businesses/${biz.id}`}
                        className="flex items-center gap-1 bg-primary/8 hover:bg-primary text-primary hover:text-white px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all duration-200"
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
                className="w-9 h-9 rounded-xl glass border border-[hsl(var(--border))] flex items-center justify-center disabled:opacity-30 hover:border-primary/50 transition-all"
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
                      'w-9 h-9 rounded-xl text-xs font-black transition-all',
                      page === n
                        ? 'bg-primary text-white shadow-lg shadow-primary/30'
                        : 'glass border border-[hsl(var(--border))] hover:border-primary/50 text-muted-foreground'
                    )}
                  >
                    {n}
                  </button>
                ))
              }
              
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="w-9 h-9 rounded-xl glass border border-[hsl(var(--border))] flex items-center justify-center disabled:opacity-30 hover:border-primary/50 transition-all"
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
