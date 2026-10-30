'use client';

import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

/*
 * Responsive dialog: bottom sheet on phones, centered modal on larger screens.
 * Pure CSS breakpoints (no JS media check), so there is no layout flash.
 */
export function Sheet({
  isOpen,
  onClose,
  title,
  description,
  footer,
  size = 'md',
  children,
  className,
}: {
  isOpen: boolean;
  onClose: () => void;
  title: React.ReactNode;
  description?: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  children: React.ReactNode;
  className?: string;
}) {
  useEffect(() => {
    if (!isOpen) return;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = '';
      document.removeEventListener('keydown', onKey);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const width = { sm: 'sm:max-w-sm', md: 'sm:max-w-lg', lg: 'sm:max-w-2xl', xl: 'sm:max-w-4xl' }[size];

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center sm:p-6 print:hidden" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] p-anim-fade" onClick={onClose} />
      <div
        className={cn(
          'relative w-full flex flex-col bg-popover text-popover-foreground border border-border shadow-xl',
          'max-h-[92dvh] rounded-t-2xl p-sheet-panel sm:rounded-2xl sm:max-h-[88vh]',
          width,
          className
        )}
      >
        <div className="sm:hidden mx-auto mt-2.5 h-1 w-10 rounded-full bg-border-strong" />
        <div className="flex items-start justify-between gap-4 px-5 pt-4 pb-4 sm:pt-5 border-b border-border">
          <div className="min-w-0">
            <h3 className="text-base font-semibold text-foreground">{title}</h3>
            {description && <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Kapat"
            className="p-btn p-btn-ghost p-btn-icon p-btn-sm -mr-1.5 -mt-0.5"
          >
            <X size={16} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-5">{children}</div>
        {footer && (
          <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-border pb-[max(1rem,env(safe-area-inset-bottom))]">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
