'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { PanelLayout } from '@/components/DashboardShell';
import {
  IconButton, Card, IconTile, Badge, SectionTitle, LoadingState, EmptyState, ErrorBanner, Sheet,
} from '@/components/ui';
import RouteGuard from '@/components/RouteGuard';
import { useAuth } from '@/context/AuthContext';
import { supabase, type Business, type MaintenanceRecord, type MaintenancePhoto } from '@/lib/supabase';
import {
  ArrowLeft, Calendar, ClipboardList, Eye, X, ShieldCheck, ImageIcon, UserCircle, Wrench, RefreshCw,
  Store, ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';

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

const statusTone = (status: string): 'success' | 'info' | 'danger' | 'neutral' => {
  switch (status) {
    case 'Tamamlandı': return 'success';
    case 'Devam Ediyor': return 'info';
    case 'İptal / Ertelendi': return 'danger';
    default: return 'neutral';
  }
};

function DetailContent() {
  const { profile } = useAuth();
  const params = useParams();
  const router = useRouter();
  const bizId = params?.id as string;
  const [viewingRecord, setViewingRecord] = useState<MaintenanceRecord | null>(null);

  const [business, setBusiness] = useState<Business | null>(null);
  const [records, setRecords] = useState<MaintenanceRecord[]>([]);
  const [photos, setPhotos] = useState<Record<string, MaintenancePhoto[]>>({});
  const [loading, setLoading] = useState(true);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);

  // Fotoğraf görüntüleyici Esc ile kapanır
  useEffect(() => {
    if (!selectedPhoto) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setSelectedPhoto(null); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [selectedPhoto]);
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

  const panelRole = profile?.role === 'admin' ? 'admin' : 'client';

  if (loading && !initialLoadDone.current) {
    return (
      <PanelLayout role={panelRole} title="İşletme kartı" subtitle="Yükleniyor…" width="default">
        <LoadingState label="Detaylar hazırlanıyor…" />
      </PanelLayout>
    );
  }

  const totalPhotos = Object.values(photos).reduce((sum, list) => sum + list.length, 0);
  const backHref = profile?.role === 'admin' ? '/admin/businesses' : '/client/businesses';
  const backLabel = profile?.role === 'admin' ? 'İşletmeler' : 'İşletmelerim';

  return (
    <PanelLayout
      role={panelRole}
      title="İşletme kartı"
      subtitle={isRefreshing ? 'Yenileniyor…' : (business?.name || 'Veri kartı')}
    >
      <Link href={backHref} className="hidden lg:inline-flex p-btn p-btn-ghost p-btn-sm -ml-3 mb-3">
        <ArrowLeft size={14} /> {backLabel}
      </Link>

      {fetchError && <ErrorBanner message={fetchError} onRetry={() => fetchData(true)} className="mb-4" />}

      <div className="space-y-6">
        {/* Header card */}
        <Card className="overflow-hidden">
          <div className="flex items-start gap-4 p-4 sm:p-5">
            <IconTile icon={Store} size="lg" />
            <div className="min-w-0 flex-1">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground truncate">{business?.name || '—'}</h1>
              <p className="mt-1 text-sm text-muted-foreground flex items-center gap-1.5">
                <Wrench size={14} className="shrink-0" /> {business?.category || 'Kategori yok'}
              </p>
              <Badge tone="success" icon={ShieldCheck} className="mt-3">Doğrulanmış işletme</Badge>
            </div>
            <IconButton icon={RefreshCw} label="Yenile" variant="secondary" onClick={() => fetchData(true)} className={cn(isRefreshing && '[&_svg]:animate-spin')} />
          </div>
          <div className="grid grid-cols-3 border-t border-border divide-x divide-border bg-surface/40">
            <MiniStat label="Toplam iş emri" value={<span className="tabular-nums">{records.length}</span>} />
            <MiniStat
              label="Son operasyon"
              value={records[0] ? new Date(records[0].created_at).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' }) : 'Kayıt yok'}
            />
            <MiniStat label="Fotoğraf" value={<span className="tabular-nums">{totalPhotos}</span>} />
          </div>
        </Card>

        {/* Records */}
        <section>
          <SectionTitle action={records.length > 0 ? <Badge>{records.length} kayıt</Badge> : undefined}>Servis geçmişi</SectionTitle>

          {records.length === 0 ? (
            <Card>
              <EmptyState icon={ClipboardList} title="Henüz kayıt yok" description="Bu işletme için henüz bir servis raporu oluşturulmamış." />
            </Card>
          ) : (
            <div className="space-y-3">
              {records.map(rec => {
                const recPhotos = photos[rec.id] || [];
                const parsed = parseDescription(rec.description);

                return (
                  <React.Fragment key={rec.id}>
                    {/* Mobile: compact card, opens detail sheet */}
                    <button
                      type="button"
                      onClick={() => setViewingRecord(rec)}
                      className="md:hidden w-full text-left p-card p-card-interactive p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-semibold text-foreground truncate">{rec.service_type || 'Genel bakım'}</p>
                          <p className="mt-0.5 text-xs text-muted-foreground tabular-nums">Kayıt #{rec.id.substring(0, 6).toUpperCase()}</p>
                        </div>
                        <Badge tone={statusTone(parsed.status)} className="shrink-0">{parsed.status}</Badge>
                      </div>
                      <p className="mt-2 text-sm text-muted-foreground line-clamp-2">{parsed.text || 'Detay girilmemiş.'}</p>
                      <div className="mt-3 pt-3 border-t border-border flex items-center justify-between gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1.5 tabular-nums">
                          <Calendar size={13} /> {new Date(rec.created_at).toLocaleDateString('tr-TR')}
                        </span>
                        <span className="flex items-center gap-3">
                          {recPhotos.length > 0 && (
                            <span className="flex items-center gap-1 tabular-nums"><ImageIcon size={13} /> {recPhotos.length}</span>
                          )}
                          <span className="flex items-center gap-0.5 font-medium text-primary">Detaylar <ChevronRight size={14} /></span>
                        </span>
                      </div>
                    </button>

                    {/* Desktop: full record card */}
                    <Card className="hidden md:block">
                      <div className="flex items-start justify-between gap-4 px-5 pt-5 pb-4 border-b border-border">
                        <div className="flex items-center gap-3 min-w-0">
                          <IconTile icon={Wrench} tone="neutral" />
                          <div className="min-w-0">
                            <p className="text-[15px] font-semibold text-foreground truncate">{rec.service_type || 'Genel bakım'}</p>
                            <p className="mt-0.5 text-xs text-muted-foreground tabular-nums">Kayıt #{rec.id.substring(0, 6).toUpperCase()}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="flex items-center gap-1.5 text-sm text-muted-foreground tabular-nums">
                            <Calendar size={14} /> {new Date(rec.created_at).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}
                          </span>
                          <Badge tone={statusTone(parsed.status)}>{parsed.status}</Badge>
                        </div>
                      </div>

                      <div className="p-5 space-y-5">
                        <div>
                          <p className="text-xs font-medium text-muted-foreground mb-1.5">Saha operasyon detayı</p>
                          <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{parsed.text || 'Operasyon notu eklenmemiş.'}</p>
                        </div>

                        {(parsed.materials || parsed.technician) && (
                          <div className="grid grid-cols-2 gap-3">
                            {parsed.materials && (
                              <InfoTile label="Kullanılan malzemeler">{parsed.materials}</InfoTile>
                            )}
                            {parsed.technician && (
                              <InfoTile label="Saha personeli">
                                <span className="flex items-center gap-2"><UserCircle size={16} className="text-muted-foreground shrink-0" /> {parsed.technician}</span>
                              </InfoTile>
                            )}
                          </div>
                        )}

                        {recPhotos.length > 0 && (
                          <div>
                            <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1.5">
                              <ImageIcon size={13} /> Fotoğraflar ({recPhotos.length})
                            </p>
                            <PhotoGrid photos={recPhotos} onOpen={setSelectedPhoto} className="grid-cols-4 lg:grid-cols-6" />
                          </div>
                        )}
                      </div>
                    </Card>
                  </React.Fragment>
                );
              })}
            </div>
          )}
        </section>
      </div>

      {/* Record detail sheet (mobile) */}
      <Sheet
        isOpen={viewingRecord !== null}
        onClose={() => setViewingRecord(null)}
        title="Operasyon raporu"
        description={viewingRecord ? new Date(viewingRecord.created_at).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' }) : undefined}
      >
        {viewingRecord && (() => {
          const parsed = parseDescription(viewingRecord.description);
          const recPhotos = photos[viewingRecord.id] || [];
          return (
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">Hizmet türü</p>
                  <p className="mt-0.5 font-semibold text-foreground">{viewingRecord.service_type || 'Genel bakım'}</p>
                </div>
                <Badge tone={statusTone(parsed.status)} className="shrink-0">{parsed.status}</Badge>
              </div>

              <InfoTile label="Saha rapor notu">
                <span className="font-normal whitespace-pre-wrap leading-relaxed">{parsed.text || 'Açıklama belirtilmemiş.'}</span>
              </InfoTile>

              <div className="grid grid-cols-2 gap-3">
                <InfoTile label="Personel">{parsed.technician || 'Teknik ekip'}</InfoTile>
                <InfoTile label="Kayıt no"><span className="tabular-nums">#{viewingRecord.id.substring(0, 6).toUpperCase()}</span></InfoTile>
              </div>

              {parsed.materials && (
                <InfoTile label="Kullanılan malzemeler">{parsed.materials}</InfoTile>
              )}

              {recPhotos.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-2">Fotoğraflar ({recPhotos.length})</p>
                  <PhotoGrid photos={recPhotos} onOpen={setSelectedPhoto} className="grid-cols-3" />
                </div>
              )}
            </div>
          );
        })()}
      </Sheet>

      {/* Lightbox */}
      {selectedPhoto && (
        <div
          className="fixed inset-0 z-[200] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 min-h-[100dvh] p-anim-fade"
          onClick={() => setSelectedPhoto(null)}
          role="dialog"
          aria-modal="true"
          aria-label="Fotoğraf görüntüleyici"
        >
          <button
            type="button"
            aria-label="Kapat"
            className="absolute top-4 right-4 sm:top-6 sm:right-6 z-[210] p-btn p-btn-secondary p-btn-icon"
            onClick={() => setSelectedPhoto(null)}
          >
            <X size={18} />
          </button>
          <div className="relative w-full max-w-5xl h-full flex items-center justify-center pointer-events-none">
            <img
              src={selectedPhoto}
              className="max-w-full max-h-[90vh] rounded-2xl object-contain pointer-events-auto border border-border shadow-xl p-anim-pop"
              alt="Saha operasyon görseli"
              onClick={e => e.stopPropagation()}
            />
          </div>
        </div>
      )}
    </PanelLayout>
  );
}

function MiniStat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="px-3 py-3 sm:px-5 sm:py-4 min-w-0">
      <p className="text-xs text-muted-foreground truncate">{label}</p>
      <p className="mt-1 text-base sm:text-lg font-semibold text-foreground truncate">{value}</p>
    </div>
  );
}

function InfoTile({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-surface/50 px-4 py-3 min-w-0">
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <div className="text-sm font-medium text-foreground break-words">{children}</div>
    </div>
  );
}

function PhotoGrid({ photos, onOpen, className }: { photos: MaintenancePhoto[]; onOpen: (url: string) => void; className?: string }) {
  return (
    <div className={cn('grid gap-2 sm:gap-3', className)}>
      {photos.map(photo => (
        <button
          key={photo.id}
          type="button"
          onClick={() => onOpen(photo.photo_url)}
          aria-label="Fotoğrafı büyüt"
          className="group relative aspect-square rounded-xl overflow-hidden border border-border bg-muted cursor-zoom-in focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
        >
          <img src={photo.photo_url} alt="Saha fotoğrafı" className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
          <span className="absolute inset-0 flex items-center justify-center bg-background/40 opacity-0 group-hover:opacity-100 transition-opacity">
            <Eye size={18} className="text-foreground" />
          </span>
        </button>
      ))}
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
