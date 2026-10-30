'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard, Building2, ClipboardList, Settings, LogOut, Flame,
  Users, Store, Search, Sun, Moon, ArrowLeft, FileText, MoreHorizontal, type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { Sheet } from '@/components/ui/Sheet';
import { CommandPalette, openCommandPalette } from './CommandPalette';

export type PanelRole = 'admin' | 'client';

export interface NavItem { name: string; href: string; icon: LucideIcon }

export const NAV: Record<PanelRole, { title?: string; items: NavItem[] }[]> = {
  admin: [
    { items: [{ name: 'Özet', href: '/admin/dashboard', icon: LayoutDashboard }] },
    {
      title: 'Kayıtlar',
      items: [
        { name: 'AVM’ler', href: '/admin/malls', icon: Building2 },
        { name: 'İşletmeler', href: '/admin/businesses', icon: Store },
        { name: 'Servis arşivi', href: '/admin/history', icon: ClipboardList },
      ],
    },
    {
      title: 'Yönetim',
      items: [
        { name: 'Teklifler', href: '/admin/quotes', icon: FileText },
        { name: 'Kullanıcılar', href: '/admin/users', icon: Users },
        { name: 'Ayarlar', href: '/admin/settings', icon: Settings },
      ],
    },
  ],
  client: [
    {
      items: [
        { name: 'Özet', href: '/client/dashboard', icon: LayoutDashboard },
        { name: 'İşletmelerim', href: '/client/businesses', icon: Store },
        { name: 'Servis arşivi', href: '/client/history', icon: ClipboardList },
      ],
    },
  ],
};

// Mobil alt menüde doğrudan görünen sekmeler; kalanlar "Daha fazla" altında
const MOBILE_TABS: Record<PanelRole, string[]> = {
  admin: ['/admin/dashboard', '/admin/malls', '/admin/businesses', '/admin/history'],
  client: ['/client/dashboard', '/client/businesses', '/client/history'],
};

const allItems = (role: PanelRole) => NAV[role].flatMap(g => g.items);

function isActivePath(pathname: string | null, href: string) {
  if (!pathname) return false;
  if (href.endsWith('/dashboard')) return pathname === href;
  return pathname === href || pathname.startsWith(href + '/');
}

function initials(name?: string | null) {
  if (!name) return 'Z';
  return name.split(/[\s@._-]+/).filter(Boolean).slice(0, 2).map(p => p[0]!.toLocaleUpperCase('tr')).join('');
}

function BrandMark({ size = 'md' }: { size?: 'sm' | 'md' }) {
  const box = size === 'sm' ? 'w-8 h-8 rounded-lg' : 'w-9 h-9 rounded-[10px]';
  return (
    <span className={cn(box, 'flex items-center justify-center bg-gradient-to-br from-[#e8361c] to-[#ff6a2b] shadow-md shadow-[#e8361c]/25 shrink-0')}>
      <Flame size={size === 'sm' ? 15 : 17} className="text-white" fill="currentColor" />
    </span>
  );
}

function UserAvatar({ name, className }: { name?: string | null; className?: string }) {
  return (
    <span className={cn('w-9 h-9 rounded-full bg-primary/12 text-primary border border-primary/20 flex items-center justify-center text-xs font-bold shrink-0', className)}>
      {initials(name)}
    </span>
  );
}

function ThemeToggle({ className }: { className?: string }) {
  const { theme, toggleTheme } = useTheme();
  const Icon = theme === 'dark' ? Sun : Moon;
  const label = theme === 'dark' ? 'Açık temaya geç' : 'Koyu temaya geç';
  return (
    <button type="button" onClick={toggleTheme} aria-label={label} title={label} className={cn('p-btn p-btn-ghost p-btn-icon', className)}>
      <Icon size={17} />
    </button>
  );
}

/* ═══ Sidebar (desktop) + bottom tab bar (mobile) ═══ */
export function Sidebar({ role }: { role: PanelRole }) {
  const pathname = usePathname();
  const { signOut, profile } = useAuth();
  const [moreOpen, setMoreOpen] = React.useState(false);

  const displayName = profile?.full_name || profile?.email?.split('@')[0] || 'Kullanıcı';
  const roleLabel = role === 'admin' ? 'Yönetici' : 'Müşteri';
  const tabs = allItems(role).filter(i => MOBILE_TABS[role].includes(i.href));
  const moreItems = allItems(role).filter(i => !MOBILE_TABS[role].includes(i.href));
  const moreActive = moreItems.some(i => isActivePath(pathname, i.href));

  return (
    <>
      <CommandPalette role={role} />

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex print:!hidden fixed inset-y-0 left-0 z-40 w-64 flex-col bg-sidebar border-r border-border">
        <Link href={role === 'admin' ? '/admin/dashboard' : '/client/dashboard'} className="flex items-center gap-3 h-16 px-5 border-b border-border">
          <BrandMark />
          <span className="leading-tight">
            <span className="block text-sm font-bold tracking-tight text-foreground">Ziva Yangın</span>
            <span className="block text-xs text-muted-foreground">{role === 'admin' ? 'Yönetim paneli' : 'Müşteri portalı'}</span>
          </span>
        </Link>

        <nav className="flex-1 overflow-y-auto px-3 py-5 space-y-6" aria-label="Panel menüsü">
          {NAV[role].map((group, gi) => (
            <div key={gi}>
              {group.title && <p className="px-3 mb-2 text-xs font-medium text-muted-foreground/80">{group.title}</p>}
              <div className="space-y-0.5">
                {group.items.map(item => {
                  const Icon = item.icon;
                  const active = isActivePath(pathname, item.href);
                  return (
                    <Link key={item.href} href={item.href} className={cn('p-nav-link', active && 'active')} aria-current={active ? 'page' : undefined}>
                      <Icon size={18} className="shrink-0" />
                      {item.name}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="p-3 border-t border-border">
          <div className="flex items-center gap-3 p-2 rounded-xl">
            <UserAvatar name={displayName} />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-foreground truncate">{displayName}</p>
              <p className="text-xs text-muted-foreground">{roleLabel}</p>
            </div>
            <button type="button" onClick={() => signOut()} aria-label="Çıkış yap" title="Çıkış yap" className="p-btn p-btn-ghost p-btn-icon p-btn-sm hover:!text-destructive">
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile bottom tab bar */}
      <nav
        className="lg:hidden fixed inset-x-0 bottom-0 z-40 bg-card/95 backdrop-blur-xl border-t border-border pb-[env(safe-area-inset-bottom)] print:hidden"
        aria-label="Panel menüsü"
      >
        <div className="flex">
          {tabs.map(item => {
            const Icon = item.icon;
            const active = isActivePath(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn('flex-1 flex flex-col items-center gap-1 pt-2.5 pb-2 text-[11px] font-medium transition-colors', active ? 'text-primary' : 'text-muted-foreground')}
                aria-current={active ? 'page' : undefined}
              >
                <Icon size={21} strokeWidth={active ? 2.25 : 1.75} />
                {item.name}
              </Link>
            );
          })}
          <button
            type="button"
            onClick={() => setMoreOpen(true)}
            className={cn('flex-1 flex flex-col items-center gap-1 pt-2.5 pb-2 text-[11px] font-medium', moreActive ? 'text-primary' : 'text-muted-foreground')}
          >
            <MoreHorizontal size={21} />
            Daha fazla
          </button>
        </div>
      </nav>

      <Sheet isOpen={moreOpen} onClose={() => setMoreOpen(false)} title="Menü">
        <div className="space-y-5">
          <div className="flex items-center gap-3">
            <UserAvatar name={displayName} className="w-11 h-11 text-sm" />
            <div className="min-w-0">
              <p className="font-semibold text-foreground truncate">{displayName}</p>
              <p className="text-sm text-muted-foreground">{roleLabel}</p>
            </div>
          </div>
          {moreItems.length > 0 && (
            <div className="p-card overflow-hidden divide-y divide-border">
              {moreItems.map(item => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMoreOpen(false)}
                    className={cn('flex items-center gap-3 px-4 h-12 text-sm font-medium', isActivePath(pathname, item.href) ? 'text-primary' : 'text-foreground')}
                  >
                    <Icon size={18} className="text-muted-foreground" />
                    {item.name}
                  </Link>
                );
              })}
            </div>
          )}
          <button
            type="button"
            onClick={() => { setMoreOpen(false); signOut(); }}
            className="p-btn p-btn-danger p-btn-lg w-full"
          >
            <LogOut size={17} /> Çıkış yap
          </button>
        </div>
      </Sheet>
    </>
  );
}

/* ═══ Top bar ═══ */
export function Topbar({ title, subtitle }: { title: string; subtitle?: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const role: PanelRole = pathname?.startsWith('/client') ? 'client' : 'admin';
  const isRoot = MOBILE_TABS[role].includes(pathname || '') || allItems(role).some(i => i.href === pathname);

  return (
    <header className="sticky top-0 z-30 h-16 bg-background/85 backdrop-blur-xl border-b border-border print:hidden">
      <div className="h-full px-4 sm:px-6 lg:px-8 flex items-center gap-3">
        <div className="lg:hidden">
          {isRoot ? (
            <BrandMark size="sm" />
          ) : (
            <button type="button" onClick={() => router.back()} aria-label="Geri" className="p-btn p-btn-ghost p-btn-icon -ml-2">
              <ArrowLeft size={18} />
            </button>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <h1 className="text-[15px] font-semibold text-foreground truncate leading-tight">{title}</h1>
          {subtitle && <p className="text-xs text-muted-foreground truncate mt-0.5">{subtitle}</p>}
        </div>

        <button
          type="button"
          onClick={openCommandPalette}
          className="hidden md:flex items-center gap-2 h-9 pl-3 pr-2 w-56 rounded-[10px] border border-border bg-card text-sm text-muted-foreground hover:border-border-strong transition-colors"
        >
          <Search size={15} />
          <span className="flex-1 text-left">Sayfalarda ara</span>
          <span className="p-kbd">Ctrl K</span>
        </button>
        <button type="button" onClick={openCommandPalette} aria-label="Ara" className="md:hidden p-btn p-btn-ghost p-btn-icon">
          <Search size={17} />
        </button>
        <ThemeToggle />
      </div>
    </header>
  );
}

/* ═══ Page layout ═══ */
export function PanelLayout({
  role,
  title,
  subtitle,
  width = 'default',
  children,
}: {
  role: PanelRole;
  title: string;
  subtitle?: string;
  width?: 'default' | 'wide' | 'narrow';
  children: React.ReactNode;
}) {
  const max = { default: 'max-w-6xl', wide: 'max-w-7xl', narrow: 'max-w-3xl' }[width];
  return (
    <div className="min-h-screen bg-background print:bg-white">
      <Sidebar role={role} />
      <div className="lg:pl-64 print:!pl-0">
        <Topbar title={title} subtitle={subtitle} />
        <main className={cn('mx-auto w-full px-4 sm:px-6 lg:px-8 pt-6 lg:pt-8 pb-28 lg:pb-12 print:p-0 print:max-w-none', max)}>
          {children}
        </main>
      </div>
    </div>
  );
}

// Eski içe aktarmalar için
export { PageHeader, StatCard } from '@/components/ui';
