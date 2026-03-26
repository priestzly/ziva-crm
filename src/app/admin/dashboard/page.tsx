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
  ArrowUpRight, Zap, BarChart3, Clock
} from 'lucide-react';
import { cn } from '@/lib/utils';

function DashboardContent() {
  const { profile } = useAuth();
  const [malls, setMalls] = useState<Mall[]>([]);
  const [records, setRecords] = useState<MaintenanceRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [showAddMall, setShowAddMall] = useState(false);
  const [showAddRecord, setShowAddRecord] = useState(false);
  const [mallForm, setMallForm] = useState({ name: '', address: '', contact_person: '' });
  const [saving, setSaving] = useState(false);

  // Edit Record
  const [editingRecord, setEditingRecord] = useState<MaintenanceRecord | null>(null);
  const [showEditRecord, setShowEditRecord] = useState(false);
  const [editRecordForm, setEditRecordForm] = useState({ description: '', service_type: '' });

  // Record form
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [recordForm, setRecordForm] = useState({ business_id: '', description: '', service_type: '' });
  const [recordPhotos, setRecordPhotos] = useState<File[]>([]);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [mallsRes, recsRes, bizRes] = await Promise.all([
        supabase.from('malls').select('*').order('created_at', { ascending: false }),
        supabase.from('maintenance_records').select('*, businesses(name, mall_id)').order('created_at', { ascending: false }).limit(20),
        supabase.from('businesses').select('*').order('name')
      ]);
      setMalls(mallsRes.data || []);
      setRecords(recsRes.data || []);
      setBusinesses(bizRes.data || []);
    } catch (err) {
      console.error('Fetch Error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const mallSub = supabase.channel('dash-malls')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'malls' }, () => fetchData())
      .subscribe();
    const recSub = supabase.channel('dash-records')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'maintenance_records' }, () => fetchData())
      .subscribe();
    return () => {
      supabase.removeChannel(mallSub);
      supabase.removeChannel(recSub);
    };
  }, [fetchData]);

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
    const { data: rec } = await supabase.from('maintenance_records').insert([{
      business_id: recordForm.business_id,
      description: recordForm.description,
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
    setRecordForm({ business_id: '', description: '', service_type: '' });
    setRecordPhotos([]);
    setShowAddRecord(false);
    setSaving(false);
  };

  const handleUpdateRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRecord) return;
    setSaving(true);
    await supabase.from('maintenance_records').update({
      description: editRecordForm.description,
      service_type: editRecordForm.service_type
    }).eq('id', editingRecord.id);
    setShowEditRecord(false);
    setEditingRecord(null);
    setSaving(false);
  };

  const handleDeleteRecord = async (id: string) => {
    if (!confirm('Bu bakım kaydını silmek istediğinizden emin misiniz?')) return;
    await supabase.from('maintenance_records').delete().eq('id', id);
  };

  const thisMonthCount = records.filter(r => new Date(r.created_at).getMonth() === new Date().getMonth()).length;
  const last7Count = records.filter(r => Date.now() - new Date(r.created_at).getTime() < 7 * 86400000).length;

  const stats = [
    { label: 'Toplam AVM', value: malls.length, icon: Building2, color: 'from-violet-500 to-purple-600', iconBg: 'bg-violet-500/10 text-violet-400', trend: '+2 bu ay' },
    { label: 'İşletme Sayısı', value: businesses.length, icon: Store, color: 'from-cyan-500 to-blue-600', iconBg: 'bg-cyan-500/10 text-cyan-400', trend: 'Aktif' },
    { label: 'Bu Ay Servis', value: thisMonthCount, icon: Activity, color: 'from-amber-500 to-orange-600', iconBg: 'bg-amber-500/10 text-amber-400', trend: `${last7Count} son 7 gün` },
    { label: 'Toplam Kayıt', value: records.length, icon: BarChart3, color: 'from-emerald-500 to-teal-600', iconBg: 'bg-emerald-500/10 text-emerald-400', trend: 'Güncelleniyor' },
  ];

  return (
    <div className="min-h-screen flex">
      <Sidebar role="admin" />
      <main className="flex-1 lg:ml-72 transition-all duration-500">
        <Topbar title="Komuta Merkezi" subtitle={`Hoş geldin, ${profile?.full_name || 'Admin'}`} />

        <div className="p-6 lg:p-8 space-y-8 max-w-[1400px] mx-auto">
          {/* Welcome Banner */}
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-red-500/10 via-orange-500/5 to-transparent glass p-8 border border-white/[0.04]">
            <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-red-500/[0.08] via-orange-500/[0.04] to-transparent rounded-bl-full pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-gradient-to-tr from-purple-500/[0.04] to-transparent rounded-tr-full pointer-events-none" />
            <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold uppercase tracking-widest mb-4">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 status-active" /> Sistem Aktif
                </div>
                <h1 className="text-3xl font-black tracking-tight mb-1">Ziva Yangın <span className="gradient-text-fire">CRM</span></h1>
                <p className="text-muted-foreground text-sm max-w-md">Bakım kayıtlarını yönetin, işletmeleri takip edin ve müşterilerinize premium hizmet sunun.</p>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setShowAddMall(true)} className="btn-primary h-12 px-6 rounded-2xl text-sm flex items-center gap-2 font-bold active:scale-95 transition-transform">
                  <Building2 size={18} /> AVM Ekle
                </button>
                <button onClick={() => setShowAddRecord(true)} className="glass h-12 px-6 rounded-2xl text-sm flex items-center gap-2 font-bold hover:bg-white/[0.06] transition-all border border-white/[0.06] active:scale-95">
                  <Zap size={18} className="text-amber-400" /> Kayıt Ekle
                </button>
              </div>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {stats.map((stat, i) => {
              const Icon = stat.icon;
              return (
                <div key={i} className="glass rounded-2xl p-5 card-hover gradient-border animate-fade-in group" style={{ animationDelay: `${i * 0.08}s` }}>
                  <div className="flex items-center justify-between mb-4">
                    <div className={cn("p-2.5 rounded-xl", stat.iconBg)}>
                      <Icon size={18} />
                    </div>
                    <ArrowUpRight size={14} className="text-muted-foreground/30 group-hover:text-red-400/50 transition-colors" />
                  </div>
                  <p className="text-3xl font-black tracking-tight animate-count">{loading ? '—' : stat.value}</p>
                  <p className="text-[10px] text-muted-foreground mt-1 font-bold uppercase tracking-widest">{stat.label}</p>
                  <p className="text-[9px] text-muted-foreground/50 mt-2 italic">{stat.trend}</p>
                </div>
              );
            })}
          </div>

          {/* Records Timeline */}
          <div className="glass rounded-3xl overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-white/[0.04] flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold flex items-center gap-2.5">
                  <div className="p-1.5 rounded-lg bg-red-500/10 text-red-400"><Clock size={16} /></div>
                  Son İşlem Akışı
                </h3>
                <p className="text-[10px] text-muted-foreground mt-1 uppercase tracking-widest font-semibold">Gerçek zamanlı güncelleniyor</p>
              </div>
            </div>
            
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              </div>
            ) : records.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 gap-4">
                <div className="w-20 h-20 rounded-3xl bg-white/[0.02] border border-dashed border-white/[0.08] flex items-center justify-center">
                  <ClipboardCheck className="w-8 h-8 text-muted-foreground/20" />
                </div>
                <div className="text-center">
                  <p className="font-bold text-muted-foreground">Henüz kayıt yok</p>
                  <p className="text-xs text-muted-foreground/50 mt-1">İlk bakım kaydınızı ekleyerek başlayın</p>
                </div>
              </div>
            ) : (
              <div className="divide-y divide-white/[0.03]">
                {records.map((rec, i) => (
                  <div key={rec.id} className="px-6 py-4 flex items-center justify-between hover:bg-white/[0.015] transition-all group animate-fade-in" style={{ animationDelay: `${i * 0.03}s` }}>
                    <div className="flex items-center gap-5">
                      {/* Timeline dot */}
                      <div className="relative flex flex-col items-center">
                        <div className="w-3 h-3 rounded-full bg-gradient-to-br from-red-500 to-orange-500 shadow-lg shadow-red-500/20 group-hover:scale-125 transition-transform" />
                        {i < records.length - 1 && <div className="w-px h-8 bg-gradient-to-b from-red-500/20 to-transparent absolute top-4" />}
                      </div>
                      <div>
                        <p className="text-sm font-bold truncate max-w-[250px] sm:max-w-lg group-hover:text-red-400 transition-colors">{rec.description}</p>
                        <div className="flex items-center gap-3 mt-1.5">
                          <span className="text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-md bg-white/[0.04] border border-white/[0.06] text-muted-foreground">
                            {(rec as any).businesses?.name || '—'}
                          </span>
                          <span className="text-[9px] font-bold uppercase tracking-widest text-red-400/60">
                            {rec.service_type || 'Bakım'}
                          </span>
                          <span className="text-[9px] text-muted-foreground/40 font-mono hidden sm:block">
                            {new Date(rec.created_at).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                      <button 
                        onClick={() => { setEditingRecord(rec); setEditRecordForm({ description: rec.description, service_type: rec.service_type || '' }); setShowEditRecord(true); }}
                        className="p-2.5 rounded-xl hover:bg-white/[0.06] text-muted-foreground hover:text-amber-400 transition-all"
                      >
                        <Edit3 size={14} />
                      </button>
                      <button 
                        onClick={() => handleDeleteRecord(rec.id)}
                        className="p-2.5 rounded-xl hover:bg-red-500/10 text-muted-foreground hover:text-red-400 transition-all"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* === MODALS === */}
        {showAddMall && (
          <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-xl flex items-center justify-center p-4" onClick={() => setShowAddMall(false)}>
            <div className="glass-strong rounded-3xl p-8 w-full max-w-md animate-scale-up shadow-2xl" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-xl font-black tracking-tight">Yeni AVM</h3>
                <button onClick={() => setShowAddMall(false)} className="p-2.5 rounded-2xl hover:bg-white/[0.05]"><X size={20} /></button>
              </div>
              <form onSubmit={handleAddMall} className="space-y-5">
                <div><label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">AVM Adı *</label><input value={mallForm.name} onChange={e => setMallForm({...mallForm, name: e.target.value})} required className="w-full input-premium mt-2 py-3" placeholder="Akasya AVM" /></div>
                <div><label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Adres</label><input value={mallForm.address} onChange={e => setMallForm({...mallForm, address: e.target.value})} className="w-full input-premium mt-2 py-3" placeholder="Üsküdar, İstanbul" /></div>
                <div><label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Yetkili</label><input value={mallForm.contact_person} onChange={e => setMallForm({...mallForm, contact_person: e.target.value})} className="w-full input-premium mt-2 py-3" placeholder="Ali Yılmaz" /></div>
                <button type="submit" disabled={saving} className="w-full btn-primary h-14 rounded-2xl font-bold flex items-center justify-center gap-2 text-base mt-2">{saving ? <Loader2 size={20} className="animate-spin" /> : <><Building2 size={20} /> Kaydet</>}</button>
              </form>
            </div>
          </div>
        )}

        {showAddRecord && (
          <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-xl flex items-center justify-center p-4" onClick={() => setShowAddRecord(false)}>
            <div className="glass-strong rounded-3xl p-8 w-full max-w-lg animate-scale-up shadow-2xl" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-xl font-black tracking-tight">Yeni Bakım Kaydı</h3>
                <button onClick={() => setShowAddRecord(false)} className="p-2.5 rounded-2xl hover:bg-white/[0.05]"><X size={20} /></button>
              </div>
              <form onSubmit={handleAddRecord} className="space-y-5">
                <div><label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">İşletme *</label>
                  <select value={recordForm.business_id} onChange={e => setRecordForm({...recordForm, business_id: e.target.value})} required className="w-full input-premium mt-2 py-3">
                    <option value="">Seçin</option>{businesses.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                </div>
                <div><label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">İşlem Türü</label>
                  <input list="svc" value={recordForm.service_type} onChange={e => setRecordForm({...recordForm, service_type: e.target.value})} className="w-full input-premium mt-2 py-3" placeholder="Baca Temizliği..." />
                  <datalist id="svc"><option value="Genel Bakım" /><option value="Yangın Sistemi Kontrolü" /><option value="Baca Temizliği" /><option value="Arıza Onarımı" /><option value="Periyodik Kontrol" /></datalist>
                </div>
                <div><label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Açıklama *</label>
                  <textarea value={recordForm.description} onChange={e => setRecordForm({...recordForm, description: e.target.value})} required rows={3} className="w-full input-premium mt-2 resize-none" placeholder="Detaylı açıklama..." />
                </div>
                <div>
                  <label className="flex flex-col items-center justify-center gap-3 w-full py-8 rounded-2xl border-2 border-dashed border-white/[0.06] hover:border-red-500/30 cursor-pointer transition-all bg-white/[0.01] hover:bg-white/[0.03]">
                    <Upload size={28} className="text-muted-foreground/40" />
                    <span className="text-sm font-medium text-muted-foreground">{recordPhotos.length > 0 ? `${recordPhotos.length} Dosya Seçildi` : 'Fotoğraf Yükle'}</span>
                    <input type="file" multiple accept="image/*" className="hidden" onChange={e => setRecordPhotos(Array.from(e.target.files || []))} />
                  </label>
                </div>
                <button type="submit" disabled={saving} className="w-full btn-primary h-14 rounded-2xl font-bold flex items-center justify-center gap-2 text-base">{saving ? <Loader2 size={20} className="animate-spin" /> : <><CheckCircle2 size={20} /> Kaydı Tamamla</>}</button>
              </form>
            </div>
          </div>
        )}

        {showEditRecord && (
          <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-xl flex items-center justify-center p-4" onClick={() => setShowEditRecord(false)}>
            <div className="glass-strong rounded-3xl p-8 w-full max-w-md animate-scale-up shadow-2xl" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-xl font-black tracking-tight">Kaydı Düzenle</h3>
                <button onClick={() => setShowEditRecord(false)} className="p-2.5 rounded-2xl hover:bg-white/[0.05]"><X size={20} /></button>
              </div>
              <form onSubmit={handleUpdateRecord} className="space-y-5">
                <div><label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">İşlem Türü</label><input value={editRecordForm.service_type} onChange={e => setEditRecordForm({...editRecordForm, service_type: e.target.value})} className="w-full input-premium mt-2 py-3" /></div>
                <div><label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Açıklama</label><textarea value={editRecordForm.description} onChange={e => setEditRecordForm({...editRecordForm, description: e.target.value})} rows={4} className="w-full input-premium mt-2 resize-none" /></div>
                <button type="submit" disabled={saving} className="w-full btn-primary h-14 rounded-2xl font-bold flex items-center justify-center gap-2">{saving ? <Loader2 size={18} className="animate-spin" /> : <><CheckCircle2 size={18} /> Güncelle</>}</button>
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
