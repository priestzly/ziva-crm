'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { Flame, Loader2 } from 'lucide-react';

interface RouteGuardProps {
  children: React.ReactNode;
  requiredRole?: 'admin' | 'client';
}

export default function RouteGuard({ children, requiredRole }: RouteGuardProps) {
  const { user, profile, loading } = useAuth();
  const router = useRouter();
  const [timedOut, setTimedOut] = useState(false);
  const redirected = useRef(false);

  // Sonsuz loading koruması — 6 saniye sonra timeout
  useEffect(() => {
    const timer = setTimeout(() => {
      setTimedOut(true);
    }, 6000);

    return () => clearTimeout(timer);
  }, []);

  // Loading bittiyse ve kullanıcı yoksa → login'e yönlendir
  // Timeout olduysa da login'e yönlendir
  useEffect(() => {
    if (redirected.current) return;

    // Hâlâ yükleniyor ve timeout olmadıysa bekle
    if (loading && !timedOut) return;

    // Loading bitti veya timeout oldu ama kullanıcı yok
    if (!user || !profile) {
      redirected.current = true;
      router.replace('/login');
      return;
    }

    // Rol kontrolü — admin sayfasına client erişmeye çalışıyorsa
    if (requiredRole === 'admin' && profile.role !== 'admin') {
      redirected.current = true;
      router.replace('/client/dashboard');
      return;
    }

    // Rol kontrolü — client sayfasına admin erişmeye çalışıyorsa
    if (requiredRole === 'client' && profile.role !== 'client') {
      redirected.current = true;
      router.replace('/admin/dashboard');
      return;
    }
  }, [loading, timedOut, user, profile, requiredRole, router]);

  // Loading durumu — loading spinner göster
  if (loading && !timedOut) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-grid">
        <div className="flex flex-col items-center gap-6 animate-fade-in">
          <div className="relative">
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center shadow-2xl shadow-red-500/30">
              <Flame className="w-10 h-10 text-white animate-pulse" />
            </div>
            <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-500 rounded-full border-4 border-[hsl(225,15%,6%)] status-active" />
          </div>
          <div className="text-center space-y-2">
            <h2 className="text-lg font-bold tracking-tight gradient-text">Ziva Yangın</h2>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 size={14} className="animate-spin" />
              <span>Yükleniyor...</span>
            </div>
          </div>
          {/* Shimmer bar */}
          <div className="w-48 h-1 rounded-full overflow-hidden bg-white/[0.03]">
            <div className="h-full w-1/3 rounded-full bg-gradient-to-r from-red-500 to-orange-500 shimmer" />
          </div>
        </div>
      </div>
    );
  }

  // Kullanıcı yoksa veya rol uyumsuzsa → yönlendirme yapılıyordur, boş göster
  if (!user || !profile) {
    return null;
  }

  if (requiredRole === 'admin' && profile.role !== 'admin') {
    return null;
  }

  if (requiredRole === 'client' && profile.role !== 'client') {
    return null;
  }

  // 🎉 Yetkilendirme OK — children'ı render et
  return <>{children}</>;
}
