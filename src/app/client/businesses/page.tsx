'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Sidebar, Topbar } from '@/components/DashboardShell';
import RouteGuard from '@/components/RouteGuard';
import { useAuth } from '@/context/AuthContext';
import { supabase, type Business, type Mall } from '@/lib/supabase';
import {
  Building2, Search, Loader2, Store, ChevronRight,
  MapPin, ShieldCheck, RefreshCw, ShieldAlert
} from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';

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
    <div className="min-h-screen flex">
      <Sidebar role="client" />
      <main className="flex-1 lg:ml-72 transition-all duration-500">
        <Topbar
          title="İşletme Rehberi"
          subtitle={isRefreshing ? 'Yenileniyor...' : (mall ? `${mall.name} bünyesindeki dükkanlar` : "Yetkili olduğunuz işletmeler")}
        />

        <div className="p-6 lg:p-8 space-y-6 max-w-[1400px] mx-auto">
          {/* Error Banner */}
          {fetchError && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 flex items-center justify-between gap-4 animate-fade-in shadow-lg shadow-red-500/5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center text-red-500">
                  <ShieldAlert size={20} />
                </div>
                <div>
                  <p className="text-sm font-bold text-red-400">Veri Hatası</p>
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

          {mall && (
            <div className="glass rounded-3xl p-8 relative overflow-hidden animate-fade-in border border-white/[0.04] bg-gradient-to-br from-white/[0.02] to-transparent shadow-2xl">
              <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-bl from-red-500/[0.05] to-transparent rounded-bl-full pointer-events-none" />
              <div className="flex flex-col sm:flex-row items-center gap-6 relative z-10">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-red-500/20 to-orange-500/10 border border-red-500/20 flex items-center justify-center text-red-400 group-hover:scale-110 transition-transform">
                  <Building2 size={36} />
                </div>
                <div className="text-center sm:text-left space-y-1">
                  <h1 className="text-3xl font-black tracking-tight uppercase tracking-widest">{mall.name}</h1>
                  <p className="text-xs text-muted-foreground flex items-center justify-center sm:justify-start gap-1.5 font-bold uppercase tracking-wider">
                    <MapPin size={14} className="text-red-400" /> {mall.address || 'Adres bilgisi girilmemiş'}
                  </p>
                </div>
                <div className="sm:ml-auto flex items-center gap-4">
                  <button 
                    onClick={() => fetchData(true)}
                    className="p-3 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors text-muted-foreground group"
                    title="Yenile"
                  >
                    <RefreshCw size={20} className={cn("transition-transform duration-500", isRefreshing && "animate-spin")} />
                  </button>
                  <div className="glass px-6 py-3 rounded-2xl text-center border border-white/10">
                    <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest leading-none mb-1">Mağaza</p>
                    <p className="text-2xl font-black tabular-nums leading-none">{businesses.length}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="relative max-w-md mx-auto sm:mx-0">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Dükkan veya kategori ara..."
              className="w-full h-12 input-premium pl-11 pr-4"
            />
          </div>

          {loading && !initialLoadDone.current ? (
            <div className="flex flex-col items-center justify-center py-24 gap-4">
              <Loader2 className="w-10 h-10 animate-spin text-primary" />
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Listeleniyor</p>
            </div>
          ) : filteredBiz.length === 0 ? (
            <div className="glass rounded-3xl py-24 flex flex-col items-center justify-center text-center px-6 border border-white/[0.04] shadow-xl">
              <Store className="w-16 h-16 text-muted-foreground/10 mb-4" />
              <h3 className="text-xl font-black uppercase tracking-tight">İşletme Bulunamadı</h3>
              {profile?.mall_id ? (
                <p className="text-xs text-muted-foreground mt-2 max-w-xs font-bold leading-relaxed px-4">Bu AVM için henüz bir dükkan tanımlanmamış veya arama kriterine uygun sonuç yok.</p>
              ) : (
                <p className="text-xs text-muted-foreground mt-2 max-w-xs text-amber-400 font-black italic">Hesabınıza atanmış bir AVM bulunmuyor. Lütfen yönetici ile iletişime geçin.</p>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredBiz.map((biz, i) => (
                <Link
                  key={biz.id}
                  href={`/client/businesses/${biz.id}`}
                  className="glass group hover:bg-white/[0.03] transition-all duration-500 rounded-3xl p-6 border border-white/[0.04] flex flex-col justify-between shadow-lg relative overflow-hidden"
                  style={{ animationDelay: `${i * 0.05}s` }}
                >
                  <div className="absolute -top-4 -right-4 opacity-5 group-hover:scale-125 group-hover:rotate-12 transition-transform duration-700">
                    <Store size={100} />
                  </div>
                  
                  <div className="relative space-y-4">
                    <div className="flex items-start justify-between">
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-red-500/20 to-orange-500/10 border border-white/[0.06] flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                        <Store size={22} />
                      </div>
                      <div className="px-2 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-black uppercase tracking-widest">
                        Aktif
                      </div>
                    </div>
                    <div>
                      <h3 className="font-black text-lg tracking-tight uppercase group-hover:text-red-500 transition-colors truncate">{biz.name}</h3>
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-0.5">{biz.category || 'Resmi İşletme'}</p>
                    </div>
                  </div>

                  <div className="relative mt-8 pt-4 border-t border-white/[0.04] flex items-center justify-between text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 group-hover:text-red-400 transition-colors">
                    Saha Notları <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default function ClientBusinessesPage() {
  return (
    <RouteGuard requiredRole="client">
      <ClientBusinessesContent />
    </RouteGuard>
  );
}
