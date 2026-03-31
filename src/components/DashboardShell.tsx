'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, Building2, ClipboardList, Settings, LogOut, Flame,
  Menu, X, Bell, Users, Shield, Store, Search,
  Zap, Activity, Moon, Sun, FileText
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
    {name: 'AVM Yönetimi', href: '/admin/malls', icon: Building2 },
    {name: 'Tüm İşletmeler', href: '/admin/businesses', icon: Store },
    {name: 'Operasyon Arşivi', href: '/admin/history', icon: ClipboardList },
    {name: 'Fiyat Teklifi', href: '/admin/quotes', icon: FileText },
    {name: 'Kullanıcılar', href: '/admin/users', icon: Users },
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
      {/* Mobile Toggle */}
      <button 
        className="lg:hidden fixed top-4 left-4 z-[60] p-2.5 glass rounded-xl text-foreground"
        onClick={() => setIsOpen(!isOpen)}
      >
        {isOpen ? <X size={18} /> : <Menu size={18} />}
      </button>

      {/* Overlay */}
      {isOpen && (
        <div className="lg:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" onClick={() => setIsOpen(false)} />
      )}

      {/* Sidebar */}
      <div className={cn(
        "fixed inset-y-0 left-0 z-50 w-72 glass-strong transition-transform duration-500 ease-out lg:translate-x-0 border-none shadow-none",
        !isOpen && "-translate-x-full"
      )}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="p-6 pb-8">
            <Link href="/" className="flex items-center gap-3 group">
              <div className="relative">
                <div className="w-11 h-11 rounded-2xl overflow-hidden shadow-lg transition-shadow duration-300">
                  <img src="/logo.png" alt="Logo" className="w-full h-full object-cover" />
                </div>
                <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-[hsl(225,15%,9%)]" />
              </div>
              <div>
                <span className="font-bold text-lg tracking-tight block leading-tight">Ziva Yangın</span>
                <span className="text-[10px] text-muted-foreground uppercase tracking-[0.2em] font-semibold">
                  {role === 'admin' ? 'Admin Panel' : 'Müşteri Panel'}
                </span>
              </div>
            </Link>
          </div>

          {/* Nav */}
          <nav className="flex-1 px-4 space-y-1.5 overflow-y-auto">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground px-3 mb-3">
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
                    "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 group relative",
                    isActive 
                      ? "text-primary bg-[hsl(var(--muted))]/50" 
                      : "text-muted-foreground hover:text-foreground hover:bg-[hsl(var(--muted))]"
                  )}
                >
                  {isActive && (
                    <div className="absolute inset-0 rounded-xl bg-[hsl(var(--muted))]/50 border border-[hsl(var(--border))] pointer-events-none" />
                  )}
                  <Icon size={18} className={cn("relative z-10", isActive && "text-primary")} />
                  <span className="font-medium text-sm relative z-10">{link.name}</span>
                  {isActive && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-6 bg-primary rounded-r-full" />
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Bottom User & Sync */}
          <div className="p-4 mt-auto space-y-2">
            <div 
              onClick={() => { refreshProfile(); }}
              className="px-4 py-2 rounded-xl bg-[hsl(var(--muted))]/40 border border-[hsl(var(--border))] flex items-center justify-between group cursor-pointer hover:bg-[hsl(var(--muted))] transition-all"
            >
               <div className="flex items-center gap-2">
                  <div className="relative">
                    <Activity size={10} className="text-emerald-500 animate-pulse" />
                    <div className="absolute inset-0 bg-emerald-500 blur-[4px] opacity-20" />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground group-hover:text-foreground">Sistem Senkronize</span>
               </div>
               <div className="p-1 rounded bg-[hsl(var(--border))]/50 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Zap size={10} className="text-primary" />
               </div>
            </div>

            <div className="glass rounded-2xl p-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[hsl(var(--muted))] border border-[hsl(var(--border))] flex items-center justify-center">
                  <Shield size={16} className="text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-foreground truncate">{profile?.full_name || profile?.email || 'Kullanıcı'}</p>
                  <p className="text-[10px] text-muted-foreground capitalize">{profile?.role || role}</p>
                </div>
              </div>
            </div>
            <button 
              onClick={() => signOut()}
              className="flex items-center gap-3 px-4 py-3 w-full rounded-xl text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-all duration-300"
            >
              <LogOut size={18} />
              <span className="font-medium text-sm">Çıkış Yap</span>
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

export function Topbar({ title, subtitle }: { title: string; subtitle?: string }) {
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="h-16 glass-strong sticky top-0 z-30 px-6 lg:px-8 flex items-center justify-between">
      <div className="lg:hidden w-10" /> {/* spacer for mobile menu */}
      <div>
        <h2 className="text-base font-semibold text-foreground">{title}</h2>
        {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-3">
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[hsl(var(--muted))] border border-[hsl(var(--border))] text-[10px] font-bold text-muted-foreground/60 transition-all hover:border-primary/30 group cursor-pointer" onClick={() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true }))}>
          <Search size={14} className="group-hover:text-primary transition-colors" />
          ARAMA YAPIN
          <span className="ml-2 font-mono bg-white/10 px-1 py-0.5 rounded opacity-40 group-hover:opacity-100 transition-all">CTRL K</span>
        </div>
        
        {/* Theme Toggle Button */}
        <button 
          onClick={toggleTheme}
          className="relative p-2.5 rounded-xl hover:bg-white/[0.04] transition-colors"
          title={theme === 'dark' ? 'Açık Temaya Geç' : 'Karanlık Temaya Geç'}
        >
          {theme === 'dark' ? (
            <Sun size={18} className="text-muted-foreground hover:text-amber-400 transition-colors" />
          ) : (
            <Moon size={18} className="text-muted-foreground hover:text-indigo-500 transition-colors" />
          )}
        </button>

        <button className="relative p-2.5 rounded-xl hover:bg-white/[0.04] transition-colors">
          <Bell size={18} className="text-muted-foreground" />
          <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full ring-2 ring-[hsl(225,15%,9%)]" />
        </button>
      </div>
    </header>
  );
}
