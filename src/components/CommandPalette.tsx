'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Search, CornerDownLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { NAV, type PanelRole } from './DashboardShell';

const OPEN_EVENT = 'ziva:command-palette';

export function openCommandPalette() {
  window.dispatchEvent(new Event(OPEN_EVENT));
}

export function CommandPalette({ role }: { role: PanelRole }) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [index, setIndex] = useState(0);
  const router = useRouter();

  const items = useMemo(
    () => NAV[role].flatMap(g => g.items.map(i => ({ ...i, group: g.title ?? 'Genel' }))),
    [role]
  );
  const q = query.trim().toLocaleLowerCase('tr');
  const filtered = q ? items.filter(i => i.name.toLocaleLowerCase('tr').includes(q) || i.group.toLocaleLowerCase('tr').includes(q)) : items;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setIsOpen(o => !o);
      }
    };
    const onOpen = () => setIsOpen(true);
    document.addEventListener('keydown', onKey);
    window.addEventListener(OPEN_EVENT, onOpen);
    return () => {
      document.removeEventListener('keydown', onKey);
      window.removeEventListener(OPEN_EVENT, onOpen);
    };
  }, []);

  useEffect(() => { if (!isOpen) { setQuery(''); setIndex(0); } }, [isOpen]);
  useEffect(() => { setIndex(0); }, [query]);

  if (!isOpen) return null;

  const go = (href: string) => { router.push(href); setIsOpen(false); };

  return (
    <div className="fixed inset-0 z-[200] flex items-start justify-center pt-[12vh] px-4 print:hidden" onClick={() => setIsOpen(false)}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] p-anim-fade" />
      <div
        className="relative w-full max-w-lg rounded-2xl border border-border bg-popover shadow-xl overflow-hidden p-anim-pop"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 px-4 h-14 border-b border-border">
          <Search size={18} className="text-muted-foreground" />
          <input
            autoFocus
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Escape') setIsOpen(false);
              if (e.key === 'ArrowDown') { e.preventDefault(); setIndex(i => Math.min(i + 1, filtered.length - 1)); }
              if (e.key === 'ArrowUp') { e.preventDefault(); setIndex(i => Math.max(i - 1, 0)); }
              if (e.key === 'Enter' && filtered[index]) go(filtered[index].href);
            }}
            placeholder="Sayfa ara..."
            className="flex-1 bg-transparent outline-none text-[15px] text-foreground placeholder:text-muted-foreground"
          />
          <span className="p-kbd">Esc</span>
        </div>
        <div className="max-h-[50vh] overflow-y-auto p-2">
          {filtered.length === 0 ? (
            <p className="px-3 py-8 text-center text-sm text-muted-foreground">Sonuç bulunamadı.</p>
          ) : (
            filtered.map((item, i) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.href}
                  type="button"
                  onMouseEnter={() => setIndex(i)}
                  onClick={() => go(item.href)}
                  className={cn(
                    'w-full flex items-center gap-3 h-11 px-3 rounded-lg text-sm text-left transition-colors',
                    i === index ? 'bg-surface text-foreground' : 'text-muted-foreground'
                  )}
                >
                  <Icon size={17} className={i === index ? 'text-primary' : ''} />
                  <span className="flex-1 font-medium">{item.name}</span>
                  <span className="text-xs text-muted-foreground">{item.group}</span>
                  {i === index && <CornerDownLeft size={14} className="text-muted-foreground" />}
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
