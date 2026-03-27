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

function SettingsContent() {
  const { profile, signOut } = useAuth();
  const { theme, setTheme } = useTheme();
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'profile' | 'system' | 'appearance'>('profile');

  const handleSave = async () => {
    setSaving(true);
    setTimeout(() => setSaving(false), 1000);
  };

  const tabs = [
    { id: 'profile', label: 'Profil Ayarları', icon: User },
    { id: 'system', label: 'Sistem Yapılandırması', icon: Settings },
    { id: 'appearance', label: 'Görünüm', icon: Palette },
  ];

  return (
    <div className="min-h-screen flex">
      <Sidebar role="admin" />
      <main className="flex-1 lg:ml-72 transition-all duration-500">
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
            <button onClick={signOut} className="glass px-6 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 text-red-400 hover:bg-white/[0.05] transition-colors border border-red-500/10 active:scale-95">
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
                      "w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl text-sm font-semibold transition-all duration-300",
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
                    <div 
                      onClick={() => setTheme('dark')}
                      className={cn(
                        "p-4 rounded-2xl border-2 bg-neutral-950 flex flex-col items-center gap-2 cursor-pointer transition-all",
                        theme === 'dark' ? "border-red-500 shadow-lg shadow-red-500/10" : "border-white/5 opacity-60 hover:opacity-100"
                      )}
                    >
                      <div className="w-full h-8 bg-neutral-900 rounded-lg" />
                      <div className="w-full h-4 flex gap-1">
                        <div className="w-full h-full bg-red-500/20 rounded" />
                        <div className="w-full h-full bg-red-500/20 rounded" />
                      </div>
                      <span className="text-[10px] font-bold uppercase tracking-widest text-red-400">Premium Dark</span>
                    </div>
                    
                    <div 
                      onClick={() => setTheme('light')}
                      className={cn(
                        "p-4 rounded-2xl border-2 bg-white flex flex-col items-center gap-2 cursor-pointer transition-all",
                        theme === 'light' ? "border-red-500 shadow-lg shadow-red-500/10 text-red-500" : "border-black/5 text-slate-400 opacity-60 hover:opacity-100"
                      )}
                    >
                      <div className="w-full h-8 bg-slate-100 rounded-lg border" />
                      <div className="w-full h-4 flex gap-1">
                        <div className="w-full h-full bg-slate-200 rounded" />
                        <div className="w-full h-full bg-slate-200 rounded" />
                      </div>
                      <span className="text-[10px] font-bold uppercase tracking-widest">Minimal Light</span>
                    </div>
                  </div>
                </div>
              )}

              <div className="mt-12 pt-6 border-t border-white/[0.04] flex justify-end">
                <button 
                  onClick={handleSave}
                  className="btn-primary h-12 px-8 rounded-2xl flex items-center justify-center gap-2 font-bold"
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
