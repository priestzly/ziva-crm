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
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-5 animate-fade-in">
          <span className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#e8361c] to-[#ff6a2b] flex items-center justify-center shadow-lg shadow-[#e8361c]/25">
            <Flame className="w-7 h-7 text-white" fill="currentColor" />
          </span>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 size={16} className="animate-spin text-primary" />
            Yükleniyor…
          </div>
        </div>
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
