'use client';

import React, { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { PanelLayout } from '@/components/DashboardShell';
import {
  Card, CardHeader, PageHeader, StatCard, IconTile, IconButton, Badge,
  SearchInput, Segmented, LoadingState, EmptyState, ErrorBanner,
} from '@/components/ui';
import RouteGuard from '@/components/RouteGuard';
import { useAuth } from '@/context/AuthContext';
import { supabase, type Business, type MaintenanceRecord, type Mall } from '@/lib/supabase';
import {
  ChevronRight, ChevronLeft, MapPin, Store, Clock, RefreshCw, ArrowUpRight,
  CheckCircle2, AlertCircle, Timer, ClipboardList, Headphones, Phone, MessageCircle,
  type LucideIcon,
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

  const recentRecords = records.slice(0, 6);
  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short', year: 'numeric' });
  const firstName = profile?.full_name?.trim().split(' ')[0];
  const showSkeleton = loading && !initialLoadDone.current;

  return (
    <PanelLayout
      role="client"
      title={mall?.name || (loading ? 'Yükleniyor…' : 'Panel')}
      subtitle={isRefreshing ? 'Yenileniyor…' : 'Müşteri portalı'}
    >
      <PageHeader
        title={firstName ? `Merhaba, ${firstName}` : 'Hoş geldiniz'}
        description={
          mall?.address ? (
            <span className="inline-flex items-center gap-1.5">
              <MapPin size={14} className="shrink-0" /> {mall.name} · {mall.address}
            </span>
          ) : (
            'İşletmelerinizin servis kayıtlarını ve bakım durumunu buradan takip edebilirsiniz.'
          )
        }
        actions={
          <IconButton
            icon={RefreshCw}
            label="Yenile"
            variant="secondary"
            onClick={() => fetchData(true)}
            className={cn(isRefreshing && '[&_svg]:animate-spin')}
          />
        }
      />

      {fetchError && <ErrorBanner message={fetchError} onRetry={() => fetchData(true)} className="mb-4" />}

      <div className="space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <StatCard label="İşletme" value={businesses.length} icon={Store} tone="primary" loading={showSkeleton} />
          <StatCard
            label="Toplam servis"
            value={records.length}
            icon={CheckCircle2}
            tone="success"
            loading={showSkeleton}
            hint={records[0] ? `Son servis: ${formatDate(records[0].created_at)}` : undefined}
          />
          <StatCard label="Bu ay" value={thisMonth} icon={Timer} tone="info" loading={showSkeleton} />
          <StatCard label="Bekleyen" value={pendingCount} icon={AlertCircle} tone="warning" loading={showSkeleton} />
        </div>

        {/* Quick links + support */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
          <QuickLink href="/client/businesses" icon={Store} title="İşletmelerim" description="Tüm işletmeleriniz ve servis geçmişleri" />
          <QuickLink href="/client/history" icon={ClipboardList} title="Servis arşivi" description="Geçmiş servis kayıtları ve raporlar" />
          <Card className="p-4 sm:p-5">
            <div className="flex items-start gap-3">
              <IconTile icon={Headphones} tone="neutral" />
              <div className="min-w-0">
                <p className="text-[15px] font-semibold text-foreground">Destek</p>
                <p className="mt-0.5 text-sm text-muted-foreground">Sorularınız için bize ulaşın.</p>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <a href="tel:+905324790828" className="p-btn p-btn-secondary p-btn-sm">
                <Phone size={14} /> +90 532 479 08 28
              </a>
              <a href="https://wa.me/905324790828" target="_blank" rel="noopener noreferrer" className="p-btn p-btn-secondary p-btn-sm">
                <MessageCircle size={14} /> WhatsApp
              </a>
            </div>
          </Card>
        </div>

        {/* Recent records */}
        <Card className="overflow-hidden">
          <CardHeader
            title="Son servis kayıtları"
            description="İşletmelerinizde yapılan en son işlemler."
            actions={
              <Link href="/client/history" className="p-btn p-btn-ghost p-btn-sm">
                Tümü <ArrowUpRight size={14} />
              </Link>
            }
          />
          {showSkeleton ? (
            <LoadingState className="py-12" />
          ) : recentRecords.length === 0 ? (
            <EmptyState icon={ClipboardList} title="Henüz servis kaydı yok" description="Yapılan servisler burada listelenecek." className="py-12" />
          ) : (
            <>
              <div className="hidden md:block overflow-x-auto border-t border-border">
                <table className="p-table">
                  <thead>
                    <tr>
                      <th>İşletme</th>
                      <th>Servis</th>
                      <th>Durum</th>
                      <th>Tarih</th>
                      <th className="w-10"><span className="sr-only">Aç</span></th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentRecords.map(rec => {
                      const d = parseDesc(rec.description);
                      return (
                        <tr key={rec.id}>
                          <td className="font-medium text-foreground">{rec.businesses?.name || '—'}</td>
                          <td className="text-muted-foreground">{rec.service_type || 'Servis'}</td>
                          <td><StatusBadge status={d.status} /></td>
                          <td className="text-muted-foreground tabular-nums whitespace-nowrap">{formatDate(rec.created_at)}</td>
                          <td>
                            <Link href={`/client/businesses/${rec.business_id}`} aria-label="İşletmeyi aç" className="p-btn p-btn-ghost p-btn-icon p-btn-sm">
                              <ChevronRight size={14} />
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="md:hidden divide-y divide-border border-t border-border">
                {recentRecords.map(rec => {
                  const d = parseDesc(rec.description);
                  return (
                    <Link key={rec.id} href={`/client/businesses/${rec.business_id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-surface transition-colors">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-foreground truncate">{rec.businesses?.name || '—'}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground truncate">
                          {rec.service_type || 'Servis'} · <span className="tabular-nums">{formatDate(rec.created_at)}</span>
                        </p>
                      </div>
                      <StatusBadge status={d.status} />
                      <ChevronRight size={16} className="text-muted-foreground shrink-0" />
                    </Link>
                  );
                })}
              </div>
            </>
          )}
        </Card>

        {/* Business directory */}
        <Card className="overflow-hidden">
          <CardHeader
            title="İşletme rehberi"
            description={`${filtered.length} işletme · servis kayıtları ve son işlem tarihleri`}
          />
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 px-4 sm:px-5 pb-4">
            <SearchInput value={search} onChange={setSearch} placeholder={`${businesses.length} işletme içinde ara…`} className="flex-1 sm:max-w-sm" />
            <Segmented
              value={filterStatus}
              onChange={setFilterStatus}
              options={[
                { value: 'all', label: 'Tümü' },
                { value: 'active', label: 'Kayıtlı' },
                { value: 'none', label: 'Kayıtsız' },
              ]}
              className="self-start sm:self-auto"
            />
          </div>

          {showSkeleton ? (
            <LoadingState className="py-12 border-t border-border" />
          ) : paginated.length === 0 ? (
            <EmptyState
              icon={Store}
              title="Eşleşen işletme yok"
              description="Arama kriterlerinize uygun bir işletme kaydı bulunamadı."
              className="py-12 border-t border-border"
            />
          ) : (
            <>
              <div className="hidden md:block overflow-x-auto border-t border-border">
                <table className="p-table">
                  <thead>
                    <tr>
                      <th>İşletme</th>
                      <th>Kategori</th>
                      <th className="text-right">Servis kaydı</th>
                      <th>Son servis</th>
                      <th className="w-10"><span className="sr-only">Aç</span></th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginated.map(biz => {
                      const count = getRecordCount(biz.id);
                      const lastDate = getLastService(biz.id);
                      return (
                        <tr
                          key={biz.id}
                          onMouseEnter={() => setHoveredCard(biz.id)}
                          onMouseLeave={() => setHoveredCard(null)}
                        >
                          <td>
                            <Link href={`/client/businesses/${biz.id}`} className="flex items-center gap-3 font-medium text-foreground hover:text-primary transition-colors">
                              <IconTile icon={Store} size="sm" />
                              <span className="truncate">{biz.name}</span>
                            </Link>
                          </td>
                          <td className="text-muted-foreground">{biz.category || 'Genel ticari'}</td>
                          <td className="text-right tabular-nums font-medium text-foreground">{count}</td>
                          <td className="text-muted-foreground tabular-nums whitespace-nowrap">
                            {lastDate || <Badge>Kayıt yok</Badge>}
                          </td>
                          <td>
                            <Link
                              href={`/client/businesses/${biz.id}`}
                              aria-label={`${biz.name} detayları`}
                              className={cn('p-btn p-btn-icon p-btn-sm', hoveredCard === biz.id ? 'p-btn-secondary' : 'p-btn-ghost')}
                            >
                              <ChevronRight size={14} />
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="md:hidden divide-y divide-border border-t border-border">
                {paginated.map(biz => {
                  const count = getRecordCount(biz.id);
                  const lastDate = getLastService(biz.id);
                  return (
                    <Link key={biz.id} href={`/client/businesses/${biz.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-surface transition-colors">
                      <IconTile icon={Store} size="sm" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-foreground truncate">{biz.name}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground truncate flex items-center gap-1">
                          <Clock size={12} className="shrink-0" /> {lastDate || 'Kayıt yok'}
                        </p>
                      </div>
                      <Badge tone={count > 0 ? 'primary' : 'neutral'} className="tabular-nums">{count} kayıt</Badge>
                      <ChevronRight size={16} className="text-muted-foreground shrink-0" />
                    </Link>
                  );
                })}
              </div>
            </>
          )}

          {totalPages > 1 && (
            <div className="flex items-center justify-between gap-3 px-4 sm:px-5 py-3 border-t border-border">
              <p className="text-xs text-muted-foreground tabular-nums">Sayfa {page} / {totalPages}</p>
              <div className="flex items-center gap-1">
                <IconButton icon={ChevronLeft} label="Önceki sayfa" size="sm" variant="secondary" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} />
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter(n => n === 1 || n === totalPages || Math.abs(n - page) <= 1)
                  .reduce<(number | '...')[]>((acc, n, i, arr) => {
                    if (i > 0 && n - (arr[i - 1] as number) > 1) acc.push('...');
                    acc.push(n);
                    return acc;
                  }, [])
                  .map((n, i) => n === '...' ? (
                    <span key={`e-${i}`} className="w-8 text-center text-xs text-muted-foreground">…</span>
                  ) : (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setPage(n as number)}
                      aria-current={page === n ? 'page' : undefined}
                      className={cn('p-btn p-btn-sm min-w-8 px-2 tabular-nums', page === n ? 'p-btn-primary' : 'p-btn-ghost')}
                    >
                      {n}
                    </button>
                  ))}
                <IconButton icon={ChevronRight} label="Sonraki sayfa" size="sm" variant="secondary" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} />
              </div>
            </div>
          )}
        </Card>
      </div>
    </PanelLayout>
  );
}

function QuickLink({ href, icon, title, description }: { href: string; icon: LucideIcon; title: string; description: string }) {
  return (
    <Link href={href} className="block">
      <Card interactive className="h-full p-4 sm:p-5 flex items-start gap-3">
        <IconTile icon={icon} />
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-semibold text-foreground">{title}</p>
          <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
        </div>
        <ArrowUpRight size={16} className="text-muted-foreground shrink-0" />
      </Card>
    </Link>
  );
}

function StatusBadge({ status }: { status?: string }) {
  const done = !status || status === 'Tamamlandı';
  return (
    <Badge tone={done ? 'success' : 'warning'} icon={done ? CheckCircle2 : Timer}>
      {status || 'Tamamlandı'}
    </Badge>
  );
}

export default function ClientDashboard() {
  return (
    <RouteGuard requiredRole="client">
      <ClientContent />
    </RouteGuard>
  );
}
