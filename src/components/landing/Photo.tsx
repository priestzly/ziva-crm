import Image from 'next/image';
import type { LucideIcon } from 'lucide-react';
import { PHOTOS, type PhotoSlot } from '@/lib/landing-content';

/*
 * Fotoğraf alanı. PHOTOS içinde yol tanımlıysa fotoğrafı gösterir,
 * tanımlı değilse marka renklerinde dekoratif bir görsel çizer.
 */
export function Photo({
  slot,
  alt,
  icon: Icon,
  sizes,
  priority = false,
  position = 'center',
  className = '',
}: {
  slot: PhotoSlot;
  alt: string;
  icon: LucideIcon;
  sizes: string;
  priority?: boolean;
  /** object-position, ör. 'center 20%' — kırpmada önemli bölgeyi görünür tutar */
  position?: string;
  className?: string;
}) {
  const src = PHOTOS[slot];

  return (
    <div className={`relative overflow-hidden bg-[var(--l-surface)] ${className}`}>
      {src ? (
        <Image src={src} alt={alt} fill sizes={sizes} priority={priority} className="object-cover" style={{ objectPosition: position }} />
      ) : (
        <div className="l-photo-fallback absolute inset-0" role="img" aria-label={alt}>
          <Icon className="absolute -right-[8%] -bottom-[10%] w-[70%] h-[70%] text-white/[0.06]" strokeWidth={1} />
          <Icon className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 text-[var(--l-fire-2)]/80" strokeWidth={1.5} />
        </div>
      )}
      {/* Alt kenarda metin okunabilirliği için hafif karartma */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent pointer-events-none" />
    </div>
  );
}
