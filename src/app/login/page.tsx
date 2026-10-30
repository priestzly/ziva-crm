'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Flame, Lock, User, ArrowRight, ArrowLeft, ShieldCheck, Camera, FileText } from 'lucide-react';
import { Button, ErrorBanner } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { signIn, profile, user } = useAuth();
  const router = useRouter();

  // Kullanıcı zaten giriş yapmışsa dashboard'a yönlendir
  React.useEffect(() => {
    if (user && profile) {
      const targetUrl = profile.role === 'admin' ? '/admin/dashboard' : '/client/dashboard';
      router.replace(targetUrl);
    }
  }, [user, profile, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const isLikelyUsername = !email.includes('@');
    const finalEmail = isLikelyUsername ? `${email.toLowerCase().trim()}@ziva.com.tr` : email;

    try {
      let { error: signInError } = await signIn(finalEmail, password);
      
      // Fallback for older users with @ziva.internal
      if (signInError && isLikelyUsername) {
        const oldEmail = `${email.toLowerCase().trim()}@ziva.internal`;
        const { error: oldSignInError } = await signIn(oldEmail, password);
        signInError = oldSignInError;
      }

      if (signInError) {
        setError('Kullanıcı adı veya şifre hatalı.');
        setLoading(false);
      }
      // Giriş başarılıysa onAuthStateChange → profile set → useEffect redirect yapacak
    } catch (err) {
      setError('Bir hata oluştu. Lütfen tekrar deneyin.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-[1.05fr_1fr] bg-background">
      {/* Brand panel (always dark, brand colors) */}
      <aside className="relative hidden lg:flex flex-col justify-between overflow-hidden bg-[#0d0908] text-[#f7f0ea] p-12">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'radial-gradient(55% 45% at 80% 85%, rgba(255,106,43,.28), transparent 70%), radial-gradient(40% 40% at 10% 10%, rgba(232,54,28,.2), transparent 70%), repeating-linear-gradient(135deg, rgba(255,255,255,.025) 0 1px, transparent 1px 22px)',
          }}
        />
        <Flame className="absolute -right-24 -bottom-24 w-[28rem] h-[28rem] text-white/[0.04]" strokeWidth={1} aria-hidden />

        <Link href="/" className="relative flex items-center gap-3 w-fit">
          <span className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#e8361c] to-[#ff6a2b] flex items-center justify-center shadow-lg shadow-[#e8361c]/30">
            <Flame size={19} className="text-white" fill="currentColor" />
          </span>
          <span className="font-bold tracking-tight">Ziva Yangın</span>
        </Link>

        <div className="relative max-w-md">
          <h2 className="text-4xl font-bold tracking-tight leading-[1.1]">
            Servis kayıtlarınız, raporlarınız ve fotoğraflarınız tek yerde.
          </h2>
          <ul className="mt-8 space-y-4 text-[15px] text-[#f7f0ea]/75">
            <li className="flex items-center gap-3"><ShieldCheck size={18} className="text-[#ff6a2b]" /> İtfaiye ve bakım raporlarına anında erişim</li>
            <li className="flex items-center gap-3"><Camera size={18} className="text-[#ff6a2b]" /> Her servisin önce / sonra fotoğrafları</li>
            <li className="flex items-center gap-3"><FileText size={18} className="text-[#ff6a2b]" /> PDF olarak indirilebilir servis raporları</li>
          </ul>
        </div>

        <p className="relative text-sm text-[#f7f0ea]/50">© {new Date().getFullYear()} Ziva Yangın · 7/24 destek: +90 532 479 08 28</p>
      </aside>

      {/* Form */}
      <main className="flex flex-col px-5 py-6 sm:px-10">
        <div className="flex items-center justify-between">
          <Link href="/" className="lg:hidden flex items-center gap-2.5">
            <span className="w-9 h-9 rounded-[10px] bg-gradient-to-br from-[#e8361c] to-[#ff6a2b] flex items-center justify-center">
              <Flame size={17} className="text-white" fill="currentColor" />
            </span>
            <span className="font-bold tracking-tight text-foreground">Ziva Yangın</span>
          </Link>
          <Link href="/" className="p-btn p-btn-ghost p-btn-sm ml-auto">
            <ArrowLeft size={14} /> Ana sayfa
          </Link>
        </div>

        <div className="flex-1 flex items-center justify-center py-10">
          <div className="w-full max-w-sm">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Portala giriş yapın</h1>
            <p className="mt-1.5 text-sm text-muted-foreground">Size verilen kullanıcı adı ve şifreyle giriş yapın.</p>

            {error && <ErrorBanner message={error} className="mt-6" />}

            <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
              <div>
                <label htmlFor="login-user" className="p-label">Kullanıcı adı veya e-posta</label>
                <div className="relative">
                  <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                  <input
                    id="login-user"
                    type="text"
                    autoComplete="username"
                    autoCapitalize="none"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Örn: akasya_avm"
                    required
                    className="p-input pl-9 h-11"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="login-pass" className="p-label">Şifre</label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                  <input
                    id="login-pass"
                    type="password"
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="p-input pl-9 h-11"
                  />
                </div>
              </div>

              <Button type="submit" size="lg" loading={loading} className="w-full">
                Giriş yap {!loading && <ArrowRight size={16} />}
              </Button>
            </form>

            <p className="mt-8 text-sm text-muted-foreground">
              Şifrenizi mi unuttunuz? Yöneticinizle ya da{' '}
              <a href="tel:+905324790828" className="font-medium text-primary hover:underline">+90 532 479 08 28</a>{' '}
              numarasından bizimle iletişime geçin.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
