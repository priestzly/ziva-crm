'use client';

import React, { useEffect, useState } from 'react';
import { Sidebar, Topbar } from '@/components/DashboardShell';
import RouteGuard from '@/components/RouteGuard';
import { useAuth } from '@/context/AuthContext';
import { supabase, type Business, type Mall } from '@/lib/supabase';
import {
  Building2, Search, Loader2, Store, ChevronRight,
  MapPin, ShieldCheck, Mail
} from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';

function ClientBusinessesContent() {
  const { profile, loading: authLoading } = useAuth();
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [mall, setMall] = useState<Mall | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchData = async () => {
    if (!profile) return;
    setLoading(true);

    // 1. Get the mall details if the client is assigned to one
    if (profile.mall_id) {
      const { data: mallData } = await supabase.from('malls').select('*').eq('id', profile.mall_id).single();
      setMall(mallData);

      // 2. Get all businesses in this mall
      const { data: bizData } = await supabase
        .from('businesses')
        .select('*')
        .eq('mall_id', profile.mall_id)
        .order('name');
      setBusinesses(bizData || []);
    } else {
      // If no mall_id, maybe show only businesses specifically linked to this user's email/profile?
      // For now, if no mall_id, we assume they have no access to browse a list.
      setBusinesses([]);
    }

    setLoading(false);
  };

  useEffect(() => {
    if (!authLoading) {
      fetchData();
    }
  }, [profile, authLoading]);

  const filteredBiz = businesses.filter(b =>
    b.name.toLowerCase().includes(search.toLowerCase()) ||
    b.category?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen flex">
      <Sidebar role="client" />
      <main className="flex-1 lg:ml-72 transition-all duration-500">
        <Topbar
          title="İşletme Listesi"
          subtitle={mall ? `${mall.name} bünyesindeki dükkanlar` : "Yetkili olduğunuz işletmeler"}
        />

        <div className="p-6 lg:p-8 space-y-6 max-w-[1400px] mx-auto">
          {/* Mall Header Card (If exists) */}
          {mall && (
            <div className="glass rounded-3xl p-6 relative overflow-hidden animate-fade-in border border-white/[0.04]">
              <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-red-500/[0.03] to-transparent rounded-bl-full pointer-events-none" />
              <div className="flex flex-col sm:flex-row items-center gap-6 relative z-10">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-red-500/20 to-orange-500/10 border border-red-500/20 flex items-center justify-center text-red-400">
                  <Building2 size={32} />
                </div>
                <div className="text-center sm:text-left">
                  <h1 className="text-2xl font-bold tracking-tight">{mall.name}</h1>
                  <p className="text-sm text-muted-foreground flex items-center justify-center sm:justify-start gap-1.5 mt-1">
                    <MapPin size={14} className="text-red-400" /> {mall.address || 'Adres bilgisi girilmemiş'}
                  </p>
                </div>
                <div className="sm:ml-auto flex gap-3">
                  <div className="glass px-4 py-2 rounded-xl text-center">
                    <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Mağaza</p>
                    <p className="text-lg font-bold">{businesses.length}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Search */}
          <div className="relative max-w-md mx-auto sm:mx-0">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Dükkan veya kategori ara..."
              className="w-full input-premium pl-11 py-3"
            />
          </div>

          {/* Business Grid */}
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredBiz.length === 0 ? (
            <div className="glass rounded-3xl py-24 flex flex-col items-center justify-center text-center px-6">
              <Store className="w-12 h-12 text-muted-foreground/20 mb-4" />
              <h3 className="text-lg font-bold">Kayıtlı işletme bulunamadı</h3>
              {profile?.mall_id ? (
                <p className="text-sm text-muted-foreground mt-1 max-w-xs">Bu AVM için henüz bir dükkan tanımlanmamış. Lütfen yönetici ile iletişime geçin.</p>
              ) : (
                <p className="text-sm text-muted-foreground mt-1 max-w-xs text-amber-400 font-medium italic">Hesabınıza atanmış bir AVM bulunmuyor. Lütfen yönetici ile iletişime geçin.</p>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredBiz.map((biz, i) => (
                <Link
                  key={biz.id}
                  href={`/client/businesses/${biz.id}`}
                  className="glass rounded-3xl p-6 card-hover animate-fade-in group flex flex-col justify-between"
                  style={{ animationDelay: `${i * 0.04}s` }}
                >
                  <div>
                    <div className="flex items-start justify-between mb-4">
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-red-500/10 to-orange-500/5 border border-red-500/10 flex items-center justify-center text-red-400 group-hover:scale-110 transition-transform duration-300">
                        <Store size={22} />
                      </div>
                      <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        <ShieldCheck size={14} />
                      </div>
                    </div>
                    <h3 className="font-bold text-lg mb-0.5 group-hover:text-red-400 transition-colors">{biz.name}</h3>
                    <p className="text-xs text-muted-foreground">{biz.category || 'Kategori belirtilmemiş'}</p>
                  </div>

                  <div className="mt-8 flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-muted-foreground group-hover:text-red-400 transition-colors">
                    Detayları Gör <ChevronRight size={14} />
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
