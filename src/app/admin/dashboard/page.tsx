'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { Sidebar, Topbar } from '@/components/DashboardShell';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { supabase, type Mall, type Business, type MaintenanceRecord } from '@/lib/supabase';
import { 
  Building2, ClipboardCheck, TrendingUp, PlusCircle, Search,
  MoreVertical, ArrowUpRight, Calendar, Flame, Users, X, Loader2, Upload,
  Edit3, Trash2, CheckCircle2, AlertTriangle, Filter
} from 'lucide-react';
import { cn } from '@/lib/utils';

function DashboardContent() {
  const { profile, loading: authLoading } = useAuth();
  const [malls, setMalls] = useState<Mall[]>([]);
  const [records, setRecords] = useState<MaintenanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Modals - ADD
  const [showAddMall, setShowAddMall] = useState(false);
  const [showAddRecord, setShowAddRecord] = useState(false);
  const [mallForm, setMallForm] = useState({ name: '', address: '', contact_person: '' });
  const [saving, setSaving] = useState(false);

  // Modals - EDIT / DELETE
  const [editingRecord, setEditingRecord] = useState<MaintenanceRecord | null>(null);
  const [showEditRecord, setShowEditRecord] = useState(false);
  const [editRecordForm, setEditRecordForm] = useState({ description: '', service_type: '' });

  // Record form
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [recordForm, setRecordForm] = useState({ business_id: '', description: '', service_type: '' });
  const [recordPhotos, setRecordPhotos] = useState<File[]>([]);

  const fetchData = useCallback(async () => {
    // If we're already loading data, don't trigger twice
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
    // Auth yüklenmesi bittiyse ve profil varsa veriyi çek
    if (!authLoading) {
      fetchData();

      // Real-time subscriptions
      const mallSub = supabase.channel('dashboard-malls')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'malls' }, () => fetchData())
        .subscribe();
      const recSub = supabase.channel('dashboard-records')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'maintenance_records' }, () => fetchData())
        .subscribe();

      return () => {
        supabase.removeChannel(mallSub);
        supabase.removeChannel(recSub);
      };
    }
  }, [authLoading, fetchData]);

  const handleAddMall = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    await supabase.from('malls').insert([mallForm]);
    setMallForm({ name: '', address: '', contact_person: '' });
    setShowAddMall(false);
    setSaving(false);
    fetchData();
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

    // Parallel upload photos
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
    fetchData();
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
    fetchData();
  };

  const handleDeleteRecord = async (id: string) => {
    if (!confirm('Bu bakım kaydını silmek istediğinizden emin misiniz?')) return;
    await supabase.from('maintenance_records').delete().eq('id', id);
    fetchData();
  };

  const stats = [
    { label: 'Toplam AVM', value: malls.length, icon: Building2, color: 'from-blue-500/20 to-blue-600/5 text-blue-400', border: 'border-blue-500/10' },
    { label: 'Toplam İşletme', value: businesses.length, icon: Users, color: 'from-emerald-500/20 to-emerald-600/5 text-emerald-400', border: 'border-emerald-500/10' },
    { label: 'Bu Ay Servis', value: records.filter(r => new Date(r.created_at).getMonth() === new Date().getMonth()).length, icon: ClipboardCheck, color: 'from-orange-500/20 to-orange-600/5 text-orange-400', border: 'border-orange-500/10' },
    { label: 'Son 7 Gün', value: records.filter(r => Date.now() - new Date(r.created_at).getTime() < 7 * 86400000).length, icon: TrendingUp, color: 'from-red-500/20 to-red-600/5 text-red-400', border: 'border-red-500/10' },
  ];

  return (
    <div className="min-h-screen flex">
      <Sidebar role="admin" />
      <main className="flex-1 lg:ml-72 transition-all duration-500">
        <Topbar title="Yönetim Paneli" subtitle={`Hoş geldin, ${profile?.full_name || 'Admin'}`} />

        <div className="p-6 lg:p-8 space-y-8 max-w-[1400px] mx-auto">
          {/* Actions */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Genel Bakış</h1>
              <p className="text-sm text-muted-foreground mt-0.5">Bakım süreçlerini ve işletmeleri yönetin</p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowAddMall(true)} className="btn-primary h-12 px-5 rounded-2xl text-sm flex items-center gap-2 font-bold shadow-lg shadow-red-500/20 transition-all active:scale-95">
                <PlusCircle size={18} /> AVM Ekle
              </button>
              <button onClick={() => { setShowAddRecord(true); }} className="glass h-12 px-5 rounded-2xl text-sm flex items-center gap-2 hover:bg-white/[0.06] transition-all font-bold group border border-white/[0.05] active:scale-95">
                <ClipboardCheck size={18} className="group-hover:text-red-400" /> Kayıt Ekle
              </button>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {stats.map((stat, i) => {
              const Icon = stat.icon;
              return (
                <div key={i} className={cn("card-hover glass rounded-2xl p-5 group animate-fade-in")} style={{ animationDelay: `${i * 0.05}s` }}>
                  <div className="flex items-center justify-between mb-4">
                    <div className={cn("p-2.5 rounded-xl bg-gradient-to-br border", stat.color, stat.border)}>
                      <Icon size={18} />
                    </div>
                  </div>
                  <p className="text-2xl font-black tracking-tight">{loading ? '—' : stat.value}</p>
                  <p className="text-[10px] text-muted-foreground mt-1 font-bold uppercase tracking-widest">{stat.label}</p>
                </div>
              );
            })}
          </div>

          {/* Recent Records */}
          <div className="glass rounded-2xl overflow-hidden shadow-2xl">
            <div className="p-5 border-b border-white/[0.04] flex items-center justify-between">
              <h3 className="text-base font-bold flex items-center gap-2">
                <Calendar size={18} className="text-red-400" />
                Son Bakım Kayıtları
              </h3>
            </div>
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : records.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <ClipboardCheck className="w-10 h-10 text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground">Henüz kayıt eklenmemiş</p>
              </div>
            ) : (
              <div className="divide-y divide-white/[0.04]">
                {records.map((rec, i) => (
                  <div key={rec.id} className="px-5 py-4 flex items-center justify-between hover:bg-white/[0.02] transition-colors group animate-fade-in" style={{ animationDelay: `${i * 0.03}s` }}>
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center text-muted-foreground group-hover:bg-red-500/10 group-hover:text-red-400 transition-colors">
                        <Flame size={18} />
                      </div>
                      <div>
                        <p className="text-sm font-bold truncate max-w-[200px] sm:max-w-md">{rec.description}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5 font-medium">
                          <span className="text-red-400/80 uppercase">{(rec as any).businesses?.name || '—'}</span> • {rec.service_type || 'Bakım'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right hidden sm:block">
                         <p className="text-[10px] font-mono text-muted-foreground opacity-50">
                          {new Date(rec.created_at).toLocaleDateString('tr-TR')}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                         <button 
                          onClick={() => { setEditingRecord(rec); setEditRecordForm({ description: rec.description, service_type: rec.service_type || '' }); setShowEditRecord(true); }}
                          className="p-2 rounded-lg hover:bg-white/[0.05] text-muted-foreground hover:text-red-400"
                        >
                          <Edit3 size={16} />
                        </button>
                        <button 
                          onClick={() => handleDeleteRecord(rec.id)}
                          className="p-2 rounded-lg hover:bg-white/[0.05] text-muted-foreground hover:text-red-400"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ADD MALL MODAL */}
        {showAddMall && (
          <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-xl flex items-center justify-center p-4" onClick={() => setShowAddMall(false)}>
            <div className="glass-strong rounded-3xl p-8 w-full max-w-md animate-scale-up" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-xl font-bold">Yeni AVM Ekle</h3>
                <button onClick={() => setShowAddMall(false)} className="p-2.5 rounded-2xl hover:bg-white/[0.05] transition-colors">
                  <X size={20} />
                </button>
              </div>
              <form onSubmit={handleAddMall} className="space-y-4">
                <div>
                  <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">AVM Adı *</label>
                  <input value={mallForm.name} onChange={e => setMallForm({...mallForm, name: e.target.value})} required className="w-full input-premium mt-1.5" placeholder="Örn: Akasya AVM" />
                </div>
                <div>
                  <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Adres</label>
                  <input value={mallForm.address} onChange={e => setMallForm({...mallForm, address: e.target.value})} className="w-full input-premium mt-1.5" placeholder="Örn: Üsküdar, İstanbul" />
                </div>
                <div>
                  <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Yetkili Kişi</label>
                  <input value={mallForm.contact_person} onChange={e => setMallForm({...mallForm, contact_person: e.target.value})} className="w-full input-premium mt-1.5" placeholder="Örn: Ali Yılmaz" />
                </div>
                <button type="submit" disabled={saving} className="w-full btn-primary h-14 rounded-2xl flex items-center justify-center gap-2 font-bold text-base mt-4">
                  {saving ? <Loader2 size={20} className="animate-spin" /> : <><PlusCircle size={20} /> AVM Ekle</>}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* ADD RECORD MODAL */}
        {showAddRecord && (
          <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-xl flex items-center justify-center p-4" onClick={() => setShowAddRecord(false)}>
            <div className="glass-strong rounded-3xl p-8 w-full max-w-lg animate-scale-up" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-xl font-bold">Yeni Bakım Kaydı</h3>
                <button onClick={() => setShowAddRecord(false)} className="p-2.5 rounded-2xl hover:bg-white/[0.05] transition-colors">
                  <X size={20} />
                </button>
              </div>
              <form onSubmit={handleAddRecord} className="space-y-5">
                <div>
                  <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">İşletme *</label>
                  <select value={recordForm.business_id} onChange={e => setRecordForm({...recordForm, business_id: e.target.value})} required className="w-full input-premium mt-1.5">
                    <option value="">İşletme Seçin</option>
                    {businesses.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                </div>
                <div>
                   <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">İşlem / Servis Türü</label>
                   <input 
                    list="service-types"
                    value={recordForm.service_type} 
                    onChange={e => setRecordForm({...recordForm, service_type: e.target.value})} 
                    className="w-full input-premium mt-1.5"
                    placeholder="Örn: Baca Temizliği, Arıza Onarımı..."
                  />
                  <datalist id="service-types">
                    <option value="Genel Bakım" />
                    <option value="Yangın Sistemi Kontrolü" />
                    <option value="Baca Temizliği" />
                    <option value="Arıza Onarımı" />
                    <option value="Periyodik Kontrol" />
                  </datalist>
                </div>
                <div>
                  <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Açıklama *</label>
                  <textarea value={recordForm.description} onChange={e => setRecordForm({...recordForm, description: e.target.value})} required rows={3} className="w-full input-premium mt-1.5 resize-none" placeholder="Yapılan işlemlerin detaylı açıklaması..." />
                </div>
                <div>
                  <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Fotoğraflar</label>
                  <div className="mt-1.5">
                    <label className="flex flex-col items-center justify-center gap-2 w-full py-8 rounded-2xl border-2 border-dashed border-white/[0.08] hover:border-red-500/30 cursor-pointer transition-all bg-white/[0.01] hover:bg-white/[0.03]">
                      <Upload size={24} className="text-muted-foreground" />
                      <span className="text-sm font-medium">{recordPhotos.length > 0 ? `${recordPhotos.length} Dosya Seçildi` : 'Sürükle veya Seç'}</span>
                      <input type="file" multiple accept="image/*" className="hidden" onChange={e => setRecordPhotos(Array.from(e.target.files || []))} />
                    </label>
                  </div>
                </div>
                <button type="submit" disabled={saving} className="w-full btn-primary h-14 rounded-2xl flex items-center justify-center gap-2 font-bold text-base mt-2">
                  {saving ? <Loader2 size={20} className="animate-spin" /> : <><ClipboardCheck size={20} /> Kaydı Tamamla</>}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* EDIT RECORD MODAL */}
        {showEditRecord && (
          <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-xl flex items-center justify-center p-4" onClick={() => setShowEditRecord(false)}>
            <div className="glass-strong rounded-3xl p-8 w-full max-w-md animate-scale-up" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-xl font-bold">Kaydı Düzenle</h3>
                <button onClick={() => setShowEditRecord(false)} className="p-2.5 rounded-2xl hover:bg-white/[0.05] transition-colors">
                  <X size={20} />
                </button>
              </div>
              <form onSubmit={handleUpdateRecord} className="space-y-5">
                <div>
                  <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">İşlem Türü</label>
                  <input value={editRecordForm.service_type} onChange={e => setEditRecordForm({...editRecordForm, service_type: e.target.value})} className="w-full input-premium mt-1.5" />
                </div>
                <div>
                  <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Açıklama</label>
                  <textarea value={editRecordForm.description} onChange={e => setEditRecordForm({...editRecordForm, description: e.target.value})} rows={4} className="w-full input-premium mt-1.5 resize-none" />
                </div>
                <button type="submit" disabled={saving} className="w-full btn-primary h-14 rounded-2xl font-bold flex items-center justify-center gap-2">
                  {saving ? <Loader2 size={18} className="animate-spin" /> : <><CheckCircle2 size={18} /> Güncelle</>}
                </button>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default function AdminDashboard() {
  return <DashboardContent />;
}
