'use client';

import React, { useState } from 'react';
import { Flame, Lock, Mail, ArrowRight, Loader2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { signIn, profile, user } = useAuth();
  const router = useRouter();

  // Handle redirection centrally based on the reactive profile state
  React.useEffect(() => {
    if (user && profile) {
      router.refresh(); // Crucial for @supabase/ssr to sync the cookie into Next.js Server context
      if (profile.role === 'admin') {
        router.replace('/admin/dashboard');
      } else {
        router.replace('/client/dashboard');
      }
    }
  }, [user, profile, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const finalEmail = email.includes('@') ? email : `${email.toLowerCase().trim()}@ziva.internal`;

    try {
      const { error: signInError } = await signIn(finalEmail, password);
      
      if (signInError) {
        setError('E-posta veya şifre hatalı.');
        setLoading(false);
      }
      // Redirection is handled by the useEffect above
    } catch (err) {
      setError('Bir hata oluştu. Lütfen tekrar deneyin.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {/* Ambient background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[60%] bg-red-500/[0.04] rounded-full blur-[120px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[60%] bg-orange-500/[0.03] rounded-full blur-[140px]" />
        <div className="absolute top-[30%] right-[20%] w-[20%] h-[30%] bg-red-600/[0.02] rounded-full blur-[100px] animate-float" />
      </div>

      <div className="w-full max-w-[420px] relative z-10">
        {/* Logo */}
        <div className="text-center mb-10 animate-fade-in">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-primary mb-6 shadow-2xl shadow-primary/20 bg-grid">
            <Flame className="w-10 h-10 text-white" fill="currentColor" />
          </div>
          <h1 className="text-3xl font-black tracking-tighter uppercase italic gradient-text mb-1.5 flex flex-col">
            ZIVA <span className="text-primary not-italic tracking-normal">BACA YANGIN</span>
          </h1>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Müşteri & Personel Takip Portalı</p>
        </div>

        {/* Card */}
        <div className="glass-strong rounded-3xl p-8 animate-fade-in" style={{ animationDelay: '0.1s' }}>
          <div className="mb-8">
            <h2 className="text-xl font-bold">Giriş Yap</h2>
            <p className="text-sm text-muted-foreground mt-1">Hesabınıza erişmek için bilgilerinizi girin</p>
          </div>

          {error && (
            <div className="mb-6 p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-medium">
              {error}
            </div>
          )}

          <form className="space-y-5" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Kullanıcı Adı veya E-posta
              </label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Örn: akasya_avm"
                  required
                  className="w-full input-premium pl-11"
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Şifre</label>
              </div>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full input-premium pl-11"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary py-3.5 rounded-2xl flex items-center justify-center gap-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  Giriş Yap
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>

        <p className="text-center mt-8 text-xs text-muted-foreground animate-fade-in" style={{ animationDelay: '0.2s' }}>
          Erişim sorunu yaşıyorsanız yöneticiniz ile iletişime geçin.
        </p>
      </div>
    </div>
  );
}
