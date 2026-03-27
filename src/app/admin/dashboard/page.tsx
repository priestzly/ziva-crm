'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { Sidebar, Topbar } from '@/components/DashboardShell';
import RouteGuard from '@/components/RouteGuard';
import { useAuth } from '@/context/AuthContext';
import { supabase, type Mall, type Business, type MaintenanceRecord } from '@/lib/supabase';
import { 
  Building2, ClipboardCheck, TrendingUp, PlusCircle, Search,
  Calendar, Flame, Users, X, Loader2, Upload,
  Edit3, Trash2, CheckCircle2, Store, Activity,
  ArrowUpRight, Zap, BarChart3, Clock, ShieldCheck,
  UserCircle, Settings, FileText, Wrench, ChevronRight, Printer
} from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';

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
    return { text: desc, technician: '', materials: '', status: 'Bilinmiyor', cost: '' };
  }
};

function DashboardContent() {
  const { profile } = useAuth();
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [malls, setMalls] = useState<Mall[]>([]);
  const [records, setRecords] = useState<MaintenanceRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [showAddMall, setShowAddMall] = useState(false);
  const [showAddRecord, setShowAddRecord] = useState(false);
  const [showEditRecord, setShowEditRecord] = useState(false);

  // Forms
  const [mallForm, setMallForm] = useState({ name: '', address: '', contact_person: '' });
  const [saving, setSaving] = useState(false);
  
  const [recordForm, setRecordForm] = useState({ 
    business_id: '', 
    service_type: '', 
    text: '', 
    technician: '', 
    materials: '', 
    status: 'Tamamlandı',
    cost: ''
  });
  
  const [editRecordForm, setEditRecordForm] = useState({ 
    service_type: '', 
    text: '', 
    technician: '', 
    materials: '', 
    status: 'Tamamlandı',
    cost: ''
  });
  const [editingRecord, setEditingRecord] = useState<MaintenanceRecord | null>(null);
  const [recordPhotos, setRecordPhotos] = useState<File[]>([]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    
    const runQuery = async () => {
      const [bizRes, mallsRes, recRes] = await Promise.all([
        supabase.from('businesses').select('*'),
        supabase.from('malls').select('*'),
        supabase.from('maintenance_records').select('*, businesses(name)').order('created_at', { ascending: false }).limit(5),
      ]);
      return { bizRes, mallsRes, recRes };
    };

    let results = await runQuery();

    // If session is new, sometimes RLS blocks the first request on client-side router push.
    // We retry once after a short delay if everything came back empty.
    if (!results.bizRes.data?.length && !results.recRes?.data?.length) {
      console.warn('Initial fetch empty - possibly token race condition. Retrying in 1s...');
      await new Promise(r => setTimeout(r, 1000));
      results = await runQuery();
    }

    setBusinesses(results.bizRes.data || []);
    setMalls(results.mallsRes.data || []);
    setRecords(results.recRes.data || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!profile) return;
    fetchData();
    // (Existing subscriptions...)
    const mallSub = supabase.channel('mall-changes').on('postgres_changes', { event: '*', schema: 'public', table: 'malls' }, () => fetchData()).subscribe();
    const recSub = supabase.channel('rec-changes').on('postgres_changes', { event: '*', schema: 'public', table: 'maintenance_records' }, () => fetchData()).subscribe();
    
    return () => {
      supabase.removeChannel(mallSub);
      supabase.removeChannel(recSub);
    };
  }, [fetchData, profile]);

  const handleAddMall = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    await supabase.from('malls').insert([mallForm]);
    setMallForm({ name: '', address: '', contact_person: '' });
    setShowAddMall(false);
    setSaving(false);
  };

  const handleAddRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recordForm.business_id) return;
    setSaving(true);

    const packedDescription = JSON.stringify({
      text: recordForm.text,
      technician: recordForm.technician,
      materials: recordForm.materials,
      status: recordForm.status,
      cost: recordForm.cost
    });

    const { data: rec } = await supabase.from('maintenance_records').insert([{
      business_id: recordForm.business_id,
      description: packedDescription,
      service_type: recordForm.service_type || 'Genel Bakım',
      admin_id: profile?.id,
    }]).select().single();

    if (rec && recordPhotos.length > 0) {
      await Promise.all(recordPhotos.map(async (file) => {
        const fileName = `${rec.id}/${Date.now()}_${file.name}`;
        const { data: uploadData } = await supabase.storage.from('maintenance-photos').upload(fileName, file);
        if (uploadData) {
          const { data: { publicUrl } } = supabase.storage.from('maintenance-photos').getPublicUrl(uploadData.path);
          await supabase.from('maintenance_photos').insert([{ record_id: rec.id, photo_url: publicUrl }]);
        }
      }));
    }
    setRecordForm({ business_id: '', service_type: '', text: '', technician: '', materials: '', status: 'Tamamlandı', cost: '' });
    setRecordPhotos([]);
    setShowAddRecord(false);
    setSaving(false);
  };

  const handleUpdateRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRecord) return;
    setSaving(true);

    const packedDescription = JSON.stringify({
      text: editRecordForm.text,
      technician: editRecordForm.technician,
      materials: editRecordForm.materials,
      status: editRecordForm.status,
      cost: editRecordForm.cost
    });

    await supabase.from('maintenance_records').update({
      description: packedDescription,
      service_type: editRecordForm.service_type
    }).eq('id', editingRecord.id);
    setShowEditRecord(false);
    setEditingRecord(null);
    setSaving(false);
  };

  const handleDeleteRecord = async (id: string) => {
    if (!confirm('Bu operasyon kaydını kalıcı olarak silmek istediğinize emin misiniz?')) return;
    await supabase.from('maintenance_records').delete().eq('id', id);
  };

  const thisMonthCount = records.filter(r => new Date(r.created_at).getMonth() === new Date().getMonth()).length;
  const last7Count = records.filter(r => Date.now() - new Date(r.created_at).getTime() < 7 * 86400000).length;

  const stats = [
    { label: 'Toplam Müşteri Kompleksi', value: malls.length, icon: Building2, color: 'text-violet-500', trend: 'Sisteme Kayıtlı' },
    { label: 'Aktif İşletme / Dükkan', value: businesses.length, icon: Store, color: 'text-cyan-500', trend: 'Operasyonel' },
    { label: 'Bu Ay Servis İşlemi', value: thisMonthCount, icon: Activity, color: 'text-amber-500', trend: `${last7Count} son 7 gün içinde` },
    { label: 'Oluşturulan İş Emri', value: records.length, icon: BarChart3, color: 'text-emerald-500', trend: 'Tüm zamanlar' },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Tamamlandı': return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
      case 'Devam Ediyor': return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      case 'İptal / Ertelendi': return 'bg-red-500/10 text-red-500 border-red-500/20';
      default: return 'bg-[hsl(var(--muted))] text-muted-foreground border-[hsl(var(--border))]';
    }
  };

  return (
    <div className="min-h-screen flex">
      <Sidebar role="admin" />
      <main className="flex-1 lg:ml-72 transition-all duration-500">
        <Topbar title="Operasyon Komuta Merkezi" subtitle={`Yönetici: ${profile?.full_name || 'Admin'}`} />

        <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1400px] mx-auto">
          {/* Welcome Banner */}
          <div className="glass rounded-xl p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 border-l-4 border-l-primary">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight mb-2">Saha Operasyonları</h1>
              <p className="text-muted-foreground text-sm max-w-lg">
                Gerçek zamanlı servis biletlerini (iş emirleri) izleyin, yeni operasyonlar oluşturun ve tüm müşteri kayıtlarını profesyonel bir standartla yönetin.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto shrink-0">
              <button onClick={() => setShowAddMall(true)} className="glass h-11 px-5 rounded-lg text-sm font-medium flex items-center justify-center gap-2 hover:bg-[hsl(var(--muted))] transition-colors w-full sm:w-auto">
                <Building2 size={16} /> Yeni AVM
              </button>
              <button onClick={() => setShowAddRecord(true)} className="btn-primary h-11 px-6 rounded-lg text-sm flex items-center justify-center gap-2 w-full sm:w-auto shadow-sm">
                <PlusCircle size={16} /> İş Emri Oluştur
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {stats.map((stat, i) => {
              const Icon = stat.icon;
              return (
                <div key={i} className="glass rounded-xl p-5 flex flex-col" style={{ animationDelay: `${i * 0.05}s` }}>
                  <div className="flex items-center gap-3 mb-4">
                    <div className={cn("p-2 rounded-md bg-[hsl(var(--muted))]", stat.color)}>
                      <Icon size={16} />
                    </div>
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-widest">{stat.label}</span>
                  </div>
                  <p className="text-3xl font-semibold tracking-tight">{loading ? '—' : stat.value}</p>
                  <div className="mt-3 pt-3 border-t border-[hsl(var(--border))]">
                    <p className="text-[10px] text-muted-foreground">{stat.trend}</p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Records Timeline (Advanced Service Tickets) */}
          <div className="glass rounded-xl overflow-hidden shadow-sm flex flex-col h-full border border-[hsl(var(--border))]">
            <div className="p-5 border-b border-[hsl(var(--border))] flex items-center justify-between bg-[hsl(var(--card))]">
              <div>
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <FileText size={18} className="text-muted-foreground" />
                  Saha Servis Kayıtları & İş Emirleri
                </h3>
                <Link href="/admin/history" className="text-xs font-bold text-primary hover:underline flex items-center gap-1">
                  Arşivin Tamamını Gör <ChevronRight size={14} />
                </Link>
              </div>
            </div>
            
            <div className="flex-1 bg-[hsl(var(--background))] p-4 lg:p-6">
              {loading ? (
                <div className="flex items-center justify-center py-20">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : records.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 gap-3">
                  <div className="w-12 h-12 rounded-xl bg-[hsl(var(--muted))] flex items-center justify-center">
                    <ClipboardCheck className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <div className="text-center">
                    <p className="font-semibold text-sm">İşlem Bulunamadı</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Saha ekibi tarafından girilmiş detaylı bir iş emri yok.</p>
                  </div>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-[hsl(var(--muted))] text-muted-foreground font-black uppercase tracking-tighter border-b border-[hsl(var(--border))]">
                      <tr>
                        <th className="py-4 px-4 border-r border-[hsl(var(--border))]">No</th>
                        <th className="py-4 px-4 border-r border-[hsl(var(--border))]">Tarih</th>
                        <th className="py-4 px-4 border-r border-[hsl(var(--border))]">İşletme</th>
                        <th className="py-4 px-4 border-r border-[hsl(var(--border))]">Hizmet Türü</th>
                        <th className="py-4 px-4 border-r border-[hsl(var(--border))] w-1/3">Saha Notları</th>
                        <th className="py-4 px-4 border-r border-[hsl(var(--border))]">Durum</th>
                        <th className="py-4 px-4 text-center">İşlem</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[hsl(var(--border))] font-medium">
                      {records.map((rec) => {
                        const parsed = parseDescription(rec.description);
                        return (
                          <tr key={rec.id} className="hover:bg-primary/5 transition-colors group">
                            <td className="py-3 px-4 border-r border-[hsl(var(--border))] font-bold text-slate-400 group-hover:text-primary">#{rec.id.substring(0,6).toUpperCase()}</td>
                            <td className="py-3 px-4 border-r border-[hsl(var(--border))] whitespace-nowrap">{new Date(rec.created_at).toLocaleDateString('tr-TR')}</td>
                            <td className="py-3 px-4 border-r border-[hsl(var(--border))] font-black uppercase">{(rec as any).businesses?.name || '—'}</td>
                            <td className="py-3 px-4 border-r border-[hsl(var(--border))] font-black text-primary/70">{rec.service_type || 'BAKIM'}</td>
                            <td className="py-3 px-4 border-r border-[hsl(var(--border))] italic text-slate-500 line-clamp-1 max-w-xs">{parsed.text}</td>
                            <td className="py-3 px-4 border-r border-[hsl(var(--border))]">
                               <span className={cn("px-2 py-0.5 rounded text-[9px] font-black border uppercase", getStatusColor(parsed.status))}>{parsed.status}</span>
                            </td>
                            <td className="py-3 px-4 text-center">
                              <div className="flex items-center justify-center gap-2">
                                <button onClick={() => { setEditingRecord(rec); setEditRecordForm({ service_type: rec.service_type || '', text: parsed.text, technician: parsed.technician, materials: parsed.materials, status: parsed.status, cost: parsed.cost }); setShowEditRecord(true); }} className="p-1 hover:text-primary transition-colors"><Edit3 size={14} /></button>
                                <Link href={`/admin/history?id=${rec.id}`} className="p-1 hover:text-primary transition-colors"><Printer size={14} /></Link>
                                <button onClick={() => handleDeleteRecord(rec.id)} className="p-1 hover:text-red-500 transition-colors"><Trash2 size={14} /></button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* === MODALS === */}
        {showAddMall && (
          <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 min-h-[100dvh]" onClick={() => setShowAddMall(false)}>
            <div className="glass-strong rounded-2xl p-6 md:p-8 w-full max-w-md animate-scale-up shadow-lg" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-xl font-semibold">Yeni AVM Tanımla</h3>
                <button onClick={() => setShowAddMall(false)} className="p-2 rounded-lg hover:bg-[hsl(var(--muted))]"><X size={18} /></button>
              </div>
              <form onSubmit={handleAddMall} className="space-y-4">
                <div><label className="text-xs font-semibold text-muted-foreground mb-1.5 block">AVM Adı *</label><input value={mallForm.name} onChange={e => setMallForm({...mallForm, name: e.target.value})} required className="w-full input-premium py-2.5" placeholder="Örn: Akasya AVM" /></div>
                <div><label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Lokasyon / Adres</label><input value={mallForm.address} onChange={e => setMallForm({...mallForm, address: e.target.value})} className="w-full input-premium py-2.5" placeholder="Şehir, İlçe vs." /></div>
                <div><label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Sorumlu Kişi</label><input value={mallForm.contact_person} onChange={e => setMallForm({...mallForm, contact_person: e.target.value})} className="w-full input-premium py-2.5" placeholder="İsim Soyisim" /></div>
                <button type="submit" disabled={saving} className="w-full btn-primary h-12 rounded-lg font-medium flex items-center justify-center gap-2 mt-6">
                  {saving ? <Loader2 size={18} className="animate-spin" /> : 'Kaydet'}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* ADVANCED ADD RECORD MODAL */}
        {showAddRecord && (
          <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-start justify-center p-4 sm:p-6 overflow-y-auto" onClick={() => setShowAddRecord(false)}>
            <div className="glass-strong rounded-2xl p-6 md:p-8 w-full max-w-2xl animate-scale-up shadow-lg my-8" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-6 pb-4 border-b border-[hsl(var(--border))]">
                <div>
                  <h3 className="text-xl font-semibold">Yeni İş Emri (Servis Kaydı)</h3>
                  <p className="text-xs text-muted-foreground mt-1">Sisteme detaylı bir operasyon fişi ekleyin.</p>
                </div>
                <button onClick={() => setShowAddRecord(false)} className="p-2 rounded-lg hover:bg-[hsl(var(--muted))]"><X size={18} /></button>
              </div>
              <form onSubmit={handleAddRecord} className="space-y-6">
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Hedef İşletme *</label>
                    <select value={recordForm.business_id} onChange={e => setRecordForm({...recordForm, business_id: e.target.value})} required className="w-full input-premium py-2.5 cursor-pointer">
                      <option value="">Seçim Yapın</option>{businesses.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">İşlem Türü</label>
                    <input list="svc" value={recordForm.service_type} onChange={e => setRecordForm({...recordForm, service_type: e.target.value})} className="w-full input-premium py-2.5" placeholder="Örn: Genel Bakım" />
                    <datalist id="svc">
                      <option value="Genel Bakım" /><option value="Yangın Sistemi Kontrolü" />
                      <option value="Baca Temizliği" /><option value="Arıza Tespiti & Onarım" />
                    </datalist>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Görevli Teknisyen</label>
                    <div className="relative">
                      <UserCircle className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <input value={recordForm.technician} onChange={e => setRecordForm({...recordForm, technician: e.target.value})} className="w-full input-premium py-2.5 pl-9" placeholder="Personel seçin/yazın" />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">İşlem Durumu</label>
                    <select value={recordForm.status} onChange={e => setRecordForm({...recordForm, status: e.target.value})} className="w-full input-premium py-2.5 cursor-pointer">
                      <option value="Tamamlandı">Tamamlandı</option>
                      <option value="Devam Ediyor">Devam Ediyor</option>
                      <option value="İptal / Ertelendi">İptal / Ertelendi</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Saha Notları (Detaylı Açıklama) *</label>
                  <textarea value={recordForm.text} onChange={e => setRecordForm({...recordForm, text: e.target.value})} required rows={3} className="w-full input-premium py-2.5 resize-none" placeholder="Yapılan işlemi detaylı şekilde özetleyin..." />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Kullanılan Parçalar / Donanım</label>
                    <input value={recordForm.materials} onChange={e => setRecordForm({...recordForm, materials: e.target.value})} className="w-full input-premium py-2.5" placeholder="Örn: 2 Adet Yangın Tüpü" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Maliyet / Fatura Tutarı (Opsiyonel)</label>
                    <input value={recordForm.cost} onChange={e => setRecordForm({...recordForm, cost: e.target.value})} className="w-full input-premium py-2.5" placeholder="Örn: 2500 TL" />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Saha Fotoğrafları / Evrak Yükle</label>
                  <label className="flex flex-col items-center justify-center gap-2 w-full py-6 rounded-lg border-2 border-dashed border-[hsl(var(--border))] hover:border-primary/50 cursor-pointer transition-colors bg-[hsl(var(--card))]">
                    <Upload size={24} className="text-muted-foreground/50" />
                    <span className="text-sm font-medium text-muted-foreground">{recordPhotos.length > 0 ? `${recordPhotos.length} Dosya Seçildi` : 'Tıkla veya Sürükle'}</span>
                    <input type="file" multiple accept="image/*" className="hidden" onChange={e => setRecordPhotos(Array.from(e.target.files || []))} />
                  </label>
                </div>
                
                <div className="pt-4 border-t border-[hsl(var(--border))] flex justify-end gap-3">
                  <button type="button" onClick={() => setShowAddRecord(false)} className="px-5 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:bg-[hsl(var(--muted))] transition-colors">
                    İptal
                  </button>
                  <button type="submit" disabled={saving} className="btn-primary px-6 py-2.5 rounded-lg font-medium flex items-center justify-center gap-2 text-sm">
                    {saving ? <Loader2 size={16} className="animate-spin" /> : 'İş Emrini Kaydet'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ADVANCED EDIT RECORD MODAL (Same layout logic as above) */}
        {showEditRecord && (
          <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-start justify-center p-4 sm:p-6 overflow-y-auto" onClick={() => setShowEditRecord(false)}>
            <div className="glass-strong rounded-2xl p-6 md:p-8 w-full max-w-2xl animate-scale-up shadow-lg my-8" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-6 pb-4 border-b border-[hsl(var(--border))]">
                <h3 className="text-xl font-semibold">İş Emrini Düzenle</h3>
                <button onClick={() => setShowEditRecord(false)} className="p-2 rounded-lg hover:bg-[hsl(var(--muted))]"><X size={18} /></button>
              </div>
              <form onSubmit={handleUpdateRecord} className="space-y-6">
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">İşlem Türü</label>
                    <input list="svc2" value={editRecordForm.service_type} onChange={e => setEditRecordForm({...editRecordForm, service_type: e.target.value})} className="w-full input-premium py-2.5" />
                    <datalist id="svc2">
                      <option value="Genel Bakım" /><option value="Yangın Sistemi Kontrolü" />
                    </datalist>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">İşlem Durumu</label>
                    <select value={editRecordForm.status} onChange={e => setEditRecordForm({...editRecordForm, status: e.target.value})} className="w-full input-premium py-2.5 cursor-pointer">
                      <option value="Tamamlandı">Tamamlandı</option>
                      <option value="Devam Ediyor">Devam Ediyor</option>
                      <option value="İptal / Ertelendi">İptal / Ertelendi</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Görevli Teknisyen</label>
                    <input value={editRecordForm.technician} onChange={e => setEditRecordForm({...editRecordForm, technician: e.target.value})} className="w-full input-premium py-2.5" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Kullanılan Parçalar</label>
                    <input value={editRecordForm.materials} onChange={e => setEditRecordForm({...editRecordForm, materials: e.target.value})} className="w-full input-premium py-2.5" />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Açıklama / Saha Notları</label>
                  <textarea value={editRecordForm.text} onChange={e => setEditRecordForm({...editRecordForm, text: e.target.value})} rows={3} className="w-full input-premium py-2.5 resize-none" />
                </div>

                <div className="pt-4 border-t border-[hsl(var(--border))] flex justify-end gap-3">
                  <button type="submit" disabled={saving} className="btn-primary px-6 py-2.5 rounded-lg font-medium flex items-center justify-center gap-2 text-sm">
                    {saving ? <Loader2 size={16} className="animate-spin" /> : 'Güncelle'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default function AdminDashboard() {
  return (
    <RouteGuard requiredRole="admin">
      <DashboardContent />
    </RouteGuard>
  );
}
