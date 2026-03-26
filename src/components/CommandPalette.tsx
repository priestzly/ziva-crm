'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Search, X, Building2, Store, Users, FileText, Command } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';

export function CommandPalette() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const router = useRouter();

  const commands = [
    { name: 'Dashboard', href: '/admin/dashboard', icon: FileText, category: 'Navigasyon' },
    { name: 'AVM Listesi', href: '/admin/malls', icon: Building2, category: 'Yönetim' },
    { name: 'İşletmeler', href: '/admin/businesses', icon: Store, category: 'Yönetim' },
    { name: 'Kullanıcı Yönetimi', href: '/admin/users', icon: Users, category: 'Sistem' },
    { name: 'Sistem Ayarları', href: '/admin/settings', icon: Command, category: 'Sistem' },
  ];

  const filtered = query === '' ? commands : commands.filter(c => 
    c.name.toLowerCase().includes(query.toLowerCase()) || 
    c.category.toLowerCase().includes(query.toLowerCase())
  );

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setIsOpen((open) => !open);
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-start justify-center pt-[15vh] p-4 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={() => setIsOpen(false)}>
      <div 
        className="w-full max-w-2xl glass-strong rounded-2xl shadow-2xl overflow-hidden animate-scale-up"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-4 border-b border-[hsl(var(--border))] flex items-center gap-3">
          <Search className="w-5 h-5 text-muted-foreground" />
          <input 
            autoFocus
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Ne aramıştınız? (Kullanıcılar, İşletmeler, Ayarlar...)"
            className="flex-1 bg-transparent border-none focus:ring-0 text-lg outline-none placeholder:text-muted-foreground/50"
          />
          <div className="flex items-center gap-1 px-2 py-1 rounded bg-[hsl(var(--muted))] border border-[hsl(var(--border))] text-[10px] font-bold text-muted-foreground">
            ESC
          </div>
          <button onClick={() => setIsOpen(false)} className="p-1 hover:bg-white/5 rounded-lg transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="p-2 max-h-[60vh] overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-muted-foreground">Sonuç bulunamadı.</p>
            </div>
          ) : (
            <div className="space-y-4 p-2">
              {['Navigasyon', 'Yönetim', 'Sistem'].map(cat => {
                const catItems = filtered.filter(f => f.category === cat);
                if (catItems.length === 0) return null;
                return (
                  <div key={cat} className="space-y-1">
                    <p className="px-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">{cat}</p>
                    {catItems.map(item => {
                      const Icon = item.icon;
                      return (
                        <button
                          key={item.href}
                          onClick={() => {
                            router.push(item.href);
                            setIsOpen(false);
                          }}
                          className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-white/5 text-sm font-medium transition-all group text-left"
                        >
                          <div className="p-2 rounded-lg bg-[hsl(var(--muted))] group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                            <Icon size={16} />
                          </div>
                          <span>{item.name}</span>
                          <span className="ml-auto text-[10px] text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">Gitmek için tıkla</span>
                        </button>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="p-4 bg-[hsl(var(--muted))/30 border-t border-[hsl(var(--border))] flex items-center justify-between text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
          <span>{filtered.length} sonuç bulundu</span>
          <div className="flex gap-4">
            <span className="flex items-center gap-1"><span className="px-1 py-0.5 rounded bg-[hsl(var(--muted))] border border-[hsl(var(--border))]">↑↓</span> Seç</span>
            <span className="flex items-center gap-1"><span className="px-1 py-0.5 rounded bg-[hsl(var(--muted))] border border-[hsl(var(--border))]">ENTER</span> Git</span>
          </div>
        </div>
      </div>
    </div>
  );
}
