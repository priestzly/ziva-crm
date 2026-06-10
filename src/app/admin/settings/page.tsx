'use client';

import React, { useState } from 'react';
import { Sidebar, Topbar } from '@/components/DashboardShell';
import RouteGuard from '@/components/RouteGuard';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { 
  Settings, User, Lock, Bell, Shield, Palette,
  Save, LogOut, Loader2, Sparkles, ChevronRight
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/useIsMobile';
import { MobileBottomSheet } from '@/components/MobileBottomSheet';
import { THEMES } from '@/lib/themes';

function SettingsContent() {
  const isMobile = useIsMobile();
  const { profile, signOut } = useAuth();
  const { theme, setTheme } = useTheme();
  const activeThemeConfig = THEMES.find(t => t.id === theme);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'profile' | 'system' | 'appearance'>('profile');

  // Mobile Bottom Sheets visibility
  const [showProfileSheet, setShowProfileSheet] = useState(false);
  const [showSystemSheet, setShowSystemSheet] = useState(false);
  const [showAppearanceSheet, setShowAppearanceSheet] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    setTimeout(() => setSaving(false), 1000);
  };

  const tabs = [
    { id: 'profile', label: 'Profil Ayarları', icon: User },
    { id: 'system', label: 'Sistem Yapılandırması', icon: Settings },
    { id: 'appearance', label: 'Görünüm', icon: Palette },
  ];

  if (isMobile) {
    return (
      <div className="min-h-screen flex bg-amoled text-white pb-28">
        <Sidebar role="admin" />
        <main className="flex-1 w-full overflow-hidden">
          <Topbar title="Ayarlar" subtitle="Profil ve sistem tercihlerinizi düzenleyin" />
          
          <div className="p-4 space-y-6 max-w-lg mx-auto animate-fade-in">
            {/* iOS style Profile Summary Card */}
            <div className="bg-amoled-card border border-white/5 rounded-2xl p-4 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center text-white font-bold shadow-lg shrink-0">
                {profile?.full_name?.substring(0, 1).toUpperCase() || 'A'}
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="text-sm font-black text-white truncate leading-tight">{profile?.full_name || 'Admin'}</h2>
                <p className="text-[11px] text-white/40 truncate">{profile?.email}</p>
              </div>
            </div>

            {/* iOS style settings lists */}
            <div className="space-y-4">
              <div className="space-y-1.5">
                <p className="text-[9px] font-black uppercase tracking-widest text-white/30 px-1">Hesap Ayarları</p>
                <div className="bg-amoled-card border border-white/5 rounded-2xl overflow-hidden divide-y divide-white/5">
                  <button
                    onClick={() => setShowProfileSheet(true)}
                    className="w-full flex items-center justify-between px-4 py-4 hover:bg-white/[0.02] active:bg-white/[0.04] transition-colors text-left cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center">
                        <User size={16} />
                      </div>
                      <span className="text-sm font-bold text-white">Profil Bilgileri</span>
                    </div>
                    <ChevronRight size={16} className="text-white/30" />
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <p className="text-[9px] font-black uppercase tracking-widest text-white/30 px-1">Sistem ve Güvenlik</p>
                <div className="bg-amoled-card border border-white/5 rounded-2xl overflow-hidden divide-y divide-white/5">
                  <button
                    onClick={() => setShowSystemSheet(true)}
                    className="w-full flex items-center justify-between px-4 py-4 hover:bg-white/[0.02] active:bg-white/[0.04] transition-colors text-left cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                        <Settings size={16} />
                      </div>
                      <span className="text-sm font-bold text-white">Sistem Yapılandırması</span>
                    </div>
                    <ChevronRight size={16} className="text-white/30" />
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <p className="text-[9px] font-black uppercase tracking-widest text-white/30 px-1">Görünüm Ayarları</p>
                <div className="bg-amoled-card border border-white/5 rounded-2xl overflow-hidden divide-y divide-white/5">
                  <button
                    onClick={() => setShowAppearanceSheet(true)}
                    className="w-full flex items-center justify-between px-4 py-4 hover:bg-white/[0.02] active:bg-white/[0.04] transition-colors text-left cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center">
                        <Palette size={16} />
                      </div>
                      <span className="text-sm font-bold text-white">Tema ve Tasarım</span>
                    </div>
                    <ChevronRight size={16} className="text-white/30" />
                  </button>
                </div>
              </div>
            </div>

            {/* Logout Row */}
            <button
              onClick={signOut}
              className="w-full bg-red-500/10 border border-red-500/20 text-red-500 rounded-2xl py-4 flex items-center justify-center gap-2 font-bold text-xs uppercase tracking-widest active:scale-98 transition-all cursor-pointer"
            >
              <LogOut size={16} /> Güvenli Çıkış
            </button>
          </div>

          {/* ════ BOTTOM SHEETS FOR MOBILE SETTINGS ════ */}
          <MobileBottomSheet
            isOpen={showProfileSheet}
            onClose={() => setShowProfileSheet(false)}
            title="Profil Bilgileri"
          >
            <div className="space-y-4 text-white pb-6">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-white/40 uppercase tracking-wider ml-1">Ad Soyad</label>
                <input className="w-full h-12 px-4 rounded-xl bg-white/5 border border-white/10 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/50" defaultValue="Ziva Admin" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-white/40 uppercase tracking-wider ml-1">E-posta (Salt Okunur)</label>
                <input className="w-full h-12 px-4 rounded-xl bg-white/5 border border-white/10 text-sm opacity-55" readOnly defaultValue={profile?.email || ''} />
              </div>
              <div className="space-y-1 pt-2">
                <label className="text-[10px] font-bold text-white/40 uppercase tracking-wider ml-1">Şifreyi Güncelle</label>
                <div className="relative">
                  <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" />
                  <input type="password" placeholder="••••••••" className="w-full h-12 pl-11 pr-4 rounded-xl bg-white/5 border border-white/10 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/50" />
                </div>
              </div>

              <div className="pt-4">
                <button
                  onClick={async () => {
                    setSaving(true);
                    setTimeout(() => {
                      setSaving(false);
                      setShowProfileSheet(false);
                    }, 800);
                  }}
                  className="w-full h-12 bg-red-500 text-white rounded-xl font-bold uppercase text-xs tracking-widest flex items-center justify-center gap-2 active:scale-95 transition-all cursor-pointer"
                >
                  {saving ? <Loader2 size={16} className="animate-spin" /> : <><Save size={16} /> Değişiklikleri Kaydet</>}
                </button>
              </div>
            </div>
          </MobileBottomSheet>

          <MobileBottomSheet
            isOpen={showSystemSheet}
            onClose={() => setShowSystemSheet(false)}
            title="Sistem Tercihleri"
          >
            <div className="space-y-4 text-white pb-6">
              <div className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10">
                <div>
                  <p className="text-sm font-semibold">Gerçek Zamanlı Bildirimler</p>
                  <p className="text-xs text-white/40">Anlık bildirim al.</p>
                </div>
                <div className="w-12 h-6 bg-red-500/20 border border-red-500/25 rounded-full relative cursor-pointer p-1">
                  <div className="w-4 h-4 bg-red-500 rounded-full ml-auto shadow-lg" />
                </div>
              </div>
              
              <div className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10">
                <div>
                  <p className="text-sm font-semibold">Fotoğraf Arşivleme</p>
                  <p className="text-xs text-white/40">Buluta otomatik yedekle.</p>
                </div>
                <div className="w-12 h-6 bg-red-500/20 border border-red-500/25 rounded-full relative cursor-pointer p-1">
                  <div className="w-4 h-4 bg-red-500 rounded-full ml-auto shadow-lg" />
                </div>
              </div>

              <div className="pt-4">
                <button
                  onClick={async () => {
                    setSaving(true);
                    setTimeout(() => {
                      setSaving(false);
                      setShowSystemSheet(false);
                    }, 800);
                  }}
                  className="w-full h-12 bg-red-500 text-white rounded-xl font-bold uppercase text-xs tracking-widest flex items-center justify-center gap-2 active:scale-95 transition-all cursor-pointer"
                >
                  {saving ? <Loader2 size={16} className="animate-spin" /> : <><Save size={16} /> Değişiklikleri Kaydet</>}
                </button>
              </div>
            </div>
          </MobileBottomSheet>

          <MobileBottomSheet
            isOpen={showAppearanceSheet}
            onClose={() => setShowAppearanceSheet(false)}
            title="Tema ve Görünüm"
          >
            <div className="space-y-4 text-white pb-6">
              <div className="grid grid-cols-2 gap-4">
                {THEMES.map((t) => {
                  const isActive = theme === t.id;
                  let cardBg = '';
                  let cardBorder = '';
                  let textClass = '';

                  if (t.id === 'dark') {
                    cardBg = 'bg-neutral-950';
                    cardBorder = isActive ? 'border-red-500 shadow-lg shadow-red-500/10' : 'border-white/5 opacity-60';
                    textClass = 'text-red-400';
                  } else if (t.id === 'light') {
                    cardBg = 'bg-white';
                    cardBorder = isActive ? 'border-red-500 shadow-lg shadow-red-500/10 text-red-500' : 'border-black/5 opacity-60';
                    textClass = 'text-slate-900';
                  } else if (t.id === 'fluent') {
                    cardBg = 'bg-slate-100';
                    cardBorder = isActive ? 'border-blue-500 shadow-lg shadow-blue-500/10 text-blue-600' : 'border-slate-300/50 opacity-60';
                    textClass = 'text-slate-800';
                  } else if (t.id === 'cyberpunk') {
                    cardBg = 'bg-[#0c0714]';
                    cardBorder = isActive ? 'border-pink-500 shadow-lg shadow-pink-500/20 text-pink-500' : 'border-purple-900/40 opacity-60';
                    textClass = 'text-[#00f0ff]';
                  }

                  return (
                    <div 
                      key={t.id}
                      onClick={() => setTheme(t.id)}
                      className={cn(
                        "p-4 rounded-xl border-2 flex flex-col items-center gap-2 cursor-pointer transition-all",
                        cardBg,
                        cardBorder
                      )}
                    >
                      <div className={cn(
                        "w-full h-8 rounded-lg",
                        t.id === 'dark' && 'bg-neutral-900',
                        t.id === 'light' && 'bg-slate-100 border',
                        t.id === 'fluent' && 'bg-blue-500/10 border border-blue-500/20',
                        t.id === 'cyberpunk' && 'bg-pink-500/10 border border-pink-500/30'
                      )} />
                      <span className={cn("text-[10px] font-bold uppercase tracking-widest", textClass)}>{t.name}</span>
                    </div>
                  );
                })}
              </div>

              <div className="pt-4">
                <button
                  onClick={() => setShowAppearanceSheet(false)}
                  className="w-full h-12 bg-red-500 text-white rounded-xl font-bold uppercase text-xs tracking-widest flex items-center justify-center gap-2 active:scale-95 transition-all cursor-pointer"
                >
                  Değişiklikleri Kaydet
                </button>
              </div>
            </div>
          </MobileBottomSheet>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex">
      <Sidebar role="admin" />
      <main className="flex-1 lg:ml-72 pb-24 lg:pb-0 transition-all duration-500">
        <Topbar title="Ayarlar" subtitle="Sistem ve profil tercihlerinizi düzenleyin" />

        <div className="p-6 lg:p-8 space-y-6 max-w-[1000px] mx-auto">
          {/* Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 py-8 relative overflow-hidden glass rounded-3xl px-8">
            <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-red-500/[0.04] to-transparent rounded-bl-full pointer-events-none" />
            <div className="flex gap-4 items-center">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center text-white shadow-xl shadow-red-500/20">
                <User size={32} />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight">{profile?.full_name || 'Admin'}</h1>
                <p className="text-sm text-muted-foreground">{profile?.email}</p>
              </div>
            </div>
            <button onClick={signOut} className="glass px-6 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 text-red-400 hover:bg-white/[0.05] transition-colors border border-red-500/10 active:scale-95 cursor-pointer">
              <LogOut size={16} /> Güvenli Çıkış
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Sidebar Tabs */}
            <div className="lg:col-span-3 space-y-1">
              {tabs.map(t => {
                const Icon = t.icon;
                return (
                  <button 
                    key={t.id}
                    onClick={() => setActiveTab(t.id as any)}
                    className={cn(
                      "w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl text-sm font-semibold transition-all duration-300 cursor-pointer",
                      activeTab === t.id 
                        ? "bg-gradient-to-r from-red-500 to-orange-500 text-white shadow-lg shadow-red-500/20" 
                        : "text-muted-foreground hover:bg-white/[0.04] hover:text-foreground"
                    )}
                  >
                    <Icon size={18} /> {t.label}
                  </button>
                );
              })}
            </div>

            {/* Form Content */}
            <div className="lg:col-span-9 glass rounded-3xl p-8 animate-fade-in">
              {activeTab === 'profile' && (
                <div className="space-y-6">
                  <h3 className="text-lg font-bold flex items-center gap-2"><Sparkles size={18} className="text-red-400" /> Kişisel Bilgiler</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Ad Soyad</label>
                      <input className="w-full input-premium py-3" defaultValue="Ziva Admin" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">E-posta (Salt Okunur)</label>
                      <input className="w-full input-premium py-3 opacity-50" readOnly defaultValue={profile?.email || ''} />
                    </div>
                  </div>
                  <div className="space-y-2 pt-4">
                    <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Şifreyi Güncelle</label>
                    <div className="relative">
                      <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
                      <input type="password" placeholder="••••••••" className="w-full input-premium pl-11 py-3" />
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'system' && (
                <div className="space-y-6">
                  <h3 className="text-lg font-bold flex items-center gap-2"><Shield size={18} className="text-red-400" /> Sistem Tercihleri</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 rounded-2xl bg-white/[0.02] border border-white/[0.04]">
                      <div>
                        <p className="text-sm font-semibold">Gerçek Zamanlı Bildirimler</p>
                        <p className="text-xs text-muted-foreground">Her yeni kayıt girildiğinde anlık bildirim al.</p>
                      </div>
                      <div className="w-12 h-6 bg-red-500/20 border border-red-500/20 rounded-full relative cursor-pointer p-1">
                        <div className="w-4 h-4 bg-red-500 rounded-full ml-auto shadow-lg" />
                      </div>
                    </div>
                    <div className="flex items-center justify-between p-4 rounded-2xl bg-white/[0.02] border border-white/[0.04]">
                      <div>
                        <p className="text-sm font-semibold">Fotoğraf Arşivleme</p>
                        <p className="text-xs text-muted-foreground">Servis fotoğraflarını otomatik buluta yedekle.</p>
                      </div>
                      <div className="w-12 h-6 bg-red-500/20 border border-red-500/20 rounded-full relative cursor-pointer p-1">
                        <div className="w-4 h-4 bg-red-500 rounded-full ml-auto shadow-lg" />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'appearance' && (
                <div className="space-y-6">
                  <h3 className="text-lg font-bold flex items-center gap-2"><Palette size={18} className="text-red-400" /> Tema Tercihleri</h3>
                  <div className="grid grid-cols-2 gap-4">
                    {THEMES.map((t) => {
                      const isActive = theme === t.id;
                      let cardBg = '';
                      let cardBorder = '';
                      let textClass = '';

                      if (t.id === 'dark') {
                        cardBg = 'bg-neutral-950';
                        cardBorder = isActive ? 'border-red-500 shadow-lg shadow-red-500/10' : 'border-white/5 opacity-60 hover:opacity-100';
                        textClass = 'text-red-400';
                      } else if (t.id === 'light') {
                        cardBg = 'bg-white';
                        cardBorder = isActive ? 'border-red-500 shadow-lg shadow-red-500/10 text-red-500' : 'border-black/5 text-slate-400 opacity-60 hover:opacity-100';
                        textClass = 'text-slate-700';
                      } else if (t.id === 'fluent') {
                        cardBg = 'bg-slate-100';
                        cardBorder = isActive ? 'border-blue-500 shadow-lg shadow-blue-500/10 text-blue-600' : 'border-slate-300/50 text-slate-400 opacity-60 hover:opacity-100';
                        textClass = 'text-blue-600';
                      } else if (t.id === 'cyberpunk') {
                        cardBg = 'bg-[#0c0714]';
                        cardBorder = isActive ? 'border-pink-500 shadow-lg shadow-pink-500/20 text-pink-500' : 'border-purple-900/40 text-purple-400 opacity-60 hover:opacity-100';
                        textClass = 'text-pink-500';
                      }

                      return (
                        <div 
                          key={t.id}
                          onClick={() => setTheme(t.id)}
                          className={cn(
                            "p-4 rounded-2xl border-2 flex flex-col items-center gap-2 cursor-pointer transition-all",
                            cardBg,
                            cardBorder
                          )}
                        >
                          <div className={cn(
                            "w-full h-8 rounded-lg",
                            t.id === 'dark' && 'bg-neutral-900',
                            t.id === 'light' && 'bg-slate-100 border',
                            t.id === 'fluent' && 'bg-blue-500/10 border border-blue-500/20',
                            t.id === 'cyberpunk' && 'bg-pink-500/10 border border-pink-500/30'
                          )} />
                          <div className="w-full h-4 flex gap-1">
                            <div className={cn(
                              "w-full h-full rounded",
                              t.id === 'dark' && 'bg-red-500/20',
                              t.id === 'light' && 'bg-slate-200',
                              t.id === 'fluent' && 'bg-blue-500/20',
                              t.id === 'cyberpunk' && 'bg-pink-500/20'
                            )} />
                            <div className={cn(
                              "w-full h-full rounded",
                              t.id === 'dark' && 'bg-red-500/20',
                              t.id === 'light' && 'bg-slate-200',
                              t.id === 'fluent' && 'bg-blue-500/20',
                              t.id === 'cyberpunk' && 'bg-pink-500/20'
                            )} />
                          </div>
                          <span className={cn("text-[10px] font-bold uppercase tracking-widest", textClass)}>{t.name}</span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Theme Info & Live Preview Panel */}
                  <div className={cn(
                    "mt-8 p-6 border rounded-2xl space-y-6 transition-all",
                    theme === 'dark' && 'bg-white/[0.01] border-white/[0.04]',
                    theme === 'light' && 'bg-slate-50 border-slate-200 text-slate-800',
                    theme === 'fluent' && 'bg-slate-50/50 border-slate-200/60 text-slate-800',
                    theme === 'cyberpunk' && 'bg-pink-500/[0.01] border-pink-500/20 text-[#00f0ff]'
                  )}>
                    <div>
                      <h4 className="text-sm font-bold uppercase tracking-wider mb-1">Aktif Tema Teknik Detayları</h4>
                      <p className="text-xs text-muted-foreground">Sisteminizin görünüm parametreleri şu anda dinamik olarak aşağıdaki gibi ayarlanmıştır:</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Technical Specs List */}
                      <div className="space-y-4 text-xs font-medium">
                        <div className="flex justify-between items-center py-2 border-b border-white/[0.04] border-slate-200/60">
                          <span className="text-muted-foreground">Tema Adı:</span>
                          <span className="font-bold">{activeThemeConfig?.name}</span>
                        </div>
                        <div className="flex justify-between items-center py-2 border-b border-white/[0.04] border-slate-200/60">
                          <span className="text-muted-foreground">Yazı Tipi (Font-Family):</span>
                          <span className="font-mono text-[10px] max-w-[200px] truncate" title={activeThemeConfig?.fontFamily}>
                            {activeThemeConfig?.fontFamily}
                          </span>
                        </div>
                        <div className="flex justify-between items-center py-2 border-b border-white/[0.04] border-slate-200/60">
                          <span className="text-muted-foreground">Vurgu Rengi (Accent):</span>
                          <div className="flex items-center gap-2">
                            <span 
                              className="w-3.5 h-3.5 rounded-full inline-block border" 
                              style={{ backgroundColor: activeThemeConfig?.accentColor, borderColor: 'rgba(255,255,255,0.2)' }} 
                            />
                            <span className="font-mono font-bold uppercase">{activeThemeConfig?.accentColor}</span>
                          </div>
                        </div>
                        <div className="flex justify-between items-center py-2 border-b border-white/[0.04] border-slate-200/60">
                          <span className="text-muted-foreground">Köşe Yerleşimi (Radius):</span>
                          <span>
                            {theme === 'fluent' && 'Fluent Yuvarlak (6px)'}
                            {theme === 'cyberpunk' && 'Kesik Çapraz (Sharp clip-path)'}
                            {theme === 'dark' && 'OLED Akıcı Yuvarlak (12px)'}
                            {theme === 'light' && 'Standart Oval (12px)'}
                          </span>
                        </div>
                      </div>

                      {/* Interactive Visual Preview Box */}
                      <div className="flex flex-col justify-center">
                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2">Canlı Arayüz Element Testi</p>
                        
                        {/* Live rendering box that transforms automatically */}
                        <div className="glass p-5 flex flex-col gap-4 text-foreground bg-card border-border">
                          <div className="space-y-1">
                            <h5 className="font-bold text-sm">Ziva Yangın Servis AVM</h5>
                            <p className="text-xs text-muted-foreground">Bu kutu temanıza göre şekil, yazı tipi ve kenarlık değiştirir.</p>
                          </div>
                          <div className="flex gap-2">
                            <button className="btn-primary px-4 py-2 text-xs cursor-pointer">
                              Test Butonu
                            </button>
                            <button className="btn-outline px-4 py-2 text-xs cursor-pointer">
                              İkincil Eylem
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="mt-12 pt-6 border-t border-white/[0.04] flex justify-end">
                <button 
                  onClick={handleSave}
                  className="btn-primary h-12 px-8 rounded-2xl flex items-center justify-center gap-2 font-bold cursor-pointer"
                >
                  {saving ? <Loader2 size={16} className="animate-spin" /> : <><Save size={16} /> Değişiklikleri Kaydet</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function AdminSettingsPage() {
  return (
    <RouteGuard requiredRole="admin">
      <SettingsContent />
    </RouteGuard>
  );
}
