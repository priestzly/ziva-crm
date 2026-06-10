'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Sidebar, Topbar, PageHeader, StatCard } from '@/components/DashboardShell';
import RouteGuard from '@/components/RouteGuard';
import { useAuth } from '@/context/AuthContext';
import { supabase, type Mall, type Business, type MaintenanceRecord } from '@/lib/supabase';
import { 
  Building2, PlusCircle, X, Loader2, Upload,
  Edit3, Trash2, Store, Activity,
  ChevronRight, ChevronLeft, Printer, FileText, UserCircle, RefreshCw, ShieldAlert,
  Check, MapPin, Search, Camera, Wrench, ClipboardList
} from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';
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
    return { text: desc, technician: '', materials: '', status: 'Bilinmiyor', cost: '' };
  }
};

function DashboardContent() {
  const isMobile = useIsMobile();
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
  const [showRecentRecordsModal, setShowRecentRecordsModal] = useState(false);
  const [viewingRecordDetail, setViewingRecordDetail] = useState<MaintenanceRecord | null>(null);
  const [detailPhotos, setDetailPhotos] = useState<any[]>([]);

  // Wizard states
  const [wizardStep, setWizardStep] = useState(1);
  const [wizardDirection, setWizardDirection] = useState<'right' | 'left'>('right');
  const [mallSearch, setMallSearch] = useState('');
  const [bizSearch, setBizSearch] = useState('');

  const handleOpenAddRecord = () => {
    setRecordForm({ 
      mall_id: '', business_id: '', service_type: '', text: '', technician: '', materials: '', status: 'Tamamlandı', cost: '' 
    });
    setRecordPhotos([]);
    setMallSearch('');
    setBizSearch('');
    setWizardStep(1);
    setShowAddRecord(true);
  };

  const handleViewRecordDetail = async (rec: MaintenanceRecord) => {
    setViewingRecordDetail(rec);
    const { data } = await supabase.from('maintenance_photos').select('*').eq('record_id', rec.id);
    setDetailPhotos(data || []);
  };

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
    <div className="min-h-screen flex bg-amoled lg:bg-transparent">
      <Sidebar role="admin" />
      <main className="flex-1 lg:ml-72 pb-24 lg:pb-0 transition-all duration-300 w-full overflow-x-hidden">
        <Topbar 
          title="Operasyon Komuta Merkezi" 
          subtitle={isRefreshing ? 'Yenileniyor...' : `Yönetici: ${profile?.full_name || 'Admin'}`} 
        />

        <div className="p-3 sm:p-6 lg:p-8 space-y-4 sm:space-y-6 max-w-7xl mx-auto">
          {/* Error Banner */}
          {fetchError && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl sm:rounded-2xl p-3 sm:p-4 flex items-center justify-between gap-3 animate-fade-in shadow-lg shadow-red-500/5">
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
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => fetchData(true)}
                  className="p-2 rounded-lg sm:rounded-xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06] transition-colors text-muted-foreground group"
                  title="Yenile"
                >
                  <RefreshCw size={16} className={cn("transition-transform duration-500", isRefreshing && "animate-spin")} />
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
                  onClick={handleOpenAddRecord} 
                  className="btn-primary h-10 px-4 text-xs font-semibold"
                >
                  <PlusCircle size={16} />
                  İş Emri Oluştur
                </button>
              </div>
            }
          />

          {/* Horizontal Row Menu / Yatay Barlar */}
          <div className="space-y-3 sm:space-y-4 pt-1 sm:pt-2">
            {/* Row 1: İş Emri Oluştur */}
            <button 
              onClick={handleOpenAddRecord}
              className="w-full flex items-center justify-between p-3.5 sm:p-5 lg:p-6 bg-gradient-to-r from-red-500/10 via-orange-500/5 to-transparent border border-red-500/20 hover:border-red-500/40 rounded-2xl sm:rounded-3xl transition-all duration-300 text-left group cursor-pointer"
            >
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="w-10 h-10 sm:w-12 sm:h-12 lg:w-14 lg:h-14 rounded-xl sm:rounded-2xl bg-red-500/20 flex items-center justify-center text-red-500 group-hover:scale-110 transition-transform duration-300 shadow-lg shadow-red-500/10 shrink-0">
                  <PlusCircle size={20} className="sm:hidden" />
                  <PlusCircle size={24} className="hidden sm:block" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm sm:text-base font-black text-white uppercase tracking-wider">İş Emri Oluştur</h3>
                  <p className="text-[10px] sm:text-xs text-white/40 font-medium mt-0.5 sm:mt-1 hidden sm:block">Saha teknik ekibi için hızlı şekilde yeni operasyon fişi tanımlayın</p>
                </div>
              </div>
              <ChevronRight size={18} className="text-white/20 group-hover:translate-x-1 group-hover:text-white/50 transition-all shrink-0" />
            </button>

            {/* Row 2: AVM'ler */}
            <Link 
              href="/admin/malls"
              className="w-full flex items-center justify-between p-3.5 sm:p-5 lg:p-6 bg-white/[0.02] border border-white/[0.04] hover:border-white/10 hover:bg-white/[0.03] rounded-2xl sm:rounded-3xl transition-all duration-300 text-left group"
            >
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="w-10 h-10 sm:w-12 sm:h-12 lg:w-14 lg:h-14 rounded-xl sm:rounded-2xl bg-violet-500/20 flex items-center justify-center text-violet-400 group-hover:scale-110 transition-transform duration-300 shadow-lg shadow-violet-500/10 shrink-0">
                  <Building2 size={20} className="sm:hidden" />
                  <Building2 size={24} className="hidden sm:block" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm sm:text-base font-black text-white uppercase tracking-wider">AVM Yönetimi</h3>
                  <p className="text-[10px] sm:text-xs text-white/40 font-medium mt-0.5 sm:mt-1 hidden sm:block">Sistemdeki kayıtlı AVM bölgelerini ve yerleşim planlarını yönetin</p>
                </div>
              </div>
              <div className="flex items-center gap-2 sm:gap-4 shrink-0">
                <span className="text-sm sm:text-xl font-black text-violet-400 tabular-nums">{malls.length} AVM</span>
                <ChevronRight size={18} className="text-white/20 group-hover:translate-x-1 group-hover:text-white/50 transition-all" />
              </div>
            </Link>

            {/* Row 3: İşletmeler */}
            <Link 
              href="/admin/businesses"
              className="w-full flex items-center justify-between p-3.5 sm:p-5 lg:p-6 bg-white/[0.02] border border-white/[0.04] hover:border-white/10 hover:bg-white/[0.03] rounded-2xl sm:rounded-3xl transition-all duration-300 text-left group"
            >
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="w-10 h-10 sm:w-12 sm:h-12 lg:w-14 lg:h-14 rounded-xl sm:rounded-2xl bg-cyan-500/20 flex items-center justify-center text-cyan-400 group-hover:scale-110 transition-transform duration-300 shadow-lg shadow-cyan-500/10 shrink-0">
                  <Store size={20} className="sm:hidden" />
                  <Store size={24} className="hidden sm:block" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm sm:text-base font-black text-white uppercase tracking-wider">İşletmeler</h3>
                  <p className="text-[10px] sm:text-xs text-white/40 font-medium mt-0.5 sm:mt-1 hidden sm:block">AVM'lere bağlı aktif ticari işletmeleri ve mağaza kartlarını inceleyin</p>
                </div>
              </div>
              <div className="flex items-center gap-2 sm:gap-4 shrink-0">
                <span className="text-sm sm:text-xl font-black text-cyan-400 tabular-nums">{businesses.length} Mağaza</span>
                <ChevronRight size={18} className="text-white/20 group-hover:translate-x-1 group-hover:text-white/50 transition-all" />
              </div>
            </Link>

            {/* Row 4: Son İş Emirleri (Modal) */}
            <button 
              onClick={() => setShowRecentRecordsModal(true)}
              className="w-full flex items-center justify-between p-3.5 sm:p-5 lg:p-6 bg-white/[0.02] border border-white/[0.04] hover:border-white/10 hover:bg-white/[0.03] rounded-2xl sm:rounded-3xl transition-all duration-300 text-left group cursor-pointer"
            >
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="w-10 h-10 sm:w-12 sm:h-12 lg:w-14 lg:h-14 rounded-xl sm:rounded-2xl bg-amber-500/20 flex items-center justify-center text-amber-400 group-hover:scale-110 transition-transform duration-300 shadow-lg shadow-amber-500/10 shrink-0">
                  <FileText size={20} className="sm:hidden" />
                  <FileText size={24} className="hidden sm:block" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm sm:text-base font-black text-white uppercase tracking-wider">Son İş Emirleri</h3>
                  <p className="text-[10px] sm:text-xs text-white/40 font-medium mt-0.5 sm:mt-1 hidden sm:block">Son oluşturulan operasyon fişlerini ve teknik detayları inceleyin</p>
                </div>
              </div>
              <div className="flex items-center gap-2 sm:gap-4 shrink-0">
                <span className="text-sm sm:text-xl font-black text-amber-400 tabular-nums">{records.length} Kayıt</span>
                <ChevronRight size={18} className="text-white/20 group-hover:translate-x-1 group-hover:text-white/50 transition-all" />
              </div>
            </button>
          </div>
        </div>

        {/* Mobile FAB */}
        {isMobile && (
          <button
            onClick={handleOpenAddRecord}
            className="fixed bottom-24 right-6 w-14 h-14 rounded-full bg-primary text-white flex items-center justify-center shadow-lg shadow-red-500/30 active:scale-95 transition-all z-40 cursor-pointer"
            title="Yeni İş Emri"
          >
            <PlusCircle size={24} />
          </button>
        )}

        {/* ═══ MODALS & SHEETS ═══ */}
        
        {/* Add Mall Sheet */}
        <MobileBottomSheet
          isOpen={showAddMall}
          onClose={() => setShowAddMall(false)}
          title="Yeni AVM Tanımla"
        >
          <form onSubmit={handleAddMall} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-white/40 ml-1">AVM Adı *</label>
              <input value={mallForm.name} onChange={e => setMallForm({...mallForm, name: e.target.value})} required className="w-full h-11 bg-white/5 border border-white/10 rounded-xl px-4 text-sm text-white placeholder-white/30" placeholder="Örn: Akasya AVM" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-white/40 ml-1">Lokasyon / Adres</label>
              <input value={mallForm.address} onChange={e => setMallForm({...mallForm, address: e.target.value})} className="w-full h-11 bg-white/5 border border-white/10 rounded-xl px-4 text-sm text-white placeholder-white/30" placeholder="Şehir, İlçe vs." />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-white/40 ml-1">Sorumlu Kişi</label>
              <input value={mallForm.contact_person} onChange={e => setMallForm({...mallForm, contact_person: e.target.value})} className="w-full h-11 bg-white/5 border border-white/10 rounded-xl px-4 text-sm text-white placeholder-white/30" placeholder="İsim Soyisim" />
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t border-white/5">
              <button type="submit" disabled={saving} className="w-full h-12 bg-red-500 text-white rounded-xl text-xs font-black uppercase tracking-widest cursor-pointer shadow-lg shadow-red-500/20 active:scale-95 transition-all">
                {saving ? <Loader2 size={18} className="animate-spin" /> : 'AVM Kaydet'}
              </button>
            </div>
          </form>
        </MobileBottomSheet>

        {/* ═══ ADD RECORD — FULL SCREEN WIZARD ═══ */}
        {showAddRecord && (() => {
          const WIZARD_STEPS = [
            { num: 1, label: 'AVM', icon: Building2 },
            { num: 2, label: 'İşletme', icon: Store },
            { num: 3, label: 'Detaylar', icon: ClipboardList },
            { num: 4, label: 'Onay', icon: Check },
          ];
          const selectedMall = malls.find(m => m.id === recordForm.mall_id);
          const selectedBiz = businesses.find(b => b.id === recordForm.business_id);
          const filteredMalls = malls.filter(m => m.name.toLowerCase().includes(mallSearch.toLowerCase()));
          const filteredBiz = businesses.filter(b => b.mall_id === recordForm.mall_id && b.name.toLowerCase().includes(bizSearch.toLowerCase()));
          const wizardAnimClass = wizardDirection === 'right' ? 'wizard-slide-right' : 'wizard-slide-left';

          const goNext = () => { setWizardDirection('right'); setWizardStep(s => Math.min(s + 1, 4)); };
          const goBack = () => { setWizardDirection('left'); setWizardStep(s => Math.max(s - 1, 1)); };

          return (
            <div className="fixed inset-0 z-[150] bg-background text-foreground flex flex-col animate-fade-in">
              {/* ── Header ── */}
              <div className="shrink-0 bg-card border-b border-border">
                <div className="h-14 px-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {wizardStep > 1 ? (
                      <button onClick={goBack} className="w-9 h-9 rounded-xl bg-secondary border border-border flex items-center justify-center text-foreground hover:bg-muted transition-colors">
                        <ChevronLeft size={18} />
                      </button>
                    ) : (
                      <button onClick={() => setShowAddRecord(false)} className="w-9 h-9 rounded-xl bg-secondary border border-border flex items-center justify-center text-foreground hover:bg-muted transition-colors">
                        <X size={18} />
                      </button>
                    )}
                    <div className="ml-1">
                      <h3 className="font-black text-sm tracking-tight text-foreground">Yeni İş Emri</h3>
                      <p className="text-[9px] text-muted-foreground font-bold uppercase tracking-widest">Adım {wizardStep} / 4</p>
                    </div>
                  </div>
                  <button onClick={() => setShowAddRecord(false)} className="w-9 h-9 rounded-xl bg-secondary border border-border flex items-center justify-center text-muted-foreground hover:bg-muted transition-colors">
                    <X size={16} />
                  </button>
                </div>

                {/* Progress bar */}
                <div className="px-4 pb-3">
                  <div className="wizard-progress">
                    <div className="wizard-progress-bar" style={{ width: `${(wizardStep / 4) * 100}%` }} />
                  </div>
                  {/* Step indicators */}
                  <div className="flex justify-between mt-2.5">
                    {WIZARD_STEPS.map(s => {
                      const StepIcon = s.icon;
                      const isActive = wizardStep === s.num;
                      const isDone = wizardStep > s.num;
                      return (
                        <div key={s.num} className="flex flex-col items-center gap-1">
                          <div className={cn(
                            "w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 text-xs font-black",
                            isActive && "bg-primary text-white scale-110 shadow-lg shadow-primary/30",
                            isDone && "bg-emerald-500/20 text-emerald-400",
                            !isActive && !isDone && "bg-secondary text-muted-foreground/30"
                          )}>
                            {isDone ? <Check size={14} /> : <StepIcon size={14} />}
                          </div>
                          <span className={cn(
                            "text-[8px] font-bold uppercase tracking-wider",
                            isActive ? "text-foreground font-black" : isDone ? "text-emerald-400/60" : "text-muted-foreground/30"
                          )}>{s.label}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* ── Step Content ── */}
              <div className="flex-1 overflow-y-auto pb-32">
                <div className="max-w-lg mx-auto w-full p-4">

                  {/* ════ STEP 1: AVM Seçimi ════ */}
                  {wizardStep === 1 && (
                    <div key="step1" className={wizardAnimClass}>
                      <div className="text-center mb-6 mt-2">
                        <div className="w-16 h-16 rounded-2xl bg-violet-500/15 flex items-center justify-center text-violet-400 mx-auto mb-3">
                          <Building2 size={30} />
                        </div>
                        <h2 className="text-xl font-black text-foreground tracking-tight">AVM Seçin</h2>
                        <p className="text-sm text-muted-foreground mt-1">İş emrinin uygulanacağı AVM bölgesini belirleyin</p>
                      </div>

                      {/* Search */}
                      <div className="relative mb-4">
                        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground/40" />
                        <input
                          type="text"
                          value={mallSearch}
                          onChange={e => setMallSearch(e.target.value)}
                          placeholder="AVM ara..."
                          className="input-premium h-12 pl-11 pr-4 w-full"
                          autoFocus
                        />
                      </div>

                      {/* Mall cards */}
                      <div className="space-y-3">
                        {filteredMalls.length === 0 ? (
                          <div className="text-center py-12 text-muted-foreground/40">
                            <Building2 size={36} className="mx-auto mb-2 opacity-30" />
                            <p className="text-sm font-bold">AVM bulunamadı</p>
                          </div>
                        ) : (
                          filteredMalls.map(mall => (
                            <div
                              key={mall.id}
                              onClick={() => {
                                setRecordForm(f => ({ ...f, mall_id: mall.id, business_id: '' }));
                                setBizSearch('');
                                setTimeout(goNext, 200);
                              }}
                              className={cn('wizard-card bg-card border-border', recordForm.mall_id === mall.id && 'selected border-red-500')}
                            >
                              <div className="w-11 h-11 rounded-xl bg-violet-500/15 flex items-center justify-center text-violet-400 shrink-0">
                                <Building2 size={20} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-bold text-foreground text-[15px] truncate">{mall.name}</p>
                                {mall.address && (
                                  <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5 truncate">
                                    <MapPin size={10} />
                                    {mall.address}
                                  </p>
                                )}
                              </div>
                              <div className="wizard-check">
                                {recordForm.mall_id === mall.id && <Check size={12} className="text-white" />}
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}

                  {/* ════ STEP 2: İşletme Seçimi ════ */}
                  {wizardStep === 2 && (
                    <div key="step2" className={wizardAnimClass}>
                      <div className="text-center mb-6 mt-2">
                        <div className="w-16 h-16 rounded-2xl bg-cyan-500/15 flex items-center justify-center text-cyan-400 mx-auto mb-3">
                          <Store size={30} />
                        </div>
                        <h2 className="text-xl font-black text-foreground tracking-tight">İşletme Seçin</h2>
                        <p className="text-sm text-muted-foreground mt-1">
                          {selectedMall ? <><span className="text-violet-400 font-bold">{selectedMall.name}</span> içindeki işletme</> : 'İşletme seçin'}
                        </p>
                      </div>

                      {/* Search */}
                      <div className="relative mb-4">
                        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground/40" />
                        <input
                          type="text"
                          value={bizSearch}
                          onChange={e => setBizSearch(e.target.value)}
                          placeholder="İşletme ara..."
                          className="input-premium h-12 pl-11 pr-4 w-full"
                          autoFocus
                        />
                      </div>

                      {/* Business cards */}
                      <div className="space-y-3">
                        {filteredBiz.length === 0 ? (
                          <div className="text-center py-12 text-muted-foreground/40">
                            <Store size={36} className="mx-auto mb-2 opacity-30" />
                            <p className="text-sm font-bold">İşletme bulunamadı</p>
                            <p className="text-xs mt-1 text-muted-foreground/30">Bu AVM'de kayıtlı işletme yok veya aramanız eşleşmedi</p>
                          </div>
                        ) : (
                          filteredBiz.map(biz => (
                            <div
                              key={biz.id}
                              onClick={() => {
                                setRecordForm(f => ({ ...f, business_id: biz.id }));
                                setTimeout(goNext, 200);
                              }}
                              className={cn('wizard-card bg-card border-border', recordForm.business_id === biz.id && 'selected border-red-500')}
                            >
                              <div className="w-11 h-11 rounded-xl bg-cyan-500/15 flex items-center justify-center text-cyan-400 shrink-0">
                                <Store size={20} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-bold text-foreground text-[15px] truncate">{biz.name}</p>
                                <p className="text-xs text-muted-foreground mt-0.5">{biz.category || 'İşletme'}</p>
                              </div>
                              <div className="wizard-check">
                                {recordForm.business_id === biz.id && <Check size={12} className="text-white" />}
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}

                  {/* ════ STEP 3: İşlem Detayları ════ */}
                  {wizardStep === 3 && (
                    <div key="step3" className={wizardAnimClass}>
                      <div className="text-center mb-6 mt-2">
                        <div className="w-16 h-16 rounded-2xl bg-amber-500/15 flex items-center justify-center text-amber-400 mx-auto mb-3">
                          <ClipboardList size={30} />
                        </div>
                        <h2 className="text-xl font-black text-foreground tracking-tight">İşlem Detayları</h2>
                        <p className="text-sm text-muted-foreground mt-1">Servis bilgilerini doldurun</p>
                      </div>

                      {/* Selected info summary */}
                      <div className="flex gap-2 mb-5">
                        <div className="flex-1 p-3 rounded-xl bg-violet-500/10 border border-violet-500/20">
                          <p className="text-[9px] text-violet-400/60 font-bold uppercase tracking-wider">AVM</p>
                          <p className="text-sm font-bold text-violet-600 dark:text-violet-300 truncate">{selectedMall?.name || '—'}</p>
                        </div>
                        <div className="flex-1 p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/20">
                          <p className="text-[9px] text-cyan-400/60 font-bold uppercase tracking-wider">İşletme</p>
                          <p className="text-sm font-bold text-cyan-600 dark:text-cyan-300 truncate">{selectedBiz?.name || '—'}</p>
                        </div>
                      </div>

                      <div className="space-y-4">
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
                            <option value="Tamamlandı">Tamamlandı</option>
                            <option value="Devam Ediyor">Devam Ediyor</option>
                            <option value="İptal / Ertelendi">İptal / Ertelendi</option>
                          </select>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1.5">
                            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Teknisyen</label>
                            <input value={recordForm.technician} onChange={e => setRecordForm({...recordForm, technician: e.target.value})} className="input-premium h-12 px-4 w-full" placeholder="Personel" />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Maliyet</label>
                            <input value={recordForm.cost} onChange={e => setRecordForm({...recordForm, cost: e.target.value})} className="input-premium h-12 px-4 w-full" placeholder="₺ Opsiyonel" />
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Kullanılan Parçalar</label>
                          <input value={recordForm.materials} onChange={e => setRecordForm({...recordForm, materials: e.target.value})} className="input-premium h-12 px-4 w-full" placeholder="Örn: 2 Tüp, 1 Hortum" />
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Saha Notları *</label>
                          <textarea value={recordForm.text} onChange={e => setRecordForm({...recordForm, text: e.target.value})} rows={4} className="input-premium p-4 w-full resize-none" placeholder="Yapılan işlemi detaylı şekilde özetleyin..." />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ════ STEP 4: Fotoğraf & Onay ════ */}
                  {wizardStep === 4 && (
                    <div key="step4" className={wizardAnimClass}>
                      <div className="text-center mb-6 mt-2">
                        <div className="w-16 h-16 rounded-2xl bg-emerald-500/15 flex items-center justify-center text-emerald-400 mx-auto mb-3">
                          <Check size={30} />
                        </div>
                        <h2 className="text-xl font-black text-foreground tracking-tight">Gözden Geçir & Gönder</h2>
                        <p className="text-sm text-muted-foreground mt-1">Bilgileri kontrol edin, fotoğraf ekleyin</p>
                      </div>

                      {/* Summary cards */}
                      <div className="space-y-3 mb-6">
                        <div className="p-4 rounded-2xl bg-card border border-border space-y-3">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="text-[9px] text-violet-400/60 font-bold uppercase tracking-wider">AVM</p>
                              <p className="text-base font-black text-foreground">{selectedMall?.name || '—'}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-[9px] text-cyan-400/60 font-bold uppercase tracking-wider">İşletme</p>
                              <p className="text-base font-black text-foreground">{selectedBiz?.name || '—'}</p>
                            </div>
                          </div>
                          <div className="h-px bg-border" />
                          <div className="grid grid-cols-2 gap-3 text-sm">
                            <div>
                              <p className="text-[9px] text-muted-foreground font-bold uppercase">İşlem</p>
                              <p className="font-bold text-foreground/80">{recordForm.service_type || 'Genel Bakım'}</p>
                            </div>
                            <div>
                              <p className="text-[9px] text-muted-foreground font-bold uppercase">Durum</p>
                              <p className={cn("font-bold",
                                recordForm.status === 'Tamamlandı' ? 'text-emerald-500' :
                                recordForm.status === 'Devam Ediyor' ? 'text-blue-500' : 'text-red-500'
                              )}>{recordForm.status}</p>
                            </div>
                            {recordForm.technician && (
                              <div>
                                <p className="text-[9px] text-muted-foreground font-bold uppercase">Teknisyen</p>
                                <p className="font-bold text-foreground/80">{recordForm.technician}</p>
                              </div>
                            )}
                            {recordForm.cost && (
                              <div>
                                <p className="text-[9px] text-muted-foreground font-bold uppercase">Maliyet</p>
                                <p className="font-bold text-foreground/80">{recordForm.cost}</p>
                              </div>
                            )}
                          </div>
                          {recordForm.text && (
                            <>
                              <div className="h-px bg-border" />
                              <div>
                                <p className="text-[9px] text-muted-foreground font-bold uppercase mb-1">Saha Notları</p>
                                <p className="text-sm text-muted-foreground italic leading-relaxed">"{recordForm.text}"</p>
                              </div>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Photo upload */}
                      <div className="space-y-3">
                        <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Görsel Kanıt</p>
                        <label className="flex flex-col items-center justify-center gap-3 w-full py-10 rounded-2xl border-2 border-dashed border-border hover:border-primary/40 cursor-pointer transition-all bg-secondary/20 active:scale-[0.98]">
                          <Camera size={32} className="text-muted-foreground/30" />
                          <span className="text-sm font-bold text-muted-foreground">{recordPhotos.length > 0 ? `${recordPhotos.length} Dosya Seçildi` : 'Fotoğraf Ekle'}</span>
                          <span className="text-[10px] text-muted-foreground/40">Tıklayın veya sürükleyin</span>
                          <input type="file" multiple accept="image/*" className="hidden" onChange={e => setRecordPhotos(Array.from(e.target.files || []))} />
                        </label>
                        {recordPhotos.length > 0 && (
                          <div className="grid grid-cols-3 gap-2">
                            {recordPhotos.map((file, i) => (
                              <div key={i} className="aspect-square rounded-xl bg-secondary border border-border flex items-center justify-center overflow-hidden">
                                <img src={URL.createObjectURL(file)} alt="" className="w-full h-full object-cover" />
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* ── Bottom Action Bar ── */}
              <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border p-4 pb-[max(1rem,env(safe-area-inset-bottom))] z-10">
                <div className="max-w-lg mx-auto flex gap-3">
                  {wizardStep > 1 && (
                    <button
                      type="button"
                      onClick={goBack}
                      className="flex-1 h-14 rounded-2xl bg-secondary border border-border text-foreground font-bold text-sm flex items-center justify-center gap-2 hover:bg-secondary/80 transition-colors active:scale-[0.97]"
                    >
                      <ChevronLeft size={18} />
                      Geri
                    </button>
                  )}
                  {wizardStep < 4 ? (
                    <button
                      type="button"
                      onClick={goNext}
                      disabled={
                        (wizardStep === 1 && !recordForm.mall_id) ||
                        (wizardStep === 2 && !recordForm.business_id)
                      }
                      className={cn(
                        "flex-[2] h-14 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.97]",
                        ((wizardStep === 1 && !recordForm.mall_id) || (wizardStep === 2 && !recordForm.business_id))
                          ? "bg-secondary text-muted-foreground/30 cursor-not-allowed"
                          : "bg-primary text-white shadow-lg shadow-primary/30 hover:brightness-110"
                      )}
                    >
                      Devam Et
                      <ChevronRight size={18} />
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={e => { handleAddRecord(e as any); }}
                      disabled={saving || !recordForm.text}
                      className={cn(
                        "flex-[2] h-14 rounded-2xl font-black text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.97] uppercase tracking-wider",
                        (saving || !recordForm.text)
                          ? "bg-secondary text-muted-foreground/30 cursor-not-allowed"
                          : "bg-emerald-500 text-white shadow-lg shadow-emerald-500/30 hover:brightness-110"
                      )}
                    >
                      {saving ? <Loader2 size={20} className="animate-spin" /> : <><Check size={18} /> İş Emri Oluştur</>}
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })()}

        {/* Edit Record Sheet / Modal */}
        <MobileBottomSheet
          isOpen={showEditRecord}
          onClose={() => setShowEditRecord(false)}
          title="İş Emrini Düzenle"
        >
          <form onSubmit={handleUpdateRecord} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-widest text-white/40 ml-1">İşlem Türü</label>
                <input list="svc2" value={editRecordForm.service_type} onChange={e => setEditRecordForm({...editRecordForm, service_type: e.target.value})} className="w-full h-11 bg-white/5 border border-white/10 rounded-xl px-4 text-sm text-white" />
                <datalist id="svc2"><option value="Genel Bakım" /><option value="Yangın Sistemi Kontrolü" /></datalist>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-widest text-white/40 ml-1">Teknisyen</label>
                <input value={editRecordForm.technician} onChange={e => setEditRecordForm({...editRecordForm, technician: e.target.value})} className="w-full h-11 bg-white/5 border border-white/10 rounded-xl px-4 text-sm text-white" />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-widest text-white/40 ml-1">İşlem Durumu</label>
                <select value={editRecordForm.status} onChange={e => setEditRecordForm({...editRecordForm, status: e.target.value})} className="w-full h-11 bg-white/5 border border-white/10 rounded-xl px-4 text-sm text-white select-premium">
                  <option value="Tamamlandı">Tamamlandı</option><option value="Devam Ediyor">Devam Ediyor</option><option value="İptal / Ertelendi">İptal / Ertelendi</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-widest text-white/40 ml-1">Maliyet</label>
                <input value={editRecordForm.cost} onChange={e => setEditRecordForm({...editRecordForm, cost: e.target.value})} className="w-full h-11 bg-white/5 border border-white/10 rounded-xl px-4 text-sm text-white" />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-widest text-white/40 ml-1">Açıklama / Saha Notları</label>
              <textarea value={editRecordForm.text} onChange={e => setEditRecordForm({...editRecordForm, text: e.target.value})} rows={3} className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-sm text-white leading-relaxed resize-none" />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-widest text-white/40 ml-1">Kullanılan Parçalar</label>
              <input value={editRecordForm.materials} onChange={e => setEditRecordForm({...editRecordForm, materials: e.target.value})} className="w-full h-11 bg-white/5 border border-white/10 rounded-xl px-4 text-sm text-white" />
            </div>

            {editingPhotos.length > 0 && (
              <div className="grid grid-cols-4 gap-2 pt-2">
                {editingPhotos.map(p => (
                  <div key={p.id} className="relative group aspect-square rounded-xl overflow-hidden border border-white/10 bg-black">
                    <img src={p.photo_url} alt="Ek" className="w-full h-full object-cover" />
                    <button type="button" onClick={() => handleDeletePhoto(p)} className="absolute inset-0 bg-red-600/90 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-[1px]"><Trash2 size={16} /></button>
                  </div>
                ))}
              </div>
            )}

            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-widest text-white/40 ml-1">Ek Görsel Ekle</label>
              <label className="flex flex-col items-center justify-center gap-2 w-full py-6 rounded-xl border border-dashed border-white/10 cursor-pointer transition-all bg-white/[0.02] hover:border-red-500/50 hover:bg-red-500/5">
                <span className="text-xs font-bold text-white/40">{recordPhotos.length > 0 ? `${recordPhotos.length} Dosya` : '+ Görsel Seç'}</span>
                <input type="file" multiple accept="image/*" className="hidden" onChange={e => setRecordPhotos(Array.from(e.target.files || []))} />
              </label>
            </div>
            
            <div className="flex justify-end pt-4 border-t border-white/5">
              <button type="submit" disabled={saving} className="bg-red-500 text-white w-full h-12 rounded-xl font-black uppercase tracking-[0.2em] text-xs shadow-xl shadow-red-500/20 hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer">
                {saving ? <Loader2 size={18} className="animate-spin" /> : 'Güncelle'}
              </button>
            </div>
          </form>
        </MobileBottomSheet>

        {/* Recent Records Sheet / Modal */}
        <MobileBottomSheet
          isOpen={showRecentRecordsModal}
          onClose={() => setShowRecentRecordsModal(false)}
          title="Son İş Emirleri"
        >
          <div className="space-y-3 pb-8 text-white">
            {records.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center text-white/30">
                <FileText size={36} className="mb-2 opacity-20" />
                <p className="text-xs font-bold uppercase tracking-widest">Kayıt Bulunamadı</p>
              </div>
            ) : (
              records.map((rec) => {
                const parsed = parseDescription(rec.description);
                return (
                  <div 
                    key={rec.id}
                    onClick={() => {
                      setShowRecentRecordsModal(false);
                      handleViewRecordDetail(rec);
                    }}
                    className="bg-white/[0.02] border border-white/5 rounded-xl p-4 active:scale-[0.98] transition-all cursor-pointer relative overflow-hidden"
                  >
                    <div className="flex justify-between items-start gap-4 mb-2">
                      <div className="min-w-0">
                        <p className="text-[8px] font-bold text-white/30 uppercase tracking-widest font-mono">#{rec.id.substring(0, 6).toUpperCase()}</p>
                        <h4 className="text-xs font-black text-white uppercase tracking-tight truncate mt-0.5">{(rec as any).businesses?.name || '—'}</h4>
                      </div>
                      <span className={cn(
                        "px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider border shrink-0",
                        parsed.status === 'Tamamlandı' ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" : "bg-blue-500/10 text-blue-500 border-blue-500/20"
                      )}>
                        {parsed.status}
                      </span>
                    </div>

                    <div className="py-2 border-y border-white/5 mb-2 text-[11px] text-white/50 leading-relaxed italic truncate">
                      "{parsed.text || 'Açıklama belirtilmemiş'}"
                    </div>

                    <div className="flex justify-between items-center text-[8px] font-black uppercase tracking-widest text-white/40">
                      <span>{rec.service_type || 'BAKIM'}</span>
                      <span>{new Date(rec.created_at).toLocaleDateString('tr-TR')}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </MobileBottomSheet>

        {/* Record Detail Sheet / Modal */}
        <MobileBottomSheet
          isOpen={!!viewingRecordDetail}
          onClose={() => setViewingRecordDetail(null)}
          title="Operasyon Raporu"
        >
          {viewingRecordDetail && (() => {
            const parsed = parseDescription(viewingRecordDetail.description);
            return (
              <div className="space-y-5 text-white pb-8">
                <div className="border-b border-white/5 pb-3">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-[9px] font-black uppercase tracking-widest text-red-500 bg-red-500/10 px-2 py-0.5 rounded border border-red-500/20">
                      {viewingRecordDetail.service_type || 'Servis'}
                    </span>
                    <span className={cn(
                      "text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded border",
                      parsed.status === 'Tamamlandı' ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" : "bg-blue-500/10 text-blue-500 border-blue-500/20"
                    )}>
                      {parsed.status}
                    </span>
                  </div>
                  <h3 className="text-sm font-black uppercase tracking-tight text-white leading-tight">
                    {(viewingRecordDetail as any).businesses?.name || '—'}
                  </h3>
                  <p className="text-[9px] text-white/40 font-bold uppercase tracking-widest flex items-center gap-1.5 mt-1">
                    <MapPin size={9} className="text-red-500" />
                    Belge No: #{viewingRecordDetail.id.substring(0,8).toUpperCase()}
                    <span className="text-white/20">•</span>
                    {new Date(viewingRecordDetail.created_at).toLocaleDateString('tr-TR')}
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="space-y-1">
                    <h4 className="text-[9px] font-black uppercase tracking-widest text-white/40">Saha Notları</h4>
                    <div className="bg-white/[0.02] border border-white/5 rounded-xl p-3.5 text-xs text-white/80 leading-relaxed font-serif italic whitespace-pre-wrap">
                      "{parsed.text || 'Açıklama belirtilmemiş.'}"
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <h4 className="text-[9px] font-black uppercase tracking-widest text-white/40">Teknisyen</h4>
                      <div className="bg-white/[0.02] border border-white/5 rounded-xl p-3 text-[11px] text-white/80 font-bold truncate">
                        {parsed.technician || 'Ziva Teknik Ekibi'}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-[9px] font-black uppercase tracking-widest text-white/40">Kullanılan Parçalar</h4>
                      <div className="bg-white/[0.02] border border-white/5 rounded-xl p-3 text-[11px] text-white/80 font-bold truncate">
                        {parsed.materials || 'Ekipman Kullanılmadı'}
                      </div>
                    </div>
                  </div>

                  {parsed.cost && (
                    <div className="space-y-1">
                      <h4 className="text-[9px] font-black uppercase tracking-widest text-white/40">Maliyet</h4>
                      <div className="bg-white/[0.02] border border-white/5 rounded-xl p-3 text-[11px] text-white/80 font-bold">
                        {parsed.cost}
                      </div>
                    </div>
                  )}
                </div>

                {detailPhotos.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-[9px] font-black uppercase tracking-widest text-white/40">Görsel Belgeler ({detailPhotos.length})</h4>
                    <div className="flex gap-2.5 overflow-x-auto pb-1 scrollbar-none">
                      {detailPhotos.map((ph, idx) => (
                        <div key={idx} className="relative shrink-0 w-40 aspect-video rounded-xl border border-white/10 overflow-hidden bg-black shadow-lg">
                          <img src={ph.photo_url} className="w-full h-full object-cover" />
                          <span className="absolute bottom-1 left-1 bg-black/80 px-1.5 py-0.5 rounded text-[8px] font-black text-white/70 uppercase">
                            FOTO_{idx + 1}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex gap-2 pt-4 border-t border-white/5">
                  <button
                    onClick={() => {
                      setViewingRecordDetail(null);
                      handleEditClick(viewingRecordDetail);
                    }}
                    className="flex-1 h-11 bg-blue-600 text-white rounded-xl text-xs font-black uppercase tracking-widest flex items-center justify-center gap-1.5 active:scale-95 transition-all cursor-pointer"
                  >
                    <Edit3 size={14} /> Düzenle
                  </button>
                  <button
                    onClick={() => {
                      setViewingRecordDetail(null);
                      handleDeleteRecord(viewingRecordDetail.id);
                    }}
                    className="flex-1 h-11 bg-red-600 text-white rounded-xl text-xs font-black uppercase tracking-widest flex items-center justify-center gap-1.5 active:scale-95 transition-all cursor-pointer"
                  >
                    <Trash2 size={14} /> Sil
                  </button>
                </div>
              </div>
            );
          })()}
        </MobileBottomSheet>
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