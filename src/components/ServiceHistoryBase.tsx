'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { Sidebar, Topbar } from '@/components/DashboardShell';
import { supabase, type MaintenanceRecord } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { 
  Search, Loader2, Calendar, ChevronRight, MapPin, 
  Printer, ArrowLeft, Flame, LayoutGrid, List, Trash2, Edit3, Upload, X, Clock, Store
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
    return { text: desc, technician: '', materials: '', status: 'Tamamlandı', cost: '' };
  }
};

interface ServiceHistoryBaseProps {
  role: 'admin' | 'client';
  businessId?: string;
  targetId?: string | null;
}

export default function ServiceHistoryBase({ role, businessId, targetId }: ServiceHistoryBaseProps) {
  const { loading: authLoading } = useAuth();
  const [records, setRecords] = useState<MaintenanceRecord[]>([]);
  const [photos, setPhotos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedMall, setSelectedMall] = useState<string>('all');
  const [malls, setMalls] = useState<any[]>([]);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('table');

  const [showEditRecord, setShowEditRecord] = useState(false);
  const [editingRecord, setEditingRecord] = useState<MaintenanceRecord | null>(null);
  const [existingPhotos, setExistingPhotos] = useState<any[]>([]);
  const [recordPhotos, setRecordPhotos] = useState<File[]>([]);
  const [saving, setSaving] = useState(false);
  const [editRecordForm, setEditRecordForm] = useState({ 
    service_type: '', text: '', technician: '', materials: '', status: 'Tamamlandı', cost: ''
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase.from('maintenance_records').select('*, businesses:business_id(name, mall_id, mall:mall_id(name))').order('created_at', { ascending: false });
      if (role === 'client' && businessId) query = query.eq('business_id', businessId);
      
      const { data: recData } = await query;
      const { data: mallData } = await supabase.from('malls').select('id, name');
      
      setRecords(recData || []);
      setMalls(mallData || []);

      if (targetId) {
        const { data: photoData } = await supabase.from('maintenance_photos').select('*').eq('record_id', targetId);
        setPhotos(photoData || []);
      }
    } catch (err) { console.error(err); } finally { setLoading(false); }
  }, [role, businessId, targetId]);

  useEffect(() => {
    // Auth loading tamamlanana kadar bekle
    if (authLoading) return;
    fetchData();
  }, [fetchData, authLoading]);

  const handleEditClick = async (rec: any) => {
    const p = parseDescription(rec.description);
    setEditRecordForm({ service_type: rec.service_type || '', text: p.text, technician: p.technician, materials: p.materials, status: p.status, cost: p.cost });
    setEditingRecord(rec);
    setShowEditRecord(true);
    
    // Fotoğrafları getir
    const { data } = await supabase.from('maintenance_photos').select('*').eq('record_id', rec.id);
    setExistingPhotos(data || []);
  };

  const handleUpdateRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRecord) return;
    setSaving(true);
    const packed = JSON.stringify({ text: editRecordForm.text, technician: editRecordForm.technician, materials: editRecordForm.materials, status: editRecordForm.status, cost: editRecordForm.cost });
    try {
      await supabase.from('maintenance_records').update({ description: packed, service_type: editRecordForm.service_type }).eq('id', editingRecord.id);
      if (recordPhotos.length > 0) {
        await Promise.all(recordPhotos.map(async (file) => {
          const fileName = `${editingRecord.id}/${Date.now()}_${file.name}`;
          const { data: uploadData } = await supabase.storage.from('maintenance-photos').upload(fileName, file);
          if (uploadData) {
            const { data: { publicUrl } } = supabase.storage.from('maintenance-photos').getPublicUrl(uploadData.path);
            await supabase.from('maintenance_photos').insert([{ record_id: editingRecord.id, photo_url: publicUrl }]);
          }
        }));
      }
      setShowEditRecord(false); setEditingRecord(null); setRecordPhotos([]); fetchData();
    } catch (err) { console.error(err); } finally { setSaving(false); }
  };

  const handleDeleteRecord = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Silinsin mi?')) return;
    try {
      await supabase.from('maintenance_records').delete().eq('id', id);
      fetchData();
    } catch (err) { console.error(err); }
  };

  const handleDeletePhoto = async (photoId: string, url: string) => {
    if (!confirm('Bu fotoğraf silinsin mi?')) return;
    try {
      await supabase.from('maintenance_photos').delete().eq('id', photoId);
      const parts = url.split('/');
      const fileName = parts[parts.length - 1];
      if (editingRecord) {
         await supabase.storage.from('maintenance-photos').remove([`${editingRecord.id}/${fileName}`]);
      }
      setExistingPhotos(prev => prev.filter(p => p.id !== photoId));
      if (targetId) fetchData(); // Detay ekranındaysa arka planı da güncelle
    } catch (err) { console.error(err); }
  };

  const filteredRecords = records.filter(r => {
    if (targetId) return r.id === targetId;
    const p = parseDescription(r.description);
    const matchesMall = role === 'client' || selectedMall === 'all' || (r as any).businesses?.mall_id === selectedMall;
    const searchTerm = search.toLowerCase();
    return matchesMall && (
      p.text.toLowerCase().includes(searchTerm) || 
      (r as any).businesses?.name?.toLowerCase().includes(searchTerm) ||
      r.service_type?.toLowerCase().includes(searchTerm)
    );
  });

  return (
    <div className="min-h-screen flex bg-[hsl(var(--background))] print:bg-white print:text-black">
      <Sidebar role={role} />
      <main className="flex-1 lg:ml-72 w-full overflow-x-hidden pb-20 sm:pb-8">
        <div className="print:hidden">
          <Topbar title={role === 'admin' ? "Operasyon Arşivi" : "Servis Geçmişi"} subtitle={role === 'admin' ? "Tüm servis kayıtları" : "Dükkanınıza ait servis kayıtları"} />
        </div>

        <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1400px] mx-auto print:p-0">
          {!targetId && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 print:hidden items-center">
                <div className="sm:col-span-2 relative"><Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" /><input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Ara..." className="w-full input-premium pl-11 py-3 text-sm" /></div>
                {role === 'admin' && (<select value={selectedMall} onChange={e => setSelectedMall(e.target.value)} className="input-premium text-sm"><option value="all">Tüm AVM'ler</option>{malls.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}</select>)}
                <div className="flex bg-[hsl(var(--card))] border rounded-xl p-1 gap-1 ml-auto shrink-0 w-32"><button onClick={() => setViewMode('grid')} className={cn("flex-1 py-1 rounded-lg transition-all", viewMode === 'grid' ? "bg-primary text-white" : "")}><LayoutGrid size={16} className="mx-auto" /></button><button onClick={() => setViewMode('table')} className={cn("flex-1 py-1 rounded-lg transition-all", viewMode === 'table' ? "bg-primary text-white" : "")}><List size={16} className="mx-auto" /></button></div>
            </div>
          )}

          {targetId && (
            <div className="flex items-center justify-between mb-4 print:hidden">
              <Link href={role === 'admin' ? "/admin/history" : "/client/history"} className="text-primary font-black flex items-center gap-2"><ArrowLeft size={16} /> Geri </Link>
              <div className="flex gap-2">
                {role === 'admin' && filteredRecords[0] && (<button onClick={() => handleEditClick(filteredRecords[0])} className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-xs font-black"><Edit3 size={14} /> Düzenle</button>)}
                <button onClick={() => window.print()} className="bg-slate-900 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-xs font-black shadow-lg"><Printer size={14} /> PDF Kaydet</button>
              </div>
            </div>
          )}

          {authLoading || loading ? <div className="py-20 text-center"><Loader2 className="animate-spin inline-block text-primary w-8 h-8" /></div> : (
            <div className="animate-fade-in">
              {/* TABLO GÖRÜNÜMÜ */}
              {!targetId && viewMode === 'table' && (
                <div className="glass rounded-none overflow-hidden border border-slate-200 shadow-xl print:hidden">
                   <div className="overflow-x-auto"><table className="w-full text-left"><thead className="bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest"><tr><th className="p-4">Tarih</th><th className="p-4">İşletme</th><th className="p-4">Tür</th><th className="p-4">Durum</th><th className="p-4 text-right">İşlem</th></tr></thead><tbody className="text-xs font-bold divide-y">{filteredRecords.map(rec => {
                    const p = parseDescription(rec.description);
                    return (<tr key={rec.id} className="hover:bg-primary/5 transition-colors cursor-pointer group" onClick={() => window.location.href=`?id=${rec.id}`}>
                      <td className="p-4 tabular-nums">{new Date(rec.created_at).toLocaleDateString('tr-TR')}</td>
                      <td className="p-4 uppercase">{(rec as any).businesses?.name}</td>
                      <td className="p-4"><span className="bg-primary/10 text-primary px-2 py-0.5 border border-primary/20">{rec.service_type}</span></td>
                      <td className="p-4"><span className={cn(p.status === 'Tamamlandı' ? "text-emerald-600" : "text-blue-600")}>{p.status}</span></td>
                      <td className="p-4 text-right flex justify-end gap-3">{role === 'admin' && (<button onClick={(e) => { e.stopPropagation(); handleEditClick(rec); }} className="p-1 hover:text-primary"><Edit3 size={14} /></button>)}<Printer size={14} className="opacity-40 group-hover:opacity-100 transition-opacity" />{role === 'admin' && (<button onClick={(e) => handleDeleteRecord(rec.id, e)} className="p-1 hover:text-red-500"><Trash2 size={14} /></button>)}</td>
                    </tr>);
                   })}</tbody></table></div>
                </div>
              )}

              {/* GRİD GÖRÜNÜMÜ (Düz Kart Tasarımı) */}
              {!targetId && viewMode === 'grid' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 print:hidden">
                   {filteredRecords.map(rec => {
                     const p = parseDescription(rec.description);
                     return (
                       <div key={rec.id} className="bg-white border-2 border-slate-100 p-6 flex flex-col gap-4 hover:border-primary transition-all cursor-pointer shadow-sm relative group" onClick={() => window.location.href=`?id=${rec.id}`}>
                          <div className="flex justify-between items-start">
                             <div className="w-10 h-10 border border-slate-100 overflow-hidden"><img src="/logo.png" alt="Ziva" className="w-full h-full object-cover" /></div>
                             <div className="text-right">
                                <p className="text-[10px] font-black text-slate-300">#{rec.id.substring(0,6).toUpperCase()}</p>
                                <p className="text-xs font-black text-slate-500">{new Date(rec.created_at).toLocaleDateString('tr-TR')}</p>
                             </div>
                          </div>
                          <div className="space-y-1">
                             <h4 className="font-black uppercase text-base text-slate-900 line-clamp-1">{(rec as any).businesses?.name}</h4>
                             <p className="text-[10px] font-black text-slate-400 flex items-center gap-1"><MapPin size={10} /> {(rec as any).businesses?.mall?.name}</p>
                          </div>
                          <div className="py-3 border-y border-slate-50">
                             <p className="text-xs font-bold text-slate-600 line-clamp-2 italic italic font-serif">"{p.text || 'Müdahale notu bulunmuyor.'}"</p>
                          </div>
                          <div className="flex justify-between items-center mt-auto pt-2">
                             <span className="text-[10px] font-black uppercase text-primary bg-primary/5 px-2 py-1">{rec.service_type}</span>
                             <span className={cn("text-[10px] font-black uppercase", p.status === 'Tamamlandı' ? "text-emerald-500" : "text-blue-500")}>{p.status}</span>
                          </div>
                          {role === 'admin' && (
                            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                               <button onClick={(e) => { e.stopPropagation(); handleEditClick(rec); }} className="p-1.5 bg-white border shadow-sm hover:text-primary"><Edit3 size={12} /></button>
                               <button onClick={(e) => handleDeleteRecord(rec.id, e)} className="p-1.5 bg-white border shadow-sm hover:text-red-500"><Trash2 size={12} /></button>
                            </div>
                          )}
                       </div>
                     );
                   })}
                </div>
              )}

              {/* TEKİL RAPOR / PDF DÖKÜMÜ */}
              {targetId && filteredRecords.map(rec => {
                const p = parseDescription(rec.description);
                return (
                  <div key={rec.id} className="mx-auto space-y-10 print:m-0" id="print-area" style={{ maxWidth: '900px' }}>
                    <div className="bg-white text-slate-950 p-12 border border-slate-200 print:text-black print:border-none print:p-0 min-h-[1100px] flex flex-col relative">
                      <div className="flex justify-between items-end border-b-2 border-slate-900 pb-8 mb-12">
                        <div className="flex items-center gap-4">
                           <div className="w-16 h-16 border border-slate-100 overflow-hidden"><img src="/logo.png" alt="Ziva Logo" className="w-full h-full object-cover" /></div>
                           <div>
                             <h1 className="text-2xl font-black italic tracking-tighter uppercase leading-none">ZIVA <span className="text-primary">BACA YANGIN</span></h1>
                             <p className="text-[9px] uppercase font-bold tracking-[0.3em] text-slate-400 mt-1">Teknik Servis & Müdahale Birimi</p>
                           </div>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] font-black text-slate-400 mb-1 tracking-widest uppercase">Teknik Rapor</p>
                          <p className="text-sm font-black text-slate-800 uppercase tabular-nums">{new Date(rec.created_at).toLocaleDateString('tr-TR')}</p>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-12 mb-12 py-6 border-b border-slate-100">
                        <div>
                          <p className="text-[10px] font-black uppercase text-slate-400 mb-2">İşletme Bilgisi</p>
                          <h3 className="text-lg font-black uppercase italic leading-tight">{(rec as any).businesses?.name}</h3>
                          <p className="text-xs font-bold text-slate-400">{(rec as any).businesses?.mall?.name}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] font-black uppercase text-slate-400 mb-2">Hizmet Türü</p>
                          <p className="text-sm font-black text-slate-900 uppercase mb-1">{rec.service_type || 'Periyodik Bakım'}</p>
                          <span className="text-[10px] font-black uppercase border border-slate-900 px-2 py-0.5">{p.status}</span>
                        </div>
                      </div>

                      <div className="flex-1 space-y-12">
                         <div className="space-y-4">
                            <h4 className="text-[10px] font-black uppercase text-slate-900 tracking-widest pl-1">Saha Müdahale Özeti</h4>
                            <div className="p-8 bg-slate-50 border border-slate-100 text-sm leading-relaxed text-slate-800 font-serif">
                               "{p.text || 'Not girilmemiştir.'}"
                            </div>
                         </div>
                         <div className="space-y-4">
                            <h4 className="text-[10px] font-black uppercase text-slate-900 tracking-widest pl-1">Parça & İşçilik Dökümü</h4>
                            <div className="border border-slate-900 overflow-hidden">
                              <table className="w-full text-left text-xs">
                                <thead className="bg-slate-900 text-white font-black uppercase">
                                  <tr><th className="p-4 text-[10px]">Açıklama</th><th className="p-4 text-right text-[10px]">Toplam</th></tr>
                                </thead>
                                <tbody className="font-bold">
                                  <tr>
                                    <td className="p-4 border-b text-slate-700">{p.materials || 'Standart Servis'}</td>
                                    <td className="p-4 border-b text-right font-black text-slate-950">{p.cost || '—'}</td>
                                  </tr>
                                </tbody>
                              </table>
                            </div>
                         </div>
                      </div>
                      <div className="mt-12 pt-6 border-t border-slate-100 text-center opacity-40">
                         <p className="text-[8px] font-bold uppercase tracking-[0.6em]">BU BELGE DİJİTAL OLARAK ZIVA FIRE CRM ÜZERİNDEN OLUŞTURULMUŞTUR</p>
                      </div>
                    </div>
                    {photos.length > 0 && (
                      <div className="space-y-6 pt-10 break-inside-avoid">
                        <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest text-center">EK SERVİS FOTOĞRAFLARI</h4>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          {photos.map((ph, i) => (
                            <div key={i} className="aspect-square border-2 border-slate-100 overflow-hidden bg-white">
                              <img src={ph.photo_url} className="w-full h-full object-cover" />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* EDİT MODAL (Sadece Admin) */}
        {showEditRecord && (
          <div className="fixed inset-0 z-[200] bg-black/60 flex items-center justify-center p-4" onClick={() => setShowEditRecord(false)}>
            <div className="bg-[hsl(var(--card))] rounded-none p-8 w-full max-w-xl shadow-2xl border-4 border-slate-900" onClick={e => e.stopPropagation()}>
               <div className="flex justify-between items-center mb-8 border-b-2 border-slate-900 pb-4"><h3 className="font-black uppercase text-base">İş Emrini Güncelle</h3><button onClick={() => setShowEditRecord(false)}><X size={20} /></button></div>
               <form onSubmit={handleUpdateRecord} className="space-y-5 text-xs font-black uppercase">
                  <div className="grid grid-cols-2 gap-5"><div><label className="block mb-2">Hizmet Türü</label><input value={editRecordForm.service_type} onChange={e => setEditRecordForm({...editRecordForm, service_type: e.target.value})} className="w-full input-premium py-3 rounded-none border-2 border-slate-200" /></div><div><label className="block mb-2">Teknisyen</label><input value={editRecordForm.technician} onChange={e => setEditRecordForm({...editRecordForm, technician: e.target.value})} className="w-full input-premium py-3 rounded-none border-2 border-slate-200" /></div></div>
                  <div><label className="block mb-2">Açıklama</label><textarea value={editRecordForm.text} onChange={e => setEditRecordForm({...editRecordForm, text: e.target.value})} rows={4} className="w-full input-premium p-3 rounded-none border-2 border-slate-200 resize-none" /></div>
                  <div className="grid grid-cols-2 gap-5"><div><label className="block mb-2">Malzeme</label><input value={editRecordForm.materials} onChange={e => setEditRecordForm({...editRecordForm, materials: e.target.value})} className="w-full input-premium py-3 rounded-none border-2 border-slate-200" /></div><div><label className="block mb-2">Maliyet</label><input value={editRecordForm.cost} onChange={e => setEditRecordForm({...editRecordForm, cost: e.target.value})} className="w-full input-premium py-3 rounded-none border-2 border-slate-200" /></div></div>
                  <div><label className="flex flex-col items-center p-6 border-4 border-dashed border-slate-200 rounded-none cursor-pointer hover:border-slate-900 transition-all font-black"><Upload size={24} className="mb-2" /><span>{recordPhotos.length > 0 ? `${recordPhotos.length} Dosya Seçildi` : 'Fotoğraf Ekle'}</span><input type="file" multiple accept="image/*" className="hidden" onChange={e => setRecordPhotos(Array.from(e.target.files || []))} /></label></div>
                  
                  {existingPhotos.length > 0 && (
                     <div className="pt-4 border-t border-slate-200">
                        <p className="mb-3 text-[10px] text-slate-400">MEVCUT FOTOĞRAFLAR (SİLMEK İÇİN TIKLAYIN)</p>
                        <div className="flex gap-2 overflow-x-auto pb-2">
                           {existingPhotos.map(ph => (
                              <div key={ph.id} className="relative shrink-0 w-20 h-20 border-2 border-slate-200 group">
                                 <img src={ph.photo_url} className="w-full h-full object-cover" />
                                 <button type="button" onClick={() => handleDeletePhoto(ph.id, ph.photo_url)} className="absolute inset-0 bg-red-600/90 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={16}/></button>
                              </div>
                           ))}
                        </div>
                     </div>
                  )}

                  <div className="flex justify-end gap-3 pt-6 border-t-2 border-slate-900"><button type="submit" disabled={saving} className="bg-slate-900 text-white px-8 py-3 font-black text-sm hover:bg-primary transition-all active:scale-95">{saving ? 'Güncelleniyor...' : 'KAYDI GÜNCELLE'}</button></div>
               </form>
            </div>
          </div>
        )}
      </main>

      <style jsx global>{`
        @media print {
          html, body, .min-h-screen, main { 
            background: white !important; 
            color: black !important;
            margin: 0 !important; 
            padding: 0 !important;
            display: block !important;
            -webkit-print-color-adjust: exact;
            color-adjust: exact;
            border: none !important;
          }
          .print\:hidden, aside, nav, button, header { 
            display: none !important; 
          }
          main { 
            margin: 0 !important; 
            padding: 0 !important; 
            width: 100vw !important; 
            background: transparent !important;
            border: none !important;
            box-shadow: none !important;
          }
          .p-12 { padding: 1.5cm !important; }
          .min-h-\[1100px\] { min-height: auto !important; }
          #print-area { 
            display: block !important; 
            visibility: visible !important;
            margin: 0 !important;
            width: 100% !important;
          }
          .break-inside-avoid { break-inside: avoid; page-break-inside: avoid; }
        }
      `}</style>
    </div>
  );
}
