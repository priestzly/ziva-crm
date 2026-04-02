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

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;
  const isAuthRoute = pathname.startsWith('/login');
  const isAdminRoute = pathname.startsWith('/admin');
  const isClientRoute = pathname.startsWith('/client');
  const isProtectedRoute = isAdminRoute || isClientRoute;
  
  // Public routes that should redirect authenticated users
  const isPublicRoute = isAuthRoute || pathname === '/';
  
  if (!user) {
    // No user - protect authenticated routes
    if (isProtectedRoute) {
      const url = request.nextUrl.clone();
      url.pathname = '/login';
      return NextResponse.redirect(url);
    }
    // Allow access to public routes (including landing page and login)
    return supabaseResponse;
  }

  // User is authenticated - fetch profile for role-based routing
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();

  if (!profile) {
    // Profile not found - let them through, client-side will handle it
    return supabaseResponse;
  }

  // Redirect authenticated users away from public routes
  if (isPublicRoute) {
    const url = request.nextUrl.clone();
    url.pathname = profile.role === 'admin' ? '/admin/dashboard' : '/client/dashboard';
    return NextResponse.redirect(url);
  }

  // Role boundary checks: clients cannot access admin routes
  if (profile.role === 'client' && isAdminRoute) {
    const url = request.nextUrl.clone();
    url.pathname = '/client/dashboard';
    return NextResponse.redirect(url);
  }

  // All good - let the request through
  return supabaseResponse;
}
