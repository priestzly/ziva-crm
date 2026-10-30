'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import Link from 'next/link';
import { PanelLayout } from '@/components/DashboardShell';
import {
  IconButton, Card, PageHeader, IconTile, Badge, SearchInput, LoadingState, EmptyState, ErrorBanner,
} from '@/components/ui';
import RouteGuard from '@/components/RouteGuard';
import { useAuth } from '@/context/AuthContext';
import { supabase, type Business, type Mall } from '@/lib/supabase';
import { Building2, Store, ChevronRight, MapPin, RefreshCw, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

function ClientBusinessesContent() {
  const { profile } = useAuth();
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [mall, setMall] = useState<Mall | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

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
      const [mallRes, bizRes] = await Promise.all([
        supabase.from('malls').select('*').eq('id', profile.mall_id).single(),
        supabase.from('businesses')
          .select('*')
          .eq('mall_id', profile.mall_id)
          .order('name')
      ]);
      
      if (bizRes.error) throw bizRes.error;
      
      setMall(mallRes.data);
      setBusinesses(bizRes.data || []);
      initialLoadDone.current = true;
    } catch (err: any) {
      console.error('Error fetching client businesses:', err);
      setFetchError(`Bağlantı hatası: ${err.message || 'Bilinmeyen hata'}`);
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

    const sub = supabase.channel('client-biz-list')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'businesses', filter: `mall_id=eq.${profile.mall_id}` }, () => fetchData(true))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'malls', filter: `id=eq.${profile.mall_id}` }, () => fetchData(true))
      .subscribe((status: string) => {
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.warn('Businesses Realtime error, retrying...');
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

  const filteredBiz = businesses.filter(b =>
    b.name.toLowerCase().includes(search.toLowerCase()) ||
    b.category?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <PanelLayout
      role="client"
      title="İşletmelerim"
      subtitle={isRefreshing ? 'Yenileniyor…' : (mall ? mall.name : 'Yetkili olduğunuz işletmeler')}
    >
      <PageHeader
        title="İşletmelerim"
        description={mall ? `${mall.name} bünyesindeki işletmeler` : 'Yetkili olduğunuz işletmeler'}
        actions={
          <IconButton icon={RefreshCw} label="Yenile" variant="secondary" onClick={() => fetchData(true)} className={cn(isRefreshing && '[&_svg]:animate-spin')} />
        }
      />

      {fetchError && <ErrorBanner message={fetchError} onRetry={() => fetchData(true)} className="mb-4" />}

      <div className="space-y-6">
        {mall && (
          <Card className="p-4 sm:p-5 flex items-center gap-4">
            <IconTile icon={Building2} size="lg" />
            <div className="min-w-0 flex-1">
              <p className="text-[15px] font-semibold text-foreground truncate">{mall.name}</p>
              <p className="mt-0.5 text-sm text-muted-foreground flex items-center gap-1.5 truncate">
                <MapPin size={13} className="shrink-0" /> {mall.address || 'Adres bilgisi girilmemiş'}
              </p>
            </div>
            <div className="shrink-0 text-right">
              <p className="text-xs text-muted-foreground">İşletme</p>
              <p className="text-2xl font-bold tabular-nums text-foreground leading-tight">{businesses.length}</p>
            </div>
          </Card>
        )}

        <div>
          <SearchInput value={search} onChange={setSearch} placeholder="İşletme veya kategori ara…" className="mb-4 sm:max-w-sm" />

          {loading && !initialLoadDone.current ? (
            <LoadingState label="Listeleniyor…" />
          ) : filteredBiz.length === 0 ? (
            <Card>
              {profile?.mall_id ? (
                <EmptyState
                  icon={Store}
                  title={search ? 'Eşleşen işletme yok' : 'Henüz işletme yok'}
                  description={search ? 'Farklı bir arama deneyin.' : 'Bu AVM için henüz bir işletme tanımlanmamış.'}
                />
              ) : (
                <EmptyState
                  icon={AlertTriangle}
                  title="AVM atanmamış"
                  description="Hesabınıza atanmış bir AVM bulunmuyor. Lütfen yönetici ile iletişime geçin."
                />
              )}
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {filteredBiz.map(biz => (
                <Link
                  key={biz.id}
                  href={`/client/businesses/${biz.id}`}
                  className="group p-card p-card-interactive p-4 sm:p-5 flex items-center gap-3 sm:flex-col sm:items-stretch sm:gap-4"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1 sm:flex-none">
                    <IconTile icon={Store} />
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-foreground truncate">{biz.name}</p>
                      <p className="mt-0.5 text-sm text-muted-foreground truncate">{biz.category || 'Kategori yok'}</p>
                    </div>
                    <Badge tone="success" className="hidden sm:inline-flex">Aktif</Badge>
                  </div>
                  <div className="shrink-0 flex items-center gap-2 sm:pt-3 sm:border-t sm:border-border sm:justify-between">
                    <Badge tone="success" className="sm:hidden">Aktif</Badge>
                    <span className="hidden sm:inline text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">Servis geçmişi</span>
                    <ChevronRight size={16} className="text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </PanelLayout>
  );
}

export default function ClientBusinessesPage() {
  return (
    <RouteGuard requiredRole="client">
      <ClientBusinessesContent />
    </RouteGuard>
  );
}
