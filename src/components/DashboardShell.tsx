'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard, Building2, ClipboardList, Settings, LogOut, Flame,
  Menu, X, Bell, Users, Store, Search,
  Sun, Moon, ChevronRight, RefreshCw, UserCircle, ArrowLeft, FileText, Palette, Zap
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { THEMES } from '@/lib/themes';
import { useIsMobile } from '@/hooks/useIsMobile';
import { MobileBottomSheet } from './MobileBottomSheet';
import { CommandPalette } from './CommandPalette';

export function Sidebar({ role }: { role: 'admin' | 'client' }) {
  const pathname = usePathname();
  const isMobile = useIsMobile();
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);
  const { signOut, profile, refreshProfile } = useAuth();

  const adminLinks = [
    { name: 'Özet', href: '/admin/dashboard', icon: LayoutDashboard },
    { name: 'AVM\'ler', href: '/admin/malls', icon: Building2 },
    { name: 'İşletmeler', href: '/admin/businesses', icon: Store },
    { name: 'Arşiv', href: '/admin/history', icon: ClipboardList },
    { name: 'Teklif', href: '/admin/quotes', icon: FileText },
    { name: 'Kullanıcılar', href: '/admin/users', icon: Users },
    { name: 'Ayarlar', href: '/admin/settings', icon: Settings },
  ];

  const clientLinks = [
    { name: 'Özet', href: '/client/dashboard', icon: LayoutDashboard },
    { name: 'İşletmeler', href: '/client/businesses', icon: Store },
    { name: 'Arşiv', href: '/client/history', icon: ClipboardList },
  ];

  const links = role === 'admin' ? adminLinks : clientLinks;

  // Primary links for mobile bottom tab bar (max 4 links)
  const mobileTabLinks = role === 'admin'
    ? [
        { name: 'Özet', href: '/admin/dashboard', icon: LayoutDashboard },
        { name: 'AVM\'ler', href: '/admin/malls', icon: Building2 },
        { name: 'İşletmeler', href: '/admin/businesses', icon: Store },
        { name: 'Arşiv', href: '/admin/history', icon: ClipboardList },
      ]
    : clientLinks; // 3 tabs for client

  // Secondary links for mobile bottom sheet menu
  const mobileMenuLinks = role === 'admin'
    ? [
        { name: 'Teklif Oluştur', href: '/admin/quotes', icon: FileText },
        { name: 'Kullanıcılar', href: '/admin/users', icon: Users },
        { name: 'Ayarlar', href: '/admin/settings', icon: Settings },
      ]
    : [];

  if (isMobile) {
    return (
      <>
        <CommandPalette />

        {/* Mobile Bottom Floating Tab Bar */}
        <div className="fixed bottom-4 left-4 right-4 z-40 mobile-tab-bar backdrop-blur-2xl rounded-[1.8rem] px-2 py-2.5 flex justify-around items-center pb-safe transition-all duration-300">
          {mobileTabLinks.map((link) => {
            const Icon = link.icon;
            const isActive = pathname === link.href || (link.href !== '/admin/dashboard' && link.href !== '/client/dashboard' && pathname?.startsWith(link.href));
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "relative flex flex-col items-center gap-1 py-1.5 px-3 rounded-2xl transition-all duration-300",
                  isActive 
                    ? "text-primary font-bold scale-105" 
                    : "text-muted-foreground/60 font-semibold hover:text-foreground"
                )}
              >
                <Icon size={20} className={cn("transition-transform duration-300", isActive && "scale-110")} />
                <span className="text-[10px] tracking-tight">{link.name}</span>
                {isActive && (
                  <span className="absolute -bottom-1 w-5 h-1 bg-primary rounded-full shadow-glow" />
                )}
              </Link>
            );
          })}
          {/* Menu Tab Button */}
          <button
            onClick={() => setIsMenuOpen(true)}
            className={cn(
              "flex flex-col items-center gap-1 py-1.5 px-3 rounded-2xl transition-all duration-300 cursor-pointer",
              isMenuOpen ? "text-primary font-bold scale-105" : "text-muted-foreground/60 font-semibold hover:text-foreground"
            )}
          >
            <Menu size={20} />
            <span className="text-[10px] tracking-tight">Menü</span>
          </button>
        </div>

        {/* Mobile Menu Bottom Sheet */}
        <MobileBottomSheet
          isOpen={isMenuOpen}
          onClose={() => setIsMenuOpen(false)}
          title="Menü İşlemleri"
        >
          <div className="space-y-4">
            {mobileMenuLinks.length > 0 && (
              <div className="space-y-1.5 pb-2">
                <p className="text-[9px] font-black uppercase tracking-widest text-white/30 px-2.5 mb-2">Hızlı Erişim</p>
                {mobileMenuLinks.map((link) => {
                  const Icon = link.icon;
                  const isActive = pathname === link.href;
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={() => setIsMenuOpen(false)}
                      className={cn(
                        "flex items-center gap-3.5 px-4 py-3.5 rounded-2xl border border-transparent transition-all text-sm font-bold",
                        isActive
                          ? "bg-primary/10 border-primary/20 text-foreground"
                          : "bg-muted/30 border-border/30 text-muted-foreground hover:bg-muted/50"
                      )}
                    >
                      <Icon size={18} className={isActive ? "text-primary" : "text-muted-foreground/60"} />
                      <span>{link.name}</span>
                    </Link>
                  );
                })}
              </div>
            )}

            {/* User Info Panel in Menu Sheet */}
            <div className="bg-white/[0.02] border border-white/[0.04] p-4 rounded-2xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center shrink-0">
                  <UserCircle size={20} className="text-white/50" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-black text-white/80 truncate uppercase tracking-tight">{profile?.full_name || profile?.email?.split('@')[0] || 'Kullanıcı'}</p>
                  <p className="text-[9px] text-white/30 font-black uppercase tracking-widest mt-0.5">{profile?.role || role}</p>
                </div>
              </div>
              <button
                onClick={() => { refreshProfile(); setIsMenuOpen(false); }}
                className="p-2.5 bg-white/5 rounded-xl border border-white/10 hover:bg-white/10 cursor-pointer active:scale-95 transition-all text-white/50 hover:text-white"
                title="Yenile"
              >
                <RefreshCw size={14} />
              </button>
            </div>

            {/* Logout Action */}
            <button
              onClick={() => { signOut(); setIsMenuOpen(false); }}
              className="w-full flex items-center justify-center gap-2 px-4 py-4 rounded-2xl bg-red-500/15 border border-red-500/20 text-red-500 hover:bg-red-500/20 font-bold text-xs uppercase tracking-widest cursor-pointer transition-all active:scale-95"
            >
              <LogOut size={16} />
              <span>Çıkış Yap</span>
            </button>
          </div>
        </MobileBottomSheet>
      </>
    );
  }

  // Desktop Sidebar
  return (
    <>
      <CommandPalette />
      <aside className="fixed inset-y-0 left-0 z-50 w-72 desktop-sidebar backdrop-blur-2xl transition-transform duration-500 lg:translate-x-0 flex flex-col">
        {/* Subtle glowing dots in sidebar */}
        <div className="absolute top-20 left-10 w-24 h-24 bg-primary/[0.03] rounded-full blur-2xl pointer-events-none" />
        <div className="absolute bottom-20 right-10 w-32 h-32 bg-primary/[0.02] rounded-full blur-3xl pointer-events-none" />

        {/* Logo Section */}
        <div className="p-6 border-b border-border/30 relative z-10">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="relative">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-red-500 to-orange-600 flex items-center justify-center shadow-lg shadow-red-500/20 group-hover:scale-105 group-hover:rotate-6 transition-all duration-500">
                <Flame size={22} className="text-white" fill="currentColor" />
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full border-2 border-slate-950 shadow-[0_0_8px_#10b981]" />
            </div>
            <div>
              <span className="font-black text-sm tracking-tight block leading-tight text-foreground uppercase italic">ZIVA <span className="text-primary not-italic tracking-normal">YANGIN</span></span>
              <span className="text-[9px] text-muted-foreground/60 uppercase tracking-[0.15em] font-bold block mt-0.5">
                {role === 'admin' ? 'Yönetim Merkezi' : 'Müşteri Portalı'}
              </span>
            </div>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto relative z-10">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/40 px-4 mb-4">
            Ana Menü
          </p>
          {links.map((link) => {
            const Icon = link.icon;
            const isActive = pathname === link.href || (link.href !== '/admin/dashboard' && link.href !== '/client/dashboard' && pathname?.startsWith(link.href));
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "sidebar-link-premium",
                  isActive && "active"
                )}
              >
                <Icon size={18} className={cn("shrink-0 transition-transform duration-300 group-hover:scale-110", isActive ? "text-primary" : "text-muted-foreground/60")} />
                <span className="font-semibold text-[13px] tracking-tight">{link.name}</span>
              </Link>
            );
          })}
        </nav>
        <div className="p-4 border-t border-border/30 space-y-3 relative z-10 bg-muted/10">
          {/* Sync Status */}
          <div
            onClick={() => refreshProfile()}
            className="px-4 py-3 rounded-2xl bg-muted/20 border border-border/30 flex items-center justify-between cursor-pointer hover:bg-muted/30 hover:border-border/50 transition-all duration-300 group"
          >
            <div className="flex items-center gap-2.5">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 group-hover:text-foreground transition-colors">Sistem Canlı</span>
            </div>
            <RefreshCw size={13} className="text-muted-foreground/60 group-hover:text-primary group-hover:rotate-180 transition-all duration-700" />
          </div>

          {/* User Card */}
          <div className="px-4 py-3.5 rounded-2xl bg-muted/20 border border-border/30">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-muted/30 border border-border/50 flex items-center justify-center shrink-0">
                <UserCircle size={20} className="text-muted-foreground/60" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-black text-foreground/80 truncate leading-tight uppercase tracking-tight">{profile?.full_name || profile?.email?.split('@')[0] || 'Kullanıcı'}</p>
                <p className="text-[9px] text-muted-foreground/40 font-black uppercase tracking-widest mt-0.5">{profile?.role || role}</p>
              </div>
            </div>
          </div>

          {/* Logout */}
          <button
            onClick={() => signOut()}
            className="flex items-center gap-3 px-4 py-3 w-full rounded-2xl text-muted-foreground/60 hover:text-red-500 hover:bg-red-500/10 hover:border-red-500/20 border border-transparent transition-all duration-300 font-bold text-xs uppercase tracking-widest cursor-pointer"
          >
            <LogOut size={16} className="shrink-0" />
            <span>Çıkış Yap</span>
          </button>
        </div>
      </aside>
    </>
  );
}

export function Topbar({ title, subtitle }: { title: string; subtitle?: string }) {
  const { theme, toggleTheme } = useTheme();
  const isMobile = useIsMobile();
  const pathname = usePathname();
  const router = useRouter();

  const activeThemeConfig = THEMES.find(t => t.id === theme);
  const ThemeIcon = activeThemeConfig?.icon || Sun;

  const getThemeIconColor = (themeId: string) => {
    switch (themeId) {
      case 'dark': return 'text-amber-400';
      case 'light': return 'text-slate-500 dark:text-slate-400';
      case 'fluent': return 'text-blue-500';
      case 'cyberpunk': return 'text-pink-500';
      default: return 'text-white/70';
    }
  };

  const rootPaths = [
    '/admin/dashboard', '/admin/malls', '/admin/businesses', '/admin/history',
    '/client/dashboard', '/client/businesses', '/client/history'
  ];

  const showBackButton = isMobile && !rootPaths.includes(pathname);

  if (isMobile) {
    return (
      <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl border-b border-border/40 h-14">
        <div className="px-4 h-full flex items-center justify-between relative">
          {/* Left Area (Back Button or Branding icon) */}
          <div className="w-10 flex items-center">
            {showBackButton ? (
              <button
                onClick={() => router.back()}
                className="w-9 h-9 rounded-xl bg-muted/20 border border-border/30 flex items-center justify-center text-foreground active:scale-90 transition-all cursor-pointer"
              >
                <ArrowLeft size={16} />
              </button>
            ) : (
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-red-500 to-orange-600 flex items-center justify-center shadow-lg shadow-red-500/20 shrink-0">
                <Flame size={14} className="text-white" fill="currentColor" />
              </div>
            )}
          </div>

          {/* Centered Title */}
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none max-w-[200px]">
            <h2 className="text-xs font-black tracking-widest text-foreground uppercase truncate">{title}</h2>
            {subtitle && <p className="text-[7px] font-bold text-muted-foreground/60 uppercase tracking-[0.15em] mt-0.5 truncate">{subtitle}</p>}
          </div>

          {/* Right Actions */}
          <div className="flex items-center gap-2">
            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="w-9 h-9 rounded-xl bg-muted/20 border border-border/30 flex items-center justify-center active:scale-90 transition-all cursor-pointer"
            >
              <ThemeIcon size={14} className={getThemeIconColor(theme)} />
            </button>
            <button className="relative w-9 h-9 rounded-xl bg-muted/20 border border-border/30 flex items-center justify-center active:scale-90 transition-all">
              <Bell size={14} className="text-muted-foreground/80" />
              <span className="absolute top-2.5 right-2.5 w-1 h-1 bg-red-500 rounded-full" />
            </button>
          </div>
        </div>
      </header>
    );
  }

  // Desktop Topbar
  return (
    <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl border-b border-border/40">
      <div className="px-8 h-16 flex items-center justify-between">
        {/* Title & Brand */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="min-w-0">
            <h2 className="text-sm lg:text-base font-black tracking-tight text-foreground uppercase italic leading-none truncate">{title}</h2>
            {subtitle && <p className="text-[9px] font-bold text-muted-foreground/60 uppercase tracking-widest mt-0.5 truncate">{subtitle}</p>}
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-3">
          {/* Search Shortcut - Desktop */}
          <button
            className="flex items-center gap-2.5 px-4 h-10 rounded-xl bg-muted/20 border border-border/30 text-xs text-muted-foreground/60 hover:border-border/60 hover:text-foreground transition-all duration-300 group"
            onClick={() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true }))}
          >
            <Search size={14} className="group-hover:scale-105 transition-transform" />
            <span className="font-semibold">Sistemde Ara</span>
            <kbd className="ml-2 px-2 py-0.5 text-[9px] bg-muted/30 rounded-lg font-mono border border-border/30 text-muted-foreground/40">⌘K</kbd>
          </button>

          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="w-10 h-10 rounded-xl bg-muted/20 border border-border/30 hover:bg-muted/30 hover:border-border/60 transition-all duration-300 flex items-center justify-center"
            title="Temayı Değiştir"
          >
            <ThemeIcon size={16} className={getThemeIconColor(theme)} />
          </button>

          <button className="relative w-10 h-10 rounded-xl bg-muted/20 border border-border/30 hover:bg-muted/30 hover:border-border/60 transition-all duration-300 flex items-center justify-center">
            <Bell size={16} className="text-muted-foreground/60" />
            <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-red-500 rounded-full shadow-[0_0_8px_#ef4444]" />
          </button>
        </div>
      </div>
    </header>
  );
}

// Page Header Component
export function PageHeader({ 
  title, 
  description, 
  actions,
  breadcrumb 
}: { 
  title: string; 
  description?: string; 
  actions?: React.ReactNode;
  breadcrumb?: { label: string; href: string }[];
}) {
  const isMobile = useIsMobile();

  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-4 sm:mb-6">
      <div className="min-w-0">
        {!isMobile && breadcrumb && breadcrumb.length > 0 && (
          <nav className="flex items-center gap-1.5 text-xs text-muted-foreground mb-2">
            {breadcrumb.map((item, i) => (
              <React.Fragment key={item.href}>
                {i > 0 && <ChevronRight size={10} />}
                <Link href={item.href} className="hover:text-foreground transition-colors truncate">
                  {item.label}
                </Link>
              </React.Fragment>
            ))}
          </nav>
        )}
        <h1 className="text-base sm:text-xl lg:text-2xl font-bold tracking-tight truncate">{title}</h1>
        {description && <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 sm:mt-1 hidden sm:block">{description}</p>}
      </div>
      {actions && (
        <div className="flex items-center gap-2 shrink-0">
          {actions}
        </div>
      )}
    </div>
  );
}

// Stat Card Component
export function StatCard({ 
  label, 
  value, 
  icon: Icon, 
  color = 'text-primary',
  trend,
  loading = false 
}: { 
  label: string; 
  value: number | string; 
  icon: React.ElementType; 
  color?: string;
  trend?: string;
  loading?: boolean;
}) {
  return (
    <div className="stat-card">
      <div className="flex items-center justify-between mb-3">
        <div className={cn("p-2 rounded-lg bg-[hsl(var(--muted))]", color)}>
          <Icon size={18} />
        </div>
        {trend && (
          <span className="text-[10px] font-medium text-muted-foreground">{trend}</span>
        )}
      </div>
      <p className="text-lg sm:text-2xl lg:text-3xl font-bold tabular-nums">
        {loading ? '—' : value}
      </p>
      <p className="text-[10px] sm:text-xs text-muted-foreground mt-1 sm:mt-2 font-medium">{label}</p>
    </div>
  );
}