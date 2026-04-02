'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { 
  Flame, ArrowRight, ShieldCheck, Settings, Users, 
  MapPin, Phone, Mail, ClipboardCheck, CheckCircle2,
  Lock, Clock, Building2, Award, ChevronRight
} from 'lucide-react';

/* ─── Scroll Reveal Hook ─── */
function useReveal() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { el.classList.add('visible'); obs.unobserve(el); } },
      { threshold: 0.12 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return ref;
}

function Reveal({ children, delay = 0, className = '' }: { children: React.ReactNode; delay?: number; className?: string }) {
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
      gradient: 'from-orange-500 to-red-500',
    },
    { 
      title: 'Yangın Söndürme Sistemleri', 
      desc: 'Sprinkler, gazlı söndürme ve yangın dolapları: projelendirme, montaj ve periyodik bakım hizmetleri.', 
      icon: Flame,
      gradient: 'from-red-500 to-rose-500',
    },
    { 
      title: 'İtfaiye Raporu', 
      desc: 'Resmi yönetmeliklere uygun denetimler, çalışma ruhsatı süreçleri ve teknik onay desteği sağlıyoruz.',
      icon: ClipboardCheck,
      gradient: 'from-blue-500 to-indigo-500',
    },
    { 
      title: 'İSG Eğitimi', 
      desc: 'İş Sağlığı ve Güvenliği kapsamında personel yangın eğitimi ve acil durum tatbikatları düzenliyoruz.',
      icon: Users,
      gradient: 'from-emerald-500 to-teal-500',
    },
  ];

  return (
    <div className="flex flex-col min-h-screen bg-[#0a0a0f] text-white">

      {/* ═══ BG GRADIENTS ═══ */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[-15%] left-[-10%] w-[500px] h-[500px] bg-red-600/[0.06] rounded-full blur-[120px]" />
        <div className="absolute bottom-[10%] right-[5%] w-[400px] h-[400px] bg-orange-500/[0.04] rounded-full blur-[100px]" />
      </div>

      {/* ═══ HEADER ═══ */}
      <header className={`px-6 h-18 flex items-center sticky top-0 z-50 transition-all duration-500 ${scrollY > 30 ? 'bg-[#0a0a0f]/85 backdrop-blur-xl border-b border-white/[0.06]' : ''}`}>
        <div className="max-w-6xl mx-auto w-full flex items-center justify-between">
          <Link className="flex items-center gap-3 group" href="/">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500 to-orange-600 flex items-center justify-center group-hover:shadow-lg group-hover:shadow-red-500/20 transition-all duration-300">
              <Flame className="h-5 w-5 text-white" fill="currentColor" />
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-sm tracking-tight group-hover:text-red-400 transition-colors">ZIVA YANGIN</span>
              <span className="text-[9px] text-white/30 tracking-[0.2em]">GÜVENLİK SİSTEMLERİ</span>
            </div>
          </Link>
          
          <nav className="hidden md:flex items-center gap-8">
            {[
              { label: 'Hizmetler', href: '#hizmetler' },
              { label: 'Hakkımızda', href: '#hakkimizda' },
              { label: 'İletişim', href: '#iletisim' },
            ].map((item) => (
              <a key={item.label} href={item.href} className="text-sm text-white/50 hover:text-white transition-colors relative group">
                {item.label}
                <span className="absolute -bottom-0.5 left-0 w-0 h-px bg-red-500 group-hover:w-full transition-all duration-300" />
              </a>
            ))}
          </nav>

          <Link href="/login" className="group flex items-center gap-2 bg-white text-black px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-red-500 hover:text-white transition-all duration-300 hover:shadow-lg hover:shadow-red-500/20">
            <Lock size={14} />
            <span className="hidden sm:inline">Giriş Yap</span>
          </Link>
        </div>
      </header>

      <main className="flex-1 relative z-10">

        {/* ═══ HERO ═══ */}
        <section className="min-h-[85vh] flex items-center">
          <div className="max-w-6xl mx-auto px-6 w-full grid lg:grid-cols-2 gap-16 items-center py-24">
            
            <div className="space-y-8">
              <Reveal>
                <div className="inline-flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-full px-4 py-2 text-xs font-medium text-red-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                  Online Müşteri Portalı Aktif
                </div>
              </Reveal>

              <Reveal delay={100}>
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-[1.05] tracking-tight">
                  Yangın tehlikelerine karşı{' '}
                  <span className="text-red-500">güvenliğinizi</span>{' '}
                  profesyonelce koruyoruz.
                </h1>
              </Reveal>

              <Reveal delay={200}>
                <p className="text-white/50 text-lg max-w-md leading-relaxed">
                  25 yılı aşkın sektör deneyimimiz ile konut, ticari ve endüstriyel tesisleriniz için güvenilir çözümler sunuyoruz.
                </p>
              </Reveal>

              <Reveal delay={300}>
                <div className="flex flex-wrap gap-3">
                  <a href="tel:+905324790828" className="flex items-center gap-2 bg-red-600 px-6 py-3.5 rounded-xl text-sm font-semibold hover:bg-red-500 transition-all duration-300 hover:shadow-lg hover:shadow-red-500/20 hover:scale-[1.02] active:scale-[0.98]">
                    <Phone size={16} />
                    Hemen Arayın
                  </a>
                  <Link href="/login" className="flex items-center gap-2 bg-white/5 border border-white/10 px-6 py-3.5 rounded-xl text-sm font-semibold text-white/70 hover:bg-white/10 hover:text-white transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]">
                    <ShieldCheck size={16} className="text-emerald-400" />
                    Portal Girişi
                  </Link>
                </div>
              </Reveal>

              {/* Mini trust row */}
              <Reveal delay={400}>
                <div className="flex items-center gap-4 text-xs text-white/30 pt-2">
                  <div className="flex items-center gap-1.5">
                    <Clock size={14} className="text-white/40" />
                    <span>7/24 Destek</span>
                  </div>
                  <span className="w-1 h-1 rounded-full bg-white/20" />
                  <div className="flex items-center gap-1.5">
                    <ShieldCheck size={14} className="text-blue-400" />
                    <span>ISO Sertifikalı</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Award size={14} className="text-yellow-400" />
                    <span>25+ Yıl Tecrübe</span>
                  </div>
                </div>
              </Reveal>
            </div>

            {/* Right card */}
            <div className="hidden lg:flex items-center justify-center">
              <div className="relative">
                <div className="absolute -inset-8 bg-gradient-to-br from-red-500/10 to-orange-500/5 rounded-[2.5rem] blur-2xl" />
                
                <div className="relative w-80 h-80 rounded-[2rem] bg-white/[0.04] border border-white/[0.08] flex flex-col items-center justify-center gap-6">
                  <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-red-500 to-orange-600 flex items-center justify-center shadow-xl shadow-red-500/30 hover:scale-110 transition-transform duration-500">
                    <Flame size={44} className="text-white" fill="currentColor" />
                  </div>
                  <div className="text-center">
                    <p className="text-3xl font-bold">25+ Yıl</p>
                    <p className="text-[11px] text-white/40 tracking-[0.25em] uppercase mt-1">Sektör Tecrübesi</p>
                  </div>
                </div>

                {/* Floating badges */}
                <div className="absolute -top-3 -right-3 bg-white/[0.06] backdrop-blur-xl border border-white/[0.08] px-4 py-2.5 rounded-xl float-animation-1 shadow-lg">
                  <div className="flex items-center gap-2 text-[11px] font-medium text-white/60">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    Aktif Müşteriler
                  </div>
                </div>
                <div className="absolute -bottom-3 -left-6 bg-white/[0.06] backdrop-blur-xl border border-white/[0.08] px-4 py-2.5 rounded-xl float-animation-2 shadow-lg">
                  <div className="flex items-center gap-2 text-[11px] font-medium text-white/60">
                    <ClipboardCheck size={12} className="text-blue-400" />
                    Teknik Raporlama
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Marquee */}
        <div className="border-y border-white/[0.05] py-4 overflow-hidden bg-white/[0.01]">
          <div className="absolute inset-y-0 left-0 w-20 bg-gradient-to-r from-[#0a0a0f] to-transparent z-10" />
          <div className="absolute inset-y-0 right-0 w-20 bg-gradient-to-l from-[#0a0a0f] to-transparent z-10" />
          <div className="flex animate-[marquee_30s_linear_infinite] whitespace-nowrap">
            {[...Array(2)].map((_, s) => (
              <React.Fragment key={s}>
                {['Baca Temizliği', 'Yangın Algılama', 'Sprinkler Sistemleri', 'Gazlı Söndürme', 'İtfaiye Onayı', 'İSG Eğitimleri', 'Acil Durum Planı', 'Periyodik Bakım'].map((item, i) => (
                  <span key={`${s}-${i}`} className="mx-8 text-[11px] font-medium text-white/20 uppercase tracking-[0.2em] flex items-center gap-2">
                    <span className="w-1 h-1 rounded-full bg-red-500/50" />
                    {item}
                  </span>
                ))}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* ═══ SERVICES ═══ */}
        <section id="hizmetler" className="py-24">
          <div className="max-w-6xl mx-auto px-6">
            <Reveal className="mb-16">
              <p className="text-red-500 text-xs font-semibold uppercase tracking-[0.3em] mb-3">Hizmetlerimiz</p>
              <h2 className="text-3xl md:text-4xl font-bold">Neler Yapıyoruz?</h2>
              <p className="text-white/40 mt-3 max-w-lg">Yangın sistemleri montajı ve baca temizliği konusunda kapsamlı çözümler sunuyoruz.</p>
            </Reveal>

            <div className="grid md:grid-cols-2 gap-5">
              {services.map((service, i) => (
                <Reveal key={i} delay={i * 100}>
                  <div className="group p-6 rounded-2xl bg-white/[0.02] border border-white/[0.06] hover:border-white/[0.12] transition-all duration-500 hover:bg-white/[0.04]">
                    <div className={`absolute top-0 right-0 w-48 h-48 bg-gradient-to-br ${service.gradient} opacity-0 group-hover:opacity-[0.06] blur-[80px] transition-opacity duration-700`} />
                    <div className="relative flex gap-4">
                      <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${service.gradient} flex items-center justify-center shrink-0 shadow-lg group-hover:scale-110 group-hover:rotate-3 transition-all duration-500`}>
                        <service.icon size={20} className="text-white" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-base mb-1.5 group-hover:text-red-400 transition-colors">{service.title}</h3>
                        <p className="text-[13px] text-white/40 leading-relaxed">{service.desc}</p>
                      </div>
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ═══ WHY US ═══ */}
        <section id="hakkimizda" className="py-24">
          <div className="max-w-6xl mx-auto px-6">
            <div className="grid lg:grid-cols-5 gap-12 lg:gap-16 items-start">
              <div className="lg:col-span-3 space-y-10">
                <Reveal>
                  <p className="text-red-500 text-xs font-semibold uppercase tracking-[0.3em] mb-3">Neden Biz?</p>
                  <h2 className="text-3xl md:text-4xl font-bold">Güvenilir ve Profesyonel Çözümler</h2>
                </Reveal>
                
                <div className="space-y-4">
                  {[
                    { icon: Clock, title: '25+ Yıl Tecrübe', desc: 'Uzun yılların verdiği deneyim ile hizmet veriyoruz.' },
                    { icon: ShieldCheck, title: 'Sertifikalı Ekipman', desc: 'Kalite belgeleriyle doğrulanmış ekipmanlar kullanıyoruz.' },
                    { icon: CheckCircle2, title: 'Uzman Kadro', desc: 'Deneyimli personelimiz ile projelerinizi güvenle tamamlıyoruz.' },
                  ].map((item, i) => (
                    <Reveal key={i} delay={i * 120}>
                      <div className="flex gap-4 items-start p-5 rounded-2xl hover:bg-white/[0.03] transition-colors group">
                        <div className="w-11 h-11 rounded-xl bg-red-500/10 flex items-center justify-center shrink-0 group-hover:bg-red-500 group-hover:text-white transition-all duration-300">
                          <item.icon size={18} className="text-red-400 group-hover:text-white" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-sm mb-1 group-hover:text-white transition-colors">{item.title}</h4>
                          <p className="text-xs text-white/35">{item.desc}</p>
                        </div>
                      </div>
                    </Reveal>
                  ))}
                </div>
              </div>

              {/* Side card */}
              <div className="lg:col-span-2">
                <Reveal delay={300}>
                  <div className="relative">
                    <div className="absolute -inset-10 bg-red-500/8 blur-[60px] rounded-full" />
                    <div className="relative p-8 rounded-2xl bg-white/[0.03] border border-white/[0.08] space-y-6 group hover:border-red-500/20 transition-all duration-500">
                      {[
                        { label: 'Müşteri Desteği', value: '7/24', accent: 'text-emerald-400' },
                        { label: 'Müşteri Memnuniyeti', value: '%100', accent: 'text-white' },
                        { label: 'Hizmet Bölgesi', value: 'İstanbul', accent: 'text-white' },
                      ].map((stat, i) => (
                        <div key={i} className="flex items-center justify-between p-4 rounded-xl bg-white/[0.03]">
                          <span className="text-sm text-white/40">{stat.label}</span>
                          <span className={`text-lg font-bold ${stat.accent}`}>{stat.value}</span>
                        </div>
                      ))}
                      
                      <div className="h-px bg-white/10" />
                      
                      <a href="tel:+905324790828" className="flex items-center justify-between cursor-pointer group/link p-2">
                        <span className="text-sm text-white/40 group-hover/link:text-white transition-colors font-medium">Ücretsiz keşif randevusu</span>
                        <div className="w-9 h-9 rounded-full bg-red-500 flex items-center justify-center group-hover/link:scale-110 group-hover/link:shadow-lg group-hover/link:shadow-red-500/20 transition-all duration-300">
                          <ChevronRight size={14} className="text-white" />
                        </div>
                      </a>
                    </div>
                  </div>
                </Reveal>
              </div>
            </div>
          </div>
        </section>

        {/* Process */}
        <section className="py-24">
          <div className="max-w-6xl mx-auto px-6">
            <Reveal className="text-center mb-16">
              <p className="text-red-500 text-xs font-semibold uppercase tracking-[0.3em] mb-3">Süreç</p>
              <h2 className="text-3xl font-bold">Nasıl Çalışıyoruz?</h2>
            </Reveal>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { step: '01', title: 'Arayın', desc: 'Bizi arayarak talebinizi iletin.' },
                { step: '02', title: 'Keşif', desc: 'Yerinizde inceleme yapalım.' },
                { step: '03', title: 'Uygulama', desc: 'Profesyonel ekip ile uygulayalım.' },
                { step: '04', title: 'Rapor', desc: 'Raporlar portalınıza yüklenir.' },
              ].map((item, i) => (
                <Reveal key={i} delay={i * 80}>
                  <div className="relative p-6 rounded-2xl bg-white/[0.02] border border-white/[0.06] hover:border-red-500/20 transition-all duration-300 text-center group hover:bg-white/[0.03]">
                    <div className="w-10 h-10 mx-auto rounded-xl bg-red-500/10 flex items-center justify-center mb-4 group-hover:bg-red-500 transition-colors duration-300">
                      <span className="text-sm font-bold text-red-400 group-hover:text-white transition-colors">{item.step}</span>
                    </div>
                    <h3 className="font-semibold text-sm mb-2 group-hover:text-red-400 transition-colors">{item.title}</h3>
                    <p className="text-[11px] text-white/35">{item.desc}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ═══ CTA ═══ */}
        <section className="py-24">
          <div className="max-w-4xl mx-auto px-6">
            <Reveal>
              <div className="group relative rounded-2xl overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-red-600/15 via-orange-600/10 to-red-500/15 animate-[gradient_5s_ease_infinite] bg-[length:200%_200%]" />
                <div className="absolute inset-0 bg-[#0a0a0f]/60 backdrop-blur-xl" />
                <div className="absolute inset-[1px] rounded-2xl border border-white/[0.08] group-hover:border-white/15 transition-colors duration-500" />
                
                <div className="relative px-8 py-14 md:px-14 md:py-16 text-center space-y-6">
                  <div className="w-16 h-16 rounded-xl bg-white/[0.06] border border-white/[0.1] mx-auto flex items-center justify-center group-hover:border-red-500/30 transition-all duration-300">
                    <Building2 size={28} className="text-red-400 group-hover:scale-110 transition-transform" />
                  </div>
                  <div className="space-y-3">
                    <h3 className="text-2xl md:text-3xl font-bold">Müşteri Takip Portalı</h3>
                    <p className="text-white/40 max-w-sm mx-auto text-[14px]">
                      Baca temizliği kayıtlarını, itfaiye raporlarını ve servis fotoğraflarını online portalımızdan takip edin.
                    </p>
                  </div>
                  <Link href="/login" className="inline-flex items-center gap-2.5 bg-white text-black px-7 py-3.5 rounded-xl font-semibold text-sm hover:bg-red-500 hover:text-white hover:shadow-xl hover:shadow-red-500/30 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300">
                    Portala Giriş Yap
                    <ArrowRight size={15} />
                  </Link>
                </div>
              </div>
            </Reveal>
          </div>
        </section>
      </main>

      {/* ═══ FOOTER ═══ */}
      <footer id="iletisim" className="border-t border-white/[0.06] pt-16 pb-8">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid gap-12 md:grid-cols-3 mb-12">
            <div className="space-y-4">
              <Link className="flex items-center gap-2.5" href="/">
                <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-red-500 to-orange-600 flex items-center justify-center">
                  <Flame className="h-4 w-4 text-white" fill="currentColor" />
                </div>
                <span className="font-bold text-sm">ZIVA YANGIN</span>
              </Link>
              <p className="text-sm text-white/30 max-w-sm leading-relaxed">
                25 yıllık profesyonel tecrübe ile güvenliğinizi titizlikle sağlıyoruz.
              </p>
            </div>

            <div className="space-y-3">
              <p className="text-xs font-semibold text-white/20 uppercase tracking-[0.2em]">İletişim</p>
              <a href="tel:+905324790828" className="flex items-center gap-2 text-sm text-white/50 hover:text-white transition-colors">
                <Phone size={14} className="text-red-400" />
                +90 532 479 08 28
              </a>
              <a href="mailto:admin@zivabacayangin.com" className="flex items-center gap-2 text-sm text-white/50 hover:text-white transition-colors">
                <Mail size={14} className="text-red-400" />
                admin@zivabacayangin.com
              </a>
              <div className="flex items-start gap-2 text-sm text-white/50">
                <MapPin size={14} className="text-red-400 shrink-0 mt-0.5" />
                <span>Kazım Karabekir Mah. 859. Cad. No:1A<br />Gaziosmanpaşa / İstanbul</span>
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-xs font-semibold text-white/20 uppercase tracking-[0.2em]">Hizmetler</p>
              {['Baca Temizliği', 'Yangın Sistemleri', 'İtfaiye Raporu', 'İSG Eğitimi'].map(l => (
                <p key={l} className="text-sm text-white/40 hover:text-white transition-colors">{l}</p>
              ))}
            </div>
          </div>

          <div className="border-t border-white/[0.06] pt-6 text-center text-xs text-white/20">
            © {new Date().getFullYear()} Ziva Baca Yangın Ltd. Şti. Tüm hakları saklıdır.
          </div>
        </div>
      </footer>
    </div>
  );
}