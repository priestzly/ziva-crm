'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Menu, X, Phone, Lock } from 'lucide-react';
import { CONTACT } from '@/lib/site';

export function MobileMenu({ links }: { links: { label: string; href: string }[] }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  return (
    <div className="lg:hidden">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        aria-label={open ? 'Menüyü kapat' : 'Menüyü aç'}
        className="w-11 h-11 rounded-xl border border-[var(--l-line)] flex items-center justify-center text-[var(--l-text)]"
      >
        {open ? <X size={20} /> : <Menu size={20} />}
      </button>

      {open && (
        <div className="fixed inset-x-0 top-[72px] bottom-0 z-40 bg-[var(--l-bg)]/98 backdrop-blur-xl px-6 pt-6 pb-10 flex flex-col">
          <nav className="flex flex-col">
            {links.map(l => (
              <a
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="py-4 border-b border-[var(--l-line)] text-2xl font-bold text-[var(--l-text)]"
              >
                {l.label}
              </a>
            ))}
          </nav>
          <div className="mt-auto space-y-3">
            <a href={`tel:${CONTACT.phone}`} className="l-btn-fire w-full justify-center">
              <Phone size={18} /> {CONTACT.phoneDisplay}
            </a>
            <Link href="/login" className="l-btn-ghost w-full justify-center">
              <Lock size={16} /> Müşteri Portalı
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
