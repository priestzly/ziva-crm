import { type NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
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
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value);
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  // getUser() ile server-side token doğrulaması yap (güvenlik best-practice)
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  const url = new URL(request.url);
  const pathname = url.pathname;

  // Public route'lar — auth gerekmez
  const publicPaths = ['/', '/login', '/signup', '/forgot-password'];
  const isPublicPath = publicPaths.some(path => pathname === path || pathname.startsWith(path + '/'));

  // API route'lar da public
  const isApiPath = pathname.startsWith('/api');

  // Protected route'lara session olmadan erişim → login'e yönlendir
  if (!isPublicPath && !isApiPath && (!user || error)) {
    const redirectUrl = new URL('/login', request.url);
    redirectUrl.searchParams.set('redirectedFrom', pathname);
    return NextResponse.redirect(redirectUrl);
  }

  // Login sayfasında zaten session varsa → profil tablosundaki role göre yönlendir
  if (pathname === '/login' && user && !error) {
    // Profili middleware'dan çekmeye gerek yok — client-side'da AuthContext halleder
    // Ama basit bir yönlendirme yapalım: profilden role çek
    try {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      const role = profileData?.role || 'client';
      const target = role === 'admin' ? '/admin/dashboard' : '/client/dashboard';
      return NextResponse.redirect(new URL(target, request.url));
    } catch {
      // Profil çekilemezse client dashboard'a yönlendir, oradan RouteGuard halleder
      return NextResponse.redirect(new URL('/client/dashboard', request.url));
    }
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public assets
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
