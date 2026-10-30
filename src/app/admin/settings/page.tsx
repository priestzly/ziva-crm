'use client';

import React, { useState } from 'react';
import { PanelLayout } from '@/components/DashboardShell';
import { Button, Card, CardHeader, PageHeader, Field, Input } from '@/components/ui';
import RouteGuard from '@/components/RouteGuard';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { Save, LogOut, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { THEMES, Theme } from '@/lib/themes';

function SettingsContent() {
  const { profile, signOut } = useAuth();
  const { theme, setTheme } = useTheme();
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    setTimeout(() => setSaving(false), 1000);
  };

  const displayName = profile?.full_name || 'Admin';
  const initials = displayName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(w => w.charAt(0).toLocaleUpperCase('tr-TR'))
    .join('') || 'A';

  return (
    <PanelLayout role="admin" title="Ayarlar" subtitle="Profil ve sistem tercihleri" width="narrow">
      <PageHeader
        title="Ayarlar"
        description="Profilinizi, sistem tercihlerinizi ve panel görünümünü düzenleyin."
      />

      <div className="space-y-6">
        {/* Profile summary */}
        <Card className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex items-center gap-4 min-w-0 flex-1">
            <span className="w-12 h-12 rounded-full bg-primary/10 border border-primary/20 text-primary text-base font-semibold flex items-center justify-center shrink-0">
              {initials}
            </span>
            <div className="min-w-0">
              <p className="text-[15px] font-semibold text-foreground truncate">{displayName}</p>
              <p className="text-sm text-muted-foreground truncate">{profile?.email}</p>
            </div>
          </div>
          <Button variant="danger" icon={LogOut} onClick={signOut} className="w-full sm:w-auto">Çıkış yap</Button>
        </Card>

        {/* Profile details */}
        <Card>
          <CardHeader title="Profil bilgileri" description="Adınız ve giriş bilgileriniz." />
          <div className="px-4 sm:px-5 pb-5 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <Field label="Ad soyad" htmlFor="settings-name">
                <Input id="settings-name" defaultValue={profile?.full_name || 'Ziva Admin'} />
              </Field>
              <Field label="E-posta" htmlFor="settings-email" hint="E-posta adresi değiştirilemez.">
                <Input id="settings-email" readOnly defaultValue={profile?.email || ''} className="text-muted-foreground" />
              </Field>
            </div>
            <Field label="Yeni şifre" htmlFor="settings-password" hint="Boş bırakılırsa mevcut şifre değişmez.">
              <Input id="settings-password" type="password" placeholder="••••••••" autoComplete="new-password" />
            </Field>
          </div>
        </Card>

        {/* System preferences */}
        <Card>
          <CardHeader title="Sistem tercihleri" description="Bildirim ve yedekleme ayarları." />
          <div className="px-4 sm:px-5 pb-2">
            <div className="divide-y divide-border border-t border-border">
              <SwitchRow
                id="pref-realtime"
                label="Gerçek zamanlı bildirimler"
                description="Her yeni kayıt girildiğinde anlık bildirim al."
              />
              <SwitchRow
                id="pref-photo-archive"
                label="Fotoğraf arşivleme"
                description="Servis fotoğraflarını otomatik olarak buluta yedekle."
              />
            </div>
          </div>
        </Card>

        {/* Appearance */}
        <Card>
          <CardHeader title="Görünüm" description="Panel temasını seçin. Değişiklik hemen uygulanır." />
          <div className="px-4 sm:px-5 pb-5">
            <ThemePicker theme={theme} setTheme={setTheme} />
          </div>
        </Card>

        <div className="flex justify-end">
          <Button icon={Save} loading={saving} onClick={handleSave} className="w-full sm:w-auto">Değişiklikleri kaydet</Button>
        </div>
      </div>
    </PanelLayout>
  );
}

function Switch({ id, checked, onChange, labelledBy, describedBy }: {
  id?: string; checked: boolean; onChange: (v: boolean) => void; labelledBy?: string; describedBy?: string;
}) {
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      aria-labelledby={labelledBy}
      aria-describedby={describedBy}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition-colors cursor-pointer',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        checked ? 'bg-primary border-primary' : 'bg-muted border-border-strong'
      )}
    >
      <span
        className={cn(
          'inline-block h-[18px] w-[18px] rounded-full shadow-sm transition-transform',
          checked ? 'translate-x-[22px] bg-primary-foreground' : 'translate-x-[2px] bg-muted-foreground'
        )}
      />
    </button>
  );
}

function SwitchRow({ id, label, description, defaultChecked = true }: { id: string; label: string; description: string; defaultChecked?: boolean }) {
  const [on, setOn] = useState(defaultChecked);
  return (
    <div className="flex items-center justify-between gap-4 py-4">
      <div className="min-w-0">
        <p id={`${id}-label`} className="text-sm font-medium text-foreground">{label}</p>
        <p id={`${id}-desc`} className="mt-0.5 text-xs text-muted-foreground">{description}</p>
      </div>
      <Switch id={id} checked={on} onChange={setOn} labelledBy={`${id}-label`} describedBy={`${id}-desc`} />
    </div>
  );
}

/* Preview swatches use fixed colors on purpose: each card depicts its own theme. */
const THEME_PREVIEW: Record<Theme, { frame: string; side: string; line: string }> = {
  dark: { frame: 'bg-[#17110f] border-[#2a2220]', side: 'bg-[#221a17]', line: 'bg-[#3a2f2b]' },
  light: { frame: 'bg-[#f4f4f5] border-[#e4e4e7]', side: 'bg-[#ffffff]', line: 'bg-[#e4e4e7]' },
};

function ThemePicker({ theme, setTheme }: { theme: Theme; setTheme: (t: Theme) => void }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4" role="radiogroup" aria-label="Tema">
      {THEMES.map((t) => {
        const isActive = theme === t.id;
        const Icon = t.icon;
        const pv = THEME_PREVIEW[t.id];
        return (
          <button
            key={t.id}
            type="button"
            role="radio"
            aria-checked={isActive}
            onClick={() => setTheme(t.id)}
            className={cn(
              'p-3 rounded-xl border bg-surface text-left cursor-pointer transition-colors',
              isActive ? 'border-primary ring-2 ring-primary/20' : 'border-border hover:border-border-strong'
            )}
          >
            <div className={cn('w-full h-20 rounded-lg border p-2 flex gap-2', pv.frame)}>
              <div className={cn('w-1/4 rounded', pv.side)} />
              <div className="flex-1 flex flex-col gap-1.5 pt-0.5">
                <div className="h-2 w-2/3 rounded bg-primary/80" />
                <div className={cn('h-2 w-full rounded', pv.line)} />
                <div className={cn('h-2 w-1/2 rounded', pv.line)} />
              </div>
            </div>
            <div className="mt-3 flex items-center gap-2">
              <Icon size={16} className={isActive ? 'text-primary' : 'text-muted-foreground'} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground">{t.name}</p>
                <p className="text-xs text-muted-foreground truncate">{t.description}</p>
              </div>
              {isActive && (
                <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0">
                  <Check size={12} />
                </span>
              )}
            </div>
          </button>
        );
      })}
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
