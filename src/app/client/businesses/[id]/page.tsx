'use client';

import React, { useEffect, useState } from 'react';
import { Sidebar, Topbar } from '@/components/DashboardShell';
import RouteGuard from '@/components/RouteGuard';
import { useAuth } from '@/context/AuthContext';
import { supabase, type Business, type MaintenanceRecord, type MaintenancePhoto } from '@/lib/supabase';
import { 
  ArrowLeft, Calendar, User, ClipboardList, Eye, X,
  ShieldCheck, Loader2, ImageIcon, Download, UserCircle, Wrench
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
  const { profile, loading: authLoading } = useAuth();
  const params = useParams();
  const bizId = params?.id as string;

  const [business, setBusiness] = useState<Business | null>(null);
  const [records, setRecords] = useState<MaintenanceRecord[]>([]);
  const [photos, setPhotos] = useState<Record<string, MaintenancePhoto[]>>({});
  const [loading, setLoading] = useState(true);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    const [bizRes, recsRes] = await Promise.all([
      supabase.from('businesses').select('*').eq('id', bizId).single(),
      supabase.from('maintenance_records').select('*').eq('business_id', bizId).order('created_at', { ascending: false }),
    ]);

    setBusiness(bizRes.data);
    const recs = recsRes.data || [];
    setRecords(recs);

    // Fetch photos for all records
    if (recs.length > 0) {
      const { data: photoData } = await supabase
        .from('maintenance_photos')
        .select('*')
        .in('record_id', recs.map(r => r.id));

      const grouped: Record<string, MaintenancePhoto[]> = {};
      (photoData || []).forEach(p => {
        if (!grouped[p.record_id]) grouped[p.record_id] = [];
        grouped[p.record_id].push(p);
      });
      setPhotos(grouped);
    }

    setLoading(false);
  };

  useEffect(() => {
    if (bizId && !authLoading) fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bizId, authLoading]);

  useEffect(() => {
    if (!bizId) return;
    const sub = supabase.channel(`biz-${bizId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'maintenance_records', filter: `business_id=eq.${bizId}` }, () => fetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'maintenance_photos' }, () => fetchData())
      .subscribe();
    return () => { supabase.removeChannel(sub); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bizId]);

  if (loading) {
    return (
      <div className="min-h-screen flex">
        <Sidebar role={profile?.role === 'admin' ? 'admin' : 'client'} />
        <main className="flex-1 lg:ml-72 flex flex-col items-center justify-center bg-[hsl(var(--background))]">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground mb-4" />
          <p className="text-sm font-semibold text-muted-foreground">İşletme Detayları Yükleniyor...</p>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex">
      <Sidebar role={profile?.role === 'admin' ? 'admin' : 'client'} />
      <main className="flex-1 lg:ml-72 transition-all duration-500 bg-[hsl(var(--background))]">
        <Topbar title="İşletme Detayları" subtitle={business?.name} />

        <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-5xl mx-auto">
          {/* Back Button */}
          <Link 
            href={profile?.role === 'admin' ? '/admin/businesses' : '/client/dashboard'} 
            className="inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-primary transition-colors font-medium w-fit"
          >
            <div className="p-1.5 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))]">
              <ArrowLeft size={14} />
            </div>
            Geri Dön
          </Link>

          {/* Header Card */}
          <div className="glass rounded-xl p-6 md:p-8 flex flex-col md:flex-row md:items-end justify-between gap-6 border-l-4 border-l-primary">
            <div className="space-y-4">
              <div className="inline-flex items-center justify-center gap-1.5 px-3 py-1 rounded bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 text-[11px] font-semibold w-fit">
                <ShieldCheck size={14} />
                İşletme Aktif
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight mb-1">{business?.name}</h1>
                <p className="text-sm text-muted-foreground">{business?.category || 'Kategori belirtilmemiş'}</p>
              </div>
            </div>
            
            <div className="flex gap-4">
              <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] p-4 rounded-lg text-center flex-1 md:min-w-[120px]">
                <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold mb-1">Geçmiş Kayıt</p>
                <p className="text-2xl font-bold leading-none">{records.length}</p>
              </div>
              <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] p-4 rounded-lg text-center flex-1 md:min-w-[120px]">
                <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold mb-1">Son Ziyaret</p>
                <p className="text-base font-bold leading-none mt-1">
                  {records[0] ? new Date(records[0].created_at).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' }) : 'Kayıt Yok'}
                </p>
              </div>
            </div>
          </div>

          {/* Records Timeline / Ticket Feed */}
          <div className="space-y-4">
            <h2 className="text-base font-semibold flex items-center gap-2 mb-4">
              <ClipboardList size={18} className="text-muted-foreground" />
              Saha Servis Raporları
            </h2>

            {records.length === 0 ? (
              <div className="glass rounded-xl flex flex-col items-center justify-center py-24 gap-3">
                <ClipboardList className="w-12 h-12 text-muted-foreground/30" />
                <p className="text-sm font-semibold text-muted-foreground mt-2">Bu işletme için saha operasyon kaydı bulunamadı.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {records.map((rec, i) => {
                  const recPhotos = photos[rec.id] || [];
                  const parsed = parseDescription(rec.description);

                  return (
                    <div key={rec.id} className="glass rounded-xl border border-[hsl(var(--border))] p-5 sm:p-6 shadow-sm animate-fade-in" style={{ animationDelay: `${i * 0.05}s` }}>
                      
                      {/* Ticket Header */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 pb-5 border-b border-[hsl(var(--border))]">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 shrink-0 rounded bg-[hsl(var(--muted))] flex items-center justify-center border border-[hsl(var(--border))]">
                            <Wrench size={18} className="text-muted-foreground" />
                          </div>
                          <div>
                            <p className="text-[10px] font-semibold text-muted-foreground tracking-wider uppercase mb-0.5">İşlem / Kayıt No: TKT-{rec.id.substring(0, 6).toUpperCase()}</p>
                            <h4 className="font-semibold text-sm">{rec.service_type || 'Genel Bakım'}</h4>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                           <span className={cn("text-[10px] font-bold px-2 py-1 rounded border", getStatusColor(parsed.status))}>
                            {parsed.status}
                          </span>
                          <span className="text-xs text-muted-foreground flex items-center gap-1.5 bg-[hsl(var(--muted))] px-2.5 py-1.5 rounded-md">
                            <Calendar size={12} /> {new Date(rec.created_at).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>

                      {/* Ticket Body */}
                      <div className="space-y-4">
                        <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] p-4 rounded-lg">
                          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Saha Rapor Özeti</p>
                          <p className="text-sm text-foreground/90 leading-relaxed">
                            {parsed.text || 'Açıklama belirtilmemiş.'}
                          </p>
                        </div>
                        
                        {(parsed.materials || parsed.technician) && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {parsed.materials && (
                              <div>
                                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Kullanılan Parçalar</p>
                                <p className="text-sm text-muted-foreground bg-[hsl(var(--muted))] px-3 py-2 rounded-md">{parsed.materials}</p>
                              </div>
                            )}
                            {parsed.technician && (
                              <div>
                                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Müdahale Eden Personel</p>
                                <p className="text-sm flex items-center gap-1.5 text-muted-foreground bg-[hsl(var(--muted))] px-3 py-2 rounded-md font-medium">
                                  <UserCircle size={16} /> {parsed.technician}
                                </p>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Photos section */}
                        {recPhotos.length > 0 && (
                          <div className="pt-4 mt-2 border-t border-[hsl(var(--border))]">
                            <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5 mb-3">
                              <ImageIcon size={14} /> Görsel Kanıtlar / Ekler ({recPhotos.length})
                            </p>
                            <div className="flex flex-wrap gap-2">
                              {recPhotos.map((photo) => (
                                <div 
                                  key={photo.id}
                                  className="w-24 h-24 sm:w-28 sm:h-28 rounded-lg overflow-hidden cursor-zoom-in group border border-[hsl(var(--border))] relative"
                                  onClick={() => setSelectedPhoto(photo.photo_url)}
                                >
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img src={photo.photo_url} alt="Saha Görseli" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                                  <div className="absolute inset-0 bg-background/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                    <Eye size={16} className="text-foreground" />
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
            className="fixed inset-0 z-[100] bg-background/95 backdrop-blur-md flex items-center justify-center p-4 min-h-[100dvh]"
            onClick={() => setSelectedPhoto(null)}
          >
            <button 
              className="absolute top-4 sm:top-6 right-4 sm:right-6 bg-[hsl(var(--muted))] border border-[hsl(var(--border))] p-2.5 rounded-lg hover:bg-[hsl(var(--card))] transition-colors z-10"
              onClick={() => setSelectedPhoto(null)}
            >
              <X size={20} className="text-foreground" />
            </button>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img 
              src={selectedPhoto} 
              className="max-w-full max-h-[85vh] rounded-xl shadow-2xl animate-scale-up object-contain border border-[hsl(var(--border))]" 
              alt="Büyütülmüş Görsel"
              onClick={e => e.stopPropagation()}
            />
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
