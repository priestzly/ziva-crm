'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, Building2, ClipboardList, Settings, LogOut, Flame,
  Menu, X, Bell, Users, Shield, Store
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';

export function Sidebar({ role }: { role: 'admin' | 'client' }) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = React.useState(false);
  const { signOut, profile } = useAuth();

  const adminLinks = [
    { name: 'Genel Bakış', href: '/admin/dashboard', icon: LayoutDashboard },
    { name: 'AVM Yönetimi', href: '/admin/malls', icon: Building2 },
    { name: 'Tüm İşletmeler', href: '/admin/businesses', icon: Store },
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
        "fixed inset-y-0 left-0 z-50 w-72 glass-strong transition-transform duration-500 ease-out lg:translate-x-0",
        !isOpen && "-translate-x-full"
      )}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="p-6 pb-8">
            <Link href="/" className="flex items-center gap-3 group">
              <div className="relative">
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center shadow-lg shadow-red-500/20 group-hover:shadow-red-500/40 transition-shadow duration-300">
                  <Flame className="h-5 w-5 text-white" />
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
                      ? "text-white" 
                      : "text-muted-foreground hover:text-foreground hover:bg-white/[0.03]"
                  )}
                >
                  {isActive && (
                    <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-red-500/20 to-orange-500/10 border border-red-500/20" />
                  )}
                  <Icon size={18} className={cn("relative z-10", isActive && "text-red-400")} />
                  <span className="font-medium text-sm relative z-10">{link.name}</span>
                  {isActive && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-6 bg-gradient-to-b from-red-500 to-orange-500 rounded-r-full" />
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Bottom User */}
          <div className="p-4 mt-auto">
            <div className="glass rounded-2xl p-4 mb-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-red-500/20 to-orange-500/20 border border-red-500/20 flex items-center justify-center">
                  <Shield size={16} className="text-red-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold truncate">{profile?.full_name || profile?.email || 'Kullanıcı'}</p>
                  <p className="text-[10px] text-muted-foreground capitalize">{profile?.role || role}</p>
                </div>
              </div>
            </div>
            <button 
              onClick={() => signOut()}
              className="flex items-center gap-3 px-4 py-3 w-full rounded-xl text-muted-foreground hover:text-red-400 hover:bg-red-500/5 transition-all duration-300"
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
  return (
    <header className="h-16 glass-strong sticky top-0 z-30 px-6 lg:px-8 flex items-center justify-between">
      <div className="lg:hidden w-10" /> {/* spacer for mobile menu */}
      <div>
        <h2 className="text-base font-semibold text-foreground">{title}</h2>
        {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-3">
        <button className="relative p-2.5 rounded-xl hover:bg-white/[0.04] transition-colors">
          <Bell size={18} className="text-muted-foreground" />
          <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full ring-2 ring-[hsl(225,15%,9%)]" />
        </button>
      </div>
    </header>
  );
}
