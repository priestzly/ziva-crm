'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { PanelLayout } from '@/components/DashboardShell';
import {
  Button, IconButton, Card, CardHeader, PageHeader, StatCard, IconTile, Badge, Field, Input, Select,
  Textarea, SearchInput, EmptyState, ErrorBanner, Sheet,
} from '@/components/ui';
import RouteGuard from '@/components/RouteGuard';
import { useAuth } from '@/context/AuthContext';
import { supabase, type Mall, type Business, type MaintenanceRecord } from '@/lib/supabase';
import {
  Building2, PlusCircle, X, Edit3, Trash2, Store, ChevronRight, ChevronLeft, FileText, RefreshCw,
  Check, MapPin, Camera, ClipboardList, CalendarDays, type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';


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
  const router = useRouter();
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

  const firstName = profile?.full_name?.split(' ')[0];
  const recentPreview = records.slice(0, 6);

  return (
    <PanelLayout
      role="admin"
      title="Özet"
      subtitle={isRefreshing ? 'Yenileniyor…' : `Yönetici: ${profile?.full_name || 'Admin'}`}
    >
      <PageHeader
        title={firstName ? `Merhaba, ${firstName}` : 'Genel bakış'}
        description="Servis kayıtlarını izleyin, yeni iş emirleri oluşturun ve müşteri lokasyonlarını yönetin."
        actions={
          <>
            <IconButton icon={RefreshCw} label="Yenile" variant="secondary" onClick={() => fetchData(true)} className={cn(isRefreshing && '[&_svg]:animate-spin')} />
            <Button variant="secondary" icon={Building2} onClick={() => setShowAddMall(true)}>Yeni AVM</Button>
            <Button icon={PlusCircle} onClick={handleOpenAddRecord}>Yeni servis kaydı</Button>
          </>
        }
      />

      <div className="space-y-6">
        {fetchError && <ErrorBanner message={fetchError} onRetry={() => fetchData(true)} />}

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <StatCard label="AVM’ler" value={malls.length} icon={Building2} tone="primary" hint="Kayıtlı lokasyon" loading={loading} onClick={() => router.push('/admin/malls')} />
          <StatCard label="İşletmeler" value={businesses.length} icon={Store} tone="info" hint="AVM’lere bağlı" loading={loading} onClick={() => router.push('/admin/businesses')} />
          <StatCard label="Bu ay" value={thisMonthCount} icon={CalendarDays} tone="success" hint={`Son 7 günde ${last7Count} kayıt`} loading={loading} />
          <StatCard label="Son kayıtlar" value={records.length} icon={FileText} tone="warning" hint="Tümünü görüntüle" loading={loading} onClick={() => setShowRecentRecordsModal(true)} />
        </div>

        {/* Recent records */}
        <Card className="overflow-hidden">
          <CardHeader
            title="Son servis kayıtları"
            description="En son oluşturulan iş emirleri"
            actions={records.length > 0 && (
              <Button variant="ghost" size="sm" onClick={() => setShowRecentRecordsModal(true)}>
                Tümünü gör <ChevronRight size={14} />
              </Button>
            )}
          />
          {loading && !initialLoadDone.current ? (
            <div className="px-5 pb-5 space-y-2">
              {[0, 1, 2].map(i => <div key={i} className="h-12 rounded-lg bg-muted animate-pulse" />)}
            </div>
          ) : recentPreview.length === 0 ? (
            <EmptyState
              icon={FileText}
              title="Henüz servis kaydı yok"
              description="İlk iş emrini oluşturarak başlayın."
              action={<Button icon={PlusCircle} onClick={handleOpenAddRecord}>Yeni servis kaydı</Button>}
              className="border-t border-border"
            />
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden md:block overflow-x-auto border-t border-border">
                <table className="p-table">
                  <thead>
                    <tr>
                      <th>İşletme</th>
                      <th>İşlem</th>
                      <th>Durum</th>
                      <th>Teknisyen</th>
                      <th className="text-right">Tarih</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentPreview.map(rec => {
                      const parsed = parseDescription(rec.description);
                      return (
                        <tr key={rec.id} onClick={() => handleViewRecordDetail(rec)} className="cursor-pointer">
                          <td>
                            <p className="font-medium text-foreground truncate max-w-[220px]">{(rec as any).businesses?.name || '—'}</p>
                            <p className="text-xs text-muted-foreground font-mono">#{rec.id.substring(0, 6).toUpperCase()}</p>
                          </td>
                          <td className="text-muted-foreground">{rec.service_type || 'Bakım'}</td>
                          <td><Badge tone={statusTone(parsed.status)}>{parsed.status}</Badge></td>
                          <td className="text-muted-foreground">{parsed.technician || '—'}</td>
                          <td className="text-right text-muted-foreground tabular-nums">{new Date(rec.created_at).toLocaleDateString('tr-TR')}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile rows */}
              <div className="md:hidden border-t border-border divide-y divide-border">
                {recentPreview.map(rec => {
                  const parsed = parseDescription(rec.description);
                  return (
                    <button
                      key={rec.id}
                      type="button"
                      onClick={() => handleViewRecordDetail(rec)}
                      className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-surface transition-colors"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-foreground truncate">{(rec as any).businesses?.name || '—'}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground truncate">
                          {rec.service_type || 'Bakım'} · <span className="tabular-nums">{new Date(rec.created_at).toLocaleDateString('tr-TR')}</span>
                        </p>
                      </div>
                      <Badge tone={statusTone(parsed.status)}>{parsed.status}</Badge>
                      <ChevronRight size={16} className="text-muted-foreground shrink-0" />
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </Card>
      </div>

      {/* Add mall */}
      <Sheet isOpen={showAddMall} onClose={() => setShowAddMall(false)} title="Yeni AVM" description="Sisteme yeni bir müşteri lokasyonu ekleyin.">
        <form onSubmit={handleAddMall} className="space-y-4">
          <Field label="AVM adı" required>
            <Input value={mallForm.name} onChange={e => setMallForm({ ...mallForm, name: e.target.value })} required placeholder="Örn: Akasya AVM" />
          </Field>
          <Field label="Lokasyon / adres">
            <Input value={mallForm.address} onChange={e => setMallForm({ ...mallForm, address: e.target.value })} placeholder="Şehir, ilçe vb." />
          </Field>
          <Field label="Sorumlu kişi">
            <Input value={mallForm.contact_person} onChange={e => setMallForm({ ...mallForm, contact_person: e.target.value })} placeholder="Ad soyad" />
          </Field>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setShowAddMall(false)}>Vazgeç</Button>
            <Button type="submit" icon={Check} loading={saving}>AVM’yi kaydet</Button>
          </div>
        </form>
      </Sheet>

      {/* Add record — wizard */}
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

        const currentStep = WIZARD_STEPS[wizardStep - 1];

        return (
          <div className="fixed inset-0 z-[150] flex sm:items-center sm:justify-center sm:p-6 print:hidden" role="dialog" aria-modal="true">
            <div className="hidden sm:block absolute inset-0 bg-background/80 backdrop-blur-sm p-anim-fade" onClick={() => setShowAddRecord(false)} />
            <div className="relative flex flex-col w-full h-full bg-background text-foreground sm:h-auto sm:max-h-[90vh] sm:max-w-2xl sm:rounded-2xl sm:border sm:border-border sm:bg-popover sm:shadow-xl p-anim-fade">
              {/* Header */}
              <div className="shrink-0 border-b border-border px-4 sm:px-6 pt-4 pb-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <h3 className="text-base font-semibold text-foreground">Yeni servis kaydı</h3>
                    <p className="mt-0.5 text-sm text-muted-foreground">Adım {wizardStep} / 4 · {currentStep.label}</p>
                  </div>
                  <IconButton icon={X} label="Kapat" size="sm" onClick={() => setShowAddRecord(false)} className="-mr-1.5" />
                </div>

                {/* Progress */}
                <div className="mt-4 h-1 rounded-full bg-muted overflow-hidden">
                  <div className="h-full rounded-full bg-primary transition-all duration-300" style={{ width: `${(wizardStep / 4) * 100}%` }} />
                </div>
                <ol className="mt-3 grid grid-cols-4 gap-2">
                  {WIZARD_STEPS.map(s => {
                    const isActive = wizardStep === s.num;
                    const isDone = wizardStep > s.num;
                    return (
                      <li key={s.num} className="flex items-center gap-2 min-w-0">
                        <span className={cn(
                          'w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-xs font-semibold tabular-nums transition-colors',
                          isActive && 'bg-primary text-white',
                          isDone && 'bg-primary/10 text-primary',
                          !isActive && !isDone && 'bg-muted text-muted-foreground'
                        )}>
                          {isDone ? <Check size={12} /> : s.num}
                        </span>
                        <span className={cn('text-xs truncate', isActive ? 'font-medium text-foreground' : 'text-muted-foreground')}>{s.label}</span>
                      </li>
                    );
                  })}
                </ol>
              </div>

              {/* Step content */}
              <div className="flex-1 overflow-y-auto">
                <div className="max-w-xl mx-auto w-full px-4 sm:px-6 py-6">

                  {/* Step 1: mall */}
                  {wizardStep === 1 && (
                    <div key="step1" className={wizardAnimClass}>
                      <StepHeading icon={Building2} title="AVM seçin" description="İş emrinin uygulanacağı AVM’yi belirleyin." />
                      <SearchInput value={mallSearch} onChange={setMallSearch} placeholder="AVM ara…" className="mb-4" />
                      {filteredMalls.length === 0 ? (
                        <Card><EmptyState icon={Building2} title="AVM bulunamadı" description="Farklı bir arama deneyin." className="py-10" /></Card>
                      ) : (
                        <div className="space-y-2">
                          {filteredMalls.map(mall => (
                            <SelectCard
                              key={mall.id}
                              icon={Building2}
                              title={mall.name}
                              meta={mall.address ? <><MapPin size={12} className="shrink-0" /> {mall.address}</> : undefined}
                              selected={recordForm.mall_id === mall.id}
                              onSelect={() => {
                                setRecordForm(f => ({ ...f, mall_id: mall.id, business_id: '' }));
                                setBizSearch('');
                                setTimeout(goNext, 200);
                              }}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Step 2: business */}
                  {wizardStep === 2 && (
                    <div key="step2" className={wizardAnimClass}>
                      <StepHeading
                        icon={Store}
                        title="İşletme seçin"
                        description={selectedMall ? <><span className="font-medium text-foreground">{selectedMall.name}</span> içindeki işletmeyi seçin.</> : 'İşletme seçin.'}
                      />
                      <SearchInput value={bizSearch} onChange={setBizSearch} placeholder="İşletme ara…" className="mb-4" />
                      {filteredBiz.length === 0 ? (
                        <Card><EmptyState icon={Store} title="İşletme bulunamadı" description="Bu AVM’de kayıtlı işletme yok veya aramanız eşleşmedi." className="py-10" /></Card>
                      ) : (
                        <div className="space-y-2">
                          {filteredBiz.map(biz => (
                            <SelectCard
                              key={biz.id}
                              icon={Store}
                              title={biz.name}
                              meta={biz.category || 'İşletme'}
                              selected={recordForm.business_id === biz.id}
                              onSelect={() => {
                                setRecordForm(f => ({ ...f, business_id: biz.id }));
                                setTimeout(goNext, 200);
                              }}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Step 3: details */}
                  {wizardStep === 3 && (
                    <div key="step3" className={wizardAnimClass}>
                      <StepHeading icon={ClipboardList} title="İşlem detayları" description="Servis bilgilerini doldurun." />

                      <div className="grid grid-cols-2 gap-3 mb-5">
                        <SummaryItem label="AVM" value={selectedMall?.name || '—'} boxed />
                        <SummaryItem label="İşletme" value={selectedBiz?.name || '—'} boxed />
                      </div>

                      <div className="space-y-4">
                        <Field label="İşlem türü">
                          <Input list="svc" value={recordForm.service_type} onChange={e => setRecordForm({ ...recordForm, service_type: e.target.value })} placeholder="Örn: Genel bakım" />
                          <datalist id="svc">
                            <option value="Genel Bakım" /><option value="Yangın Sistemi Kontrolü" /><option value="Baca Temizliği" /><option value="Arıza Tespiti & Onarım" />
                          </datalist>
                        </Field>

                        <Field label="İşlem durumu">
                          <Select value={recordForm.status} onChange={e => setRecordForm({ ...recordForm, status: e.target.value })}>
                            <option value="Tamamlandı">Tamamlandı</option>
                            <option value="Devam Ediyor">Devam ediyor</option>
                            <option value="İptal / Ertelendi">İptal / ertelendi</option>
                          </Select>
                        </Field>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <Field label="Teknisyen">
                            <Input value={recordForm.technician} onChange={e => setRecordForm({ ...recordForm, technician: e.target.value })} placeholder="Personel adı" />
                          </Field>
                          <Field label="Maliyet">
                            <Input value={recordForm.cost} onChange={e => setRecordForm({ ...recordForm, cost: e.target.value })} placeholder="₺ (opsiyonel)" />
                          </Field>
                        </div>

                        <Field label="Kullanılan parçalar">
                          <Input value={recordForm.materials} onChange={e => setRecordForm({ ...recordForm, materials: e.target.value })} placeholder="Örn: 2 tüp, 1 hortum" />
                        </Field>

                        <Field label="Saha notları" required hint="Kaydı oluşturmak için zorunludur.">
                          <Textarea value={recordForm.text} onChange={e => setRecordForm({ ...recordForm, text: e.target.value })} rows={4} className="resize-none" placeholder="Yapılan işlemi kısaca özetleyin…" />
                        </Field>
                      </div>
                    </div>
                  )}

                  {/* Step 4: photos & confirm */}
                  {wizardStep === 4 && (
                    <div key="step4" className={wizardAnimClass}>
                      <StepHeading icon={Check} title="Gözden geçirin ve kaydedin" description="Bilgileri kontrol edin, isterseniz fotoğraf ekleyin." />

                      <Card className="p-4 sm:p-5 mb-6 space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <SummaryItem label="AVM" value={selectedMall?.name || '—'} />
                          <SummaryItem label="İşletme" value={selectedBiz?.name || '—'} />
                        </div>
                        <div className="h-px bg-border" />
                        <div className="grid grid-cols-2 gap-4">
                          <SummaryItem label="İşlem" value={recordForm.service_type || 'Genel Bakım'} />
                          <div>
                            <p className="text-xs text-muted-foreground">Durum</p>
                            <Badge tone={statusTone(recordForm.status)} className="mt-1">{recordForm.status}</Badge>
                          </div>
                          {recordForm.technician && <SummaryItem label="Teknisyen" value={recordForm.technician} />}
                          {recordForm.cost && <SummaryItem label="Maliyet" value={recordForm.cost} />}
                        </div>
                        {recordForm.text && (
                          <>
                            <div className="h-px bg-border" />
                            <div>
                              <p className="text-xs text-muted-foreground mb-1">Saha notları</p>
                              <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{recordForm.text}</p>
                            </div>
                          </>
                        )}
                      </Card>

                      <Field label="Fotoğraflar">
                        <PhotoDrop
                          label={recordPhotos.length > 0 ? `${recordPhotos.length} dosya seçildi` : 'Fotoğraf ekle'}
                          onFiles={files => setRecordPhotos(files)}
                        />
                      </Field>
                      {recordPhotos.length > 0 && (
                        <div className="mt-3 grid grid-cols-3 sm:grid-cols-4 gap-2">
                          {recordPhotos.map((file, i) => (
                            <div key={i} className="aspect-square rounded-xl bg-muted border border-border overflow-hidden">
                              <img src={URL.createObjectURL(file)} alt="" className="w-full h-full object-cover" />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Footer */}
              <div className="shrink-0 border-t border-border bg-background sm:bg-transparent px-4 sm:px-6 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
                <div className="flex items-center justify-between gap-2">
                  {wizardStep > 1 ? (
                    <Button variant="secondary" icon={ChevronLeft} onClick={goBack}>Geri</Button>
                  ) : (
                    <Button variant="ghost" onClick={() => setShowAddRecord(false)}>Vazgeç</Button>
                  )}
                  {wizardStep < 4 ? (
                    <Button
                      onClick={goNext}
                      disabled={
                        (wizardStep === 1 && !recordForm.mall_id) ||
                        (wizardStep === 2 && !recordForm.business_id)
                      }
                      className="min-w-32"
                    >
                      Devam <ChevronRight size={16} />
                    </Button>
                  ) : (
                    <Button
                      icon={Check}
                      loading={saving}
                      onClick={e => { handleAddRecord(e as any); }}
                      disabled={saving || !recordForm.text}
                      className="min-w-32"
                    >
                      Kaydet
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Edit record */}
      <Sheet
        isOpen={showEditRecord}
        onClose={() => setShowEditRecord(false)}
        title="Servis kaydını düzenle"
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowEditRecord(false)}>Vazgeç</Button>
            <Button type="submit" form="edit-record-form" loading={saving}>Güncelle</Button>
          </>
        }
      >
        <form id="edit-record-form" onSubmit={handleUpdateRecord} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="İşlem türü">
              <Input list="svc2" value={editRecordForm.service_type} onChange={e => setEditRecordForm({ ...editRecordForm, service_type: e.target.value })} />
              <datalist id="svc2"><option value="Genel Bakım" /><option value="Yangın Sistemi Kontrolü" /></datalist>
            </Field>
            <Field label="Teknisyen">
              <Input value={editRecordForm.technician} onChange={e => setEditRecordForm({ ...editRecordForm, technician: e.target.value })} />
            </Field>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="İşlem durumu">
              <Select value={editRecordForm.status} onChange={e => setEditRecordForm({ ...editRecordForm, status: e.target.value })}>
                <option value="Tamamlandı">Tamamlandı</option>
                <option value="Devam Ediyor">Devam ediyor</option>
                <option value="İptal / Ertelendi">İptal / ertelendi</option>
              </Select>
            </Field>
            <Field label="Maliyet">
              <Input value={editRecordForm.cost} onChange={e => setEditRecordForm({ ...editRecordForm, cost: e.target.value })} />
            </Field>
          </div>

          <Field label="Açıklama / saha notları">
            <Textarea value={editRecordForm.text} onChange={e => setEditRecordForm({ ...editRecordForm, text: e.target.value })} rows={3} className="resize-none" />
          </Field>

          <Field label="Kullanılan parçalar">
            <Input value={editRecordForm.materials} onChange={e => setEditRecordForm({ ...editRecordForm, materials: e.target.value })} />
          </Field>

          {editingPhotos.length > 0 && (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {editingPhotos.map(p => (
                <div key={p.id} className="relative group aspect-square rounded-xl overflow-hidden border border-border bg-muted">
                  <img src={p.photo_url} alt="Ek" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => handleDeletePhoto(p)}
                    aria-label="Fotoğrafı sil"
                    className="absolute top-1.5 right-1.5 w-7 h-7 rounded-lg bg-destructive text-destructive-foreground flex items-center justify-center sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}

          <Field label="Ek görsel">
            <PhotoDrop
              compact
              label={recordPhotos.length > 0 ? `${recordPhotos.length} dosya seçildi` : 'Görsel seç'}
              onFiles={files => setRecordPhotos(files)}
            />
          </Field>
        </form>
      </Sheet>

      {/* Recent records list */}
      <Sheet
        isOpen={showRecentRecordsModal}
        onClose={() => setShowRecentRecordsModal(false)}
        title="Son servis kayıtları"
        description={`${records.length} kayıt`}
        size="lg"
      >
        {records.length === 0 ? (
          <EmptyState icon={FileText} title="Kayıt bulunamadı" className="py-10" />
        ) : (
          <div className="space-y-2">
            {records.map(rec => {
              const parsed = parseDescription(rec.description);
              return (
                <Card
                  key={rec.id}
                  interactive
                  role="button"
                  tabIndex={0}
                  onClick={() => {
                    setShowRecentRecordsModal(false);
                    handleViewRecordDetail(rec);
                  }}
                  onKeyDown={e => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setShowRecentRecordsModal(false);
                      handleViewRecordDetail(rec);
                    }
                  }}
                  className="p-4 cursor-pointer"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{(rec as any).businesses?.name || '—'}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground font-mono">#{rec.id.substring(0, 6).toUpperCase()}</p>
                    </div>
                    <Badge tone={statusTone(parsed.status)}>{parsed.status}</Badge>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground line-clamp-2">{parsed.text || 'Açıklama belirtilmemiş'}</p>
                  <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                    <span>{rec.service_type || 'Bakım'}</span>
                    <span className="tabular-nums">{new Date(rec.created_at).toLocaleDateString('tr-TR')}</span>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </Sheet>

      {/* Record detail */}
      <Sheet
        isOpen={!!viewingRecordDetail}
        onClose={() => setViewingRecordDetail(null)}
        title="Servis raporu"
        description={viewingRecordDetail ? `Belge no #${viewingRecordDetail.id.substring(0, 8).toUpperCase()} · ${new Date(viewingRecordDetail.created_at).toLocaleDateString('tr-TR')}` : undefined}
        size="lg"
        footer={viewingRecordDetail && (
          <>
            <Button
              variant="danger"
              icon={Trash2}
              onClick={() => {
                setViewingRecordDetail(null);
                handleDeleteRecord(viewingRecordDetail.id);
              }}
            >
              Sil
            </Button>
            <Button
              variant="secondary"
              icon={Edit3}
              onClick={() => {
                setViewingRecordDetail(null);
                handleEditClick(viewingRecordDetail);
              }}
            >
              Düzenle
            </Button>
          </>
        )}
      >
        {viewingRecordDetail && (() => {
          const parsed = parseDescription(viewingRecordDetail.description);
          return (
            <div className="space-y-5">
              <div className="flex items-start gap-3">
                <IconTile icon={Store} />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-foreground truncate">{(viewingRecordDetail as any).businesses?.name || '—'}</p>
                  <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                    <Badge tone="primary">{viewingRecordDetail.service_type || 'Servis'}</Badge>
                    <Badge tone={statusTone(parsed.status)}>{parsed.status}</Badge>
                  </div>
                </div>
              </div>

              <div>
                <p className="text-xs text-muted-foreground mb-1.5">Saha notları</p>
                <div className="rounded-xl border border-border bg-surface p-3.5 text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                  {parsed.text || 'Açıklama belirtilmemiş.'}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <SummaryItem label="Teknisyen" value={parsed.technician || 'Ziva teknik ekibi'} boxed />
                <SummaryItem label="Kullanılan parçalar" value={parsed.materials || 'Ekipman kullanılmadı'} boxed />
                {parsed.cost && <SummaryItem label="Maliyet" value={parsed.cost} boxed />}
              </div>

              {detailPhotos.length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1.5">Fotoğraflar ({detailPhotos.length})</p>
                  <div className="flex gap-2.5 overflow-x-auto pb-1">
                    {detailPhotos.map((ph, idx) => (
                      <a key={idx} href={ph.photo_url} target="_blank" rel="noreferrer" className="shrink-0 w-40 aspect-video rounded-xl border border-border overflow-hidden bg-muted">
                        <img src={ph.photo_url} alt={`Fotoğraf ${idx + 1}`} className="w-full h-full object-cover" />
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })()}
      </Sheet>
    </PanelLayout>
  );
}

/* ─── Local presentation helpers ─── */

function statusTone(status: string): 'success' | 'primary' | 'danger' | 'neutral' {
  switch (status) {
    case 'Tamamlandı': return 'success';
    case 'Devam Ediyor': return 'primary';
    case 'İptal / Ertelendi': return 'danger';
    default: return 'neutral';
  }
}

function StepHeading({ icon, title, description }: { icon: LucideIcon; title: string; description?: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 mb-5">
      <IconTile icon={icon} />
      <div className="min-w-0">
        <h2 className="text-lg font-semibold text-foreground">{title}</h2>
        {description && <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>}
      </div>
    </div>
  );
}

function SelectCard({ icon, title, meta, selected, onSelect }: { icon: LucideIcon; title: string; meta?: React.ReactNode; selected: boolean; onSelect: () => void }) {
  return (
    <Card
      interactive
      role="button"
      tabIndex={0}
      aria-pressed={selected}
      onClick={onSelect}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(); } }}
      className={cn('flex items-center gap-3 p-4 cursor-pointer', selected && 'border-primary bg-primary/5')}
    >
      <IconTile icon={icon} tone={selected ? 'primary' : 'neutral'} />
      <div className="min-w-0 flex-1">
        <p className="text-[15px] font-medium text-foreground truncate">{title}</p>
        {meta && <p className="mt-0.5 text-xs text-muted-foreground flex items-center gap-1 truncate">{meta}</p>}
      </div>
      <span className={cn(
        'w-5 h-5 rounded-full border flex items-center justify-center shrink-0 transition-colors',
        selected ? 'bg-primary border-primary text-white' : 'border-border-strong'
      )}>
        {selected && <Check size={12} />}
      </span>
    </Card>
  );
}

function SummaryItem({ label, value, boxed }: { label: string; value: React.ReactNode; boxed?: boolean }) {
  return (
    <div className={cn('min-w-0', boxed && 'rounded-xl border border-border bg-surface px-3.5 py-3')}>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-sm font-medium text-foreground truncate">{value}</p>
    </div>
  );
}

function PhotoDrop({ label, onFiles, compact }: { label: string; onFiles: (files: File[]) => void; compact?: boolean }) {
  return (
    <label className={cn(
      'flex flex-col items-center justify-center gap-2 w-full rounded-xl border-2 border-dashed border-border bg-surface/40 text-center cursor-pointer transition-colors hover:border-primary hover:bg-primary/5',
      compact ? 'py-6' : 'py-10'
    )}>
      <Camera size={compact ? 20 : 26} className="text-muted-foreground" />
      <span className="text-sm font-medium text-foreground">{label}</span>
      {!compact && <span className="text-xs text-muted-foreground">Seçmek için tıklayın</span>}
      <input type="file" multiple accept="image/*" className="hidden" onChange={e => onFiles(Array.from(e.target.files || []))} />
    </label>
  );
}

export default function AdminDashboardPage() {
  return (
    <RouteGuard requiredRole="admin">
      <DashboardContent />
    </RouteGuard>
  );
}