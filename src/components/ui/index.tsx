'use client';

/*
 * Ziva panel UI primitives. Every panel page should be built from these so
 * colors come from theme tokens (dark & light) instead of hard-coded values.
 */

import React from 'react';
import { Loader2, Search, AlertTriangle, RefreshCw, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

/* ─── Button ─── */
type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: LucideIcon;
  loading?: boolean;
}

export function Button({ variant = 'primary', size = 'md', icon: Icon, loading, className, children, disabled, type = 'button', ...rest }: ButtonProps) {
  const iconSize = size === 'sm' ? 14 : 16;
  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={cn('p-btn', `p-btn-${variant}`, size !== 'md' && `p-btn-${size}`, className)}
      {...rest}
    >
      {loading ? <Loader2 size={iconSize} className="animate-spin" /> : Icon && <Icon size={iconSize} />}
      {children}
    </button>
  );
}

export function IconButton({ icon: Icon, label, variant = 'ghost', size = 'md', className, ...rest }: Omit<ButtonProps, 'children'> & { icon: LucideIcon; label: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={cn('p-btn p-btn-icon', `p-btn-${variant}`, size !== 'md' && `p-btn-${size}`, className)}
      {...rest}
    >
      <Icon size={size === 'sm' ? 14 : 16} />
    </button>
  );
}

/* ─── Card ─── */
export function Card({ className, interactive, children, ...rest }: React.HTMLAttributes<HTMLDivElement> & { interactive?: boolean }) {
  return (
    <div className={cn('p-card', interactive && 'p-card-interactive', className)} {...rest}>
      {children}
    </div>
  );
}

export function CardHeader({ title, description, actions, className }: { title: React.ReactNode; description?: React.ReactNode; actions?: React.ReactNode; className?: string }) {
  return (
    <div className={cn('flex items-start justify-between gap-4 px-5 pt-5 pb-4', className)}>
      <div className="min-w-0">
        <h3 className="text-[15px] font-semibold text-foreground">{title}</h3>
        {description && <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </div>
  );
}

/* ─── Page header ─── */
export function PageHeader({ title, description, actions, className }: { title: React.ReactNode; description?: React.ReactNode; actions?: React.ReactNode; className?: string }) {
  return (
    <div className={cn('flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-6', className)}>
      <div className="min-w-0">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2 shrink-0">{actions}</div>}
    </div>
  );
}

/* ─── Stat card ─── */
type Tone = 'primary' | 'success' | 'warning' | 'info' | 'neutral' | 'danger';
const TONE_TILE: Record<Tone, string> = {
  primary: 'bg-primary/10 text-primary border-primary/20',
  success: 'bg-success/10 text-success border-success/20',
  warning: 'bg-warning/10 text-warning border-warning/20',
  info: 'bg-info/10 text-info border-info/20',
  danger: 'bg-destructive/10 text-destructive border-destructive/20',
  neutral: 'bg-muted text-muted-foreground border-border',
};

export function IconTile({ icon: Icon, tone = 'primary', size = 'md', className }: { icon: LucideIcon; tone?: Tone; size?: 'sm' | 'md' | 'lg'; className?: string }) {
  const dims = size === 'sm' ? 'w-8 h-8 rounded-lg' : size === 'lg' ? 'w-12 h-12 rounded-xl' : 'w-10 h-10 rounded-[10px]';
  return (
    <span className={cn('inline-flex items-center justify-center shrink-0 border', dims, TONE_TILE[tone], className)}>
      <Icon size={size === 'sm' ? 15 : size === 'lg' ? 22 : 18} />
    </span>
  );
}

export function StatCard({ label, value, icon, tone = 'primary', hint, loading, onClick }: {
  label: string; value: React.ReactNode; icon: LucideIcon; tone?: Tone; hint?: React.ReactNode; loading?: boolean; onClick?: () => void;
}) {
  const Comp = onClick ? 'button' : 'div';
  return (
    <Comp onClick={onClick} className={cn('p-card p-5 text-left w-full', onClick && 'p-card-interactive cursor-pointer')}>
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        <IconTile icon={icon} tone={tone} size="sm" />
      </div>
      <p className="mt-3 text-3xl font-bold tracking-tight tabular-nums text-foreground">
        {loading ? <span className="inline-block h-8 w-16 rounded-md bg-muted animate-pulse align-middle" /> : value}
      </p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </Comp>
  );
}

/* ─── Badge ─── */
export function Badge({ tone = 'neutral', icon: Icon, className, children }: { tone?: Tone; icon?: LucideIcon; className?: string; children: React.ReactNode }) {
  const toneClass = tone === 'danger' ? 'p-badge-danger' : `p-badge-${tone}`;
  return (
    <span className={cn('p-badge', toneClass, className)}>
      {Icon && <Icon size={12} />}
      {children}
    </span>
  );
}

/* ─── Form ─── */
export function Field({ label, hint, required, htmlFor, className, children }: { label: string; hint?: string; required?: boolean; htmlFor?: string; className?: string; children: React.ReactNode }) {
  return (
    <div className={className}>
      <label htmlFor={htmlFor} className="p-label">
        {label}{required && <span className="text-primary"> *</span>}
      </label>
      {children}
      {hint && <p className="mt-1.5 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...rest }, ref) {
    return <input ref={ref} className={cn('p-input', className)} {...rest} />;
  }
);

export const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  function Select({ className, children, ...rest }, ref) {
    return <select ref={ref} className={cn('p-input', className)} {...rest}>{children}</select>;
  }
);

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  function Textarea({ className, ...rest }, ref) {
    return <textarea ref={ref} className={cn('p-input', className)} {...rest} />;
  }
);

export function SearchInput({ value, onChange, placeholder = 'Ara...', className }: { value: string; onChange: (v: string) => void; placeholder?: string; className?: string }) {
  return (
    <div className={cn('relative', className)}>
      <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
      <input
        type="search"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="p-input pl-9"
      />
    </div>
  );
}

/* ─── States ─── */
export function LoadingState({ label = 'Yükleniyor...', className }: { label?: string; className?: string }) {
  return (
    <div className={cn('flex flex-col items-center justify-center gap-3 py-20 text-muted-foreground', className)}>
      <Loader2 size={24} className="animate-spin text-primary" />
      <p className="text-sm">{label}</p>
    </div>
  );
}

export function EmptyState({ icon: Icon, title, description, action, className }: { icon: LucideIcon; title: string; description?: string; action?: React.ReactNode; className?: string }) {
  return (
    <div className={cn('flex flex-col items-center justify-center text-center py-16 px-6', className)}>
      <span className="w-12 h-12 rounded-xl bg-muted border border-border flex items-center justify-center text-muted-foreground">
        <Icon size={22} />
      </span>
      <p className="mt-4 font-semibold text-foreground">{title}</p>
      {description && <p className="mt-1 text-sm text-muted-foreground max-w-sm">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function ErrorBanner({ message, onRetry, className }: { message: string; onRetry?: () => void; className?: string }) {
  return (
    <div className={cn('flex items-center gap-3 rounded-xl border border-destructive/25 bg-destructive/10 px-4 py-3', className)}>
      <AlertTriangle size={18} className="text-destructive shrink-0" />
      <p className="flex-1 text-sm text-destructive">{message}</p>
      {onRetry && (
        <Button size="sm" variant="danger" icon={RefreshCw} onClick={onRetry}>Tekrar dene</Button>
      )}
    </div>
  );
}

/* ─── Misc ─── */
export function SectionTitle({ children, action, className }: { children: React.ReactNode; action?: React.ReactNode; className?: string }) {
  return (
    <div className={cn('flex items-center justify-between gap-3 mb-3', className)}>
      <h2 className="text-sm font-semibold text-foreground">{children}</h2>
      {action}
    </div>
  );
}

export function Segmented<T extends string>({ value, onChange, options, className }: { value: T; onChange: (v: T) => void; options: { value: T; label: string }[]; className?: string }) {
  return (
    <div className={cn('inline-flex p-1 rounded-[10px] bg-muted border border-border', className)}>
      {options.map(o => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={cn(
            'h-8 px-3 rounded-lg text-sm font-medium transition-colors',
            value === o.value ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export { Sheet } from './Sheet';
