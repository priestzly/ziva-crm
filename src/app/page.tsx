'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { 
  Flame, ArrowRight, ShieldCheck, Settings, Users, 
  MapPin, Phone, Mail, ClipboardCheck, CheckCircle2,
  Lock, Clock, Building2, Award, ChevronRight, MessageCircle
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
    <div className="flex flex-col min-h-screen bg-[#0a0a0f] text-white selection:bg-red-500/30">

      {/* ═══ LIVING BACKGROUND ═══ */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        {/* Animated Fiery Glows */}
        <div className="absolute -top-[10%] -left-[10%] w-[80vw] h-[80vw] bg-red-600/[0.1] rounded-full blur-[120px] animate-pulse" />
        <div className="absolute top-[20%] -right-[15%] w-[60vw] h-[60vw] bg-orange-600/[0.08] rounded-full blur-[100px] animate-glow" />
        <div className="absolute bottom-[-10%] left-[10%] w-[70vw] h-[70vw] bg-red-500/[0.05] rounded-full blur-[130px]" />
        
        {/* Diagonal Technical Stripes */}
        <div className="absolute inset-0 opacity-[0.05] sm:opacity-[0.03]" 
             style={{ 
               backgroundImage: `repeating-linear-gradient(45deg, #fff 0, #fff 1px, transparent 0, transparent 40px)` 
             }} 
        />
        <div className="absolute inset-0 opacity-[0.03] sm:opacity-[0.02]" 
             style={{ 
               backgroundImage: `repeating-linear-gradient(-45deg, #ff0000 0, #ff0000 1px, transparent 0, transparent 100px)` 
             }} 
        />
        
        {/* Subtle Technical Pattern */}
        <div className="absolute inset-0 opacity-[0.02] bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:20px_20px]" />
      </div>

      {/* ═══ HEADER ═══ */}
      <header className={`px-4 sm:px-6 h-18 flex items-center sticky top-0 z-50 transition-all duration-500 ${scrollY > 30 ? 'bg-[#0a0a0f]/85 backdrop-blur-xl border-b border-white/[0.06]' : ''}`}>
        <div className="max-w-6xl mx-auto w-full flex items-center justify-between">
          <Link className="flex items-center gap-3 group" href="/">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-600 to-orange-600 flex items-center justify-center group-hover:shadow-lg group-hover:shadow-red-500/30 transition-all duration-500">
              <Flame className="h-5 w-5 text-white" fill="currentColor" />
            </div>
            <div className="flex flex-col">
              <span className="font-black text-sm tracking-tight group-hover:text-red-400 transition-colors">ZIVA YANGIN</span>
              <span className="text-[9px] text-white/30 tracking-[0.2em] font-bold uppercase">Güvenlik Sistemleri</span>
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

          <Link href="/login" className="group flex items-center gap-2 bg-white text-black px-5 py-2.5 rounded-xl text-xs font-bold hover:bg-red-500 hover:text-white transition-all duration-500 hover:shadow-lg hover:shadow-red-500/30">
            <Lock size={13} strokeWidth={3} />
            <span className="hidden sm:inline">Portal Girişi</span>
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
                <h1 className="text-4xl sm:text-5xl lg:text-[68px] font-black leading-[0.95] tracking-tighter">
                  Yangın tehlikesine karşı{' '}
                  <span className="relative inline-block">
                    <span className="bg-gradient-to-r from-red-500 via-orange-500 to-red-600 bg-clip-text text-transparent animate-gradient bg-[length:200%_auto]">
                      güvenliğinizi
                    </span>
                  </span>{' '}
                  profesyonelce koruyoruz.
                </h1>
              </Reveal>

              <Reveal delay={200}>
                <p className="text-white/50 text-lg sm:text-xl max-w-md leading-relaxed font-medium">
                  25 yılı aşkın sektör deneyimimiz ile ticari ve endüstriyel tesisleriniz için dünya standartlarında çözümler sunuyoruz.
                </p>
              </Reveal>

              <Reveal delay={300}>
                <div className="flex flex-wrap gap-4">
                  <a href="tel:+905324790828" className="flex items-center gap-2.5 bg-red-600 px-8 py-4 rounded-xl text-sm font-black uppercase tracking-tight hover:bg-red-500 transition-all duration-300 hover:shadow-2xl hover:shadow-red-500/40 hover:scale-[1.03] active:scale-[0.98]">
                    <Phone size={18} strokeWidth={3} />
                    Hemen Arayın
                  </a>
                  <a 
                    href="https://wa.me/905324790828?text=Merhaba%2C%20yang%C4%B1n%20g%C3%BCvenli%C4%9Fi%20hakk%C4%B1nda%20bilgi%20almak%20istiyorum." 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center gap-2.5 bg-emerald-600/10 border border-emerald-600/20 px-8 py-4 rounded-xl text-sm font-black uppercase tracking-tight text-emerald-400 hover:bg-emerald-600 hover:text-white transition-all duration-300 hover:shadow-2xl hover:shadow-emerald-500/20 hover:scale-[1.03] active:scale-[0.98]"
                  >
                    <MessageCircle size={18} strokeWidth={3} />
                    WhatsApp
                  </a>
                </div>
              </Reveal>

              {/* High-end trust row */}
              <Reveal delay={400}>
                <div className="flex items-center gap-6 text-[10px] sm:text-xs font-bold uppercase tracking-widest text-white/20 pt-4">
                  <div className="flex items-center gap-2 group cursor-default">
                    <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center group-hover:bg-red-500/10 transition-colors">
                       <Clock size={14} className="text-red-500/60" />
                    </div>
                    <span className="group-hover:text-white/40 transition-colors">7/24 Teknik Destek</span>
                  </div>
                  <div className="hidden sm:flex items-center gap-2 group cursor-default">
                    <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center group-hover:bg-blue-500/10 transition-colors">
                       <ShieldCheck size={14} className="text-blue-500/60" />
                    </div>
                    <span className="group-hover:text-white/40 transition-colors">TSE & ISO Onaylı</span>
                  </div>
                </div>
              </Reveal>
            </div>

            {/* Right card - Fiery Glass */}
            <div className="hidden lg:flex items-center justify-end">
              <div className="relative group">
                <div className="absolute -inset-10 bg-gradient-to-br from-red-600/20 to-orange-600/10 rounded-[3rem] blur-3xl opacity-50 group-hover:opacity-100 transition-opacity duration-1000" />
                
                <div className="relative w-80 h-80 sm:w-96 sm:h-96 rounded-[3rem] bg-white/[0.03] border border-white/[0.08] backdrop-blur-2xl flex flex-col items-center justify-center gap-8 shadow-2xl overflow-hidden">
                   {/* Inner light sweep */}
                   <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/[0.02] to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                   
                  <div className="w-28 h-28 rounded-3xl bg-gradient-to-br from-red-500 to-orange-600 flex items-center justify-center shadow-2xl shadow-red-500/40 hover:scale-110 transition-transform duration-500">
                    <Flame size={56} className="text-white drop-shadow-xl" fill="currentColor" />
                  </div>
                  <div className="text-center space-y-2">
                    <p className="text-5xl font-black tracking-tighter bg-gradient-to-b from-white to-white/40 bg-clip-text text-transparent italic">25+ YIL</p>
                    <p className="text-xs font-black text-red-500/60 tracking-[0.4em] uppercase">Sektör Tecrübesi</p>
                  </div>

                  <div className="absolute bottom-6 left-0 right-0 flex justify-center gap-2">
                     {[...Array(3)].map((_, i) => (
                       <div key={i} className="w-1.5 h-1.5 rounded-full bg-white/10" />
                     ))}
                  </div>
                </div>

                {/* Floating mini glass badges */}
                <div className="absolute -top-6 -right-6 bg-white/[0.06] backdrop-blur-3xl border border-white/[0.1] px-5 py-3 rounded-2xl animate-float shadow-2xl">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981]" />
                    <span className="text-[11px] font-black uppercase tracking-wider text-white/70">%100 Memnuniyet</span>
                  </div>
                </div>
                <div className="absolute -bottom-4 -left-10 bg-white/[0.06] backdrop-blur-3xl border border-white/[0.1] px-5 py-3 rounded-2xl animate-float-delayed shadow-2xl">
                  <div className="flex items-center gap-3">
                    <ShieldCheck size={14} className="text-blue-400" />
                    <span className="text-[11px] font-black uppercase tracking-wider text-white/70">Teknik Denetim</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Marquee - Fiery Band */}
        <div className="relative border-y border-red-500/10 py-6 overflow-hidden bg-red-500/[0.02]">
          <div className="absolute inset-y-0 left-0 w-32 bg-gradient-to-r from-[#0a0a0f] to-transparent z-10" />
          <div className="absolute inset-y-0 right-0 w-32 bg-gradient-to-l from-[#0a0a0f] to-transparent z-10" />
          <div className="flex animate-[marquee_40s_linear_infinite] whitespace-nowrap">
            {[...Array(2)].map((_, s) => (
              <React.Fragment key={s}>
                {['Baca Temizliği', 'Yangın Algılama', 'Sprinkler Sistemleri', 'Gazlı Söndürme', 'İtfaiye Onayı', 'İSG Eğitimleri', 'Acil Durum Planı', 'Periyodik Bakım'].map((item, i) => (
                  <span key={`${s}-${i}`} className="mx-12 text-[10px] sm:text-[11px] font-black text-white/30 uppercase tracking-[0.4em] flex items-center gap-3">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-600 shadow-[0_0_8px_rgba(239,68,68,0.8)]" />
                    {item}
                  </span>
                ))}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* ═══ SERVICES ═══ */}
        <section id="hizmetler" className="py-28 relative">
          {/* Subtle glow behind services */}
          <div className="absolute top-[20%] left-[-10%] w-[400px] h-[400px] bg-red-600/[0.03] rounded-full blur-[120px] pointer-events-none" />

          <div className="max-w-6xl mx-auto px-6 relative">
            <Reveal className="mb-16">
              <p className="text-red-500 text-[10px] font-black uppercase tracking-[0.4em] mb-4">Uzmanlık Alanlarımız</p>
              <h2 className="text-3xl md:text-5xl font-black tracking-tight italic">Neler Yapıyoruz?</h2>
              <p className="text-white/40 mt-5 max-w-lg text-lg font-medium leading-relaxed">Yangın sistemleri montajı ve baca temizliği konusunda kapsamlı, teknolojik ve profesyonel çözümler sunuyoruz.</p>
            </Reveal>

            <div className="grid md:grid-cols-2 gap-6">
              {services.map((service, i) => (
                <Reveal key={i} delay={i * 100}>
                  <div className="group relative p-8 rounded-3xl bg-white/[0.02] border border-white/[0.06] hover:border-red-500/20 transition-all duration-500 hover:bg-white/[0.04] overflow-hidden">
                    <div className={`absolute top-0 right-0 w-64 h-64 bg-gradient-to-br ${service.gradient} opacity-0 group-hover:opacity-[0.08] blur-[100px] transition-opacity duration-700`} />
                    <div className="relative flex flex-col sm:flex-row gap-6">
                      <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${service.gradient} flex items-center justify-center shrink-0 shadow-2xl shadow-black/50 group-hover:scale-110 group-hover:rotate-6 transition-all duration-500`}>
                        <service.icon size={24} className="text-white" strokeWidth={2.5} />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-bold text-lg mb-2.5 group-hover:text-red-400 transition-colors uppercase tracking-tight">{service.title}</h3>
                        <p className="text-sm text-white/40 leading-relaxed font-medium">{service.desc}</p>
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