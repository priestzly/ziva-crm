'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, Building2, ClipboardList, Settings, LogOut, Flame,
  Menu, X, Bell, Users, Shield, Store, Search,
  Zap, Activity, Moon, Sun, FileText, ChevronRight
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';

import { CommandPalette } from './CommandPalette';

export function Sidebar({ role }: { role: 'admin' | 'client' }) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = React.useState(false);
  const { signOut, profile, refreshProfile } = useAuth();

  const adminLinks = [
    { name: 'Genel Bakış', href: '/admin/dashboard', icon: LayoutDashboard },
    { name: 'AVM Yönetimi', href: '/admin/malls', icon: Building2 },
    { name: 'Tüm İşletmeler', href: '/admin/businesses', icon: Store },
    { name: 'Operasyon Arşivi', href: '/admin/history', icon: ClipboardList },
    { name: 'Fiyat Teklifi', href: '/admin/quotes', icon: FileText },
    { name: 'Kullanıcılar', href: '/admin/users', icon: Users },
    { name: 'Ayarlar', href: '/admin/settings', icon: Settings },
  ];

  const clientLinks = [
    { name: 'Dashboard', href: '/client/dashboard', icon: LayoutDashboard },
    { name: 'İşletmeler', href: '/client/businesses', icon: Building2 },
    { name: 'Servis Geçmişi', href: '/client/history', icon: ClipboardList },
  ];

  const links = role === 'admin' ? adminLinks : clientLinks;

  return (
    <>
      <CommandPalette />
      
      {/* Mobile Menu Button - Fixed top-left */}
      <button 
        className="lg:hidden fixed top-4 left-4 z-[60] p-2.5 rounded-xl bg-[hsl(var(--card))] border border-[hsl(var(--border))] shadow-lg text-foreground hover:border-[hsl(var(--primary))] transition-all duration-200"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Menüyü aç/kapat"
      >
        {isOpen ? <X size={18} /> : <Menu size={18} />}
      </button>

      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="lg:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" 
          onClick={() => setIsOpen(false)} 
        />
      )}

      {/* Sidebar - Desktop & Mobile */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 w-72 bg-[hsl(var(--card))] border-r border-[hsl(var(--border))] transition-transform duration-300 ease-out lg:translate-x-0",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex flex-col h-full">
          {/* Logo Section */}
          <div className="p-5 border-b border-[hsl(var(--border))]">
            <Link href="/" className="flex items-center gap-3 group">
              <div className="relative">
                <div className="w-10 h-10 rounded-xl overflow-hidden shadow-md transition-transform duration-200 group-hover:scale-105">
                  <img src="/logo.png" alt="Ziva Logo" className="w-full h-full object-cover" />
                </div>
                <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-[hsl(var(--card))]" />
              </div>
              <div>
                <span className="font-bold text-base block leading-tight">Ziva Yangın</span>
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
                  {role === 'admin' ? 'Yönetim Paneli' : 'Müşteri Paneli'}
                </span>
              </div>
            </Link>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground px-3 mb-3">
              Ana Menü
            </p>
            {links.map((link) => {
              const Icon = link.icon;
              const isActive = pathname?.startsWith(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setIsOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group relative",
                    isActive 
                      ? "text-primary bg-[hsl(var(--primary))]/10" 
                      : "text-muted-foreground hover:text-foreground hover:bg-[hsl(var(--muted))]"
                  )}
                >
                  <Icon size={18} className={cn("shrink-0", isActive && "text-primary")} />
                  <span className="font-medium text-sm">{link.name}</span>
                  {isActive && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-primary rounded-r-full" />
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Bottom Section */}
          <div className="p-3 border-t border-[hsl(var(--border))] space-y-2">
            {/* Sync Status */}
            <div 
              onClick={() => refreshProfile()}
              className="px-3 py-2 rounded-lg bg-[hsl(var(--muted))]/50 border border-[hsl(var(--border))] flex items-center justify-between cursor-pointer hover:bg-[hsl(var(--muted))] transition-all"
            >
              <div className="flex items-center gap-2">
                <Activity size={12} className="text-emerald-500" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Senkronize</span>
              </div>
              <Zap size={12} className="text-primary" />
            </div>

            {/* User Card */}
            <div className="px-3 py-2.5 rounded-lg bg-[hsl(var(--muted))]/50 border border-[hsl(var(--border))]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[hsl(var(--card))] border border-[hsl(var(--border))] flex items-center justify-center shrink-0">
                  <Shield size={14} className="text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold truncate">{profile?.full_name || profile?.email || 'Kullanıcı'}</p>
                  <p className="text-[10px] text-muted-foreground capitalize">{profile?.role || role}</p>
                </div>
              </div>
            </div>

            {/* Logout */}
            <button 
              onClick={() => signOut()}
              className="flex items-center gap-3 px-3 py-2.5 w-full rounded-lg text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-all"
            >
              <LogOut size={16} className="shrink-0" />
              <span className="font-medium text-sm">Çıkış Yap</span>
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}

export function Topbar({ title, subtitle }: { title: string; subtitle?: string }) {
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="sticky top-0 z-30 bg-[hsl(var(--card))]/80 backdrop-blur-xl border-b border-[hsl(var(--border))]">
      <div className="px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Left spacer for mobile menu button */}
        <div className="lg:hidden w-10" />
        
        {/* Title */}
        <div className="flex-1 lg:flex-none lg:text-center lg:ml-4">
          <h2 className="text-sm sm:text-base font-semibold truncate">{title}</h2>
          {subtitle && <p className="text-xs text-muted-foreground hidden sm:block">{subtitle}</p>}
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2">
          {/* Search Shortcut - Desktop */}
          <button 
            className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[hsl(var(--muted))] border border-[hsl(var(--border))] text-xs text-muted-foreground hover:border-[hsl(var(--primary))]/30 transition-all"
            onClick={() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true }))}
          >
            <Search size={14} />
            <span className="font-medium">Ara</span>
            <kbd className="ml-2 px-1.5 py-0.5 text-[10px] bg-[hsl(var(--card))] rounded font-mono">⌘K</kbd>
          </button>
          
          {/* Theme Toggle */}
          <button 
            onClick={toggleTheme}
            className="p-2 rounded-lg hover:bg-[hsl(var(--muted))] transition-colors"
            title={theme === 'dark' ? 'Açık Temaya Geç' : 'Karanlık Temaya Geç'}
          >
            {theme === 'dark' ? (
              <Sun size={18} className="text-muted-foreground hover:text-amber-400 transition-colors" />
            ) : (
              <Moon size={18} className="text-muted-foreground hover:text-indigo-500 transition-colors" />
            )}
          </button>

          {/* Notifications */}
          <button className="relative p-2 rounded-lg hover:bg-[hsl(var(--muted))] transition-colors">
            <Bell size={18} className="text-muted-foreground" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
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
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
      <div>
        {breadcrumb && breadcrumb.length > 0 && (
          <nav className="flex items-center gap-1.5 text-xs text-muted-foreground mb-2">
            {breadcrumb.map((item, i) => (
              <React.Fragment key={item.href}>
                {i > 0 && <ChevronRight size={12} />}
                <Link href={item.href} className="hover:text-foreground transition-colors">
                  {item.label}
                </Link>
              </React.Fragment>
            ))}
          </nav>
        )}
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight">{title}</h1>
        {description && <p className="text-sm text-muted-foreground mt-1">{description}</p>}
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
      <p className="text-2xl sm:text-3xl font-bold tabular-nums">
        {loading ? '—' : value}
      </p>
      <p className="text-xs text-muted-foreground mt-2 font-medium">{label}</p>
    </div>
  );
}