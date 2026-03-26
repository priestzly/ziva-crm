import React from 'react';
import Link from 'next/link';
import { Flame, ArrowRight, ShieldCheck, Activity, Camera, LayoutDashboard, Zap, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-screen relative">
      {/* Ambient BG */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-15%] left-[10%] w-[40%] h-[50%] bg-red-500/[0.04] rounded-full blur-[120px]" />
        <div className="absolute bottom-[-15%] right-[10%] w-[40%] h-[50%] bg-orange-500/[0.03] rounded-full blur-[140px]" />
      </div>

      {/* Header */}
      <header className="px-6 h-16 flex items-center glass-strong sticky top-0 z-50">
        <Link className="flex items-center gap-2.5" href="/">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center shadow-lg shadow-red-500/20">
            <Flame className="h-4 w-4 text-white" />
          </div>
          <span className="font-bold text-lg tracking-tight">Ziva Yangın</span>
        </Link>
        <nav className="ml-auto">
          <Link 
            className="btn-primary px-5 py-2 rounded-xl text-sm flex items-center gap-2" 
            href="/login"
          >
            Giriş Yap <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </nav>
      </header>

      <main className="flex-1 relative z-10">
        {/* Hero */}
        <section className="w-full pt-24 pb-32 md:pt-36 md:pb-48">
          <div className="max-w-5xl mx-auto px-6 text-center">
            <div className="inline-flex items-center gap-2 rounded-full glass px-4 py-2 text-xs font-semibold text-red-400 mb-8 animate-fade-in">
              <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
              Profesyonel Servis Takip Sistemi
            </div>

            <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold tracking-tight leading-[1.05] mb-6 animate-fade-in" style={{ animationDelay: '0.1s' }}>
              <span className="gradient-text">Yangın Güvenliğinizi</span>
              <br />
              <span className="gradient-text-fire">Dijitale Taşıyın</span>
            </h1>

            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed font-light animate-fade-in" style={{ animationDelay: '0.2s' }}>
              Baca bakımı, yangın söndürme sistemleri ve tüm servis işlemlerinizi 
              fotoğraflı kanıtlarla AVM yönetimlerine şeffaf bir şekilde sunun.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center animate-fade-in" style={{ animationDelay: '0.3s' }}>
              <Link
                href="/login"
                className="btn-primary h-14 px-10 rounded-2xl text-base flex items-center justify-center gap-2 group"
              >
                Panele Giriş
                <LayoutDashboard className="w-5 h-5 group-hover:rotate-6 transition-transform" />
              </Link>
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="w-full py-24 relative">
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/[0.01] to-transparent pointer-events-none" />
          <div className="max-w-5xl mx-auto px-6">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight gradient-text mb-4">Neden Ziva?</h2>
              <p className="text-muted-foreground max-w-lg mx-auto">Modern altyapı ile bakım süreçlerinizi profesyonel bir düzeye taşıyın.</p>
            </div>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {[
                { icon: Lock, title: 'Güvenli Erişim', desc: 'Her AVM yönetimi sadece kendi verilerini görür. Çapraz erişim kesinlikle engellenir.', color: 'from-blue-500/15 to-blue-600/5 text-blue-400 border-blue-500/15' },
                { icon: Zap, title: 'Gerçek Zamanlı', desc: 'Tüm bakım kayıtları anlık olarak panele yansır. Beklemeye gerek yok.', color: 'from-amber-500/15 to-amber-600/5 text-amber-400 border-amber-500/15' },
                { icon: Camera, title: 'Fotoğraflı Kanıt', desc: 'Servis sonrası çekilen görseller otomatik olarak ilgili kaydın altında arşivlenir.', color: 'from-emerald-500/15 to-emerald-600/5 text-emerald-400 border-emerald-500/15' },
              ].map((f, i) => {
                const Icon = f.icon;
                return (
                  <div key={i} className="glass card-hover rounded-2xl p-8 text-center group animate-fade-in" style={{ animationDelay: `${i * 0.1}s` }}>
                    <div className={cn("w-14 h-14 rounded-2xl bg-gradient-to-br border mx-auto mb-5 flex items-center justify-center group-hover:scale-110 transition-transform duration-300", f.color)}>
                      <Icon size={24} />
                    </div>
                    <h3 className="text-lg font-bold mb-2">{f.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/[0.04] py-8 relative z-10">
        <div className="max-w-5xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Flame size={14} className="text-red-500" />
            <p className="text-xs text-muted-foreground">© 2024 Ziva Yangın. Tüm Hakları Saklıdır.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
