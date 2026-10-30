'use client';

import React, { useState, useRef } from 'react';
import { PanelLayout } from '@/components/DashboardShell';
import {
  Button, IconButton, Card, CardHeader, PageHeader, Badge, Field, Input, Select, Textarea, Segmented, Sheet,
} from '@/components/ui';
import RouteGuard from '@/components/RouteGuard';
import {
  Plus, Minus, Trash2, Printer, ChevronRight, ChevronLeft,
  FileText, User, Phone, Mail, Hash, Eye, Copy, ArrowDown, ArrowUp,
} from 'lucide-react';
import { cn } from '@/lib/utils';

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

const UNIT_OPTIONS = ['Adet', 'm²', 'm', 'kg', 'lt', 'Paket', 'Set'];

/* Input with a leading icon */
function IconInput({ icon: Icon, className, ...rest }: React.InputHTMLAttributes<HTMLInputElement> & { icon: React.ComponentType<{ size?: number; className?: string }> }) {
  return (
    <div className="relative">
      <Icon size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
      <Input className={cn('pl-9', className)} {...rest} />
    </div>
  );
}

/* Subtotal / discount / VAT / grand total rows */
function TotalsList({ subtotal, totalDiscount, isTaxIncluded, taxRate, taxAmount, grandTotal }: {
  subtotal: number; totalDiscount: number; isTaxIncluded: boolean; taxRate: number; taxAmount: number; grandTotal: number;
}) {
  return (
    <dl className="space-y-2.5 text-sm">
      <div className="flex items-center justify-between gap-4">
        <dt className="text-muted-foreground">Ara toplam</dt>
        <dd className="font-medium text-foreground tabular-nums">{subtotal.toLocaleString('tr-TR')} ₺</dd>
      </div>
      {totalDiscount > 0 && (
        <div className="flex items-center justify-between gap-4">
          <dt className="text-success flex items-center gap-1"><ArrowDown size={13} /> İndirim</dt>
          <dd className="font-medium text-success tabular-nums">-{totalDiscount.toLocaleString('tr-TR')} ₺</dd>
        </div>
      )}
      {isTaxIncluded && (
        <div className="flex items-center justify-between gap-4">
          <dt className="text-muted-foreground">KDV (%{taxRate})</dt>
          <dd className="font-medium text-foreground tabular-nums">{taxAmount.toLocaleString('tr-TR')} ₺</dd>
        </div>
      )}
      <div className="flex items-center justify-between gap-4 pt-3 border-t border-border">
        <dt className="font-semibold text-foreground">Genel toplam</dt>
        <dd className="text-2xl font-bold tracking-tight text-foreground tabular-nums">{grandTotal.toLocaleString('tr-TR')} ₺</dd>
      </div>
    </dl>
  );
}

export default function QuoteBuilderPage() {
  const [showMobilePreviewSheet, setShowMobilePreviewSheet] = useState(false);
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

  const totalsProps = { subtotal, totalDiscount, isTaxIncluded, taxRate, taxAmount, grandTotal };

  return (
    <RouteGuard requiredRole="admin">
      <PanelLayout role="admin" title="Teklif oluşturucu" subtitle="Profesyonel fiyat teklifleri hazırlayın" width="wide">
        {/* Editor header + step switcher */}
        <div className="print:hidden">
          <PageHeader
            title="Teklif oluşturucu"
            description="Müşteri bilgilerini girin, kalemleri ekleyin ve teklifi PDF olarak indirin."
            actions={
              <Button icon={Printer} loading={isGenerating} onClick={handlePrint}>
                {isGenerating ? 'Hazırlanıyor…' : 'Yazdır / PDF indir'}
              </Button>
            }
          />

          <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <Segmented
              value={currentStep}
              onChange={setCurrentStep}
              options={steps.map(s => ({ value: s.id, label: s.label }))}
              className="w-full sm:w-auto [&>button]:flex-1 sm:[&>button]:flex-none sm:[&>button]:px-5"
            />
            <p className="text-xs text-muted-foreground">
              Adım {currentStepIndex + 1} / {steps.length} · {items.length} kalem · Genel toplam{' '}
              <span className="font-semibold text-foreground tabular-nums">{grandTotal.toLocaleString('tr-TR')} ₺</span>
            </p>
          </div>
        </div>

        {/* STEP 1: CLIENT INFO */}
        {currentStep === 'client' && (
          <div className="print:hidden">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                <Card>
                  <CardHeader title="Teklif bilgileri" description="Teklif numarası ve tarih bilgileri" className="px-4 sm:px-5 pt-4 sm:pt-5" />
                  <div className="px-4 sm:px-5 pb-4 sm:pb-5 grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <Field label="Form başlığı">
                      <Input
                        value={quoteData.title}
                        onChange={e => setQuoteData({...quoteData, title: e.target.value})}
                        placeholder="TEKLİF FORMU"
                      />
                    </Field>
                    <Field label="Teklif no">
                      <Input
                        value={quoteData.quoteNo}
                        onChange={e => setQuoteData({...quoteData, quoteNo: e.target.value})}
                        className="tabular-nums"
                      />
                    </Field>
                    <Field label="Tarih">
                      <Input
                        type="date"
                        value={quoteData.date}
                        onChange={e => setQuoteData({...quoteData, date: e.target.value})}
                      />
                    </Field>
                    <Field label="Geçerlilik tarihi">
                      <Input
                        type="date"
                        value={quoteData.validUntil}
                        onChange={e => setQuoteData({...quoteData, validUntil: e.target.value})}
                      />
                    </Field>
                  </div>
                </Card>

                <Card>
                  <CardHeader title="Müşteri bilgileri" description="Teklif yapılacak müşteri detayları" className="px-4 sm:px-5 pt-4 sm:pt-5" />
                  <div className="px-4 sm:px-5 pb-4 sm:pb-5 grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <Field label="Firma / ad soyad" className="sm:col-span-2">
                      <Input
                        value={quoteData.clientName}
                        onChange={e => setQuoteData({...quoteData, clientName: e.target.value})}
                        placeholder="Müşteri firma adı veya kişi adı"
                      />
                    </Field>
                    <Field label="Telefon">
                      <IconInput
                        icon={Phone}
                        value={quoteData.clientPhone}
                        onChange={e => setQuoteData({...quoteData, clientPhone: e.target.value})}
                        placeholder="0(5XX) XXX XX XX"
                      />
                    </Field>
                    <Field label="E-posta">
                      <IconInput
                        icon={Mail}
                        type="email"
                        value={quoteData.clientEmail}
                        onChange={e => setQuoteData({...quoteData, clientEmail: e.target.value})}
                        placeholder="ornek@email.com"
                      />
                    </Field>
                    <Field label="Adres" className="sm:col-span-2">
                      <Textarea
                        value={quoteData.clientAddress}
                        onChange={e => setQuoteData({...quoteData, clientAddress: e.target.value})}
                        placeholder="Müşteri adresi…"
                        rows={3}
                      />
                    </Field>
                    <Field label="Vergi no">
                      <IconInput
                        icon={Hash}
                        value={quoteData.clientTaxNo}
                        onChange={e => setQuoteData({...quoteData, clientTaxNo: e.target.value})}
                        placeholder="Vergi numarası"
                      />
                    </Field>
                  </div>
                </Card>
              </div>

              <div className="space-y-6">
                <Card>
                  <CardHeader title="Vergi ayarları" description="KDV oranı ve uygulama" className="px-4 sm:px-5 pt-4 sm:pt-5" />
                  <div className="px-4 sm:px-5 pb-4 sm:pb-5 space-y-4">
                    <div className="flex items-center justify-between gap-4 rounded-xl border border-border bg-surface px-4 py-3">
                      <div>
                        <p className="text-sm font-medium text-foreground">KDV uygula</p>
                        <p className="text-xs text-muted-foreground">Fiyatlara KDV eklensin mi?</p>
                      </div>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={isTaxIncluded}
                        aria-label="KDV uygula"
                        onClick={() => setIsTaxIncluded(!isTaxIncluded)}
                        className={cn(
                          'relative w-11 h-6 shrink-0 rounded-full border transition-colors cursor-pointer',
                          isTaxIncluded ? 'bg-primary border-primary' : 'bg-muted border-border-strong'
                        )}
                      >
                        <span className={cn(
                          'absolute top-0.5 w-[18px] h-[18px] rounded-full shadow-sm transition-all',
                          isTaxIncluded ? 'left-[22px] bg-primary-foreground' : 'left-0.5 bg-muted-foreground'
                        )} />
                      </button>
                    </div>
                    <Field label="KDV oranı (%)">
                      <div className="flex items-center gap-2">
                        <IconButton icon={Minus} label="Oranı azalt" variant="secondary" onClick={() => setTaxRate(Math.max(0, taxRate - 1))} />
                        <Input
                          type="number"
                          value={taxRate}
                          onChange={e => setTaxRate(Number(e.target.value))}
                          className="flex-1 text-center font-semibold tabular-nums"
                        />
                        <IconButton icon={Plus} label="Oranı artır" variant="secondary" onClick={() => setTaxRate(taxRate + 1)} />
                      </div>
                    </Field>
                  </div>
                </Card>

                <Card>
                  <CardHeader title="Notlar ve şartlar" description="Teklifin alt bilgisi" className="px-4 sm:px-5 pt-4 sm:pt-5" />
                  <div className="px-4 sm:px-5 pb-4 sm:pb-5 space-y-4">
                    <Field label="Notlar">
                      <Textarea
                        value={quoteData.notes}
                        onChange={e => setQuoteData({...quoteData, notes: e.target.value})}
                        placeholder="Ek notlar…"
                        rows={3}
                      />
                    </Field>
                    <Field label="Şartlar">
                      <Textarea
                        value={quoteData.terms}
                        onChange={e => setQuoteData({...quoteData, terms: e.target.value})}
                        placeholder="Teklif şartları…"
                        rows={3}
                      />
                    </Field>
                  </div>
                </Card>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <Button size="lg" onClick={() => setCurrentStep('items')} className="w-full sm:w-auto">
                Devam et <ChevronRight size={16} />
              </Button>
            </div>
          </div>
        )}

        {/* STEP 2: ITEMS */}
        {currentStep === 'items' && (
          <div className="print:hidden space-y-6">
            <Card className="overflow-hidden">
              <CardHeader
                title="Teklif kalemleri"
                description={<span className="tabular-nums">{items.length} kalem · Toplam: {grandTotal.toLocaleString('tr-TR')} ₺</span>}
                actions={<Button size="sm" icon={Plus} onClick={addItem}>Kalem ekle</Button>}
                className="px-4 sm:px-5 pt-4 sm:pt-5"
              />

              {/* Desktop table */}
              <div className="hidden md:block overflow-x-auto border-t border-border">
                <table className="p-table min-w-[820px]">
                  <thead>
                    <tr>
                      <th className="w-[104px]">Sıra</th>
                      <th>Ürün / hizmet</th>
                      <th className="w-[88px] !text-center">Adet</th>
                      <th className="w-[112px]">Birim</th>
                      <th className="w-[132px] !text-right">Birim fiyat (₺)</th>
                      <th className="w-[92px] !text-center">İndirim %</th>
                      <th className="w-[124px] !text-right">Toplam</th>
                      <th className="w-[84px]"><span className="sr-only">İşlemler</span></th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, index) => (
                      <tr key={item.id} className="align-top">
                        <td>
                          <div className="flex items-center gap-0.5">
                            <IconButton icon={ArrowUp} label="Yukarı taşı" size="sm" onClick={() => moveItem(index, 'up')} disabled={index === 0} />
                            <IconButton icon={ArrowDown} label="Aşağı taşı" size="sm" onClick={() => moveItem(index, 'down')} disabled={index === items.length - 1} />
                            <span className="ml-1 text-xs font-semibold text-muted-foreground tabular-nums">{index + 1}</span>
                          </div>
                        </td>
                        <td className="space-y-2">
                          <Input
                            placeholder="Ürün / hizmet adı"
                            value={item.name}
                            onChange={e => updateItem(item.id, 'name', e.target.value)}
                          />
                          <Input
                            placeholder="Açıklama (opsiyonel)"
                            value={item.description}
                            onChange={e => updateItem(item.id, 'description', e.target.value)}
                            className="h-9 text-xs"
                          />
                        </td>
                        <td>
                          <Input
                            type="number"
                            aria-label="Adet"
                            value={item.quantity}
                            onChange={e => updateItem(item.id, 'quantity', Number(e.target.value))}
                            className="text-center tabular-nums"
                          />
                        </td>
                        <td>
                          <Select aria-label="Birim" value={item.unit} onChange={e => updateItem(item.id, 'unit', e.target.value)}>
                            {UNIT_OPTIONS.map(u => <option key={u} value={u}>{u}</option>)}
                          </Select>
                        </td>
                        <td>
                          <Input
                            type="number"
                            aria-label="Birim fiyat"
                            value={item.price}
                            onChange={e => updateItem(item.id, 'price', Number(e.target.value))}
                            className="text-right tabular-nums"
                          />
                        </td>
                        <td>
                          <Input
                            type="number"
                            aria-label="İndirim yüzdesi"
                            value={item.discount}
                            onChange={e => updateItem(item.id, 'discount', Number(e.target.value))}
                            className="text-center tabular-nums"
                          />
                        </td>
                        <td className="text-right">
                          <p className="h-10 flex items-center justify-end font-semibold text-foreground tabular-nums whitespace-nowrap">
                            {getItemTotal(item).toLocaleString('tr-TR')} ₺
                          </p>
                        </td>
                        <td>
                          <div className="flex items-center justify-end gap-0.5 pt-1">
                            <IconButton icon={Copy} label="Kalemi çoğalt" size="sm" onClick={() => duplicateItem(item.id)} />
                            <IconButton icon={Trash2} label="Kalemi sil" size="sm" className="hover:!text-destructive" onClick={() => removeItem(item.id)} disabled={items.length <= 1} />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile stacked rows */}
              <div className="md:hidden divide-y divide-border border-t border-border">
                {items.map((item, index) => (
                  <div key={item.id} className="p-4 space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1">
                        <Badge tone="neutral" className="tabular-nums">Kalem {index + 1}</Badge>
                        <IconButton icon={ArrowUp} label="Yukarı taşı" size="sm" onClick={() => moveItem(index, 'up')} disabled={index === 0} />
                        <IconButton icon={ArrowDown} label="Aşağı taşı" size="sm" onClick={() => moveItem(index, 'down')} disabled={index === items.length - 1} />
                      </div>
                      <div className="flex items-center gap-0.5">
                        <IconButton icon={Copy} label="Kalemi çoğalt" size="sm" onClick={() => duplicateItem(item.id)} />
                        <IconButton icon={Trash2} label="Kalemi sil" size="sm" className="hover:!text-destructive" onClick={() => removeItem(item.id)} disabled={items.length <= 1} />
                      </div>
                    </div>

                    <Field label="Ürün / hizmet adı">
                      <Input
                        placeholder="Ürün / hizmet adı"
                        value={item.name}
                        onChange={e => updateItem(item.id, 'name', e.target.value)}
                      />
                    </Field>
                    <Field label="Açıklama">
                      <Input
                        placeholder="Açıklama (opsiyonel)"
                        value={item.description}
                        onChange={e => updateItem(item.id, 'description', e.target.value)}
                      />
                    </Field>

                    <div className="grid grid-cols-3 gap-3">
                      <Field label="Adet">
                        <Input
                          type="number"
                          value={item.quantity}
                          onChange={e => updateItem(item.id, 'quantity', Number(e.target.value))}
                          className="tabular-nums"
                        />
                      </Field>
                      <Field label="Birim">
                        <Select value={item.unit} onChange={e => updateItem(item.id, 'unit', e.target.value)}>
                          {UNIT_OPTIONS.map(u => <option key={u} value={u}>{u}</option>)}
                        </Select>
                      </Field>
                      <Field label="İndirim %">
                        <Input
                          type="number"
                          value={item.discount}
                          onChange={e => updateItem(item.id, 'discount', Number(e.target.value))}
                          className="tabular-nums"
                        />
                      </Field>
                    </div>

                    <Field label="Birim fiyat (₺)">
                      <Input
                        type="number"
                        value={item.price}
                        onChange={e => updateItem(item.id, 'price', Number(e.target.value))}
                        className="tabular-nums"
                      />
                    </Field>

                    <div className="flex items-center justify-between rounded-xl border border-border bg-surface px-4 py-3">
                      <span className="text-sm text-muted-foreground">Satır toplamı</span>
                      <span className="text-lg font-bold text-foreground tabular-nums">{getItemTotal(item).toLocaleString('tr-TR')} ₺</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="border-t border-border p-3 sm:px-5">
                <Button variant="ghost" size="sm" icon={Plus} onClick={addItem} className="w-full sm:w-auto">Kalem ekle</Button>
              </div>
            </Card>

            <div className="flex flex-col-reverse lg:flex-row lg:items-end justify-between gap-6">
              <Button variant="secondary" size="lg" icon={ChevronLeft} onClick={() => setCurrentStep('client')} className="w-full sm:w-auto">
                Geri
              </Button>
              <div className="w-full lg:max-w-sm space-y-3">
                <Card className="p-4 sm:p-5">
                  <TotalsList {...totalsProps} />
                </Card>
                <Button size="lg" onClick={() => setCurrentStep('preview')} className="w-full">
                  Önizle <Eye size={16} />
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: PREVIEW */}
        {currentStep === 'preview' && (
          <div className="print:hidden">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
              <Button variant="secondary" icon={ChevronLeft} onClick={() => setCurrentStep('items')} className="w-full sm:w-auto">
                Düzenle
              </Button>
              <Button variant="secondary" icon={Eye} onClick={() => setShowMobilePreviewSheet(true)} className="w-full md:hidden">
                A4 belgeyi önizle
              </Button>
            </div>

            {/* Mobile summary */}
            <Card className="md:hidden">
              <CardHeader
                title={quoteData.title}
                description={<span className="tabular-nums">No: {quoteData.quoteNo} · {new Date(quoteData.date).toLocaleDateString('tr-TR')}</span>}
                className="px-4 pt-4"
              />
              <div className="px-4 pb-4 space-y-4">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground flex items-center gap-1.5"><User size={13} /> Müşteri</p>
                  <p className="font-semibold text-foreground">{quoteData.clientName || '—'}</p>
                  {quoteData.clientAddress && <p className="text-sm text-muted-foreground">{quoteData.clientAddress}</p>}
                  {(quoteData.clientPhone || quoteData.clientEmail) && (
                    <div className="text-xs text-muted-foreground space-y-0.5 pt-1">
                      {quoteData.clientPhone && <p>Tel: {quoteData.clientPhone}</p>}
                      {quoteData.clientEmail && <p>E-posta: {quoteData.clientEmail}</p>}
                    </div>
                  )}
                </div>

                <div className="h-px bg-border" />

                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground flex items-center gap-1.5"><FileText size={13} /> Kalemler ({items.length})</p>
                  {items.map((item, idx) => (
                    <div key={item.id} className="flex items-center justify-between gap-3 rounded-xl border border-border bg-surface px-3 py-2.5 text-sm">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-foreground truncate">{item.name || `Kalem #${idx+1}`}</p>
                        <p className="text-xs text-muted-foreground truncate tabular-nums">{item.quantity} {item.unit} × {item.price.toLocaleString('tr-TR')} ₺ {item.discount > 0 && `(-%${item.discount})`}</p>
                      </div>
                      <span className="font-semibold text-foreground shrink-0 tabular-nums">{getItemTotal(item).toLocaleString('tr-TR')} ₺</span>
                    </div>
                  ))}
                </div>

                <div className="h-px bg-border" />

                <TotalsList {...totalsProps} />
              </div>
            </Card>

            {/* Desktop A4 preview: paper on a muted desk surface */}
            <div className="hidden md:block rounded-2xl border border-border bg-muted/50 p-6 lg:p-10">
              <div className="mx-auto max-w-[900px]">
                  <div className="bg-white rounded-2xl border border-slate-100 shadow-xl overflow-hidden text-slate-900">
                    <div ref={printRef} id="quote-preview" className="p-8 md:p-12 lg:p-16">
                      {/* Header */}
                      <div className="flex flex-col sm:flex-row justify-between items-start gap-8 pb-8 border-b-2 border-slate-900">
                        <div className="flex items-center gap-4">
                          <div className="w-14 h-14 bg-white border border-slate-100 rounded-xl p-1">
                            <img src="/logo.png" alt="Logo" className="w-full h-full object-contain" />
                          </div>
                          <div>
                            <h2 className="text-lg font-black uppercase tracking-tight">ZIVA <span className="text-red-500">FIRE</span></h2>
                            <p className="text-[8px] uppercase tracking-[0.3em] text-slate-400 font-bold">Teknik Servis & Güvenlik Sistemleri</p>
                          </div>
                        </div>
                        <div className="text-left sm:text-right">
                          <p className="text-xl font-black text-slate-900 uppercase">{quoteData.title}</p>
                          <div className="flex flex-wrap gap-4 mt-1">
                            <span className="text-[10px] font-bold text-slate-500">No: {quoteData.quoteNo}</span>
                            <span className="text-[10px] font-bold text-slate-500">Tarih: {new Date(quoteData.date).toLocaleDateString('tr-TR')}</span>
                          </div>
                        </div>
                      </div>

                      {/* Client Info */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 py-8">
                        <div className="space-y-1">
                          <p className="text-[8px] font-black uppercase tracking-widest text-red-500">Sayın Müşteri</p>
                          <p className="text-base font-black text-slate-900">{quoteData.clientName || '—'}</p>
                          {quoteData.clientAddress && <p className="text-[11px] text-slate-500">{quoteData.clientAddress}</p>}
                          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1">
                            {quoteData.clientPhone && <p className="text-[11px] text-slate-500 flex items-center gap-1"><Phone size={10} /> {quoteData.clientPhone}</p>}
                            {quoteData.clientEmail && <p className="text-[11px] text-slate-500 flex items-center gap-1"><Mail size={10} /> {quoteData.clientEmail}</p>}
                            {quoteData.clientTaxNo && <p className="text-[11px] text-slate-500 flex items-center gap-1"><Hash size={10} /> VN: {quoteData.clientTaxNo}</p>}
                          </div>
                        </div>
                        <div className="text-left sm:text-right space-y-1">
                          <p className="text-[8px] font-black uppercase tracking-widest text-slate-300">Geçerlilik</p>
                          <p className="text-[11px] font-bold text-slate-900">{new Date(quoteData.validUntil).toLocaleDateString('tr-TR')}</p>
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
                                  {item.description && <p className="text-[9px] text-slate-400">{item.description}</p>}
                                </td>
                                <td className="py-2.5 px-3 text-center font-semibold">{item.quantity} {item.unit}</td>
                                <td className="py-2.5 px-3 text-right font-semibold">{item.price.toLocaleString('tr-TR')} ₺</td>
                                {items.some(it => it.discount > 0) && (
                                  <td className="py-2.5 px-3 text-center text-emerald-600 font-semibold text-[10px]">%{item.discount}</td>
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
                        <p className="text-[9px] text-slate-400 font-bold">Ziva Fire Sistemleri • Balaban Mah. Boyalık Cad. No:70/A Arnavutköy / İstanbul • 0850 123 45 67 • info@zivafire.com</p>
                      </div>
                    </div>
                  </div>
              </div>
            </div>

            {/* Mobile A4 preview */}
            <Sheet
              isOpen={showMobilePreviewSheet}
              onClose={() => setShowMobilePreviewSheet(false)}
              title="A4 belge önizlemesi"
              size="xl"
            >
                    <div className="overflow-auto max-h-[70vh] bg-white text-slate-900 p-4 rounded-2xl border border-border scrollbar-none shadow-2xl scale-[0.98] origin-top">
                      <div ref={printRef} id="quote-preview-mobile" className="p-4 md:p-8 text-[10px] sm:text-xs">
                        {/* Header */}
                        <div className="flex justify-between items-start pb-4 border-b-2 border-slate-900 mb-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-white border border-slate-100 rounded-lg p-0.5">
                              <img src="/logo.png" alt="Logo" className="w-full h-full object-contain" />
                            </div>
                            <div>
                              <h2 className="text-xs font-black uppercase">ZIVA <span className="text-red-500">FIRE</span></h2>
                              <p className="text-[7px] uppercase tracking-wider text-slate-400 font-bold">Teknik Servis & Güvenlik</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-black text-slate-900 uppercase">{quoteData.title}</p>
                            <p className="text-[8px] font-bold text-slate-500">No: {quoteData.quoteNo}</p>
                          </div>
                        </div>

                        {/* Client details */}
                        <div className="mb-4 text-[9px] text-slate-700">
                          <p className="text-[7px] font-black uppercase text-red-500">Müşteri Detail</p>
                          <p className="font-bold text-slate-900">{quoteData.clientName || '—'}</p>
                          {quoteData.clientAddress && <p>{quoteData.clientAddress}</p>}
                        </div>

                        {/* Items Table */}
                        <table className="w-full text-[9px] mb-4 border-collapse">
                          <thead>
                            <tr className="bg-slate-900 text-white text-left">
                              <th className="p-1 text-center font-bold">#</th>
                              <th className="p-1 font-bold">Hizmet / Ürün</th>
                              <th className="p-1 text-center font-bold">Adet</th>
                              <th className="p-1 text-right font-bold">Birim</th>
                              <th className="p-1 text-right font-bold">Toplam</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {items.map((item, idx) => (
                              <tr key={item.id}>
                                <td className="p-1 text-center text-slate-300 font-bold">{idx + 1}</td>
                                <td className="p-1">
                                  <p className="font-bold text-slate-900">{item.name || '—'}</p>
                                  {item.description && <p className="text-[8px] text-slate-400">{item.description}</p>}
                                </td>
                                <td className="p-1 text-center">{item.quantity} {item.unit}</td>
                                <td className="p-1 text-right">{item.price.toLocaleString('tr-TR')} ₺</td>
                                <td className="p-1 text-right font-bold text-slate-900">{getItemTotal(item).toLocaleString('tr-TR')} ₺</td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot>
                            <tr className="bg-slate-50 text-[9px] font-bold">
                              <td colSpan={3}></td>
                              <td className="p-1 text-right text-slate-500">Ara Toplam</td>
                              <td className="p-1 text-right">{subtotal.toLocaleString('tr-TR')} ₺</td>
                            </tr>
                            {totalDiscount > 0 && (
                              <tr className="bg-slate-50 text-[9px] font-bold text-emerald-600">
                                <td colSpan={3}></td>
                                <td className="p-1 text-right">İndirim</td>
                                <td className="p-1 text-right">-{totalDiscount.toLocaleString('tr-TR')} ₺</td>
                              </tr>
                            )}
                            <tr className="bg-slate-900 text-white text-[9px] font-black">
                              <td colSpan={3}></td>
                              <td className="p-1.5 text-right uppercase">Genel Toplam</td>
                              <td className="p-1.5 text-right text-red-400">{grandTotal.toLocaleString('tr-TR')} ₺</td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    </div>
            </Sheet>
          </div>
        )}

        {/* PRINT STYLES */}
            <div className="hidden print:block">
              <div id="print-area" className="p-8">
                {/* Header */}
                <div className="flex justify-between items-start pb-8 border-b-2 border-slate-900 mb-8">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-white border border-slate-100 rounded-xl p-1">
                      <img src="/logo.png" alt="Logo" className="w-full h-full object-contain" />
                    </div>
                    <div>
                      <h2 className="text-lg font-black uppercase">ZIVA <span className="text-red-500">FIRE</span></h2>
                      <p className="text-[8px] uppercase tracking-[0.3em] text-slate-400 font-bold">Teknik Servis & Güvenlik Sistemleri</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-black text-slate-900 uppercase">{quoteData.title}</p>
                    <p className="text-[10px] font-bold text-slate-500">No: {quoteData.quoteNo}</p>
                    <p className="text-[10px] font-bold text-slate-500">Tarih: {new Date(quoteData.date).toLocaleDateString('tr-TR')}</p>
                  </div>
                </div>

                {/* Client */}
                <div className="mb-8 space-y-1">
                  <p className="text-[8px] font-black uppercase tracking-widest text-red-500">Sayın Müşteri</p>
                  <p className="text-base font-black">{quoteData.clientName || '—'}</p>
                  {quoteData.clientAddress && <p className="text-[11px] text-slate-500">{quoteData.clientAddress}</p>}
                  <div className="flex flex-wrap gap-x-4 gap-y-1">
                    {quoteData.clientPhone && <p className="text-[11px] text-slate-500">Tel: {quoteData.clientPhone}</p>}
                    {quoteData.clientTaxNo && <p className="text-[11px] text-slate-500">VN: {quoteData.clientTaxNo}</p>}
                  </div>
                </div>

                {/* Table */}
                <table className="w-full text-[11px] mb-8">
                  <thead>
                    <tr className="bg-slate-900 text-white">
                      <th className="py-2 px-4 text-center font-bold text-[8px] uppercase">#</th>
                      <th className="py-2 px-4 text-left font-bold text-[8px] uppercase">Ürün / Hizmet</th>
                      <th className="py-2 px-3 text-center font-bold text-[8px] uppercase">Adet</th>
                      <th className="py-2 px-3 text-right font-bold text-[8px] uppercase">Birim</th>
                      {items.some(i => i.discount > 0) && (
                        <th className="py-2 px-3 text-center font-bold text-[8px] uppercase">İnd.</th>
                      )}
                      <th className="py-2 px-4 text-right font-bold text-[8px] uppercase">Toplam</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {items.map((item, i) => (
                      <tr key={item.id}>
                        <td className="py-2 px-4 text-center font-bold text-slate-300">{i + 1}</td>
                        <td className="py-2 px-4 font-semibold">
                          <p className="font-bold text-slate-900">{item.name || '—'}</p>
                          {item.description && <p className="text-[9px] text-slate-400 mt-0.5">{item.description}</p>}
                        </td>
                        <td className="py-2 px-3 text-center font-semibold">{item.quantity} {item.unit}</td>
                        <td className="py-2 px-3 text-right font-semibold">{item.price.toLocaleString('tr-TR')} ₺</td>
                        {items.some(it => it.discount > 0) && (
                          <td className="py-2 px-3 text-center font-semibold text-emerald-600">%{item.discount}</td>
                        )}
                        <td className="py-2 px-4 text-right font-bold">{getItemTotal(item).toLocaleString('tr-TR')} ₺</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-50">
                      <td colSpan={3}></td>
                      <td className="py-2 px-4 text-right text-[8px] font-bold uppercase tracking-wider text-slate-500">Ara Toplam</td>
                      {items.some(i => i.discount > 0) && <td className="py-2 px-4"></td>}
                      <td className="py-2 px-4 text-right font-bold">{subtotal.toLocaleString('tr-TR')} ₺</td>
                    </tr>
                    {totalDiscount > 0 && (
                      <tr className="bg-slate-50/50">
                        <td colSpan={3}></td>
                        <td className="py-2 px-4 text-right text-[8px] font-bold uppercase tracking-wider text-emerald-600">İndirim</td>
                        {items.some(i => i.discount > 0) && <td className="py-2 px-4"></td>}
                        <td className="py-2 px-4 text-right font-bold text-emerald-600">-{totalDiscount.toLocaleString('tr-TR')} ₺</td>
                      </tr>
                    )}
                    {isTaxIncluded && (
                      <tr className="bg-slate-50">
                        <td colSpan={3}></td>
                        <td className="py-2 px-4 text-right text-[8px] font-bold uppercase tracking-wider text-slate-500">KDV (%{taxRate})</td>
                        {items.some(i => i.discount > 0) && <td className="py-2 px-4"></td>}
                        <td className="py-2 px-4 text-right font-bold">{taxAmount.toLocaleString('tr-TR')} ₺</td>
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

                {/* Print Footer */}
                <div className="mt-8 pt-4 border-t border-slate-200 text-center">
                  <p className="text-[8px] text-slate-500 font-bold uppercase tracking-wider">Ziva Fire Sistemleri • Balaban Mah. Boyalık Cad. No:70/A Arnavutköy / İstanbul • 0850 123 45 67</p>
                </div>
              </div>
            </div>

        <style jsx global>{`
          @media print {
            @page { size: A4; margin: 1cm; }
            html, body, .min-h-screen, main, #print-area, #quote-preview, #quote-preview-mobile { 
              background: white !important; 
              background-color: white !important;
              color: black !important;
              margin: 0 !important; 
              padding: 0 !important;
              -webkit-print-color-adjust: exact;
              color-adjust: exact;
            }
            aside, nav, button, .print\\:hidden { display: none !important; }
            main { 
              margin: 0 !important; 
              padding: 0 !important; 
              width: 100% !important; 
              background: white !important;
              background-color: white !important;
            }
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
      </PanelLayout>
    </RouteGuard>
  );
}
