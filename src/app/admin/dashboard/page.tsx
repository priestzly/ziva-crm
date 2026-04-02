'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Sidebar, Topbar, PageHeader, StatCard } from '@/components/DashboardShell';
import RouteGuard from '@/components/RouteGuard';
import { useAuth } from '@/context/AuthContext';
import { supabase, type Mall, type Business, type MaintenanceRecord } from '@/lib/supabase';
import { 
  Building2, PlusCircle, X, Loader2, Upload,
  Edit3, Trash2, Store, Activity,
  ChevronRight, Printer, FileText, UserCircle, RefreshCw, ShieldAlert
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
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Modals
  const [showAddMall, setShowAddMall] = useState(false);
  const [showAddRecord, setShowAddRecord] = useState(false);
  const [showEditRecord, setShowEditRecord] = useState(false);

  // Forms
  const [mallForm, setMallForm] = useState({ name: '', address: '', contact_person: '' });
  const [saving, setSaving] = useState(false);
  
  const [recordForm, setRecordForm] = useState({ 
    mall_id: '',
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
  const [editingPhotos, setEditingPhotos] = useState<any[]>([]);

  const initialLoadDone = useRef(false);
  const subscriptionRef = useRef<{ mall: ReturnType<typeof supabase.channel>; rec: ReturnType<typeof supabase.channel> } | null>(null);

  /**
   * ENHANCED FAILSAFE FETCH PATTERN
   */
  const fetchData = useCallback(async (isRefresh = false) => {
    if (!initialLoadDone.current) setLoading(true);
    if (isRefresh) {
      setIsRefreshing(true);
      setFetchError(null);
    }
    
    try {
      const [bizRes, mallsRes, recRes] = await Promise.all([
        supabase.from('businesses').select('*'),
        supabase.from('malls').select('*'),
        supabase.from('maintenance_records').select('*, businesses(name)').order('created_at', { ascending: false }).limit(20),
      ]);

      if (bizRes.error) throw bizRes.error;
      if (mallsRes.error) throw mallsRes.error;
      if (recRes.error) throw recRes.error;

      setBusinesses(bizRes.data || []);
      setMalls(mallsRes.data || []);
      setRecords(recRes.data || []);
      initialLoadDone.current = true;
    } catch (error: any) {
      console.error('Error fetching dashboard data:', error);
      setFetchError(`Veri bağlantı hatası: ${error.message || 'Bilinmeyen hata'}`);
    } finally {
      setLoading(false);
      if (isRefresh) setIsRefreshing(false);
    }
  }, []);

  const setupSubscriptions = useCallback(() => {
    if (subscriptionRef.current) {
      supabase.removeChannel(subscriptionRef.current.mall);
      supabase.removeChannel(subscriptionRef.current.rec);
      subscriptionRef.current = null;
    }

    const mallSub = supabase.channel('mall-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'malls' }, () => fetchData(true))
      .subscribe((status: string) => {
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.warn('Mall subscription error, retrying...');
          setTimeout(() => setupSubscriptions(), 3000);
        }
      });
    
    const recSub = supabase.channel('rec-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'maintenance_records' }, () => fetchData(true))
      .subscribe((status: string) => {
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.warn('Records subscription error, retrying...');
          setTimeout(() => setupSubscriptions(), 3000);
        }
      });
    
    subscriptionRef.current = { mall: mallSub, rec: recSub };
    return { mall: mallSub, rec: recSub };
  }, [fetchData]);

  const visibilityTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    fetchData();
    setupSubscriptions();

    const handleVisibility = () => {
      if (visibilityTimeoutRef.current) clearTimeout(visibilityTimeoutRef.current);

      if (document.visibilityState === 'visible') {
        visibilityTimeoutRef.current = setTimeout(() => {
          fetchData(true);
          setupSubscriptions();
        }, 500); 
      } else {
        if (subscriptionRef.current) {
          supabase.removeChannel(subscriptionRef.current.mall);
          supabase.removeChannel(subscriptionRef.current.rec);
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
        supabase.removeChannel(subscriptionRef.current.mall);
        supabase.removeChannel(subscriptionRef.current.rec);
        subscriptionRef.current = null;
      }
    };
  }, [fetchData, setupSubscriptions]);

  const handleDeletePhoto = async (photo: any) => {
    if (!confirm('Bu fotoğrafı kalıcı olarak silmek istediğinizden emin misiniz?')) return;
    try {
      const urlParts = photo.photo_url.split('/maintenance-photos/');
      if (urlParts.length > 1) {
        const filePath = urlParts[1];
        await supabase.storage.from('maintenance-photos').remove([filePath]);
      }
      await supabase.from('maintenance_photos').delete().eq('id', photo.id);
      setEditingPhotos(editingPhotos.filter(p => p.id !== photo.id));
    } catch (error) {
      console.error('Error deleting photo:', error);
      alert('Fotoğraf silinirken hata oluştu.');
    }
  };

  const handleEditClick = async (rec: any) => {
    const parsed = parseDescription(rec.description);
    setEditingRecord(rec);
    setEditRecordForm({ 
      service_type: rec.service_type || '', 
      text: parsed.text, 
      technician: parsed.technician, 
      materials: parsed.materials, 
      status: parsed.status, 
      cost: parsed.cost 
    });
    
    const { data: photoData } = await supabase
      .from('maintenance_photos')
      .select('*')
      .eq('record_id', rec.id);
    setEditingPhotos(photoData || []);
    setShowEditRecord(true);
  };

  const handleAddMall = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    await supabase.from('malls').insert([mallForm]);
    setMallForm({ name: '', address: '', contact_person: '' });
    setShowAddMall(false);
    setSaving(false);
    fetchData(true);
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

    try {
      const { data: rec, error: recError } = await supabase.from('maintenance_records').insert([{
        business_id: recordForm.business_id,
        description: packedDescription,
        service_type: recordForm.service_type || 'Genel Bakım',
        admin_id: profile?.id,
      }]).select().single();

      if (recError) throw recError;

      if (rec && recordPhotos.length > 0) {
        let uploadErrors = 0;
        await Promise.all(recordPhotos.map(async (file) => {
          const fileName = `${rec.id}/${Date.now()}_${file.name}`;
          const { data: uploadData, error: uploadError } = await supabase.storage.from('maintenance-photos').upload(fileName, file);
          
          if (uploadError) {
            console.error('Storage Upload Error:', uploadError);
            uploadErrors++;
          }
          
          if (uploadData) {
            const { data: { publicUrl } } = supabase.storage.from('maintenance-photos').getPublicUrl(uploadData.path);
            await supabase.from('maintenance_photos').insert([{ record_id: rec.id, photo_url: publicUrl }]);
          }
        }));

        if (uploadErrors > 0) {
          alert(`Rapor oluşturuldu ancak ${uploadErrors} fotoğraf yüklenemedi.`);
        }
      }
      
      setRecordForm({ mall_id: '', business_id: '', service_type: '', text: '', technician: '', materials: '', status: 'Tamamlandı', cost: '' });
      setRecordPhotos([]);
      setShowAddRecord(false);
      fetchData(true);
    } catch (error) {
      console.error(error);
      alert('Kayıt eklenirken bir hata oluştu');
    } finally {
      setSaving(false);
    }
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

    try {
      await supabase.from('maintenance_records').update({
        description: packedDescription,
        service_type: editRecordForm.service_type
      }).eq('id', editingRecord.id);

      if (recordPhotos.length > 0) {
        let uploadErrors = 0;
        await Promise.all(recordPhotos.map(async (file) => {
          const fileName = `${editingRecord.id}/${Date.now()}_${file.name}`;
          const { data: uploadData, error: uploadError } = await supabase.storage.from('maintenance-photos').upload(fileName, file);
          
          if (uploadError) {
            console.error('Storage Upload Error:', uploadError);
            uploadErrors++;
          }
          
          if (uploadData) {
            const { data: { publicUrl } } = supabase.storage.from('maintenance-photos').getPublicUrl(uploadData.path);
            await supabase.from('maintenance_photos').insert([{ record_id: editingRecord.id, photo_url: publicUrl }]);
          }
        }));

        if (uploadErrors > 0) {
          alert(`Güncelleme yapıldı ancak ${uploadErrors} fotoğraf yüklenemedi.`);
        }
      }

      setShowEditRecord(false);
      setEditingRecord(null);
      setRecordPhotos([]);
      fetchData(true);
    } catch (error) {
      console.error(error);
      alert('Kayıt güncellenirken hata oluştu');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteRecord = async (id: string) => {
    if (!confirm('Bu operasyon kaydını kalıcı olarak silmek istediğinize emin misiniz?')) return;
    await supabase.from('maintenance_records').delete().eq('id', id);
    fetchData(true);
  };

  const thisMonthCount = records.filter(r => new Date(r.created_at).getMonth() === new Date().getMonth()).length;
  const last7Count = records.filter(r => Date.now() - new Date(r.created_at).getTime() < 7 * 86400000).length;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Tamamlandı': return 'badge-success';
      case 'Devam Ediyor': return 'badge-primary';
      case 'İptal / Ertelendi': return 'badge-destructive';
      default: return 'badge-muted';
    }
  };

  return (
    <div className="min-h-screen flex">
      <Sidebar role="admin" />
      <main className="flex-1 lg:ml-72 transition-all duration-300 w-full overflow-x-hidden">
        <Topbar 
          title="Operasyon Komuta Merkezi" 
          subtitle={isRefreshing ? 'Yenileniyor...' : `Yönetici: ${profile?.full_name || 'Admin'}`} 
        />

        <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
          {/* Error Banner */}
          {fetchError && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 flex items-center justify-between gap-4 animate-fade-in shadow-lg shadow-red-500/5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center text-red-500">
                  <ShieldAlert size={20} />
                </div>
                <div>
                  <p className="text-sm font-bold text-red-400">Bağlantı Sorunu</p>
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

          {/* Page Header */}
          <PageHeader 
            title="Saha Operasyonları"
            description="Gerçek zamanlı servis biletlerini izleyin, yeni operasyonlar oluşturun ve müşteri kayıtlarını yönetin."
            actions={
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => fetchData(true)}
                  className="p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06] transition-colors text-muted-foreground group"
                  title="Yenile"
                >
                  <RefreshCw size={18} className={cn("transition-transform duration-500", isRefreshing && "animate-spin")} />
                </button>
                <div className="h-8 w-px bg-white/[0.06] mx-1" />
                <button 
                  onClick={() => setShowAddMall(true)} 
                  className="btn-secondary h-10 px-4 text-xs font-semibold"
                >
                  <Building2 size={16} />
                  <span className="hidden sm:inline">Yeni AVM</span>
                </button>
                <button 
                  onClick={() => setShowAddRecord(true)} 
                  className="btn-primary h-10 px-4 text-xs font-semibold"
                >
                  <PlusCircle size={16} />
                  İş Emri Oluştur
                </button>
              </div>
            }
          />

          {/* Stats Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard 
              label="Toplam AVM" 
              value={malls.length} 
              icon={Building2} 
              color="text-violet-500"
              trend="Sisteme Kayıtlı"
              loading={loading}
            />
            <StatCard 
              label="Aktif İşletme" 
              value={businesses.length} 
              icon={Store} 
              color="text-cyan-500"
              trend="Operasyonel"
              loading={loading}
            />
            <StatCard 
              label="Bu Ay Servis" 
              value={thisMonthCount} 
              icon={Activity} 
              color="text-amber-500"
              trend={`${last7Count} son 7 gün`}
              loading={loading}
            />
            <StatCard 
              label="İş Emirleri" 
              value={records.length} 
              icon={FileText} 
              color="text-emerald-500"
              trend="Tüm zamanlar"
              loading={loading}
            />
          </div>

          {/* Records Table */}
          <div className="glass rounded-3xl overflow-hidden shadow-2xl border border-white/[0.04]">
            <div className="p-4 sm:p-5 border-b border-[hsl(var(--border))] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white/[0.01]">
              <div>
                <h3 className="text-base font-semibold flex items-center gap-2">
                  <FileText size={16} className="text-muted-foreground" />
                  Son İş Emirleri
                </h3>
              </div>
              <Link href="/admin/history" className="text-xs font-semibold text-primary hover:underline flex items-center gap-1 group">
                Tümünü Gör <ChevronRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </div>
            
            <div className="overflow-x-auto">
              {loading && !initialLoadDone.current ? (
                <div className="flex items-center justify-center py-24">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
              ) : records.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 gap-3 text-center">
                  <div className="w-16 h-16 rounded-2xl bg-[hsl(var(--muted))] flex items-center justify-center mb-2">
                    <FileText className="w-8 h-8 text-muted-foreground/30" />
                  </div>
                  <div>
                    <p className="font-bold text-base">İşlem Bulunamadı</p>
                    <p className="text-xs text-muted-foreground mt-1">Henüz iş emri oluşturulmamış.</p>
                  </div>
                </div>
              ) : (
                <table className="table-modern text-left">
                  <thead>
                    <tr className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold border-b border-white/[0.04]">
                      <th className="px-6 py-4">No</th>
                      <th className="px-6 py-4">Tarih</th>
                      <th className="px-6 py-4">İşletme</th>
                      <th className="px-6 py-4">Hizmet Türü</th>
                      <th className="px-6 py-4 hidden lg:table-cell">İçerik Özeti</th>
                      <th className="px-6 py-4">Durum</th>
                      <th className="px-6 py-4 text-center">İşlem</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.02]">
                    {records.map((rec, i) => {
                      const parsed = parseDescription(rec.description);
                      return (
                        <tr key={rec.id} className="hover:bg-white/[0.01] transition-colors group animate-fade-in" style={{ animationDelay: `${i * 0.03}s` }}>
                          <td className="px-6 py-5 font-mono text-[10px] text-muted-foreground">#{rec.id.substring(0, 6).toUpperCase()}</td>
                          <td className="px-6 py-5 whitespace-nowrap text-xs font-medium">{new Date(rec.created_at).toLocaleDateString('tr-TR')}</td>
                          <td className="px-6 py-5">
                            <span className="text-sm font-bold tracking-tight">{(rec as any).businesses?.name || '—'}</span>
                          </td>
                          <td className="px-6 py-5">
                            <span className="px-2 py-1 rounded bg-primary/10 text-primary text-[10px] font-bold uppercase tracking-wider">{rec.service_type || 'BAKIM'}</span>
                          </td>
                          <td className="px-6 py-5 hidden lg:table-cell max-w-xs">
                            <p className="text-xs text-muted-foreground truncate italic">{parsed.text}</p>
                          </td>
                          <td className="px-6 py-5">
                            <span className={cn("badge text-[10px] font-bold", getStatusColor(parsed.status))}>{parsed.status}</span>
                          </td>
                          <td className="px-6 py-5 text-right">
                            <div className="flex items-center justify-center gap-2">
                              <button onClick={() => handleEditClick(rec)} className="w-8 h-8 rounded-lg bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.08] transition-all flex items-center justify-center text-muted-foreground" title="Düzenle">
                                <Edit3 size={14} />
                              </button>
                              <Link href={`/admin/history?id=${rec.id}`} className="w-8 h-8 rounded-lg bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.08] transition-all flex items-center justify-center text-muted-foreground" title="Yazdır">
                                <Printer size={14} />
                              </Link>
                              <button onClick={() => handleDeleteRecord(rec.id)} className="w-8 h-8 rounded-lg bg-red-500/5 border border-red-500/10 hover:bg-red-500/10 transition-all flex items-center justify-center text-red-400 group-hover:scale-105" title="Sil">
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>

        {/* ═══ MODALS ═══ */}
        
        {/* Add Mall Modal */}
        {showAddMall && (
          <div className="modal-overlay" onClick={() => setShowAddMall(false)}>
            <div className="modal-content glass-strong border border-white/[0.08] shadow-2xl animate-scale-up" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between p-6 border-b border-white/[0.06]">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-violet-500/20 flex items-center justify-center text-violet-400">
                    <Building2 size={20} />
                  </div>
                  <h3 className="text-xl font-black tracking-tight">Yeni AVM Tanımla</h3>
                </div>
                <button onClick={() => setShowAddMall(false)} className="w-10 h-10 rounded-xl hover:bg-white/[0.05] transition-colors"><X size={20} /></button>
              </div>
              <form onSubmit={handleAddMall} className="p-6 space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">AVM Adı *</label>
                  <input value={mallForm.name} onChange={e => setMallForm({...mallForm, name: e.target.value})} required className="input-premium h-12 px-4 w-full" placeholder="Örn: Akasya AVM" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Lokasyon / Adres</label>
                  <input value={mallForm.address} onChange={e => setMallForm({...mallForm, address: e.target.value})} className="input-premium h-12 px-4 w-full" placeholder="Şehir, İlçe vs." />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Sorumlu Kişi</label>
                  <input value={mallForm.contact_person} onChange={e => setMallForm({...mallForm, contact_person: e.target.value})} className="input-premium h-12 px-4 w-full" placeholder="İsim Soyisim" />
                </div>
                <div className="flex justify-end gap-3 pt-6 border-t border-white/[0.06]">
                  <button type="button" onClick={() => setShowAddMall(false)} className="px-6 h-12 rounded-2xl bg-white/[0.03] text-sm font-bold hover:bg-white/[0.05] transition-colors">İptal</button>
                  <button type="submit" disabled={saving} className="px-6 h-12 btn-primary rounded-2xl text-sm font-bold min-w-[120px]">
                    {saving ? <Loader2 size={18} className="animate-spin" /> : 'Kaydet'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Add Record Modal */}
        {showAddRecord && (
          <div className="modal-overlay" onClick={() => setShowAddRecord(false)}>
            <div className="modal-content max-w-2xl glass-strong border border-white/[0.08] shadow-2xl animate-scale-up" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between p-6 border-b border-white/[0.06]">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-orange-500/20 flex items-center justify-center text-orange-500">
                    <PlusCircle size={20} />
                  </div>
                  <div>
                    <h3 className="text-xl font-black tracking-tight">Yeni İş Emri</h3>
                    <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest mt-0.5">Operasyon Fişi Kaydı</p>
                  </div>
                </div>
                <button onClick={() => setShowAddRecord(false)} className="w-10 h-10 rounded-xl hover:bg-white/[0.05]"><X size={20} /></button>
              </div>
              <form onSubmit={handleAddRecord} className="p-6 space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Hedef AVM *</label>
                    <select value={recordForm.mall_id} onChange={e => setRecordForm({...recordForm, mall_id: e.target.value, business_id: ''})} required className="input-premium h-12 px-4 w-full">
                      <option value="">AVM Seçin</option>
                      {malls.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Hedef İşletme *</label>
                    <select value={recordForm.business_id} onChange={e => setRecordForm({...recordForm, business_id: e.target.value})} required disabled={!recordForm.mall_id} className="input-premium h-12 px-4 w-full disabled:opacity-50">
                      <option value="">{recordForm.mall_id ? 'İşletme Seçin' : 'Önce AVM Seçin'}</option>
                      {businesses.filter(b => b.mall_id === recordForm.mall_id).map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">İşlem Türü</label>
                    <input list="svc" value={recordForm.service_type} onChange={e => setRecordForm({...recordForm, service_type: e.target.value})} className="input-premium h-12 px-4 w-full" placeholder="Örn: Genel Bakım" />
                    <datalist id="svc">
                      <option value="Genel Bakım" /><option value="Yangın Sistemi Kontrolü" /><option value="Baca Temizliği" /><option value="Arıza Tespiti & Onarım" />
                    </datalist>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">İşlem Durumu</label>
                    <select value={recordForm.status} onChange={e => setRecordForm({...recordForm, status: e.target.value})} className="input-premium h-12 px-4 w-full">
                      <option value="Tamamlandı">Tamamlandı</option><option value="Devam Ediyor">Devam Ediyor</option><option value="İptal / Ertelendi">İptal / Ertelendi</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Teknisyen</label>
                    <input value={recordForm.technician} onChange={e => setRecordForm({...recordForm, technician: e.target.value})} className="input-premium h-12 px-4 w-full" placeholder="Personel" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Parçalar</label>
                    <input value={recordForm.materials} onChange={e => setRecordForm({...recordForm, materials: e.target.value})} className="input-premium h-12 px-4 w-full" placeholder="Örn: 2 Tüp" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Maliyet</label>
                    <input value={recordForm.cost} onChange={e => setRecordForm({...recordForm, cost: e.target.value})} className="input-premium h-12 px-4 w-full" placeholder="Opsiyonel" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Saha Notları *</label>
                  <textarea value={recordForm.text} onChange={e => setRecordForm({...recordForm, text: e.target.value})} required rows={3} className="input-premium p-4 w-full resize-none" placeholder="Yapılan işlemi detaylı şekilde özetleyin..." />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Görsel Kanıt Yükle</label>
                  <label className="flex flex-col items-center justify-center gap-2 w-full py-8 rounded-2xl border-2 border-dashed border-white/[0.08] hover:border-primary/50 cursor-pointer transition-all bg-white/[0.02]">
                    <Upload size={28} className="text-muted-foreground/30" />
                    <span className="text-sm font-bold text-muted-foreground/50">{recordPhotos.length > 0 ? `${recordPhotos.length} Dosya Seçildi` : 'Görsel Seç'}</span>
                    <input type="file" multiple accept="image/*" className="hidden" onChange={e => setRecordPhotos(Array.from(e.target.files || []))} />
                  </label>
                </div>
                
                <div className="flex justify-end gap-3 pt-6 border-t border-white/[0.06]">
                  <button type="button" onClick={() => setShowAddRecord(false)} className="px-6 h-12 rounded-2xl bg-white/[0.03] text-sm font-bold hover:bg-white/[0.05]">İptal</button>
                  <button type="submit" disabled={saving} className="px-6 h-12 btn-primary rounded-2xl text-sm font-bold min-w-[120px]">
                    {saving ? <Loader2 size={18} className="animate-spin" /> : 'Kaydet'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Edit Record Modal */}
        {showEditRecord && (
          <div className="modal-overlay" onClick={() => setShowEditRecord(false)}>
            <div className="modal-content max-w-2xl glass-strong border border-white/[0.08] shadow-2xl animate-scale-up" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between p-6 border-b border-white/[0.06]">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center text-blue-500">
                    <Edit3 size={20} />
                  </div>
                  <h3 className="text-lg font-black tracking-tight">İş Emrini Düzenle</h3>
                </div>
                <button onClick={() => setShowEditRecord(false)} className="w-10 h-10 rounded-xl hover:bg-white/[0.05]"><X size={20} /></button>
              </div>
              <form onSubmit={handleUpdateRecord} className="p-6 space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">İşlem Türü</label>
                    <input list="svc2" value={editRecordForm.service_type} onChange={e => setEditRecordForm({...editRecordForm, service_type: e.target.value})} className="input-premium h-12 px-4 w-full" />
                    <datalist id="svc2"><option value="Genel Bakım" /><option value="Yangın Sistemi Kontrolü" /></datalist>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Teknisyen</label>
                    <input value={editRecordForm.technician} onChange={e => setEditRecordForm({...editRecordForm, technician: e.target.value})} className="input-premium h-12 px-4 w-full" />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">İşlem Durumu</label>
                    <select value={editRecordForm.status} onChange={e => setEditRecordForm({...editRecordForm, status: e.target.value})} className="input-premium h-12 px-4 w-full">
                      <option value="Tamamlandı">Tamamlandı</option><option value="Devam Ediyor">Devam Ediyor</option><option value="İptal / Ertelendi">İptal / Ertelendi</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Maliyet</label>
                    <input value={editRecordForm.cost} onChange={e => setEditRecordForm({...editRecordForm, cost: e.target.value})} className="input-premium h-12 px-4 w-full" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Açıklama / Saha Notları</label>
                  <textarea value={editRecordForm.text} onChange={e => setEditRecordForm({...editRecordForm, text: e.target.value})} rows={3} className="input-premium p-4 w-full resize-none" />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Kullanılan Parçalar</label>
                  <input value={editRecordForm.materials} onChange={e => setEditRecordForm({...editRecordForm, materials: e.target.value})} className="input-premium h-12 px-4 w-full" />
                </div>

                {editingPhotos.length > 0 && (
                  <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                    {editingPhotos.map(p => (
                      <div key={p.id} className="relative group aspect-square rounded-lg overflow-hidden border border-white/[0.06]">
                        <img src={p.photo_url} alt="Ek" className="w-full h-full object-cover" />
                        <button type="button" onClick={() => handleDeletePhoto(p)} className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 bg-red-500 rounded p-1 text-white"><Trash2 size={12} /></button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Ek Görsel Ekle</label>
                  <label className="flex flex-col items-center justify-center gap-2 w-full py-6 rounded-2xl border-2 border-dashed border-white/[0.08] hover:border-primary/50 cursor-pointer transition-all bg-white/[0.02]">
                    <span className="text-xs font-bold text-muted-foreground/50">{recordPhotos.length > 0 ? `${recordPhotos.length} Dosya` : '+ Görsel Seç'}</span>
                    <input type="file" multiple accept="image/*" className="hidden" onChange={e => setRecordPhotos(Array.from(e.target.files || []))} />
                  </label>
                </div>
                
                <div className="flex justify-end gap-3 pt-6 border-t border-white/[0.06]">
                  <button type="button" onClick={() => setShowEditRecord(false)} className="px-6 h-12 rounded-2xl bg-white/[0.03] text-sm font-bold">İptal</button>
                  <button type="submit" disabled={saving} className="px-6 h-12 btn-primary rounded-2xl text-sm font-bold min-w-[120px]">
                    {saving ? <Loader2 size={18} className="animate-spin" /> : 'Güncelle'}
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

export default function AdminDashboardPage() {
  return (
    <RouteGuard requiredRole="admin">
      <DashboardContent />
    </RouteGuard>
  );
}