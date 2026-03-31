'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import Link from 'next/link';
import { 
  Flame, ArrowRight, ShieldCheck, Settings, Users, 
  MapPin, Phone, Mail, ChevronRight, CheckCircle2,
  Lock, Building2, ClipboardCheck, Award, Zap, ExternalLink
} from 'lucide-react';

/* ─── Scroll Reveal Hook ─── */
function useReveal() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { el.classList.add('visible'); obs.unobserve(el); } },
      { threshold: 0.15 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return ref;
}

/* ─── Animated Counter ─── */
function Counter({ target, suffix = '', duration = 2000 }: { target: number; suffix?: string; duration?: number }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const started = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !started.current) {
        started.current = true;
        const start = performance.now();
        const step = (now: number) => {
          const progress = Math.min((now - start) / duration, 1);
          const eased = 1 - Math.pow(1 - progress, 3); // easeOutCubic
          setCount(Math.floor(eased * target));
          if (progress < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
      }
    }, { threshold: 0.5 });
    obs.observe(el);
    return () => obs.disconnect();
  }, [target, duration]);

  return <span ref={ref}>{count}{suffix}</span>;
}

/* ─── Reveal Section Wrapper ─── */
function RevealSection({ children, className = '', delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  const ref = useReveal();
  return (
    <div ref={ref} className={`reveal ${className}`} style={{ transitionDelay: `${delay}ms` }}>
      {children}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════ */

export default function LandingPage() {
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const handle = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handle, { passive: true });
    return () => window.removeEventListener('scroll', handle);
  }, []);

  const services = [
    { 
      title: 'Baca Temizliği', 
      desc: 'Katı yakıtlı, doğalgazlı ve endüstriyel baca sistemlerinin profesyonel temizliği ile yangın riskini minimize ediyoruz.', 
      icon: Settings,
      color: 'from-orange-500 to-red-600',
      tags: ['Yağlı Kanal', 'Isınma Bacaları', 'Endüstriyel']
    },
    { 
      title: 'Yangın Söndürme', 
      desc: 'Sprinkler, gazlı söndürme ve yangın dolapları: projelendirme, montaj ve periyodik bakım hizmetleri.', 
      icon: Flame,
      color: 'from-red-500 to-pink-600',
      tags: ['Sprinkler', 'Gazlı Söndürme', 'Pano Söndürme']
    },
    { 
      title: 'İtfaiye Raporu', 
      desc: 'Resmi yönetmeliklere uygun denetimler, çalışma ruhsatı süreçleri ve teknik onay desteği sağlıyoruz.',
      icon: ClipboardCheck,
      color: 'from-blue-500 to-indigo-600',
      tags: ['Ruhsat Desteği', 'Denetim', 'Teknik Onay']
    },
    { 
      title: 'İSG Eğitimi', 
      desc: 'İş Sağlığı ve Güvenliği kapsamında personel yangın eğitimi ve acil durum tatbikatları düzenliyoruz.',
      icon: Users,
      color: 'from-emerald-500 to-teal-600',
      tags: ['Yangın Eğitimi', 'Tatbikat', 'Bilinçlendirme']
    },
  ];

  return (
    <div className="flex flex-col min-h-screen bg-[#0a0a0f] text-white overflow-x-hidden">

      {/* ═══ LIVING BACKGROUND ═══ */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[10%] left-[5%] w-96 h-96 bg-red-500/[0.08] rounded-full blur-[100px] animate-float" />
        <div className="absolute top-[60%] right-[10%] w-80 h-80 bg-orange-500/[0.06] rounded-full blur-[120px] animate-float-delayed" />
        <div className="absolute top-[30%] right-[30%] w-64 h-64 bg-rose-500/[0.04] rounded-full blur-[90px] animate-float-slow" />
        {/* Rotating ring */}
        <div className="absolute top-[15%] right-[15%] w-[500px] h-[500px] border border-white/[0.02] rounded-full animate-spin-slow" />
        <div className="absolute top-[15%] right-[15%] w-[500px] h-[500px] border border-white/[0.015] rounded-full animate-spin-slow" style={{ animationDirection: 'reverse', animationDuration: '30s' }} />
      </div>

      {/* ═══ HEADER ═══ */}
      <header className={`px-6 h-20 flex items-center sticky top-0 z-50 transition-all duration-500 ${scrollY > 50 ? 'bg-[#0a0a0f]/80 backdrop-blur-xl border-b border-white/[0.06]' : 'bg-transparent'}`}>
        <div className="max-w-7xl mx-auto w-full flex items-center justify-between">
          <Link className="flex items-center gap-3 group" href="/">
            <div className="relative">
              <div className="absolute inset-0 bg-red-500/40 blur-xl rounded-full group-hover:bg-red-500/60 transition-all" />
              <div className="relative w-11 h-11 rounded-xl bg-gradient-to-br from-red-500 to-orange-600 flex items-center justify-center animate-gradient">
                <Flame className="h-5 w-5 text-white drop-shadow-lg" fill="currentColor" />
              </div>
            </div>
            <div className="flex flex-col">
              <span className="font-black text-lg tracking-tight leading-none">ZIVA YANGIN</span>
              <span className="text-[8px] font-semibold tracking-[0.25em] text-white/40 mt-0.5">GÜVENLİK SİSTEMLERİ & BACA TEMİZLİĞİ</span>
            </div>
          </Link>
          
          <nav className="hidden lg:flex items-center gap-8">
            {[
              { label: 'Hizmetler', href: '#hizmetler' },
              { label: 'Hakkımızda', href: '#hakkimizda' },
              { label: 'İletişim', href: '#iletisim' },
            ].map((item) => (
              <a key={item.label} href={item.href} className="text-[11px] font-semibold text-white/50 hover:text-white transition-all duration-300 relative group">
                {item.label}
                <span className="absolute -bottom-1 left-0 w-0 h-px bg-red-500 group-hover:w-full transition-all duration-300" />
              </a>
            ))}
          </nav>

          <Link href="/login" className="group flex items-center gap-2 bg-white text-black px-5 py-2.5 rounded-full text-[11px] font-bold hover:bg-red-500 hover:text-white transition-all duration-300 shadow-lg shadow-white/5 hover:shadow-red-500/20">
            Müşteri Portalı
            <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      </header>

      <main className="flex-1 relative z-10">

        {/* ═══ HERO ═══ */}
        <section className="min-h-[90vh] flex items-center relative">
          <div className="max-w-7xl mx-auto px-6 w-full grid lg:grid-cols-2 gap-16 items-center py-20">
            
            {/* Left: Content */}
            <div className="space-y-8">
              <div className="inline-flex items-center gap-3 bg-white/[0.04] border border-white/[0.08] rounded-full pl-1.5 pr-4 py-1.5 backdrop-blur-sm">
                <span className="bg-red-500 text-white text-[9px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider">Yeni</span>
                <span className="text-[11px] text-white/60 font-medium">Online Müşteri Takip Portalı Aktif</span>
              </div>

              <h1 className="text-[clamp(2.5rem,6vw,5rem)] font-black leading-[0.95] tracking-tight">
                Yangın tehlikelerine karşı{' '}
                <span className="relative inline-block">
                  <span className="bg-gradient-to-r from-red-400 via-orange-400 to-red-500 bg-clip-text text-transparent animate-gradient bg-[length:200%_auto]">
                    güvenliğinizi
                  </span>
                </span>
                <br />
                titizlik ve kalite ile sağlıyoruz.
              </h1>

              <p className="text-white/50 text-lg max-w-lg leading-relaxed">
                25 yılı aşkın sektör deneyimimiz ile konut, ticari ve endüstriyel tesisleriniz için dünya standartlarında güvenlik çözümleri sunuyoruz.
              </p>

              <div className="flex flex-wrap gap-4 pt-4">
                <a href="tel:+905324790828" className="group flex items-center gap-3 bg-gradient-to-r from-red-500 to-orange-600 px-7 py-4 rounded-2xl font-bold text-sm hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 shadow-xl shadow-red-500/20 hover:shadow-red-500/40">
                  <Phone size={18} />
                  Hemen Arayın
                  <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                </a>
                <Link href="/login" className="flex items-center gap-3 bg-white/[0.05] border border-white/[0.1] px-7 py-4 rounded-2xl font-bold text-sm text-white/80 hover:bg-white/[0.1] hover:border-white/[0.15] transition-all duration-200 backdrop-blur-sm">
                  <Lock size={16} />
                  Portal Girişi
                </Link>
              </div>

              {/* Trust strip */}
              <div className="flex items-center gap-6 pt-4">
                <div className="flex -space-x-2">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="w-8 h-8 rounded-full bg-gradient-to-br from-slate-700 to-slate-800 border-2 border-[#0a0a0f] flex items-center justify-center text-[9px] font-bold text-white/60">
                      {['AVM', 'OTL', 'PLZ', 'RSN'][i]}
                    </div>
                  ))}
                </div>
                <div>
                  <p className="text-[11px] font-bold text-white/70">Güvenen işletmeler</p>
                  <p className="text-[10px] text-white/40">Türkiye genelinde aktif müşteriler</p>
                </div>
              </div>
            </div>

            {/* Right: Visual */}
            <div className="relative hidden lg:flex items-center justify-center">
              {/* Glow */}
              <div className="absolute inset-0 bg-gradient-to-br from-red-500/20 to-orange-500/10 blur-[80px] rounded-full animate-glow" />
              
              {/* Central badge */}
              <div className="relative">
                {/* Orbiting ring */}
                <div className="absolute -inset-16 border border-white/[0.04] rounded-full animate-spin-slow" />
                <div className="absolute -inset-32 border border-dashed border-white/[0.03] rounded-full animate-spin-slow" style={{ animationDirection: 'reverse', animationDuration: '40s' }} />
                
                {/* Floating pills */}
                <div className="absolute -top-8 -right-12 bg-white/[0.04] backdrop-blur-xl border border-white/[0.08] px-4 py-2 rounded-full animate-float text-[10px] font-semibold text-white/60 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  7/24 Aktif Destek
                </div>
                <div className="absolute -bottom-4 -left-16 bg-white/[0.04] backdrop-blur-xl border border-white/[0.08] px-4 py-2 rounded-full animate-float-delayed text-[10px] font-semibold text-white/60 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                  Sertifikalı Ekipman
                </div>
                <div className="absolute top-1/2 -right-24 bg-white/[0.04] backdrop-blur-xl border border-white/[0.08] px-4 py-2 rounded-full animate-float-slow text-[10px] font-semibold text-white/60 flex items-center gap-2">
                  <ShieldCheck size={12} className="text-blue-400" />
                  İSG Uyumlu
                </div>

                {/* Center piece */}
                <div className="w-64 h-64 rounded-[3rem] bg-gradient-to-br from-red-500/20 to-orange-500/10 border border-white/[0.06] backdrop-blur-xl flex flex-col items-center justify-center gap-4 shadow-2xl">
                  <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-red-500 to-orange-600 flex items-center justify-center shadow-lg shadow-red-500/30 animate-gradient">
                    <Flame size={36} className="text-white drop-shadow-lg" fill="currentColor" />
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-black tracking-tight">25+ Yıl</p>
                    <p className="text-[10px] text-white/40 font-medium tracking-widest uppercase">Sektör Tecrübesi</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ═══ MARQUEE TICKER ═══ */}
        <div className="border-y border-white/[0.04] py-5 overflow-hidden relative">
          <div className="absolute left-0 top-0 bottom-0 w-24 bg-gradient-to-r from-[#0a0a0f] to-transparent z-10" />
          <div className="absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-[#0a0a0f] to-transparent z-10" />
          <div className="flex animate-marquee whitespace-nowrap">
            {[...Array(2)].map((_, setIdx) => (
              <React.Fragment key={setIdx}>
                {['Baca Temizliği', 'Yangın Söndürme Sistemleri', 'İtfaiye Raporu', 'İSG Eğitimi', 'Sprinkler Montajı', 'Gazlı Söndürme', 'Periyodik Bakım', 'Teknik Denetim', 'Keşif & Proje'].map((text, i) => (
                  <span key={`${setIdx}-${i}`} className="mx-8 text-[11px] font-semibold text-white/20 uppercase tracking-[0.3em] flex items-center gap-3">
                    <span className="w-1 h-1 rounded-full bg-red-500/40" />
                    {text}
                  </span>
                ))}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* ═══ STATS ═══ */}
        <section className="py-24 relative">
          <div className="max-w-5xl mx-auto px-6">
            <RevealSection>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                {[
                  { target: 25, suffix: '+', label: 'Yıllık Tecrübe' },
                  { target: 500, suffix: '+', label: 'Mutlu Müşteri' },
                  { target: 7, suffix: '/24', label: 'Kesintisiz Destek' },
                  { target: 100, suffix: '%', label: 'Müşteri Memnuniyeti' },
                ].map((stat, i) => (
                  <div key={i} className="text-center group">
                    <p className="text-4xl md:text-5xl font-black tracking-tight text-white tabular-nums">
                      <Counter target={stat.target} suffix={stat.suffix} />
                    </p>
                    <p className="text-[10px] font-semibold text-white/30 uppercase tracking-[0.2em] mt-2">{stat.label}</p>
                  </div>
                ))}
              </div>
            </RevealSection>
          </div>
        </section>

        {/* ═══ SERVICES ═══ */}
        <section id="hizmetler" className="py-24 relative">
          <div className="max-w-7xl mx-auto px-6">
            <RevealSection className="mb-20">
              <div className="max-w-2xl">
                <p className="text-red-500 text-[11px] font-bold uppercase tracking-[0.3em] mb-4">Ana Hizmet Alanlarımız</p>
                <h2 className="text-4xl md:text-5xl font-black tracking-tight leading-tight">
                  Neler yapıyoruz<span className="text-red-500">?</span>
                </h2>
                <p className="text-white/40 mt-4 leading-relaxed">
                  Yangın sistemleri montajı ve baca temizliği konusunda kapsamlı çözümler sunuyoruz.
                </p>
              </div>
            </RevealSection>

            <div className="grid md:grid-cols-2 gap-6">
              {services.map((service, i) => {
                const Icon = service.icon;
                return (
                  <RevealSection key={i} delay={i * 100}>
                    <div className="group relative rounded-3xl p-8 bg-white/[0.02] border border-white/[0.06] hover:border-white/[0.12] hover:bg-white/[0.04] transition-all duration-500 cursor-default overflow-hidden">
                      {/* Hover glow */}
                      <div className={`absolute top-0 right-0 w-48 h-48 bg-gradient-to-br ${service.color} opacity-0 group-hover:opacity-[0.06] blur-[60px] transition-opacity duration-700`} />
                      
                      <div className="relative z-10 flex gap-6">
                        <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${service.color} flex items-center justify-center shrink-0 shadow-lg group-hover:scale-110 group-hover:rotate-3 transition-all duration-500`}>
                          <Icon size={22} className="text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-xl font-bold mb-2 group-hover:text-red-400 transition-colors duration-300">{service.title}</h3>
                          <p className="text-[13px] text-white/40 leading-relaxed mb-5 group-hover:text-white/60 transition-colors">{service.desc}</p>
                          <div className="flex flex-wrap gap-2">
                            {service.tags.map(tag => (
                              <span key={tag} className="text-[9px] font-semibold text-white/30 bg-white/[0.04] px-3 py-1.5 rounded-full uppercase tracking-wider group-hover:text-white/60 group-hover:bg-white/[0.08] transition-all">
                                {tag}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </RevealSection>
                );
              })}
            </div>
          </div>
        </section>

        {/* ═══ WHY US ═══ */}
        <section id="hakkimizda" className="py-32 relative">
          <div className="max-w-7xl mx-auto px-6">
            <div className="grid lg:grid-cols-5 gap-16 items-center">
              <div className="lg:col-span-3 space-y-10">
                <RevealSection>
                  <p className="text-red-500 text-[11px] font-bold uppercase tracking-[0.3em] mb-4">Neden en iyi seçiminiz biziz?</p>
                  <h2 className="text-4xl md:text-5xl font-black tracking-tight leading-tight">
                    Yenilikçi çözümler,<br />
                    <span className="text-white/40">sertifikalı güven.</span>
                  </h2>
                </RevealSection>
                
                <div className="grid sm:grid-cols-3 gap-6">
                  {[
                    { icon: Zap, title: 'Yenilikçi Çözümler', desc: 'En son teknoloji ile yangın güvenliğinde ileri düzey çözümler üretiyoruz.' },
                    { icon: Award, title: 'Sertifikalı Ekipman', desc: 'Dünya standartlarına uygun, kalite belgeleri olan ekipmanlar kullanıyoruz.' },
                    { icon: ShieldCheck, title: 'Uzmanlık & Tecrübe', desc: '25 yılı aşkın deneyim ile güvenliğinizi titizlikle sağlıyoruz.' },
                  ].map((item, i) => {
                    const Icon = item.icon;
                    return (
                      <RevealSection key={i} delay={i * 150}>
                        <div className="group space-y-4 p-6 rounded-2xl hover:bg-white/[0.03] transition-all duration-300">
                          <div className="w-12 h-12 rounded-xl bg-red-500/10 flex items-center justify-center text-red-400 group-hover:bg-red-500 group-hover:text-white transition-all duration-300">
                            <Icon size={20} />
                          </div>
                          <h4 className="font-bold text-sm">{item.title}</h4>
                          <p className="text-[12px] text-white/35 leading-relaxed">{item.desc}</p>
                        </div>
                      </RevealSection>
                    );
                  })}
                </div>
              </div>

              <div className="lg:col-span-2">
                <RevealSection delay={200}>
                  <div className="relative">
                    <div className="absolute -inset-4 bg-red-500/10 blur-[60px] rounded-full animate-glow" />
                    <div className="relative bg-gradient-to-br from-white/[0.04] to-white/[0.01] border border-white/[0.06] rounded-[2rem] p-10 space-y-8">
                      <div className="space-y-6">
                        <div className="flex items-center justify-between p-4 rounded-xl bg-white/[0.03]">
                          <span className="text-[11px] font-semibold text-white/50">Müşteri Desteği</span>
                          <span className="text-lg font-black text-emerald-400">7/24</span>
                        </div>
                        <div className="flex items-center justify-between p-4 rounded-xl bg-white/[0.03]">
                          <span className="text-[11px] font-semibold text-white/50">Memnuniyet Oranı</span>
                          <span className="text-lg font-black text-white">%100</span>
                        </div>
                        <div className="flex items-center justify-between p-4 rounded-xl bg-white/[0.03]">
                          <span className="text-[11px] font-semibold text-white/50">Aktif Hizmet Bölgesi</span>
                          <span className="text-lg font-black text-white">İstanbul</span>
                        </div>
                      </div>
                      <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                      <a href="tel:+905324790828" className="flex items-center justify-between group cursor-pointer">
                        <span className="text-[11px] font-bold text-white/50 group-hover:text-white transition-colors">Ücretsiz keşif randevusu</span>
                        <div className="w-8 h-8 rounded-full bg-red-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                          <Phone size={14} className="text-white" />
                        </div>
                      </a>
                    </div>
                  </div>
                </RevealSection>
              </div>
            </div>
          </div>
        </section>

        {/* ═══ CTA / PORTAL ═══ */}
        <section className="py-32 relative">
          <div className="max-w-4xl mx-auto px-6">
            <RevealSection>
              <div className="relative rounded-[2.5rem] overflow-hidden">
                {/* BG */}
                <div className="absolute inset-0 bg-gradient-to-br from-red-500/20 via-orange-500/10 to-red-600/20 animate-gradient bg-[length:200%_200%]" />
                <div className="absolute inset-0 bg-[#0a0a0f]/60 backdrop-blur-xl" />
                <div className="absolute inset-[1px] rounded-[2.5rem] border border-white/[0.08]" />
                
                <div className="relative px-10 py-16 md:px-16 md:py-20 text-center space-y-8">
                  <div className="w-16 h-16 rounded-2xl bg-white/[0.06] border border-white/[0.1] mx-auto flex items-center justify-center backdrop-blur-sm">
                    <Building2 size={28} className="text-red-400" />
                  </div>
                  <div className="space-y-4">
                    <h3 className="text-3xl md:text-4xl font-black tracking-tight">Müşteri Takip Portalı</h3>
                    <p className="text-white/40 max-w-md mx-auto leading-relaxed text-[14px]">
                      İşletmenize ait baca temizliği kayıtlarını, itfaiye raporlarını ve servis fotoğraflarını online portalımızdan takip edin.
                    </p>
                  </div>
                  <Link href="/login" className="inline-flex items-center gap-3 bg-white text-black px-8 py-4 rounded-2xl font-bold text-sm hover:bg-red-500 hover:text-white transition-all duration-300 shadow-xl shadow-white/10 hover:shadow-red-500/30 hover:scale-[1.02] active:scale-[0.98]">
                    Portala Giriş Yap
                    <ArrowRight size={16} />
                  </Link>
                </div>
              </div>
            </RevealSection>
          </div>
        </section>
      </main>

      {/* ═══ FOOTER ═══ */}
      <footer id="iletisim" className="border-t border-white/[0.04] pt-20 pb-8 relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid gap-16 lg:grid-cols-12 pb-16">
            {/* Brand */}
            <div className="lg:col-span-5 space-y-6">
              <Link className="flex items-center gap-3" href="/">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500 to-orange-600 flex items-center justify-center">
                  <Flame className="h-5 w-5 text-white" fill="currentColor" />
                </div>
                <span className="font-black text-lg tracking-tight">ZIVA YANGIN</span>
              </Link>
              <p className="text-sm text-white/30 max-w-sm leading-relaxed">
                Ziva Yangın Söndürme Sistemleri ve Baca Temizliği Ltd. Şti. — 25 yıllık profesyonel tecrübe ile güvenliğinizi titizlikle sağlıyoruz.
              </p>
            </div>

            {/* Quick links */}
            <div className="lg:col-span-2">
              <p className="text-[10px] font-bold text-white/20 uppercase tracking-[0.3em] mb-6">Hizmetler</p>
              <div className="space-y-3">
                {['Baca Temizliği', 'Yangın Sistemleri', 'İtfaiye Raporu', 'İSG Eğitimi'].map(l => (
                  <p key={l} className="text-[12px] text-white/40 hover:text-white transition-colors cursor-pointer">{l}</p>
                ))}
              </div>
            </div>

            {/* Contact */}
            <div className="lg:col-span-5 space-y-6">
              <p className="text-[10px] font-bold text-white/20 uppercase tracking-[0.3em] mb-6">İletişim</p>
              <div className="space-y-4">
                <a href="tel:+905324790828" className="flex items-center gap-3 group">
                  <Phone size={16} className="text-red-400" />
                  <span className="text-sm font-bold text-white/60 group-hover:text-white transition-colors">+90 532 479 08 28</span>
                </a>
                <a href="mailto:admin@zivabacayangin.com" className="flex items-center gap-3 group">
                  <Mail size={16} className="text-red-400" />
                  <span className="text-sm font-bold text-white/60 group-hover:text-white transition-colors">admin@zivabacayangin.com</span>
                </a>
                <div className="flex items-start gap-3">
                  <MapPin size={16} className="text-red-400 shrink-0 mt-0.5" />
                  <span className="text-sm text-white/40">Kazım Karabekir Mah. 859. Cad. No:1A<br />Gaziosmanpaşa / İstanbul</span>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom */}
          <div className="border-t border-white/[0.04] pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-[10px] text-white/20 font-medium">© 2024 Ziva Baca Yangın Ltd. Şti. Tüm hakları saklıdır.</p>
            <div className="flex items-center gap-1 text-[10px] text-white/20">
              <span className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
              <span>7/24 Teknik Destek Aktif</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
