'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { Sidebar, Topbar, PageHeader, StatCard } from '@/components/DashboardShell';
import RouteGuard from '@/components/RouteGuard';
import { useAuth } from '@/context/AuthContext';
import { supabase, type Mall, type Business, type MaintenanceRecord } from '@/lib/supabase';
import { 
  Building2, PlusCircle, X, Loader2, Upload,
  Edit3, Trash2, Store, Activity,
  ChevronRight, Printer, FileText, UserCircle
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
  const { profile, loading: authLoading } = useAuth();
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

  const fetchData = useCallback(async () => {
    setLoading(true);
    
    try {
      const [bizRes, mallsRes, recRes] = await Promise.all([
        supabase.from('businesses').select('*'),
        supabase.from('malls').select('*'),
        supabase.from('maintenance_records').select('*, businesses(name)').order('created_at', { ascending: false }).limit(20),
      ]);

      setBusinesses(bizRes.data || []);
      setMalls(mallsRes.data || []);
      setRecords(recRes.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Auth loading bitmiş ve profile mevcut olmalı
    if (authLoading || !profile) {
      return;
    }

    // Verileri yükle
    fetchData();

    // Real-time subscriptions
    const mallSub = supabase.channel('mall-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'malls' }, () => fetchData())
      .subscribe();
    
    const recSub = supabase.channel('rec-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'maintenance_records' }, () => fetchData())
      .subscribe();
    
    return () => {
      supabase.removeChannel(mallSub);
      supabase.removeChannel(recSub);
    };
  }, [authLoading, profile, fetchData]);

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
      fetchData();
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
      fetchData();
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
        <Topbar title="Operasyon Komuta Merkezi" subtitle={`Yönetici: ${profile?.full_name || 'Admin'}`} />

        <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
          {/* Page Header */}
          <PageHeader 
            title="Saha Operasyonları"
            description="Gerçek zamanlı servis biletlerini izleyin, yeni operasyonlar oluşturun ve müşteri kayıtlarını yönetin."
            actions={
              <>
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
              </>
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
          <div className="glass overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-[hsl(var(--border))] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h3 className="text-base font-semibold flex items-center gap-2">
                  <FileText size={16} className="text-muted-foreground" />
                  Son İş Emirleri
                </h3>
              </div>
              <Link href="/admin/history" className="text-xs font-semibold text-primary hover:underline flex items-center gap-1">
                Tümünü Gör <ChevronRight size={14} />
              </Link>
            </div>
            
            <div className="overflow-x-auto">
              {loading ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : records.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3">
                  <div className="w-12 h-12 rounded-xl bg-[hsl(var(--muted))] flex items-center justify-center">
                    <FileText className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <div className="text-center">
                    <p className="font-semibold text-sm">İşlem Bulunamadı</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Henüz iş emri oluşturulmamış.</p>
                  </div>
                </div>
              ) : (
                <table className="table-modern">
                  <thead>
                    <tr>
                      <th className="w-20">No</th>
                      <th className="w-28">Tarih</th>
                      <th>İşletme</th>
                      <th className="w-28">Hizmet Türü</th>
                      <th className="hidden md:table-cell">Notlar</th>
                      <th className="w-24">Durum</th>
                      <th className="w-24 text-center">İşlem</th>
                    </tr>
                  </thead>
                  <tbody>
                    {records.map((rec) => {
                      const parsed = parseDescription(rec.description);
                      return (
                        <tr key={rec.id}>
                          <td className="font-mono text-xs text-muted-foreground">#{rec.id.substring(0, 6).toUpperCase()}</td>
                          <td className="whitespace-nowrap text-xs">{new Date(rec.created_at).toLocaleDateString('tr-TR')}</td>
                          <td className="font-semibold">{(rec as any).businesses?.name || '—'}</td>
                          <td className="text-primary/80 font-medium text-xs">{rec.service_type || 'BAKIM'}</td>
                          <td className="hidden md:table-cell text-muted-foreground text-xs italic max-w-xs truncate">{parsed.text}</td>
                          <td>
                            <span className={cn("badge", getStatusColor(parsed.status))}>{parsed.status}</span>
                          </td>
                          <td>
                            <div className="flex items-center justify-center gap-1">
                              <button onClick={() => handleEditClick(rec)} className="btn-icon w-8 h-8" title="Düzenle">
                                <Edit3 size={14} />
                              </button>
                              <Link href={`/admin/history?id=${rec.id}`} className="btn-icon w-8 h-8" title="Yazdır">
                                <Printer size={14} />
                              </Link>
                              <button onClick={() => handleDeleteRecord(rec.id)} className="btn-icon w-8 h-8 hover:text-red-500 hover:border-red-500/30" title="Sil">
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
            <div className="modal-content" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between p-5 border-b border-[hsl(var(--border))]">
                <h3 className="text-lg font-semibold">Yeni AVM Tanımla</h3>
                <button onClick={() => setShowAddMall(false)} className="btn-icon">
                  <X size={18} />
                </button>
              </div>
              <form onSubmit={handleAddMall} className="p-5 space-y-4">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">AVM Adı *</label>
                  <input 
                    value={mallForm.name} 
                    onChange={e => setMallForm({...mallForm, name: e.target.value})} 
                    required 
                    className="input-premium" 
                    placeholder="Örn: Akasya AVM" 
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Lokasyon / Adres</label>
                  <input 
                    value={mallForm.address} 
                    onChange={e => setMallForm({...mallForm, address: e.target.value})} 
                    className="input-premium" 
                    placeholder="Şehir, İlçe vs." 
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Sorumlu Kişi</label>
                  <input 
                    value={mallForm.contact_person} 
                    onChange={e => setMallForm({...mallForm, contact_person: e.target.value})} 
                    className="input-premium" 
                    placeholder="İsim Soyisim" 
                  />
                </div>
                <div className="flex justify-end gap-2 pt-4">
                  <button type="button" onClick={() => setShowAddMall(false)} className="btn-secondary h-10 px-4">
                    İptal
                  </button>
                  <button type="submit" disabled={saving} className="btn-primary h-10 px-4">
                    {saving ? <Loader2 size={16} className="animate-spin" /> : 'Kaydet'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Add Record Modal */}
        {showAddRecord && (
          <div className="modal-overlay" onClick={() => setShowAddRecord(false)}>
            <div className="modal-content max-w-2xl" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between p-5 border-b border-[hsl(var(--border))]">
                <div>
                  <h3 className="text-lg font-semibold">Yeni İş Emri</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">Sisteme detaylı bir operasyon fişi ekleyin.</p>
                </div>
                <button onClick={() => setShowAddRecord(false)} className="btn-icon">
                  <X size={18} />
                </button>
              </div>
              <form onSubmit={handleAddRecord} className="p-5 space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Hedef AVM *</label>
                    <select 
                      value={recordForm.mall_id} 
                      onChange={e => setRecordForm({...recordForm, mall_id: e.target.value, business_id: ''})} 
                      required 
                      className="input-premium"
                    >
                      <option value="">AVM Seçin</option>
                      {malls.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Hedef İşletme *</label>
                    <select 
                      value={recordForm.business_id} 
                      onChange={e => setRecordForm({...recordForm, business_id: e.target.value})} 
                      required 
                      disabled={!recordForm.mall_id}
                      className="input-premium"
                    >
                      <option value="">{recordForm.mall_id ? 'İşletme Seçin' : 'Önce AVM Seçin'}</option>
                      {businesses
                        .filter(b => b.mall_id === recordForm.mall_id)
                        .map(b => <option key={b.id} value={b.id}>{b.name}</option>)
                      }
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">İşlem Türü</label>
                    <input 
                      list="svc" 
                      value={recordForm.service_type} 
                      onChange={e => setRecordForm({...recordForm, service_type: e.target.value})} 
                      className="input-premium" 
                      placeholder="Örn: Genel Bakım" 
                    />
                    <datalist id="svc">
                      <option value="Genel Bakım" />
                      <option value="Yangın Sistemi Kontrolü" />
                      <option value="Baca Temizliği" />
                      <option value="Arıza Tespiti & Onarım" />
                    </datalist>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">İşlem Durumu</label>
                    <select 
                      value={recordForm.status} 
                      onChange={e => setRecordForm({...recordForm, status: e.target.value})} 
                      className="input-premium"
                    >
                      <option value="Tamamlandı">Tamamlandı</option>
                      <option value="Devam Ediyor">Devam Ediyor</option>
                      <option value="İptal / Ertelendi">İptal / Ertelendi</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="sm:col-span-1">
                    <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Görevli Teknisyen</label>
                    <div className="relative">
                      <UserCircle className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <input 
                        value={recordForm.technician} 
                        onChange={e => setRecordForm({...recordForm, technician: e.target.value})} 
                        className="input-premium pl-9" 
                        placeholder="Personel" 
                      />
                    </div>
                  </div>
                  <div className="sm:col-span-1">
                    <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Kullanılan Parçalar</label>
                    <input 
                      value={recordForm.materials} 
                      onChange={e => setRecordForm({...recordForm, materials: e.target.value})} 
                      className="input-premium" 
                      placeholder="Örn: 2 Adet Tüp" 
                    />
                  </div>
                  <div className="sm:col-span-1">
                    <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Maliyet (Opsiyonel)</label>
                    <input 
                      value={recordForm.cost} 
                      onChange={e => setRecordForm({...recordForm, cost: e.target.value})} 
                      className="input-premium" 
                      placeholder="Örn: 2500 TL" 
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Saha Notları *</label>
                  <textarea 
                    value={recordForm.text} 
                    onChange={e => setRecordForm({...recordForm, text: e.target.value})} 
                    required 
                    rows={3} 
                    className="input-premium resize-none" 
                    placeholder="Yapılan işlemi detaylı şekilde özetleyin..." 
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Fotoğraf Yükle</label>
                  <label className="flex flex-col items-center justify-center gap-2 w-full py-6 rounded-lg border-2 border-dashed border-[hsl(var(--border))] hover:border-primary/50 cursor-pointer transition-colors bg-[hsl(var(--muted))]/30">
                    <Upload size={24} className="text-muted-foreground/50" />
                    <span className="text-sm font-medium text-muted-foreground">
                      {recordPhotos.length > 0 ? `${recordPhotos.length} Dosya Seçildi` : 'Tıkla veya Sürükle'}
                    </span>
                    <input type="file" multiple accept="image/*" className="hidden" onChange={e => setRecordPhotos(Array.from(e.target.files || []))} />
                  </label>
                </div>
                
                <div className="flex justify-end gap-2 pt-2">
                  <button type="button" onClick={() => setShowAddRecord(false)} className="btn-secondary h-10 px-4">
                    İptal
                  </button>
                  <button type="submit" disabled={saving} className="btn-primary h-10 px-4">
                    {saving ? <Loader2 size={16} className="animate-spin" /> : 'Kaydet'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Edit Record Modal */}
        {showEditRecord && (
          <div className="modal-overlay" onClick={() => setShowEditRecord(false)}>
            <div className="modal-content max-w-2xl" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between p-5 border-b border-[hsl(var(--border))]">
                <h3 className="text-lg font-semibold">İş Emrini Düzenle</h3>
                <button onClick={() => setShowEditRecord(false)} className="btn-icon">
                  <X size={18} />
                </button>
              </div>
              <form onSubmit={handleUpdateRecord} className="p-5 space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">İşlem Türü</label>
                    <input 
                      list="svc2" 
                      value={editRecordForm.service_type} 
                      onChange={e => setEditRecordForm({...editRecordForm, service_type: e.target.value})} 
                      className="input-premium" 
                    />
                    <datalist id="svc2">
                      <option value="Genel Bakım" />
                      <option value="Yangın Sistemi Kontrolü" />
                    </datalist>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Görevli Teknisyen</label>
                    <input 
                      value={editRecordForm.technician} 
                      onChange={e => setEditRecordForm({...editRecordForm, technician: e.target.value})} 
                      className="input-premium" 
                      placeholder="Personel seçin/yazın" 
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">İşlem Durumu</label>
                    <select 
                      value={editRecordForm.status} 
                      onChange={e => setEditRecordForm({...editRecordForm, status: e.target.value})} 
                      className="input-premium"
                    >
                      <option value="Tamamlandı">Tamamlandı</option>
                      <option value="Devam Ediyor">Devam Ediyor</option>
                      <option value="İptal / Ertelendi">İptal / Ertelendi</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Açıklama / Saha Notları</label>
                  <textarea 
                    value={editRecordForm.text} 
                    onChange={e => setEditRecordForm({...editRecordForm, text: e.target.value})} 
                    rows={3} 
                    className="input-premium resize-none" 
                    placeholder="Yapılan işlemi detaylandırın..." 
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Kullanılan Parçalar</label>
                    <input 
                      value={editRecordForm.materials} 
                      onChange={e => setEditRecordForm({...editRecordForm, materials: e.target.value})} 
                      className="input-premium" 
                      placeholder="Örn: 2 Adet Yangın Tüpü" 
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Maliyet</label>
                    <input 
                      value={editRecordForm.cost} 
                      onChange={e => setEditRecordForm({...editRecordForm, cost: e.target.value})} 
                      className="input-premium" 
                      placeholder="Örn: 2500 TL" 
                    />
                  </div>
                </div>

                {editingPhotos.length > 0 && (
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground mb-2 block">Mevcut Fotoğraflar</label>
                    <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                      {editingPhotos.map((ph) => (
                        <div key={ph.id} className="relative aspect-square rounded-lg overflow-hidden border border-[hsl(var(--border))] group">
                          <img src={ph.photo_url} className="w-full h-full object-cover" alt="Fotoğraf" />
                          <button 
                            type="button"
                            onClick={() => handleDeletePhoto(ph)}
                            className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-md opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Yeni Fotoğraf Ekle</label>
                  <label className="flex flex-col items-center justify-center gap-2 w-full py-6 rounded-lg border-2 border-dashed border-[hsl(var(--border))] hover:border-primary/50 cursor-pointer transition-colors bg-[hsl(var(--muted))]/30">
                    <Upload size={24} className="text-muted-foreground/50" />
                    <span className="text-sm font-medium text-muted-foreground">
                      {recordPhotos.length > 0 ? `${recordPhotos.length} Yeni Dosya` : 'Tıkla veya Sürükle'}
                    </span>
                    <input type="file" multiple accept="image/*" className="hidden" onChange={e => setRecordPhotos(Array.from(e.target.files || []))} />
                  </label>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button type="button" onClick={() => { setShowEditRecord(false); setRecordPhotos([]); }} className="btn-secondary h-10 px-4">
                    İptal
                  </button>
                  <button type="submit" disabled={saving} className="btn-primary h-10 px-4">
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