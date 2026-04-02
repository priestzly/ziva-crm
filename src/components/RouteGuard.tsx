'use client';

import React, { useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { Loader2, Flame } from 'lucide-react';

interface RouteGuardProps {
  children: React.ReactNode;
  requiredRole?: 'admin' | 'client' | 'any';
}

/**
 * RouteGuard ensures that only authenticated users can access a route.
 * It also handles role-based access control.
 * 
 * If Auth is loading -> show a splash screen
 * If Auth has finished loading but no user or profile -> redirect to login
 * If user possesses a role that does not match requiredRole -> redirect to their default dashboard
 * Otherwise -> show children content
 */
export default function RouteGuard({ children, requiredRole }: RouteGuardProps) {
  const { user, profile, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // We only perform routing logic once the initial auth check has completed.
    if (loading) return;

    if (!user || !profile) {
      // Not authenticated or profile fetch failed -> send to login.
      router.replace('/login');
      return;
    }

    // Role check
    if (requiredRole && requiredRole !== 'any') {
      const userRole = profile.role?.toLowerCase();
      const targetRole = requiredRole.toLowerCase();
      
      if (userRole !== targetRole) {
        // Logged in user is on the wrong dashboard type, route them back to their home.
        console.warn(`[RouteGuard] Role mismatch: user=${userRole}, required=${targetRole}. Redirecting...`);
        const target = userRole === 'admin' ? '/admin/dashboard' : '/client/dashboard';
        router.replace(target);
      }
    }
  }, [loading, user, profile, requiredRole, router]);

  // While auth is still initializing, we show a clean, high-quality splash screen.
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-grid overflow-hidden">
        <div className="flex flex-col items-center gap-8 animate-fade-in relative z-10">
          <div className="relative group">
            <div className="absolute inset-0 bg-red-500 blur-2xl opacity-20 group-hover:opacity-40 transition-opacity rounded-full" />
            <div className="w-24 h-24 rounded-[2rem] bg-gradient-to-br from-red-600 to-orange-500 flex items-center justify-center shadow-2xl relative z-10 border border-white/10">
              <Flame className="w-12 h-12 text-white animate-pulse" />
            </div>
            <div className="absolute -bottom-2 -right-2 w-7 h-7 bg-emerald-500 rounded-full border-4 border-[hsl(225,15%,6%)] shadow-lg z-20" />
          </div>
          
          <div className="text-center space-y-3">
            <h2 className="text-2xl font-bold tracking-tight text-foreground gradient-text">Ziva Yangın</h2>
            <div className="flex items-center justify-center gap-3 text-sm text-muted-foreground font-medium">
              <Loader2 size={18} className="animate-spin text-primary" />
              <span>Sistem Başlatılıyor...</span>
            </div>
          </div>

          <div className="w-56 h-1.5 rounded-full overflow-hidden bg-white/5 border border-white/5 backdrop-blur-sm shadow-inner">
            <div className="h-full w-1/2 rounded-full bg-gradient-to-r from-red-600 via-orange-500 to-red-600 animate-shimmer-fast" />
          </div>
        </div>
        
        {/* Background Decorative Elements */}
        <div className="absolute top-1/4 -left-12 w-64 h-64 bg-primary/5 blur-[100px] rounded-full" />
        <div className="absolute bottom-1/4 -right-12 w-64 h-64 bg-orange-500/5 blur-[100px] rounded-full" />
      </div>
    );
  }

  // If user is missing or role is wrong, return null so we don't flash content before redirect happens.
  if (!user || !profile || (requiredRole && requiredRole !== 'any' && profile.role !== requiredRole)) {
    return null;
  }

  // Auth is done and successful!
  return <>{children}</>;
}
