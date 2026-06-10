'use client';

import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/useIsMobile';

interface MobileBottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  className?: string;
}

export function MobileBottomSheet({
  isOpen,
  onClose,
  title,
  children,
  className,
}: MobileBottomSheetProps) {
  const isMobile = useIsMobile();

  // Handle body scroll locking when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  if (isMobile) {
    return (
      <div className="fixed inset-0 z-[100] flex flex-col justify-end">
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-black/80 backdrop-blur-sm transition-opacity duration-300 animate-fade-in"
          onClick={onClose}
        />
        {/* Bottom Sheet Drawer */}
        <div
          className={cn(
            "relative z-10 w-full max-h-[90dvh] bg-card border-t border-border rounded-t-[2rem] px-5 pb-8 pt-4 flex flex-col shadow-[0_-8px_30px_rgba(0,0,0,0.9)] pb-safe transition-transform duration-300 animate-slide-up-sheet",
            className
          )}
        >
          {/* Drag Handle Indicator */}
          <div className="w-12 h-1 bg-muted-foreground/30 rounded-full mx-auto mb-5 shrink-0 cursor-pointer" onClick={onClose} />
          
          <div className="flex items-center justify-between mb-5 px-1">
            <h3 className="text-base font-black uppercase tracking-widest text-foreground leading-none">{title}</h3>
            <button
              onClick={onClose}
              type="button"
              className="w-8 h-8 rounded-full bg-secondary border border-border flex items-center justify-center text-muted-foreground hover:bg-muted active:scale-90 transition-all"
            >
              <X size={16} />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-1 py-1">
            {children}
          </div>
        </div>
      </div>
    );
  }

  // Desktop View: Render as standard modal
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className={cn(
          "modal-content bg-card border border-border shadow-2xl animate-scale-up max-w-md",
          className
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h3 className="text-base font-black tracking-widest uppercase text-foreground leading-none">{title}</h3>
          <button
            onClick={onClose}
            type="button"
            className="w-8 h-8 rounded-xl bg-secondary hover:bg-muted border border-border transition-all flex items-center justify-center text-muted-foreground hover:text-foreground"
          >
            <X size={16} />
          </button>
        </div>
        <div className="p-5 overflow-y-auto max-h-[calc(85vh-10rem)]">{children}</div>
      </div>
    </div>
  );
}
export default MobileBottomSheet;
