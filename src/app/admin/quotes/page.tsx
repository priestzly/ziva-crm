'use client';

import React, { useState, useRef } from 'react';
import { Sidebar, Topbar } from '@/components/DashboardShell';
import RouteGuard from '@/components/RouteGuard';
import { 
  Plus, Trash2, Printer, Settings, ChevronRight, ChevronLeft,
  FileText, User, MapPin, Phone, Mail, Calendar, Hash,
  Check, Eye, Edit3, ArrowUpRight, Download, Copy, Sparkles,
  GripVertical, ArrowDown, ArrowUp, Info, AlertCircle
} from 'lucide-react';

interface QuoteItem {
  id: string;
  name: string;
  description: string;
  quantity: number;
  unit: string;
  price: number;
  discount: number;
}

type QuoteStep = 'client' | 'items' | 'preview';

export default function QuoteBuilderPage() {
  const [currentStep, setCurrentStep] = useState<QuoteStep>('client');
  const [isGenerating, setIsGenerating] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  // Form State
  const [quoteData, setQuoteData] = useState({
    title: 'TEKLİF FORMU',
    quoteNo: `QT-${Date.now().toString(36).toUpperCase()}`,
    date: new Date().toISOString().split('T')[0],
    validUntil: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    clientName: '',
    clientAddress: '',
    clientPhone: '',
    clientEmail: '',
    clientTaxNo: '',
    notes: '',
    terms: 'Teklifimiz 15 gün süreyle geçerlidir.',
  });

  const [items, setItems] = useState<QuoteItem[]>([
    { id: '1', name: '', description: '', quantity: 1, unit: 'Adet', price: 0, discount: 0 }
  ]);

  const [taxRate, setTaxRate] = useState(20);
  const [isTaxIncluded, setIsTaxIncluded] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  // Calculations
  const getItemTotal = (item: QuoteItem) => {
    const base = item.quantity * item.price;
    const discountAmount = base * (item.discount / 100);
    return base - discountAmount;
  };

  const subtotal = items.reduce((sum, item) => sum + getItemTotal(item), 0);
  const totalDiscount = items.reduce((sum, item) => sum + (item.quantity * item.price * item.discount / 100), 0);
  const taxAmount = isTaxIncluded ? (subtotal * taxRate) / 100 : 0;
  const grandTotal = subtotal + taxAmount;

  // Handlers
  const addItem = () => {
    setItems([...items, { 
      id: Date.now().toString(), 
      name: '', 
      description: '', 
      quantity: 1, 
      unit: 'Adet', 
      price: 0, 
      discount: 0 
    }]);
  };

  const removeItem = (id: string) => {
    if (items.length > 1) setItems(items.filter(item => item.id !== id));
  };

  const updateItem = (id: string, field: keyof QuoteItem, value: any) => {
    setItems(items.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  const moveItem = (index: number, direction: 'up' | 'down') => {
    if ((direction === 'up' && index === 0) || (direction === 'down' && index === items.length - 1)) return;
    const newItems = [...items];
    const swapIndex = direction === 'up' ? index - 1 : index + 1;
    [newItems[index], newItems[swapIndex]] = [newItems[swapIndex], newItems[index]];
    setItems(newItems);
  };

  const duplicateItem = (id: string) => {
    const item = items.find(i => i.id === id);
    if (item) {
      const newItem = { ...item, id: Date.now().toString() };
      const index = items.findIndex(i => i.id === id);
      const newItems = [...items];
      newItems.splice(index + 1, 0, newItem);
      setItems(newItems);
    }
  };

  const handlePrint = () => {
    setIsGenerating(true);
    setTimeout(() => {
      window.print();
      setIsGenerating(false);
    }, 300);
  };

  const steps = [
    { id: 'client' as QuoteStep, label: 'Müşteri', icon: User },
    { id: 'items' as QuoteStep, label: 'Kalemler', icon: FileText },
    { id: 'preview' as QuoteStep, label: 'Önizleme', icon: Eye },
  ];

  const currentStepIndex = steps.findIndex(s => s.id === currentStep);

  return (
    <RouteGuard requiredRole="admin">
      <div className="min-h-screen flex bg-[hsl(var(--background))] print:bg-white">
        <Sidebar role="admin" />
        <main className="flex-1 lg:ml-72 w-full overflow-hidden print:ml-0">
          <div className="print:hidden">
            <Topbar title="Teklif Oluşturucu" subtitle="Profesyonel fiyat teklifleri hazırlayın" />
          </div>

          <div className="p-4 lg:p-6 max-w-[1400px] mx-auto print:p-0">
            
            {/* Mobile Step Indicator */}
            <div className="lg:hidden mb-6 print:hidden">
              <div className="flex items-center justify-between bg-white rounded-2xl p-2 border border-slate-100">
                {steps.map((step, index) => {
                  const Icon = step.icon;
                  const isActive = step.id === currentStep;
                  const isCompleted = index < currentStepIndex;
                  return (
                    <button
                      key={step.id}
                      onClick={() => setCurrentStep(step.id)}
                      className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
                        isActive 
                          ? 'bg-slate-900 text-white shadow-lg' 
                          : isCompleted
                            ? 'bg-slate-100 text-slate-600'
                            : 'text-slate-400'
                      }`}
                    >
                      <Icon size={14} />
                      <span className="hidden sm:inline">{step.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Desktop Progress Bar */}
            <div className="hidden lg:flex items-center justify-center mb-8 print:hidden">
              <div className="flex items-center gap-0">
                {steps.map((step, index) => {
                  const Icon = step.icon;
                  const isActive = step.id === currentStep;
                  const isCompleted = index < currentStepIndex;
                  return (
                    <React.Fragment key={step.id}>
                      <button
                        onClick={() => setCurrentStep(step.id)}
                        className={`flex items-center gap-3 px-6 py-3 rounded-2xl transition-all ${
                          isActive 
                            ? 'bg-slate-900 text-white shadow-xl shadow-slate-900/20' 
                            : isCompleted
                              ? 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                              : 'text-slate-400 hover:text-slate-600'
                        }`}
                      >
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                          isActive ? 'bg-white/20' : isCompleted ? 'bg-slate-900 text-white' : 'bg-slate-200'
                        }`}>
                          {isCompleted ? <Check size={14} /> : <Icon size={14} />}
                        </div>
                        <span className="text-sm font-bold">{step.label}</span>
                      </button>
                      {index < steps.length - 1 && (
                        <div className={`w-16 h-0.5 mx-2 ${
                          isCompleted ? 'bg-slate-900' : 'bg-slate-200'
                        }`} />
                      )}
                    </React.Fragment>
                  );
                })}
              </div>
            </div>

            {/* STEP 1: CLIENT INFO */}
            {currentStep === 'client' && (
              <div className="animate-fade-in print:hidden">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Main Form */}
                  <div className="lg:col-span-2 space-y-6">
                    {/* Teklif Bilgileri */}
                    <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
                      <div className="p-5 border-b border-slate-50 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                          <FileText size={18} />
                        </div>
                        <div>
                          <h3 className="font-bold text-slate-900">Teklif Bilgileri</h3>
                          <p className="text-xs text-slate-400">Teklif numarası ve tarih bilgileri</p>
                        </div>
                      </div>
                      <div className="p-5 space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Form Başlığı</label>
                            <input
                              value={quoteData.title}
                              onChange={e => setQuoteData({...quoteData, title: e.target.value})}
                              className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all"
                              placeholder="TEKLİF FORMU"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Teklif No</label>
                            <input
                              value={quoteData.quoteNo}
                              onChange={e => setQuoteData({...quoteData, quoteNo: e.target.value})}
                              className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all"
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Tarih</label>
                            <input
                              type="date"
                              value={quoteData.date}
                              onChange={e => setQuoteData({...quoteData, date: e.target.value})}
                              className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Geçerlilik Tarihi</label>
                            <input
                              type="date"
                              value={quoteData.validUntil}
                              onChange={e => setQuoteData({...quoteData, validUntil: e.target.value})}
                              className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all"
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Müşteri Bilgileri */}
                    <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
                      <div className="p-5 border-b border-slate-50 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                          <User size={18} />
                        </div>
                        <div>
                          <h3 className="font-bold text-slate-900">Müşteri Bilgileri</h3>
                          <p className="text-xs text-slate-400">Teklif yapılacak müşteri detayları</p>
                        </div>
                      </div>
                      <div className="p-5 space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-2 sm:col-span-2">
                            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Firma / Ad Soyad</label>
                            <input
                              value={quoteData.clientName}
                              onChange={e => setQuoteData({...quoteData, clientName: e.target.value})}
                              className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all"
                              placeholder="Müşteri firma adı veya kişi adı"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Telefon</label>
                            <div className="relative">
                              <Phone size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                              <input
                                value={quoteData.clientPhone}
                                onChange={e => setQuoteData({...quoteData, clientPhone: e.target.value})}
                                className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all"
                                placeholder="0(5XX) XXX XX XX"
                              />
                            </div>
                          </div>
                          <div className="space-y-2">
                            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">E-posta</label>
                            <div className="relative">
                              <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                              <input
                                type="email"
                                value={quoteData.clientEmail}
                                onChange={e => setQuoteData({...quoteData, clientEmail: e.target.value})}
                                className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all"
                                placeholder="ornek@email.com"
                              />
                            </div>
                          </div>
                          <div className="space-y-2 sm:col-span-2">
                            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Adres</label>
                            <div className="relative">
                              <MapPin size={16} className="absolute left-4 top-4 text-slate-400" />
                              <textarea
                                value={quoteData.clientAddress}
                                onChange={e => setQuoteData({...quoteData, clientAddress: e.target.value})}
                                className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all resize-none h-24"
                                placeholder="Müşteri adresi..."
                              />
                            </div>
                          </div>
                          <div className="space-y-2">
                            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Vergi No</label>
                            <div className="relative">
                              <Hash size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                              <input
                                value={quoteData.clientTaxNo}
                                onChange={e => setQuoteData({...quoteData, clientTaxNo: e.target.value})}
                                className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all"
                                placeholder="Vergi numarası"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Sidebar */}
                  <div className="space-y-6">
                    {/* KDV Ayarları */}
                    <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
                      <div className="p-5 border-b border-slate-50 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                          <Settings size={18} />
                        </div>
                        <div>
                          <h3 className="font-bold text-slate-900">Vergi Ayarları</h3>
                          <p className="text-xs text-slate-400">KDV oranı ve uygulama</p>
                        </div>
                      </div>
                      <div className="p-5 space-y-4">
                        <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                          <div>
                            <p className="text-sm font-semibold text-slate-700">KDV Uygula</p>
                            <p className="text-xs text-slate-400">Fi yatlara KDV dahil mi?</p>
                          </div>
                          <button
                            onClick={() => setIsTaxIncluded(!isTaxIncluded)}
                            className={`w-12 h-7 rounded-full transition-all relative ${
                              isTaxIncluded ? 'bg-emerald-500' : 'bg-slate-300'
                            }`}
                          >
                            <div className={`w-5 h-5 bg-white rounded-full absolute top-1 transition-all shadow-sm ${
                              isTaxIncluded ? 'left-6' : 'left-1'
                            }`} />
                          </button>
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">KDV Oranı (%)</label>
                          <div className="flex items-center gap-3">
                            <button 
                              onClick={() => setTaxRate(Math.max(0, taxRate - 1))}
                              className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600 hover:bg-slate-200 transition-colors"
                            >
                              -
                            </button>
                            <input
                              type="number"
                              value={taxRate}
                              onChange={e => setTaxRate(Number(e.target.value))}
                              className="flex-1 px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-center text-lg font-bold focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all"
                            />
                            <button 
                              onClick={() => setTaxRate(taxRate + 1)}
                              className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600 hover:bg-slate-200 transition-colors"
                            >
                              +
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Notlar */}
                    <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
                      <div className="p-5 border-b border-slate-50 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                          <FileText size={18} />
                        </div>
                        <div>
                          <h3 className="font-bold text-slate-900">Notlar & Şartlar</h3>
                          <p className="text-xs text-slate-400">Teklif alt bilgisi</p>
                        </div>
                      </div>
                      <div className="p-5 space-y-4">
                        <div className="space-y-2">
                          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Notlar</label>
                          <textarea
                            value={quoteData.notes}
                            onChange={e => setQuoteData({...quoteData, notes: e.target.value})}
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all resize-none h-20"
                            placeholder="Ek notlar..."
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Şartlar</label>
                          <textarea
                            value={quoteData.terms}
                            onChange={e => setQuoteData({...quoteData, terms: e.target.value})}
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all resize-none h-20"
                            placeholder="Teklif şartları..."
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Navigation */}
                <div className="mt-6 flex justify-end print:hidden">
                  <button
                    onClick={() => setCurrentStep('items')}
                    className="flex items-center gap-3 px-8 py-4 bg-slate-900 text-white rounded-2xl font-bold text-sm hover:bg-slate-800 transition-all shadow-xl shadow-slate-900/10 active:scale-[0.98]"
                  >
                    Devam Et <ChevronRight size={18} />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 2: ITEMS */}
            {currentStep === 'items' && (
              <div className="animate-fade-in print:hidden">
                <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
                  {/* Header */}
                  <div className="p-5 border-b border-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center">
                        <FileText size={18} />
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-900">Teklif Kalemleri</h3>
                        <p className="text-xs text-slate-400">{items.length} kalem • Toplam: {grandTotal.toLocaleString('tr-TR')} ₺</p>
                      </div>
                    </div>
                    <button
                      onClick={addItem}
                      className="flex items-center gap-2 px-5 py-3 bg-slate-900 text-white rounded-xl text-sm font-bold hover:bg-slate-800 transition-all active:scale-95"
                    >
                      <Plus size={16} /> Yeni Kalem
                    </button>
                  </div>

                  {/* Desktop Table Header */}
                  <div className="hidden lg:grid grid-cols-12 gap-3 px-5 py-3 bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    <div className="col-span-1 text-center">Sıra</div>
                    <div className="col-span-4">Ürün / Hizmet</div>
                    <div className="col-span-1 text-center">Adet</div>
                    <div className="col-span-1 text-center">Birim</div>
                    <div className="col-span-2 text-right">Birim Fiyat</div>
                    <div className="col-span-1 text-center">İndirim</div>
                    <div className="col-span-2 text-right">Toplam</div>
                  </div>

                  {/* Items List */}
                  <div className="divide-y divide-slate-50">
                    {items.map((item, index) => (
                      <div key={item.id} className="group p-4 lg:px-5 lg:py-4 hover:bg-slate-50/50 transition-colors">
                        {/* Mobile Layout */}
                        <div className="lg:hidden space-y-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="flex items-center gap-1">
                                <button 
                                  onClick={() => moveItem(index, 'up')}
                                  disabled={index === 0}
                                  className="w-7 h-7 flex items-center justify-center text-slate-300 disabled:opacity-30 hover:text-slate-600 transition-colors"
                                >
                                  <ArrowUp size={14} />
                                </button>
                                <button 
                                  onClick={() => moveItem(index, 'down')}
                                  disabled={index === items.length - 1}
                                  className="w-7 h-7 flex items-center justify-center text-slate-300 disabled:opacity-30 hover:text-slate-600 transition-colors"
                                >
                                  <ArrowDown size={14} />
                                </button>
                              </div>
                              <span className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-500">
                                {index + 1}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <button 
                                onClick={() => duplicateItem(item.id)}
                                className="w-8 h-8 flex items-center justify-center text-slate-300 hover:text-blue-500 rounded-lg transition-colors"
                              >
                                <Copy size={14} />
                              </button>
                              <button 
                                onClick={() => removeItem(item.id)}
                                className="w-8 h-8 flex items-center justify-center text-slate-300 hover:text-red-500 rounded-lg transition-colors"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>
                          
                          <input
                            placeholder="Ürün / Hizmet adı"
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all"
                            value={item.name}
                            onChange={e => updateItem(item.id, 'name', e.target.value)}
                          />
                          <input
                            placeholder="Açıklama (opsiyonel)"
                            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all"
                            value={item.description}
                            onChange={e => updateItem(item.id, 'description', e.target.value)}
                          />
                          
                          <div className="grid grid-cols-3 gap-3">
                            <div>
                              <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Adet</label>
                              <input
                                type="number"
                                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-sm text-center focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all"
                                value={item.quantity}
                                onChange={e => updateItem(item.id, 'quantity', Number(e.target.value))}
                              />
                            </div>
                            <div>
                              <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Birim</label>
                              <select
                                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all"
                                value={item.unit}
                                onChange={e => updateItem(item.id, 'unit', e.target.value)}
                              >
                                <option value="Adet">Adet</option>
                                <option value="m²">m²</option>
                                <option value="m">m</option>
                                <option value="kg">kg</option>
                                <option value="lt">lt</option>
                                <option value="Paket">Paket</option>
                                <option value="Set">Set</option>
                              </select>
                            </div>
                            <div>
                              <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">İndirim %</label>
                              <input
                                type="number"
                                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-sm text-center focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all"
                                value={item.discount}
                                onChange={e => updateItem(item.id, 'discount', Number(e.target.value))}
                              />
                            </div>
                          </div>
                          
                          <div>
                            <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Birim Fiyat (₺)</label>
                            <input
                              type="number"
                              className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm text-right focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all"
                              value={item.price}
                              onChange={e => updateItem(item.id, 'price', Number(e.target.value))}
                            />
                          </div>
                          
                          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                            <span className="text-xs font-semibold text-slate-500">Satır Toplamı</span>
                            <span className="text-xl font-black text-slate-900">{getItemTotal(item).toLocaleString('tr-TR')} ₺</span>
                          </div>
                        </div>

                        {/* Desktop Layout */}
                        <div className="hidden lg:grid grid-cols-12 gap-3 items-center">
                          <div className="col-span-1 flex items-center justify-center gap-1">
                            <button 
                              onClick={() => moveItem(index, 'up')}
                              disabled={index === 0}
                              className="w-7 h-7 flex items-center justify-center text-slate-300 disabled:opacity-30 hover:text-slate-600 rounded-lg transition-colors"
                            >
                              <ArrowUp size={14} />
                            </button>
                            <button 
                              onClick={() => moveItem(index, 'down')}
                              disabled={index === items.length - 1}
                              className="w-7 h-7 flex items-center justify-center text-slate-300 disabled:opacity-30 hover:text-slate-600 rounded-lg transition-colors"
                            >
                              <ArrowDown size={14} />
                            </button>
                            <span className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-500 ml-1">
                              {index + 1}
                            </span>
                          </div>
                          <div className="col-span-4 space-y-2">
                            <input
                              placeholder="Ürün / Hizmet adı"
                              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-100 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all"
                              value={item.name}
                              onChange={e => updateItem(item.id, 'name', e.target.value)}
                            />
                            <input
                              placeholder="Açıklama"
                              className="w-full px-3 py-2 bg-slate-50/50 border border-slate-100 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all"
                              value={item.description}
                              onChange={e => updateItem(item.id, 'description', e.target.value)}
                            />
                          </div>
                          <div className="col-span-1">
                            <input
                              type="number"
                              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-100 rounded-lg text-sm text-center focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all"
                              value={item.quantity}
                              onChange={e => updateItem(item.id, 'quantity', Number(e.target.value))}
                            />
                          </div>
                          <div className="col-span-1">
                            <select
                              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all"
                              value={item.unit}
                              onChange={e => updateItem(item.id, 'unit', e.target.value)}
                            >
                              <option value="Adet">Adet</option>
                              <option value="m²">m²</option>
                              <option value="m">m</option>
                              <option value="kg">kg</option>
                              <option value="lt">lt</option>
                              <option value="Paket">Paket</option>
                              <option value="Set">Set</option>
                            </select>
                          </div>
                          <div className="col-span-2">
                            <input
                              type="number"
                              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-100 rounded-lg text-sm text-right focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all"
                              value={item.price}
                              onChange={e => updateItem(item.id, 'price', Number(e.target.value))}
                            />
                          </div>
                          <div className="col-span-1">
                            <input
                              type="number"
                              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-100 rounded-lg text-sm text-center focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all"
                              value={item.discount}
                              onChange={e => updateItem(item.id, 'discount', Number(e.target.value))}
                            />
                          </div>
                          <div className="col-span-2 flex items-center justify-between">
                            <span className="text-sm font-bold text-slate-900">
                              {getItemTotal(item).toLocaleString('tr-TR')} ₺
                            </span>
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button 
                                onClick={() => duplicateItem(item.id)}
                                className="w-8 h-8 flex items-center justify-center text-slate-300 hover:text-blue-500 rounded-lg transition-colors"
                              >
                                <Copy size={14} />
                              </button>
                              <button 
                                onClick={() => removeItem(item.id)}
                                className="w-8 h-8 flex items-center justify-center text-slate-300 hover:text-red-500 rounded-lg transition-colors"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Summary */}
                  <div className="p-5 bg-slate-50 border-t border-slate-100">
                    <div className="max-w-sm ml-auto space-y-3">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-500">Ara Toplam</span>
                        <span className="font-bold text-slate-900">{subtotal.toLocaleString('tr-TR')} ₺</span>
                      </div>
                      {totalDiscount > 0 && (
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-emerald-600 flex items-center gap-1">
                            <ArrowDown size={12} /> İndirim
                          </span>
                          <span className="font-bold text-emerald-600">-{totalDiscount.toLocaleString('tr-TR')} ₺</span>
                        </div>
                      )}
                      {isTaxIncluded && (
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-slate-500">KDV (%{taxRate})</span>
                          <span className="font-bold text-slate-900">{taxAmount.toLocaleString('tr-TR')} ₺</span>
                        </div>
                      )}
                      <div className="flex items-center justify-between pt-3 border-t border-slate-200">
                        <span className="text-base font-bold text-slate-700">Genel Toplam</span>
                        <span className="text-3xl font-black text-slate-900">{grandTotal.toLocaleString('tr-TR')} ₺</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Navigation */}
                <div className="mt-6 flex flex-col sm:flex-row justify-between gap-4 print:hidden">
                  <button
                    onClick={() => setCurrentStep('client')}
                    className="flex items-center justify-center gap-2 px-6 py-4 bg-white border border-slate-200 text-slate-700 rounded-2xl font-bold text-sm hover:bg-slate-50 transition-all"
                  >
                    <ChevronLeft size={18} /> Geri
                  </button>
                  <button
                    onClick={() => setCurrentStep('preview')}
                    className="flex items-center justify-center gap-2 px-8 py-4 bg-slate-900 text-white rounded-2xl font-bold text-sm hover:bg-slate-800 transition-all shadow-xl shadow-slate-900/10"
                  >
                    Önizle <Eye size={18} />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 3: PREVIEW */}
            {currentStep === 'preview' && (
              <div className="animate-fade-in print:hidden">
                {/* Navigation */}
                <div className="flex flex-col sm:flex-row justify-between gap-4 mb-6">
                  <button
                    onClick={() => setCurrentStep('items')}
                    className="flex items-center justify-center gap-2 px-6 py-3 bg-white border border-slate-200 text-slate-700 rounded-2xl font-bold text-sm hover:bg-slate-50 transition-all"
                  >
                    <ChevronLeft size={18} /> Düzenle
                  </button>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={handlePrint}
                      disabled={isGenerating}
                      className="flex items-center justify-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-2xl font-bold text-sm hover:bg-slate-800 transition-all shadow-xl shadow-slate-900/10 active:scale-[0.98] disabled:opacity-50"
                    >
                      {isGenerating ? (
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        <Printer size={18} />
                      )}
                      {isGenerating ? 'Hazırlanıyor...' : 'PDF İndir / Yazdır'}
                    </button>
                  </div>
                </div>

                {/* Preview Card */}
                <div className="bg-white rounded-2xl border border-slate-100 shadow-xl overflow-hidden">
                  <div ref={printRef} id="quote-preview" className="p-8 md:p-12 lg:p-16">
                    {/* Header */}
                    <div className="flex flex-col sm:flex-row justify-between items-start gap-8 pb-8 border-b-2 border-slate-900">
                      <div className="flex items-center gap-4">
                        <div className="w-16 h-16 bg-slate-900 rounded-xl p-1.5">
                          <img src="/logo.png" alt="Logo" className="w-full h-full object-contain" />
                        </div>
                        <div>
                          <h2 className="text-lg font-black uppercase tracking-tight">ZIVA <span className="text-red-500">BACA YANGIN</span></h2>
                          <p className="text-[8px] uppercase tracking-[0.3em] text-slate-400 font-bold">Teknik Servis & Güvenlik Sistemleri</p>
                        </div>
                      </div>
                      <div className="text-left sm:text-right">
                        <p className="text-xl font-black text-slate-950 uppercase">{quoteData.title}</p>
                        <div className="flex flex-wrap gap-4 mt-2">
                          <span className="text-xs font-bold text-slate-500">No: {quoteData.quoteNo}</span>
                          <span className="text-xs font-bold text-slate-500">Tarih: {new Date(quoteData.date).toLocaleDateString('tr-TR')}</span>
                        </div>
                      </div>
                    </div>

                    {/* Client Info */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 py-8">
                      <div className="space-y-1.5">
                        <p className="text-[8px] font-black uppercase tracking-widest text-red-500">Sayın Müşteri</p>
                        <p className="text-base font-black text-slate-900">{quoteData.clientName || '—'}</p>
                        {quoteData.clientAddress && <p className="text-[11px] text-slate-500 leading-relaxed max-w-xs">{quoteData.clientAddress}</p>}
                        <div className="flex flex-col gap-1 pt-1">
                          {quoteData.clientPhone && <p className="text-[10px] text-slate-500 flex items-center gap-1.5"><Phone size={10} className="text-slate-300" /> {quoteData.clientPhone}</p>}
                          {quoteData.clientEmail && <p className="text-[10px] text-slate-500 flex items-center gap-1.5"><Mail size={10} className="text-slate-300" /> {quoteData.clientEmail}</p>}
                          {quoteData.clientTaxNo && <p className="text-[10px] text-slate-500 flex items-center gap-1.5"><Hash size={10} className="text-slate-300" /> VN: {quoteData.clientTaxNo}</p>}
                        </div>
                      </div>
                      <div className="text-left sm:text-right space-y-1">
                        <p className="text-[8px] font-black uppercase tracking-widest text-slate-300">Geçerlilik</p>
                        <p className="text-xs font-bold text-slate-900">{new Date(quoteData.validUntil).toLocaleDateString('tr-TR')}</p>
                      </div>
                    </div>

                    {/* Table */}
                    <div className="rounded-xl overflow-hidden border border-slate-100 my-8">
                      <table className="w-full text-[11px]">
                        <thead>
                          <tr className="bg-slate-900 text-white">
                            <th className="py-2.5 px-4 text-center font-bold text-[8px] uppercase tracking-wider">#</th>
                            <th className="py-2.5 px-4 text-left font-bold text-[8px] uppercase tracking-wider">Ürün / Hizmet</th>
                            <th className="py-2.5 px-3 text-center font-bold text-[8px] uppercase tracking-wider">Adet</th>
                            <th className="py-2.5 px-3 text-right font-bold text-[8px] uppercase tracking-wider">Birim</th>
                            {items.some(i => i.discount > 0) && (
                              <th className="py-2.5 px-3 text-center font-bold text-[8px] uppercase tracking-wider">İnd.</th>
                            )}
                            <th className="py-2.5 px-4 text-right font-bold text-[8px] uppercase tracking-wider">Toplam</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {items.map((item, i) => (
                            <tr key={item.id} className="bg-white">
                              <td className="py-2.5 px-4 text-center font-bold text-slate-300">{i + 1}</td>
                              <td className="py-2.5 px-4">
                                <p className="font-semibold text-slate-900">{item.name || '—'}</p>
                                {item.description && <p className="text-[9px] text-slate-400 mt-0.5">{item.description}</p>}
                              </td>
                              <td className="py-2.5 px-3 text-center font-medium">{item.quantity} {item.unit}</td>
                              <td className="py-2.5 px-3 text-right font-medium">{item.price.toLocaleString('tr-TR')} ₺</td>
                              {items.some(it => it.discount > 0) && (
                                <td className="py-2.5 px-3 text-center text-emerald-600 font-medium">%{item.discount}</td>
                              )}
                              <td className="py-2.5 px-4 text-right font-bold text-slate-900">{getItemTotal(item).toLocaleString('tr-TR')} ₺</td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr className="bg-slate-50">
                            <td colSpan={3}></td>
                            <td className="py-2.5 px-4 text-right text-[8px] font-bold uppercase tracking-wider text-slate-500">Ara Toplam</td>
                            {items.some(i => i.discount > 0) && <td className="py-2.5 px-4"></td>}
                            <td className="py-2.5 px-4 text-right font-bold text-slate-900">{subtotal.toLocaleString('tr-TR')} ₺</td>
                          </tr>
                          {totalDiscount > 0 && (
                            <tr className="bg-slate-50/50">
                              <td colSpan={3}></td>
                              <td className="py-2.5 px-4 text-right text-[8px] font-bold uppercase tracking-wider text-emerald-600">İndirim</td>
                              {items.some(i => i.discount > 0) && <td className="py-2.5 px-4"></td>}
                              <td className="py-2.5 px-4 text-right font-bold text-emerald-600">-{totalDiscount.toLocaleString('tr-TR')} ₺</td>
                            </tr>
                          )}
                          {isTaxIncluded && (
                            <tr className="bg-slate-50/50">
                              <td colSpan={3}></td>
                              <td className="py-2.5 px-4 text-right text-[8px] font-bold uppercase tracking-wider text-slate-400">KDV (%{taxRate})</td>
                              {items.some(i => i.discount > 0) && <td className="py-2.5 px-4"></td>}
                              <td className="py-2.5 px-4 text-right font-bold text-slate-900">{taxAmount.toLocaleString('tr-TR')} ₺</td>
                            </tr>
                          )}
                          <tr className="bg-slate-900 text-white">
                            <td colSpan={3}></td>
                            <td className="py-3 px-4 text-right text-[8px] font-bold uppercase tracking-widest">Genel Toplam</td>
                            {items.some(i => i.discount > 0) && <td className="py-3 px-4"></td>}
                            <td className="py-3 px-4 text-right text-lg font-black text-red-400">{grandTotal.toLocaleString('tr-TR')} ₺</td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>

                    {/* Notes & KDV Status */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mt-8 pt-8 border-t border-slate-100">
                      <div>
                        <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2">Ödeme & Vergi</p>
                        <p className="text-xs text-slate-600 font-bold">* Bu teklifteki tutarlara KDV {isTaxIncluded ? 'dahildir' : 'dahil değildir'}.</p>
                        {quoteData.notes && <p className="text-xs text-slate-600 italic mt-2">{quoteData.notes}</p>}
                      </div>
                      {quoteData.terms && (
                        <div>
                          <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2">Şartlar</p>
                          <p className="text-xs text-slate-600 italic">{quoteData.terms}</p>
                        </div>
                      )}
                    </div>

                    {/* Footer */}
                    <div className="mt-12 pt-6 border-t border-slate-100 text-center">
                      <p className="text-[9px] text-slate-400 font-bold">Ziva Fire Sistemleri • 0850 123 45 67 • info@zivafire.com</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* PRINT STYLES */}
            <div className="hidden print:block">
              <div id="print-area" className="p-8">
                {/* Header */}
                <div className="flex justify-between items-start pb-8 border-b-2 border-slate-900 mb-8">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 border-2 border-slate-900 p-1.5">
                      <img src="/logo.png" alt="Logo" className="w-full h-full object-contain" />
                    </div>
                    <div>
                      <h2 className="text-xl font-black uppercase">ZIVA <span className="text-red-500">BACA YANGIN</span></h2>
                      <p className="text-[9px] uppercase tracking-[0.3em] text-slate-400 font-bold">Teknik Servis & Güvenlik Sistemleri</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-black text-slate-950 uppercase tracking-tight">{quoteData.title}</p>
                    <p className="text-xs font-bold text-slate-500">No: {quoteData.quoteNo}</p>
                    <p className="text-xs font-bold text-slate-500">Tarih: {new Date(quoteData.date).toLocaleDateString('tr-TR')}</p>
                  </div>
                </div>

                {/* Client */}
                <div className="mb-8">
                  <p className="text-[9px] font-black uppercase tracking-widest text-red-500 mb-2">Sayın Müşteri</p>
                  <p className="text-lg font-black">{quoteData.clientName || '—'}</p>
                  {quoteData.clientAddress && <p className="text-xs text-slate-500">{quoteData.clientAddress}</p>}
                  {quoteData.clientPhone && <p className="text-xs text-slate-500">{quoteData.clientPhone}</p>}
                  {quoteData.clientTaxNo && <p className="text-xs text-slate-500">VN: {quoteData.clientTaxNo}</p>}
                </div>

                {/* Table */}
                <table className="w-full text-xs mb-8">
                  <thead>
                    <tr className="bg-slate-900 text-white">
                      <th className="py-3 px-4 text-center font-bold text-[9px] uppercase">#</th>
                      <th className="py-3 px-4 text-left font-bold text-[9px] uppercase">Ürün / Hizmet</th>
                      <th className="py-3 px-3 text-center font-bold text-[9px] uppercase">Adet</th>
                      <th className="py-3 px-3 text-right font-bold text-[9px] uppercase">Birim</th>
                      {items.some(i => i.discount > 0) && (
                        <th className="py-3 px-3 text-center font-bold text-[9px] uppercase">İnd.</th>
                      )}
                      <th className="py-3 px-4 text-right font-bold text-[9px] uppercase">Toplam</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {items.map((item, i) => (
                      <tr key={item.id}>
                        <td className="py-3 px-4 text-center font-bold text-slate-300">{i + 1}</td>
                        <td className="py-3 px-4 font-semibold">
                          <p className="font-bold text-slate-900">{item.name || '—'}</p>
                          {item.description && <p className="text-[9px] text-slate-400 mt-0.5">{item.description}</p>}
                        </td>
                        <td className="py-3 px-3 text-center font-semibold">{item.quantity} {item.unit}</td>
                        <td className="py-3 px-3 text-right font-semibold">{item.price.toLocaleString('tr-TR')} ₺</td>
                        {items.some(it => it.discount > 0) && (
                          <td className="py-3 px-3 text-center font-semibold text-emerald-600">%{item.discount}</td>
                        )}
                        <td className="py-3 px-4 text-right font-bold">{getItemTotal(item).toLocaleString('tr-TR')} ₺</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-50">
                      <td colSpan={3}></td>
                      <td className="py-3 px-4 text-right text-[9px] font-bold uppercase tracking-wider text-slate-500">Ara Toplam</td>
                      {items.some(i => i.discount > 0) && <td className="py-3 px-4"></td>}
                      <td className="py-3 px-4 text-right font-bold">{subtotal.toLocaleString('tr-TR')} ₺</td>
                    </tr>
                    {totalDiscount > 0 && (
                      <tr className="bg-slate-50/50">
                        <td colSpan={3}></td>
                        <td className="py-3 px-4 text-right text-[9px] font-bold uppercase tracking-wider text-emerald-600">İndirim</td>
                        {items.some(i => i.discount > 0) && <td className="py-3 px-4"></td>}
                        <td className="py-3 px-4 text-right font-bold text-emerald-600">-{totalDiscount.toLocaleString('tr-TR')} ₺</td>
                      </tr>
                    )}
                    {isTaxIncluded && (
                      <tr className="bg-slate-50">
                        <td colSpan={3}></td>
                        <td className="py-3 px-4 text-right text-[9px] font-bold uppercase tracking-wider text-slate-500">KDV (%{taxRate})</td>
                        {items.some(i => i.discount > 0) && <td className="py-3 px-4"></td>}
                        <td className="py-3 px-4 text-right font-bold">{taxAmount.toLocaleString('tr-TR')} ₺</td>
                      </tr>
                    )}
                    <tr className="bg-slate-900 text-white">
                      <td colSpan={3}></td>
                      <td className="py-4 px-4 text-right text-[9px] font-bold uppercase tracking-widest">Genel Toplam</td>
                      {items.some(i => i.discount > 0) && <td className="py-4 px-4"></td>}
                      <td className="py-4 px-4 text-right text-xl font-black text-red-400">{grandTotal.toLocaleString('tr-TR')} ₺</td>
                    </tr>
                  </tfoot>
                </table>

                {/* Terms and VAT Note */}
                <div className="grid grid-cols-2 gap-8 pt-6 border-t border-slate-100">
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2">Önemli Notlar</p>
                    <p className="text-xs font-bold text-slate-900">* Teklif tutarına KDV {isTaxIncluded ? 'dahildir' : 'dahil değildir'}.</p>
                    {quoteData.terms && <p className="text-xs text-slate-600 italic mt-2">{quoteData.terms}</p>}
                  </div>
                  {quoteData.notes && (
                    <div>
                      <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2">Notlar</p>
                      <p className="text-xs text-slate-600 italic">{quoteData.notes}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </main>

        <style jsx global>{`
          @media print {
            @page { size: A4; margin: 1cm; }
            html, body { 
              background: white !important; 
              color: black !important;
              margin: 0 !important; 
              padding: 0 !important;
              -webkit-print-color-adjust: exact;
              color-adjust: exact;
            }
            aside, nav, button, .print\\:hidden { display: none !important; }
            main { margin: 0 !important; padding: 0 !important; width: 100% !important; }
            .shadow-xl, .shadow-2xl { box-shadow: none !important; }
          }
          @keyframes fade-in {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
          }
          .animate-fade-in {
            animation: fade-in 0.3s ease-out;
          }
        `}</style>
      </div>
    </RouteGuard>
  );
}