'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Sidebar, Topbar } from '@/components/DashboardShell';
import RouteGuard from '@/components/RouteGuard';
import { useAuth } from '@/context/AuthContext';
import { supabase, type Business, type MaintenanceRecord, type MaintenancePhoto } from '@/lib/supabase';
import { 
  ArrowLeft, Calendar, User, ClipboardList, Eye, X,
  ShieldCheck, Loader2, ImageIcon, Download, UserCircle, Wrench, RefreshCw, ShieldAlert
} from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { useParams, useRouter } from 'next/navigation';
import { useIsMobile } from '@/hooks/useIsMobile';
import { MobileBottomSheet } from '@/components/MobileBottomSheet';

export interface ParsedDescription {
  text: string;
  technician: string;
  materials: string;
  status: string;
  cost: string;
}

const parseDescription = (desc: string): ParsedDescription => {
  try {
    const parsed = JSON.parse(desc);
    return {
      text: parsed.text || '',
      technician: parsed.technician || '',
      materials: parsed.materials || '',
      status: parsed.status || 'Tamamlandı',
      cost: parsed.cost || ''
    };
  } catch (e) {
    return { text: desc, technician: '', materials: '', status: 'Tamamlandı', cost: '' };
  }
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'Tamamlandı': return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
    case 'Devam Ediyor': return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
    case 'İptal / Ertelendi': return 'bg-red-500/10 text-red-500 border-red-500/20';
    default: return 'bg-[hsl(var(--muted))] text-muted-foreground border-[hsl(var(--border))]';
  }
};

function DetailContent() {
  const { profile } = useAuth();
  const params = useParams();
  const router = useRouter();
  const bizId = params?.id as string;
  const isMobile = useIsMobile();
  const [viewingRecord, setViewingRecord] = useState<MaintenanceRecord | null>(null);

  const [business, setBusiness] = useState<Business | null>(null);
  const [records, setRecords] = useState<MaintenanceRecord[]>([]);
  const [photos, setPhotos] = useState<Record<string, MaintenancePhoto[]>>({});
  const [loading, setLoading] = useState(true);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const initialLoadDone = useRef(false);
  const subscriptionRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  /**
   * ENHANCED FAILSAFE FETCH PATTERN
   */
  const fetchData = useCallback(async (isRefresh = false) => {
    if (!bizId) return;
    if (!initialLoadDone.current) setLoading(true);
    if (isRefresh) {
      setIsRefreshing(true);
      setFetchError(null);
    }
    
    try {
      console.log('Fetching business detail data for:', bizId);
      
      let bizQuery = supabase.from('businesses').select('*').eq('id', bizId);
      if (profile?.role === 'client' && profile?.mall_id) {
        bizQuery = bizQuery.eq('mall_id', profile.mall_id);
      }

      const [bizRes, recsRes] = await Promise.all([
        bizQuery.single(),
        supabase.from('maintenance_records').select('*').eq('business_id', bizId).order('created_at', { ascending: false }),
      ]);

      if (bizRes.error) {
        if (bizRes.error.code === 'PGRST116') {
          throw new Error('Bu işletmeye erişim yetkiniz bulunmamaktadır.');
        }
        throw bizRes.error;
      }
      if (recsRes.error) throw recsRes.error;

      setBusiness(bizRes.data);
      const recs = recsRes.data || [];
      setRecords(recs);
      
      if (recs.length > 0) {
        const { data: photoData, error: photoError } = await supabase
          .from('maintenance_photos')
          .select('*')
          .in('record_id', recs.map((r: MaintenanceRecord) => r.id));
        
        if (photoError) console.error('Photos fetch error:', photoError);
        
        const grouped: Record<string, MaintenancePhoto[]> = {};
        (photoData || []).forEach((p: MaintenancePhoto) => {
          if (!grouped[p.record_id]) grouped[p.record_id] = [];
          grouped[p.record_id].push(p);
        });
        setPhotos(grouped);
      }
      initialLoadDone.current = true;
    } catch (err: any) {
      console.error('Error fetching business detail:', err);
      setFetchError(`Kayıtlar yüklenemedi: ${err.message || 'Bilinmeyen hata'}`);
    } finally {
      setLoading(false);
      if (isRefresh) setIsRefreshing(false);
    }
  }, [bizId, profile?.role, profile?.mall_id]);

  const setupSubscription = useCallback(() => {
    if (!bizId) return;
    
    if (subscriptionRef.current) {
      supabase.removeChannel(subscriptionRef.current);
      subscriptionRef.current = null;
    }

    const sub = supabase.channel(`biz-${bizId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'maintenance_records', filter: `business_id=eq.${bizId}` }, () => fetchData(true))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'maintenance_photos' }, () => fetchData(true))
      .subscribe((status: string) => {
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.warn('Realtime error, retrying...');
          setTimeout(() => setupSubscription(), 3000);
        }
      });
    
    subscriptionRef.current = sub;
    return sub;
  }, [bizId, fetchData]);

  useEffect(() => {
    if (bizId) {
      fetchData();
      setupSubscription();
    }
  }, [bizId, fetchData, setupSubscription]);

  const visibilityTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!bizId) return;

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
  }, [bizId, fetchData, setupSubscription]);

  if (loading && !initialLoadDone.current) {
    return (
      <div className={cn("min-h-screen flex", isMobile ? "bg-black" : "bg-[hsl(var(--background))]")}>
        <Sidebar role={profile?.role === 'admin' ? 'admin' : 'client'} />
        <main className="flex-1 lg:ml-72 flex flex-col items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary mb-3" />
          <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground italic">Detaylar Hazırlanıyor</p>
        </main>
      </div>
    );
  }

  return (
    <div className={cn("min-h-screen flex", isMobile ? "bg-black text-white" : "bg-[hsl(var(--background))]")}>
      <Sidebar role={profile?.role === 'admin' ? 'admin' : 'client'} />
      
      {isMobile ? (
        <main className="flex-1 pb-28 w-full overflow-x-hidden relative bg-black pb-safe">
          <Topbar 
            title="İşletme Kartı" 
            subtitle={business?.name || 'Yükleniyor...'}
          />

          <div className="p-4 space-y-5">
            {/* Error Banner */}
            {fetchError && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 flex flex-col gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center text-red-500">
                    <ShieldAlert size={20} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-red-400">Veri Hatası</p>
                    <p className="text-[10px] text-red-400/70">{fetchError}</p>
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

            {/* Back & Refresh Header Controls */}
            <div className="flex items-center justify-between">
              <button 
                onClick={() => router.back()}
                className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.1em] text-white/40 active:text-primary transition-colors cursor-pointer"
              >
                <div className="p-2.5 rounded-xl border border-white/[0.06] bg-white/[0.02]">
                  <ArrowLeft size={14} />
                </div>
                Geri Dön
              </button>

              <button 
                onClick={() => fetchData(true)}
                className="p-3 rounded-2xl bg-white/[0.03] border border-white/[0.06] text-white/50 active:scale-90 transition-all shrink-0"
              >
                <RefreshCw size={14} className={isRefreshing ? "animate-spin" : ""} />
              </button>
            </div>

            {/* Mobile Header Card */}
            <div className="bg-card border border-border rounded-xl p-4 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/[0.01] rounded-bl-full pointer-events-none" />
              
              <div className="space-y-3 relative z-10">
                <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[8px] font-black uppercase tracking-widest">
                  <ShieldCheck size={10} />
                  Güvenli Kayıt
                </div>
                <div>
                  <h1 className="text-xl font-black tracking-tight uppercase text-foreground mb-1">{business?.name || '—'}</h1>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
                    <Wrench size={12} className="text-primary" /> {business?.category || 'Genel Birim'}
                  </p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-3 mt-4 relative z-10">
                <div className="bg-secondary border border-border p-3 rounded-xl text-center">
                  <p className="text-[8px] text-muted-foreground/60 uppercase tracking-[0.2em] font-black mb-1">Toplam Operasyon</p>
                  <p className="text-xl font-black text-foreground tabular-nums leading-none">{records.length}</p>
                </div>
                <div className="bg-secondary border border-border p-3 rounded-xl text-center">
                  <p className="text-[8px] text-muted-foreground/60 uppercase tracking-[0.2em] font-black mb-1">Son Müdahale</p>
                  <p className="text-xs font-black text-foreground/80 uppercase tracking-wide leading-none mt-1">
                    {records[0] ? new Date(records[0].created_at).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' }) : 'Kayıt Yok'}
                  </p>
                </div>
              </div>
            </div>

            {/* Mobile Records List */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 ml-1">
                <div className="w-1 h-4 bg-red-500 rounded-full" />
                <h2 className="text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground">Servis Günlükleri</h2>
              </div>

              {records.length === 0 ? (
                <div className="bg-card border border-border rounded-xl flex flex-col items-center justify-center py-16 gap-3">
                  <ClipboardList className="w-12 h-12 text-muted-foreground/20" />
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50 italic">Kayıt Bulunmuyor</p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {records.map((rec, i) => {
                    const parsed = parseDescription(rec.description);

                    return (
                      <div 
                        key={rec.id} 
                        onClick={() => setViewingRecord(rec)}
                        className="flex flex-col p-4 bg-card border border-border rounded-xl active:scale-[0.98] transition-all cursor-pointer"
                      >
                        <div className="flex items-start justify-between gap-4 mb-2 pb-2 border-b border-border">
                          <div>
                            <p className="text-[8px] font-black text-muted-foreground/30 tracking-[0.15em] uppercase mb-0.5">KAYIT: #{rec.id.substring(0, 6).toUpperCase()}</p>
                            <h4 className="font-black text-xs uppercase tracking-tight text-foreground">{rec.service_type || 'Genel Bakım'}</h4>
                          </div>
                          <span className={cn("text-[8px] font-black uppercase tracking-[0.15em] px-2 py-1 rounded-lg border", getStatusColor(parsed.status))}>
                            {parsed.status}
                          </span>
                        </div>
                        
                        <p className="text-xs text-foreground/85 line-clamp-2 leading-relaxed">
                          {parsed.text || 'Detay girilmemiş.'}
                        </p>
                        
                        <div className="flex items-center justify-between mt-3 text-[9px] text-muted-foreground/50 font-bold uppercase tracking-wider">
                          <span className="flex items-center gap-1"><Calendar size={10} className="text-primary" /> {new Date(rec.created_at).toLocaleDateString('tr-TR')}</span>
                          <span className="text-red-500 font-black">Detayları Gör →</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Mobile Sheet details */}
            <MobileBottomSheet
              isOpen={viewingRecord !== null}
              onClose={() => setViewingRecord(null)}
              title="Operasyon Raporu"
            >
              {viewingRecord && (() => {
                const parsed = parseDescription(viewingRecord.description);
                const recPhotos = photos[viewingRecord.id] || [];
                return (
                  <div className="space-y-5">
                    <div className="bg-white/[0.02] border border-white/[0.04] p-4 rounded-xl">
                      <p className="text-[8px] font-black text-primary uppercase tracking-[0.2em] mb-2">Hizmet Türü</p>
                      <h4 className="font-black text-sm uppercase text-white">{viewingRecord.service_type || 'Genel Bakım'}</h4>
                    </div>

                    <div className="bg-white/[0.02] border border-white/[0.04] p-4 rounded-xl">
                      <p className="text-[8px] font-black text-primary uppercase tracking-[0.2em] mb-2">Saha Rapor Notu</p>
                      <p className="text-xs text-white/80 leading-relaxed font-medium whitespace-pre-wrap">{parsed.text || 'Açıklama belirtilmemiş.'}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-white/[0.02] border border-white/[0.04] p-3 rounded-xl">
                        <p className="text-[8px] font-black text-white/30 uppercase tracking-[0.2em] mb-1">Personel</p>
                        <p className="text-xs font-bold text-white/80">{parsed.technician || 'Teknik Ekip'}</p>
                      </div>
                      <div className="bg-white/[0.02] border border-white/[0.04] p-3 rounded-xl">
                        <p className="text-[8px] text-white/30 uppercase tracking-[0.2em] font-black mb-1">Durum</p>
                        <span className={cn("text-[9px] font-black uppercase tracking-[0.15em] px-2 py-0.5 rounded-lg border inline-block mt-0.5", getStatusColor(parsed.status))}>
                          {parsed.status}
                        </span>
                      </div>
                    </div>

                    {parsed.materials && (
                      <div className="bg-white/[0.02] border border-white/[0.04] p-4 rounded-xl">
                        <p className="text-[8px] font-black text-white/30 uppercase tracking-[0.2em] mb-1.5">Kullanılan Sarf Malzemeler</p>
                        <p className="text-xs font-bold text-white/80">{parsed.materials}</p>
                      </div>
                    )}

                    {recPhotos.length > 0 && (
                      <div className="space-y-2.5">
                        <p className="text-[8px] font-black text-white/30 uppercase tracking-[0.2em] ml-1">Ekspertiz Fotoğrafları ({recPhotos.length})</p>
                        <div className="grid grid-cols-3 gap-2">
                          {recPhotos.map((photo) => (
                            <div 
                              key={photo.id}
                              className="aspect-square rounded-xl overflow-hidden cursor-zoom-in border border-white/[0.06] relative bg-white/5"
                              onClick={() => setSelectedPhoto(photo.photo_url)}
                            >
                              <img src={photo.photo_url} alt="Saha Rapor Fotoğrafı" className="w-full h-full object-cover" />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}
            </MobileBottomSheet>
          </div>
        </main>
      ) : (
        <main className="flex-1 lg:ml-72 transition-all duration-500 bg-[hsl(var(--background))]">
          <Topbar 
            title="İşletme Detayları" 
            subtitle={isRefreshing ? 'Veriler Yenileniyor...' : (business?.name || 'Veri Kartı')}
          />

          <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-5xl mx-auto">
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

            {/* Controls */}
            <div className="flex items-center justify-between">
              <Link 
                href={profile?.role === 'admin' ? '/admin/businesses' : '/client/dashboard'} 
                className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.1em] text-muted-foreground hover:text-primary transition-colors group"
              >
                <div className="p-2.5 rounded-xl border border-white/[0.06] bg-white/[0.02] group-hover:bg-primary/10 group-hover:border-primary/20">
                  <ArrowLeft size={16} />
                </div>
                Geri Dön
              </Link>

              <button 
                onClick={() => fetchData(true)}
                className="p-3 rounded-2xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06] transition-colors text-muted-foreground"
                title="Yenile"
              >
                <RefreshCw size={20} className={cn("transition-transform duration-500", isRefreshing && "animate-spin")} />
              </button>
            </div>

            {/* Header Card */}
            <div className="glass rounded-xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-8 border border-border shadow-2xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-64 h-64 bg-red-500/[0.02] rounded-bl-full pointer-events-none" />
              
              <div className="space-y-4 relative z-10">
                <div className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-black uppercase tracking-widest">
                  <ShieldCheck size={14} />
                  Doğrulanmış İşletme Kartı
                </div>
                <div>
                  <h1 className="text-3xl sm:text-4xl font-black tracking-tight uppercase group-hover:text-red-500 transition-colors mb-2">{business?.name || '—'}</h1>
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                    <Wrench size={14} className="text-primary" /> {business?.category || 'Sınıflandırılmamış'}
                  </p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 relative z-10">
                <div className="glass bg-card border border-border p-4 rounded-xl text-center min-w-[130px] shadow-lg">
                  <p className="text-[9px] text-muted-foreground uppercase tracking-[0.2em] font-black mb-1">Toplam İş Emri</p>
                  <p className="text-3xl font-black tabular-nums leading-none">{records.length}</p>
                </div>
                <div className="glass bg-card border border-border p-4 rounded-xl text-center min-w-[130px] shadow-lg">
                  <p className="text-[9px] text-muted-foreground uppercase tracking-[0.2em] font-black mb-1">Son Operasyon</p>
                  <p className="text-sm font-black mt-2 uppercase tracking-wide">
                    {records[0] ? new Date(records[0].created_at).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' }) : 'Kayıt Yok'}
                  </p>
                </div>
              </div>
            </div>

            {/* Records Timeline */}
            <div className="space-y-6">
              <div className="flex items-center gap-3 ml-1">
                <div className="w-1.5 h-6 bg-red-500 rounded-full" />
                <h2 className="text-lg font-black uppercase tracking-widest">Servis Operasyon Geçmişi</h2>
              </div>

              {records.length === 0 ? (
                <div className="glass rounded-xl flex flex-col items-center justify-center py-24 gap-4 border border-border">
                  <ClipboardList className="w-16 h-16 text-muted-foreground/10" />
                  <p className="text-sm font-black uppercase tracking-widest text-muted-foreground italic">Henüz bir rapor oluşturulmamış.</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {records.map((rec, i) => {
                    const recPhotos = photos[rec.id] || [];
                    const parsed = parseDescription(rec.description);

                    return (
                      <div key={rec.id} className="glass rounded-xl border border-border p-4 sm:p-5 shadow-xl animate-fade-in group/rec hover:bg-white/[0.02] transition-colors" style={{ animationDelay: `${i * 0.05}s` }}>
                        
                        {/* Ticket Header */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-8 pb-6 border-b border-border">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center border border-border group-hover/rec:bg-primary/20 group-hover/rec:border-primary/30 transition-all duration-500">
                              <Wrench size={20} className="text-muted-foreground group-hover/rec:text-white" />
                            </div>
                            <div>
                              <p className="text-[10px] font-black text-muted-foreground/40 tracking-[0.2em] uppercase mb-1">Fatura/Kayıt: #{rec.id.substring(0, 6).toUpperCase()}</p>
                              <h4 className="font-black text-lg uppercase tracking-tight">{rec.service_type || 'Genel Bakım'}</h4>
                            </div>
                          </div>
                          <div className="flex flex-wrap items-center gap-3 sm:justify-end">
                             <span className={cn("text-[9px] font-black uppercase tracking-[0.2em] px-3 py-1.5 rounded-xl border shadow-sm", getStatusColor(parsed.status))}>
                              {parsed.status}
                            </span>
                            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2 bg-secondary px-3 py-1.5 rounded-lg border border-border">
                              <Calendar size={12} className="text-primary" /> {new Date(rec.created_at).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}
                            </span>
                          </div>
                        </div>

                        {/* Ticket Body */}
                        <div className="space-y-6">
                          <div className="bg-card border border-border p-4 rounded-xl relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-4 opacity-[0.02] font-black text-4xl select-none uppercase tracking-tighter italic">REPORT</div>
                            <p className="text-[9px] font-black text-primary uppercase tracking-[0.3em] mb-4">Saha Operasyon Detayı</p>
                            <p className="text-base text-foreground/80 leading-relaxed font-medium">
                              {parsed.text || 'Operasyon notu eklenmemiş.'}
                            </p>
                          </div>
                          
                          {(parsed.materials || parsed.technician) && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              {parsed.materials && (
                                <div className="space-y-2">
                                  <p className="text-[9px] font-black text-muted-foreground uppercase tracking-[0.2em] ml-1">İkmal & Parçalar</p>
                                  <p className="text-xs font-bold text-foreground bg-secondary/30 border border-border px-4 py-3 rounded-xl shadow-inner">{parsed.materials}</p>
                                </div>
                              )}
                              {parsed.technician && (
                                <div className="space-y-2">
                                  <p className="text-[9px] font-black text-muted-foreground uppercase tracking-[0.2em] ml-1">Saha Personeli</p>
                                  <p className="text-xs font-bold flex items-center gap-2.5 text-foreground bg-secondary/30 border border-border px-4 py-3 rounded-xl shadow-inner">
                                    <UserCircle size={18} className="text-primary" /> {parsed.technician}
                                  </p>
                                </div>
                              )}
                            </div>
                          )}

                          {recPhotos.length > 0 && (
                            <div className="pt-4">
                              <p className="text-[9px] font-black text-muted-foreground uppercase tracking-[0.2em] flex items-center gap-2 mb-4 ml-1">
                                <ImageIcon size={14} className="text-primary" /> Görsel Kanıtlar / Ekspertiz ({recPhotos.length})
                              </p>
                              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                                {recPhotos.map((photo) => (
                                  <div 
                                    key={photo.id}
                                    className="aspect-square rounded-xl overflow-hidden cursor-zoom-in group/photo border border-border relative bg-secondary"
                                    onClick={() => setSelectedPhoto(photo.photo_url)}
                                  >
                                    <img src={photo.photo_url} alt="Saha Görseli" className="w-full h-full object-cover group-hover/photo:scale-110 transition-transform duration-700" />
                                    <div className="absolute inset-0 bg-red-500/20 opacity-0 group-hover/photo:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[2px]">
                                      <Eye size={20} className="text-white" />
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </main>
      )}

      {/* Lightbox Modal */}
      {selectedPhoto && (
        <div 
          className="fixed inset-0 z-[200] bg-black/95 backdrop-blur-xl flex items-center justify-center p-4 min-h-[100dvh] animate-fade-in"
          onClick={() => setSelectedPhoto(null)}
        >
          <button 
            className="absolute top-6 right-6 w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center hover:bg-red-500 transition-all z-[210] shadow-2xl cursor-pointer"
            onClick={() => setSelectedPhoto(null)}
          >
            <X size={24} className="text-white" />
          </button>
          <div className="relative w-full max-w-5xl h-full flex items-center justify-center pointer-events-none">
             <img 
              src={selectedPhoto} 
              className="max-w-full max-h-[90vh] rounded-3xl shadow-2xl animate-scale-up object-contain pointer-events-auto border border-white/5" 
              alt="Saha Operasyon Görseli"
              onClick={e => e.stopPropagation()}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default function BusinessDetailPage() {
  return (
    <RouteGuard requiredRole="client">
      <DetailContent />
    </RouteGuard>
  );
}
