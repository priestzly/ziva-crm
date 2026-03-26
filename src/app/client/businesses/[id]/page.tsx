'use client';

import React, { useEffect, useState } from 'react';
import { Sidebar, Topbar } from '@/components/DashboardShell';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { supabase, type Business, type MaintenanceRecord, type MaintenancePhoto } from '@/lib/supabase';
import { 
  ArrowLeft, Calendar, User, ClipboardList, Eye, X,
  ShieldCheck, Flame, Loader2, ImageIcon, Download
} from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { useParams } from 'next/navigation';

function DetailContent() {
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
    if (bizId) fetchData();
  }, [bizId]);

  useEffect(() => {
    if (!bizId) return;
    const sub = supabase.channel(`biz-${bizId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'maintenance_records', filter: `business_id=eq.${bizId}` }, () => fetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'maintenance_photos' }, () => fetchData())
      .subscribe();
    return () => { supabase.removeChannel(sub); };
  }, [bizId]);

  const serviceTypeColor: Record<string, string> = {
    maintenance: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    fire_system: 'bg-red-500/10 text-red-400 border-red-500/20',
    chimney: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    repair: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  };

  if (loading) {
    return (
      <div className="min-h-screen flex">
        <Sidebar role="client" />
        <main className="flex-1 lg:ml-72 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex">
      <Sidebar role="client" />
      <main className="flex-1 lg:ml-72 transition-all duration-500">
        <Topbar title="İşletme Detayları" subtitle={business?.name} />

        <div className="p-6 lg:p-8 space-y-6 max-w-5xl mx-auto">
          {/* Back */}
          <Link href="/client/dashboard" className="inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-red-400 transition-colors font-medium group">
            <div className="p-1.5 rounded-lg glass group-hover:border-red-500/20 transition-all">
              <ArrowLeft size={14} />
            </div>
            Panele Dön
          </Link>

          {/* Header Card */}
          <div className="glass rounded-2xl p-6 relative overflow-hidden animate-fade-in">
            <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-bl from-red-500/[0.06] via-orange-500/[0.03] to-transparent rounded-bl-full pointer-events-none" />
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 relative z-10">
              <div className="space-y-3">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <ShieldCheck size={12} />
                  Sistem Aktif
                </div>
                <h1 className="text-3xl font-bold tracking-tight">{business?.name}</h1>
                <p className="text-sm text-muted-foreground">{business?.category || 'Kategori belirtilmemiş'}</p>
              </div>
              <div className="flex gap-4">
                <div className="glass p-4 rounded-xl text-center min-w-[100px]">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold mb-1">Toplam Kayıt</p>
                  <p className="text-xl font-bold">{records.length}</p>
                </div>
                <div className="glass p-4 rounded-xl text-center min-w-[100px]">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold mb-1">Son Bakım</p>
                  <p className="text-sm font-bold">{records[0] ? new Date(records[0].created_at).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' }) : '—'}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Records Timeline */}
          <div className="space-y-4">
            <h2 className="text-base font-bold flex items-center gap-2">
              <ClipboardList size={18} className="text-red-400" />
              Servis Geçmişi
            </h2>

            {records.length === 0 ? (
              <div className="glass rounded-2xl flex flex-col items-center justify-center py-20 gap-3">
                <ClipboardList className="w-10 h-10 text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground">Henüz bakım kaydı bulunmuyor</p>
              </div>
            ) : (
              <div className="space-y-4">
                {records.map((rec, i) => {
                  const recPhotos = photos[rec.id] || [];
                  return (
                    <div key={rec.id} className="glass card-hover rounded-2xl p-6 animate-fade-in" style={{ animationDelay: `${i * 0.06}s` }}>
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500/15 to-orange-500/10 border border-red-500/10 flex items-center justify-center">
                            <Flame size={16} className="text-red-400" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={cn(
                                "text-[10px] font-bold uppercase tracking-widest px-2.5 py-0.5 rounded-full border", 
                                serviceTypeColor[rec.service_type || ''] || "bg-white/[0.03] text-muted-foreground border-white/[0.06]"
                              )}>
                                {rec.service_type || 'Bakım'}
                              </span>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1.5">
                              <Calendar size={11} /> {new Date(rec.created_at).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground/40">
                          #{rec.id.substring(0, 8)}
                        </span>
                      </div>

                      <div className="pl-0 sm:pl-[52px]">
                        <p className="text-sm text-foreground/90 leading-relaxed mb-5 border-l-2 border-red-500/20 pl-4 py-1 italic">
                          "{rec.description}"
                        </p>

                        {/* Photos */}
                        {recPhotos.length > 0 && (
                          <div className="space-y-2">
                            <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                              <ImageIcon size={12} /> {recPhotos.length} Fotoğraf
                            </p>
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                              {recPhotos.map((photo, j) => (
                                <div 
                                  key={photo.id}
                                  className="aspect-square rounded-xl overflow-hidden cursor-zoom-in group/img border border-white/[0.06] relative"
                                  onClick={() => setSelectedPhoto(photo.photo_url)}
                                >
                                  <img src={photo.photo_url} alt="Bakım" className="w-full h-full object-cover group-hover/img:scale-110 transition-transform duration-500" />
                                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover/img:opacity-100 transition-opacity flex items-end justify-center pb-2">
                                    <span className="text-white text-[10px] font-bold flex items-center gap-1"><Eye size={10} /> Büyüt</span>
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

        {/* Lightbox */}
        {selectedPhoto && (
          <div 
            className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-xl flex items-center justify-center p-4"
            onClick={() => setSelectedPhoto(null)}
          >
            <button 
              className="absolute top-6 right-6 glass p-2.5 rounded-xl hover:bg-white/10 transition-colors z-10"
              onClick={() => setSelectedPhoto(null)}
            >
              <X size={18} />
            </button>
            <img 
              src={selectedPhoto} 
              className="max-w-full max-h-[85vh] rounded-2xl shadow-2xl animate-fade-in object-contain" 
              alt="Fotoğraf"
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
    <AuthProvider>
      <DetailContent />
    </AuthProvider>
  );
}
