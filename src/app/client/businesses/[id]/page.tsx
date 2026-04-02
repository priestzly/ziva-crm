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
import { useParams } from 'next/navigation';

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
  const bizId = params?.id as string;

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
      
      const [bizRes, recsRes] = await Promise.all([
        supabase.from('businesses').select('*').eq('id', bizId).single(),
        supabase.from('maintenance_records').select('*').eq('business_id', bizId).order('created_at', { ascending: false }),
      ]);

      if (bizRes.error) throw bizRes.error;
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
  }, [bizId]);

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
      <div className="min-h-screen flex">
        <Sidebar role={profile?.role === 'admin' ? 'admin' : 'client'} />
        <main className="flex-1 lg:ml-72 flex flex-col items-center justify-center bg-[hsl(var(--background))]">
          <Loader2 className="w-10 h-10 animate-spin text-primary mb-4" />
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground italic">Detaylar Hazırlanıyor</p>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex">
      <Sidebar role={profile?.role === 'admin' ? 'admin' : 'client'} />
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
          <div className="glass rounded-3xl p-8 flex flex-col md:flex-row md:items-center justify-between gap-8 border border-white/[0.04] bg-gradient-to-br from-white/[0.03] to-transparent shadow-2xl relative overflow-hidden group">
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
              <div className="glass bg-white/[0.02] border border-white/[0.04] p-5 rounded-2xl text-center min-w-[130px] shadow-lg">
                <p className="text-[9px] text-muted-foreground uppercase tracking-[0.2em] font-black mb-1">Toplam İş Emri</p>
                <p className="text-3xl font-black tabular-nums leading-none">{records.length}</p>
              </div>
              <div className="glass bg-white/[0.02] border border-white/[0.04] p-5 rounded-2xl text-center min-w-[130px] shadow-lg">
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
              <div className="glass rounded-3xl flex flex-col items-center justify-center py-24 gap-4 border border-white/[0.04]">
                <ClipboardList className="w-16 h-16 text-muted-foreground/10" />
                <p className="text-sm font-black uppercase tracking-widest text-muted-foreground italic">Henüz bir rapor oluşturulmamış.</p>
              </div>
            ) : (
              <div className="space-y-6">
                {records.map((rec, i) => {
                  const recPhotos = photos[rec.id] || [];
                  const parsed = parseDescription(rec.description);

                  return (
                    <div key={rec.id} className="glass rounded-3xl border border-white/[0.04] p-6 sm:p-8 shadow-xl animate-fade-in group/rec hover:bg-white/[0.02] transition-colors" style={{ animationDelay: `${i * 0.05}s` }}>
                      
                      {/* Ticket Header */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-8 pb-6 border-b border-white/[0.04]">
                        <div className="flex items-center gap-4">
                          <div className="w-14 h-14 rounded-2xl bg-white/[0.03] flex items-center justify-center border border-white/[0.06] group-hover/rec:bg-primary/20 group-hover/rec:border-primary/30 transition-all duration-500">
                            <Wrench size={24} className="text-muted-foreground group-hover/rec:text-white" />
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
                          <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 flex items-center gap-2 bg-white/[0.03] px-3 py-2 rounded-xl border border-white/5">
                            <Calendar size={12} className="text-primary" /> {new Date(rec.created_at).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}
                          </span>
                        </div>
                      </div>

                      {/* Ticket Body */}
                      <div className="space-y-6">
                        <div className="bg-white/[0.02] border border-white/[0.04] p-6 rounded-3xl relative overflow-hidden">
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
                                <p className="text-xs font-bold text-foreground bg-white/[0.02] border border-white/[0.04] px-4 py-3 rounded-2xl shadow-inner">{parsed.materials}</p>
                              </div>
                            )}
                            {parsed.technician && (
                              <div className="space-y-2">
                                <p className="text-[9px] font-black text-muted-foreground uppercase tracking-[0.2em] ml-1">Saha Personeli</p>
                                <p className="text-xs font-bold flex items-center gap-2.5 text-foreground bg-white/[0.02] border border-white/[0.04] px-4 py-3 rounded-2xl shadow-inner">
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
                                  className="aspect-square rounded-2xl overflow-hidden cursor-zoom-in group/photo border border-white/[0.06] relative bg-white/5"
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

        {/* Lightbox Modal */}
        {selectedPhoto && (
          <div 
            className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-xl flex items-center justify-center p-4 min-h-[100dvh] animate-fade-in"
            onClick={() => setSelectedPhoto(null)}
          >
            <button 
              className="absolute top-6 right-6 w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center hover:bg-red-500 transition-all z-[110] shadow-2xl"
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
      </main>
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
