import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // IMPORTANT: Avoid writing any logic between createServerClient and
  // supabase.auth.getUser(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isAuthRoute = request.nextUrl.pathname.startsWith('/login');
  
  // Protect /admin and /client routes
  const isAdminRoute = request.nextUrl.pathname.startsWith('/admin');
  const isClientRoute = request.nextUrl.pathname.startsWith('/client');
  const isProtectedRoute = isAdminRoute || isClientRoute;
  
  if (!user && isProtectedRoute) {
    // Session not found or expired, redirect to login
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  // If user is logged in, handle their role routing
  if (user) {
    // Fetch profile to know the role
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();

    if (profile) {
      // 1. Logged in user tries to visit login or root
      if (isAuthRoute || request.nextUrl.pathname === '/') {
        const url = request.nextUrl.clone();
        url.pathname = profile.role === 'admin' ? '/admin/dashboard' : '/client/dashboard';
        return NextResponse.redirect(url);
      }

      // 2. Cross-role boundary checks
      if (profile.role === 'client' && isAdminRoute) {
        // Client trying to access admin - Protect Admin Area
        const url = request.nextUrl.clone();
        url.pathname = '/client/dashboard';
        return NextResponse.redirect(url);
      }
      
      // Note: Admin can access both /admin and /client, so no bounce needed for Admins.
    }
  }

  return supabaseResponse;
}
