'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Sidebar, Topbar } from '@/components/DashboardShell';
import RouteGuard from '@/components/RouteGuard';
import { 
  Plus, Trash2, Printer, Flame, Save, Download, 
  Settings, FileText, Layout, Info, CheckCircle2, ChevronDown, ChevronUp
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface QuoteItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
}

export default function QuoteBuilderPage() {
  const [items, setItems] = useState<QuoteItem[]>([
    { id: '1', name: '', quantity: 1, price: 0 }
  ]);
  
  const [headerText, setHeaderText] = useState('TEKLİF FORMU');
  const [clientInfo, setClientInfo] = useState({ name: '', address: '', date: new Date().toLocaleDateString('tr-TR') });
  const [companyInfo, setCompanyInfo] = useState({ address: 'Ziva Fire Sistemleri - İstanbul', phone: '0850 123 45 67', email: 'info@zivafire.com' });
  const [footerNote, setFooterNote] = useState('Teklifimiz 15 gün süreyle geçerlidir.');
  const [taxRate, setTaxRate] = useState(20);
  const [isTaxIncluded, setIsTaxIncluded] = useState(false);
  const [showConfig, setShowConfig] = useState(true);

  const addItem = () => {
    setItems([...items, { id: Date.now().toString(), name: '', quantity: 1, price: 0 }]);
  };

  const removeItem = (id: string) => {
    if (items.length > 1) setItems(items.filter(item => item.id !== id));
  };

  const updateItem = (id: string, field: keyof QuoteItem, value: any) => {
    setItems(items.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.price), 0);
  const taxAmount = isTaxIncluded ? (subtotal * taxRate) / 100 : 0;
  const grandTotal = subtotal + taxAmount;


  return (
    <RouteGuard requiredRole="admin">
        <div className="min-h-screen flex bg-[hsl(var(--background))]">
            <Sidebar role="admin" />
            <main className="flex-1 lg:ml-72 w-full overflow-x-hidden pb-20">
                <div className="print:hidden">
                    <Topbar title="Teklif Oluşturucu" subtitle="Profesyonel fiyat teklifleri ve formlar hazırlayın" />
                </div>

                <div className="p-4 sm:p-6 lg:p-8 space-y-8 max-w-[1200px] mx-auto print:p-0 print:max-w-full">
                    
                    {/* AYARLAR PANELİ (PRINT'DE GİZLİ) */}
                    <div className="glass rounded-none border-2 border-slate-900 overflow-hidden print:hidden animate-fade-in shadow-2xl">
                        <button 
                            onClick={() => setShowConfig(!showConfig)}
                            className="w-full flex items-center justify-between p-6 bg-slate-900 text-white font-black uppercase text-xs tracking-widest"
                        >
                            <div className="flex items-center gap-3"><Settings size={18} /> TEKLİF YAPILANDIRMASI</div>
                            {showConfig ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                        </button>
                        
                        {showConfig && (
                            <div className="p-8 space-y-8 bg-[hsl(var(--card))] border-t-2 border-slate-900">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-xs font-black uppercase tracking-tight">
                                    <div className="space-y-4">
                                        <h4 className="text-primary flex items-center gap-2 pb-2 border-b border-slate-100 italic">Müşteri & Başlık Bilgileri</h4>
                                        <div className="space-y-3">
                                            <div><label className="block mb-2 text-[10px]">Form Başlığı</label><input value={headerText} onChange={e => setHeaderText(e.target.value)} className="w-full input-premium py-3" /></div>
                                            <div><label className="block mb-2 text-[10px]">Müşteri Adı / Ünvanı</label><input value={clientInfo.name} onChange={e => setClientInfo({...clientInfo, name: e.target.value})} className="w-full input-premium py-3" /></div>
                                            <div><label className="block mb-2 text-[10px]">Adres</label><textarea value={clientInfo.address} onChange={e => setClientInfo({...clientInfo, address: e.target.value})} className="w-full input-premium py-3 resize-none" rows={2} /></div>
                                        </div>
                                    </div>
                                    <div className="space-y-4">
                                        <h4 className="text-primary flex items-center gap-2 pb-2 border-b border-slate-100 italic">Şirket & Alt Not Bilgileri</h4>
                                        <div className="space-y-3">
                                            <div><label className="block mb-2 text-[10px]">Şirket Adresi</label><input value={companyInfo.address} onChange={e => setCompanyInfo({...companyInfo, address: e.target.value})} className="w-full input-premium py-3" /></div>
                                            <div><label className="block mb-2 text-[10px]">Alt Not (Açıklama)</label><textarea value={footerNote} onChange={e => setFooterNote(e.target.value)} className="w-full input-premium py-3 resize-none" rows={2} /></div>
                                            <div className="flex items-center gap-4 bg-slate-50 p-4 border border-slate-100">
                                               <div className="flex items-center gap-2">
                                                   <input type="checkbox" id="tax_inc" checked={isTaxIncluded} onChange={e => setIsTaxIncluded(e.target.checked)} className="w-4 h-4 cursor-pointer" />
                                                   <label htmlFor="tax_inc" className="cursor-pointer select-none">Fiyatlara KDV Dahil</label>
                                               </div>
                                               <div className="flex items-center gap-2 ml-auto">
                                                   <span className="text-[10px]">KDV ORANI:</span>
                                                   <input type="number" value={taxRate} onChange={e => setTaxRate(Number(e.target.value))} className="w-16 bg-white border-2 border-slate-900 p-1 text-center font-bold" />
                                                    %
                                               </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-4 pt-4">
                                     <h4 className="text-primary flex items-center gap-2 pb-2 border-b border-slate-100 italic uppercase font-black text-xs">Teklif Kalemleri</h4>
                                     <div className="space-y-3">
                                        {items.map((item, index) => (
                                            <div key={item.id} className="flex gap-3 group">
                                                <div className="flex-1 max-w-[40px] flex items-center justify-center font-bold text-slate-300 italic">{index + 1}</div>
                                                <input placeholder="Ürün / Hizmet Adı" className="flex-[3] input-premium py-3" value={item.name} onChange={e => updateItem(item.id, 'name', e.target.value)} />
                                                <input type="number" placeholder="Adet" className="flex-1 input-premium py-3 text-center" value={item.quantity} onChange={e => updateItem(item.id, 'quantity', Number(e.target.value))} />
                                                <input type="number" placeholder="Birim Fiyat" className="flex-1 input-premium py-3 text-right" value={item.price} onChange={e => updateItem(item.id, 'price', Number(e.target.value))} />
                                                <button onClick={() => removeItem(item.id)} className="w-11 h-11 flex items-center justify-center bg-slate-50 border border-slate-200 hover:bg-red-500 hover:text-white transition-all"><Trash2 size={16} /></button>
                                            </div>
                                        ))}
                                        <button onClick={addItem} className="w-full py-4 border-2 border-dashed border-slate-200 text-slate-400 hover:border-slate-900 hover:text-slate-900 transition-all font-black text-xs flex items-center justify-center gap-2"><Plus size={16} /> KALEM EKLE</button>
                                     </div>
                                </div>
                                <div className="flex justify-end pt-4"><button onClick={() => window.print()} className="btn-primary px-8 h-12 flex items-center gap-3 font-black text-sm"><Printer size={18} /> TEKLİF ÖNİZLEME & PDF</button></div>
                            </div>
                        )}
                    </div>

                    {/* PDF TASARIMI (A4 FORMATI) */}
                    <div id="quote-preview" className="mx-auto print:m-0 bg-white text-slate-950 p-12 border border-slate-200 print:border-none print:p-0 min-h-[1100px] flex flex-col relative w-full max-w-[850px] shadow-2xl animate-fade-in">
                        {/* ÜST BAŞLIK */}
                        <div className="flex justify-between items-end border-b-2 border-slate-950 pb-8 mb-12">
                            <div className="flex items-center gap-4">
                                <div className="w-16 h-16 border border-slate-100 overflow-hidden"><img src="/logo.png" alt="Ziva Logo" className="w-full h-full object-cover" /></div>
                                <div>
                                    <h1 className="text-2xl font-black italic tracking-tighter uppercase leading-none">ZIVA <span className="text-primary">BACA YANGIN</span></h1>
                                    <p className="text-[9px] uppercase font-bold tracking-[0.3em] text-slate-400 mt-1">Teknik Servis & Müdahale Birimi</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <h2 className="text-3xl font-black italic tracking-tighter text-slate-100 uppercase leading-none mb-1 opacity-20">{headerText}</h2>
                                <p className="text-sm font-black text-slate-900 uppercase tabular-nums">{clientInfo.date}</p>
                            </div>
                        </div>

                        {/* MÜŞTERİ BİLGİSİ */}
                        <div className="grid grid-cols-2 gap-12 mb-12 py-6 border-b border-slate-100">
                             <div>
                                <p className="text-[10px] font-black uppercase text-slate-400 mb-2">SAYIN / MÜŞTERİ</p>
                                <h3 className="text-lg font-black uppercase italic leading-tight">{clientInfo.name || '—'}</h3>
                                <p className="text-xs font-bold text-slate-400 mt-1 whitespace-pre-line">{clientInfo.address || '—'}</p>
                             </div>
                             <div className="text-right">
                                <p className="text-[10px] font-black uppercase text-slate-400 mb-2 tracking-widest">DÖKÜMAN NO</p>
                                <p className="text-sm font-black text-slate-900 uppercase mb-1">QT-{Math.random().toString(36).substring(7).toUpperCase()}</p>
                             </div>
                        </div>

                        {/* TEKLİF TABLOSU */}
                        <div className="flex-1 space-y-12">
                             <div className="border border-slate-950 overflow-hidden">
                                <table className="w-full text-left text-xs">
                                    <thead className="bg-slate-950 text-white font-black uppercase">
                                        <tr>
                                            <th className="p-4 w-12 text-center border-r border-slate-800">#</th>
                                            <th className="p-4">ÜRÜN / HİZMET TANIMI</th>
                                            <th className="p-4 w-20 text-center">ADET</th>
                                            <th className="p-4 text-right">BİRİM FİYAT</th>
                                            <th className="p-4 text-right">TOPLAM</th>
                                        </tr>
                                    </thead>
                                    <tbody className="font-bold border-b border-slate-950">
                                        {items.map((item, i) => (
                                            <tr key={item.id} className="border-b border-slate-100">
                                                <td className="p-4 text-center border-r border-slate-100 italic text-slate-400">{i + 1}</td>
                                                <td className="p-4 uppercase">{item.name || 'Belirtilmemiş Ürün'}</td>
                                                <td className="p-4 text-center">{item.quantity}</td>
                                                <td className="p-4 text-right">{item.price.toLocaleString('tr-TR')} TL</td>
                                                <td className="p-4 text-right">{(item.quantity * item.price).toLocaleString('tr-TR')} TL</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot>
                                        <tr className="border-none font-black text-sm">
                                            <td colSpan={3}></td>
                                            <td className="p-4 text-right text-slate-400 lowercase tracking-widest text-[10px]">ARA TOPLAM</td>
                                            <td className="p-4 text-right uppercase italic">{subtotal.toLocaleString('tr-TR')} TL</td>
                                        </tr>
                                        {isTaxIncluded && (
                                            <tr className="border-none">
                                                <td colSpan={3}></td>
                                                <td className="p-4 text-right text-slate-400 lowercase tracking-widest text-[10px]">KDV (%{taxRate})</td>
                                                <td className="p-4 text-right font-bold text-xs">{taxAmount.toLocaleString('tr-TR')} TL</td>
                                            </tr>
                                        )}
                                        <tr className={cn("text-base font-black", isTaxIncluded ? "bg-slate-50" : "bg-white")}>
                                            <td colSpan={3} className="p-4 italic text-slate-400 text-[10px]">
                                                {isTaxIncluded ? "* Fiyatlara KDV Dahildir." : "* Fiyatlara %20 KDV Dahil Değildir."}
                                            </td>
                                            <td className="p-4 text-right uppercase tracking-[0.2em]">GENEL TOPLAM</td>
                                            <td className={cn("p-4 text-right italic text-xl border-t-2 border-slate-950", isTaxIncluded ? "text-primary" : "text-slate-950")}>
                                                {grandTotal.toLocaleString('tr-TR')} TL
                                            </td>
                                        </tr>
                                    </tfoot>
                                </table>
                             </div>

                             {/* ALT NOTLAR */}
                             <div className="space-y-4">
                                <h4 className="text-[10px] font-black uppercase text-slate-900 tracking-widest border-l-2 border-slate-900 pl-3">Teklif & Uygulama Notları</h4>
                                <div className="p-8 bg-slate-50 border border-slate-100 text-[11px] leading-relaxed text-slate-800 font-serif whitespace-pre-wrap italic">
                                    {footerNote || 'Teklif detayları hakkında daha fazla bilgi için bizimle iletişime geçebilirsiniz.'}
                                </div>
                             </div>
                        </div>

                        {/* ALT BİLGİ */}
                        <div className="mt-12 pt-8 border-t border-slate-100 flex justify-between items-center opacity-60">
                             <div className="text-[9px] font-bold uppercase tracking-widest space-y-1">
                                <p>{companyInfo.address}</p>
                                <p>{companyInfo.phone} | {companyInfo.email}</p>
                             </div>
                             <p className="text-[8px] font-bold uppercase tracking-[0.6em]">TEKLİF FORMU | ZIVA FIRE CRM</p>
                        </div>
                    </div>
                </div>
            </main>

            <style jsx global>{`
                @media print {
                    html, body, .min-h-screen, main { 
                        background: white !important; 
                        color: black !important;
                        margin: 0 !important; 
                        padding: 0 !important;
                        display: block !important;
                        overflow: visible !important;
                        -webkit-print-color-adjust: exact;
                        color-adjust: exact;
                    }
                    .print\:hidden, aside, nav, button, header { display: none !important; }
                    main { margin: 0 !important; padding: 0 !important; width: 100% !important; }
                    #quote-preview { 
                        margin: 0 auto !important; 
                        border: none !important;
                        box-shadow: none !important;
                        transform: none !important;
                        padding: 1.5cm !important;
                    }
                }
            `}</style>
        </div>
    </RouteGuard>
  );
}
