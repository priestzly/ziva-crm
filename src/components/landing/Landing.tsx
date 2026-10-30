import Link from 'next/link';
import {
  Flame, Phone, MessageCircle, ShieldCheck, Clock, MapPin, Mail, ArrowRight,
  ArrowUpRight, Check, Plus, Lock, Wind, FireExtinguisher, ClipboardCheck,
  GraduationCap, Users, Navigation, type LucideIcon,
} from 'lucide-react';
import { CONTACT, SITE_LEGAL_NAME } from '@/lib/site';
import { SERVICES, STATS, REASONS, STEPS, FAQS } from '@/lib/landing-content';
import { Photo } from './Photo';
import { MobileMenu } from './MobileMenu';

const NAV = [
  { label: 'Hizmetler', href: '#hizmetler' },
  { label: 'Neden Biz', href: '#hakkimizda' },
  { label: 'Süreç', href: '#surec' },
  { label: 'SSS', href: '#sss' },
  { label: 'İletişim', href: '#iletisim' },
];

const SERVICE_ICONS: Record<string, LucideIcon> = {
  'baca-temizligi': Wind,
  'yangin-sondurme-sistemleri': FireExtinguisher,
  'itfaiye-raporu': ClipboardCheck,
  'isg-egitimi': GraduationCap,
};

function Logo() {
  return (
    <Link href="/" className="flex items-center gap-3" aria-label="Ziva Yangın ana sayfa">
      <span className="w-10 h-10 rounded-xl l-fire-bg flex items-center justify-center shadow-lg shadow-[#e8361c]/30">
        <Flame className="h-5 w-5 text-white" fill="currentColor" />
      </span>
      <span className="flex flex-col leading-none">
        <span className="font-extrabold text-[15px] tracking-tight">ZIVA YANGIN</span>
        <span className="text-[10px] text-[var(--l-muted)] tracking-[0.18em] font-semibold mt-1">BACA &amp; YANGIN SİSTEMLERİ</span>
      </span>
    </Link>
  );
}

function SectionHead({ kicker, title, desc, center = false }: { kicker: string; title: string; desc?: string; center?: boolean }) {
  return (
    <div className={`sr max-w-2xl ${center ? 'mx-auto text-center' : ''}`}>
      <p className="l-kicker">{kicker}</p>
      <h2 className="mt-4 text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight leading-[1.05]">{title}</h2>
      {desc && <p className="mt-5 text-[var(--l-muted)] text-base sm:text-lg leading-relaxed">{desc}</p>}
    </div>
  );
}

export default function Landing() {
  return (
    <div className="landing min-h-screen flex flex-col">

      {/* ═══ HEADER ═══ */}
      <header className="sticky top-0 z-50 h-[72px] border-b border-[var(--l-line)] bg-[var(--l-bg)]/80 backdrop-blur-xl">
        <div className="l-container h-full flex items-center justify-between gap-6">
          <Logo />
          <nav className="hidden lg:flex items-center gap-8" aria-label="Ana menü">
            {NAV.map(item => (
              <a key={item.href} href={item.href} className="text-sm font-medium text-[var(--l-muted)] hover:text-[var(--l-text)] transition-colors">
                {item.label}
              </a>
            ))}
          </nav>
          <div className="hidden lg:flex items-center gap-3">
            <Link href="/login" className="l-btn-ghost !py-2.5 !px-4 text-sm">
              <Lock size={14} /> Portal
            </Link>
            <a href={`tel:${CONTACT.phone}`} className="l-btn-fire !py-2.5 !px-4 text-sm">
              <Phone size={15} /> {CONTACT.phoneDisplay}
            </a>
          </div>
          <MobileMenu links={NAV} />
        </div>
      </header>

      <main className="flex-1">

        {/* ═══ HERO ═══ */}
        <section className="relative overflow-hidden">
          <div className="l-hero-glow" aria-hidden />
          <div className="l-container relative grid lg:grid-cols-[1.1fr_0.9fr] gap-12 lg:gap-16 items-center pt-12 pb-16 sm:pt-16 lg:pt-24 lg:pb-28">
            <div>
              <p className="rise l-chip">
                <span className="w-2 h-2 rounded-full bg-[var(--l-fire-2)] l-pulse" />
                İstanbul geneli · 7/24 acil servis
              </p>
              <h1 className="rise mt-6 text-[40px] leading-[1.02] sm:text-6xl lg:text-[76px] font-extrabold tracking-[-0.035em]" style={{ animationDelay: '60ms' }}>
                Yangına karşı <span className="l-fire-text">ilk savunma</span> hattınız.
              </h1>
              <p className="rise mt-6 text-lg sm:text-xl text-[var(--l-muted)] max-w-xl leading-relaxed" style={{ animationDelay: '120ms' }}>
                Baca temizliğinden yangın söndürme sistemlerine, itfaiye raporundan personel eğitimine kadar işletmenizi 25 yılı aşkın tecrübeyle koruyoruz.
              </p>
              <div className="rise mt-9 flex flex-col sm:flex-row gap-3" style={{ animationDelay: '180ms' }}>
                <a href={`tel:${CONTACT.phone}`} className="l-btn-fire">
                  <Phone size={18} /> Hemen arayın
                </a>
                <a href={CONTACT.whatsapp} target="_blank" rel="noopener noreferrer" className="l-btn-ghost">
                  <MessageCircle size={18} className="text-[#25d366]" /> WhatsApp’tan yazın
                </a>
              </div>
              <ul className="rise mt-10 flex flex-wrap gap-x-6 gap-y-3 text-sm text-[var(--l-muted)]" style={{ animationDelay: '240ms' }}>
                <li className="flex items-center gap-2"><ShieldCheck size={16} className="text-[var(--l-fire-2)]" /> TSE &amp; ISO onaylı</li>
                <li className="flex items-center gap-2"><Clock size={16} className="text-[var(--l-fire-2)]" /> 7/24 teknik destek</li>
                <li className="flex items-center gap-2"><Check size={16} className="text-[var(--l-fire-2)]" /> Ücretsiz keşif</li>
              </ul>
            </div>

            <div className="rise relative" style={{ animationDelay: '150ms' }}>
              <Photo
                slot="hero"
                icon={Flame}
                alt="Ziva Yangın ekibi sahada çalışırken"
                sizes="(min-width: 1024px) 45vw, 100vw"
                priority
                position="center 22%"
                className="aspect-[4/5] sm:aspect-[16/11] lg:aspect-[4/5] rounded-[28px] border border-[var(--l-line)]"
              />
              <div className="absolute left-4 right-4 bottom-4 sm:left-auto sm:right-6 sm:bottom-6 sm:w-72 rounded-2xl border border-white/10 bg-[#120c0a]/85 backdrop-blur-xl p-5">
                <p className="text-xs font-semibold text-[var(--l-muted)] uppercase tracking-[0.14em]">Acil müdahale hattı</p>
                <a href={`tel:${CONTACT.phone}`} className="mt-2 flex items-center justify-between gap-3 text-xl font-extrabold">
                  {CONTACT.phoneDisplay}
                  <span className="w-10 h-10 rounded-full l-fire-bg flex items-center justify-center shrink-0">
                    <Phone size={16} className="text-white" />
                  </span>
                </a>
              </div>
              <div className="hidden sm:flex absolute -top-4 -left-4 lg:-left-8 items-center gap-3 rounded-2xl border border-white/10 bg-[#120c0a]/85 backdrop-blur-xl px-4 py-3">
                <span className="text-3xl font-extrabold l-fire-text">25+</span>
                <span className="text-xs leading-tight text-[var(--l-muted)]">yıllık<br />saha tecrübesi</span>
              </div>
            </div>
          </div>
        </section>

        {/* ═══ STATS ═══ */}
        <section className="border-y border-[var(--l-line)] bg-[var(--l-surface)]/60">
          <div className="l-container grid grid-cols-2 lg:grid-cols-4">
            {STATS.map((s, i) => (
              <div key={s.label} className={`sr py-8 sm:py-10 px-2 sm:px-6 ${i % 2 === 1 ? 'border-l' : ''} ${i >= 2 ? 'border-t lg:border-t-0' : ''} lg:border-l first:lg:border-l-0 border-[var(--l-line)]`}>
                <p className="text-3xl sm:text-4xl font-extrabold tracking-tight">{s.value}</p>
                <p className="mt-1 text-sm text-[var(--l-muted)]">{s.label}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ═══ SERVICES ═══ */}
        <section id="hizmetler" className="l-section">
          <div className="l-container">
            <SectionHead
              kicker="Hizmetlerimiz"
              title="Tek ekipten eksiksiz yangın güvenliği"
              desc="Bacadan söndürme sistemine, denetimden eğitime kadar işletmenizin yangın güvenliğini uçtan uca yönetiyoruz."
            />
            <div className="mt-14 grid md:grid-cols-2 gap-5 lg:gap-6">
              {SERVICES.map(service => {
                const Icon = SERVICE_ICONS[service.id] ?? Flame;
                return (
                  <article key={service.id} id={service.id} className="sr l-card group overflow-hidden scroll-mt-24">
                    <Photo
                      slot={service.photo}
                      icon={Icon}
                      alt={service.title}
                      sizes="(min-width: 768px) 50vw, 100vw"
                      className="aspect-[16/9] border-b border-[var(--l-line)]"
                    />
                    <div className="p-6 sm:p-8">
                      <div className="flex items-center gap-3">
                        <span className="w-11 h-11 rounded-xl bg-[var(--l-fire-1)]/12 border border-[var(--l-fire-1)]/25 flex items-center justify-center">
                          <Icon size={20} className="text-[var(--l-fire-2)]" />
                        </span>
                        <h3 className="text-xl sm:text-2xl font-bold tracking-tight">{service.title}</h3>
                      </div>
                      <p className="mt-4 text-[var(--l-muted)] leading-relaxed">{service.desc}</p>
                      <ul className="mt-6 grid sm:grid-cols-2 gap-x-4 gap-y-2.5">
                        {service.items.map(item => (
                          <li key={item} className="flex items-start gap-2 text-sm">
                            <Check size={16} className="text-[var(--l-fire-2)] shrink-0 mt-0.5" />
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        {/* ═══ WHY US ═══ */}
        <section id="hakkimizda" className="l-section bg-[var(--l-surface)]/50 border-y border-[var(--l-line)]">
          <div className="l-container grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            <div className="sr relative order-last lg:order-first">
              <Photo
                slot="ekip"
                icon={Users}
                alt="Ziva Yangın teknik ekibi"
                sizes="(min-width: 1024px) 50vw, 100vw"
                className="aspect-[4/3] rounded-[28px] border border-[var(--l-line)]"
              />
              <div className="absolute -bottom-6 right-6 sm:right-10 rounded-2xl l-fire-bg px-6 py-5 shadow-2xl shadow-[#e8361c]/30">
                <p className="text-4xl font-extrabold text-white">7/24</p>
                <p className="text-sm text-white/85 font-medium">yanınızdayız</p>
              </div>
            </div>
            <div>
              <SectionHead
                kicker="Neden Ziva?"
                title="Güvenliğiniz bizim için iş değil, sorumluluk"
                desc="Her işi kendi işyerimizmiş gibi yapıyor, sonucunu da belgeleriyle teslim ediyoruz."
              />
              <dl className="mt-10 grid sm:grid-cols-2 gap-x-8 gap-y-8">
                {REASONS.map((r, i) => (
                  <div key={r.title} className="sr">
                    <dt className="flex items-center gap-3 font-bold text-lg">
                      <span className="text-sm font-extrabold l-fire-text tabular-nums">0{i + 1}</span>
                      {r.title}
                    </dt>
                    <dd className="mt-2 text-[var(--l-muted)] leading-relaxed">{r.desc}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        </section>

        {/* ═══ PROCESS ═══ */}
        <section id="surec" className="l-section">
          <div className="l-container">
            <SectionHead kicker="Nasıl çalışıyoruz?" title="Dört adımda güvendesiniz" center />
            <ol className="mt-14 grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {STEPS.map((step, i) => (
                <li key={step.title} className="sr l-card p-7 relative">
                  <span className="text-6xl font-extrabold leading-none text-white/[0.06] absolute right-5 top-4 select-none">{i + 1}</span>
                  <span className="w-10 h-10 rounded-full l-fire-bg flex items-center justify-center text-sm font-extrabold text-white">{i + 1}</span>
                  <h3 className="mt-6 text-lg font-bold">{step.title}</h3>
                  <p className="mt-2 text-sm text-[var(--l-muted)] leading-relaxed">{step.desc}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* ═══ PORTAL ═══ */}
        <section className="pb-20 sm:pb-28">
          <div className="l-container">
            <div className="sr l-card p-6 sm:p-10 flex flex-col md:flex-row md:items-center gap-6 md:gap-10">
              <span className="w-14 h-14 rounded-2xl bg-white/[0.04] border border-[var(--l-line)] flex items-center justify-center shrink-0">
                <Lock size={22} className="text-[var(--l-fire-2)]" />
              </span>
              <div className="flex-1">
                <h2 className="text-xl sm:text-2xl font-bold">Mevcut müşterimiz misiniz?</h2>
                <p className="mt-2 text-[var(--l-muted)]">Servis kayıtlarınızı, itfaiye raporlarınızı ve iş fotoğraflarını müşteri portalından takip edin.</p>
              </div>
              <Link href="/login" className="l-btn-ghost shrink-0">
                Portala giriş <ArrowRight size={16} />
              </Link>
            </div>
          </div>
        </section>

        {/* ═══ FAQ ═══ */}
        <section id="sss" className="l-section bg-[var(--l-surface)]/50 border-y border-[var(--l-line)]">
          <div className="l-container grid lg:grid-cols-[0.8fr_1.2fr] gap-12 lg:gap-20">
            <div>
              <SectionHead
                kicker="Sık sorulan sorular"
                title="Aklınızdaki sorular"
                desc="Burada bulamadığınız her şey için bir telefon uzağınızdayız."
              />
              <a href={`tel:${CONTACT.phone}`} className="sr mt-8 inline-flex items-center gap-2 font-semibold text-[var(--l-fire-2)] hover:underline">
                <Phone size={16} /> {CONTACT.phoneDisplay}
              </a>
            </div>
            <div className="divide-y divide-[var(--l-line)] border-y border-[var(--l-line)]">
              {FAQS.map(f => (
                <details key={f.q} className="l-faq group">
                  <summary className="flex items-center justify-between gap-6 py-6 cursor-pointer list-none">
                    <span className="text-lg font-semibold">{f.q}</span>
                    <span className="w-9 h-9 rounded-full border border-[var(--l-line)] flex items-center justify-center shrink-0 transition-transform group-open:rotate-45">
                      <Plus size={16} />
                    </span>
                  </summary>
                  <p className="pb-6 -mt-1 pr-12 text-[var(--l-muted)] leading-relaxed">{f.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* ═══ CTA ═══ */}
        <section className="l-section">
          <div className="l-container">
            <div className="sr relative overflow-hidden rounded-[32px] l-fire-bg px-6 py-14 sm:px-14 sm:py-20">
              <div className="absolute inset-0 l-cta-texture" aria-hidden />
              <Flame className="absolute -right-10 -bottom-16 w-80 h-80 text-white/10" strokeWidth={1} aria-hidden />
              <div className="relative max-w-2xl">
                <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white leading-[1.05]">
                  Yangın güvenliğinizi şansa bırakmayın.
                </h2>
                <p className="mt-5 text-lg text-white/85">Ücretsiz keşif için hemen arayın; ihtiyacınızı yerinde belirleyip net bir teklif sunalım.</p>
                <div className="mt-9 flex flex-col sm:flex-row gap-3">
                  <a href={`tel:${CONTACT.phone}`} className="l-btn-white">
                    <Phone size={18} /> {CONTACT.phoneDisplay}
                  </a>
                  <a href={CONTACT.whatsapp} target="_blank" rel="noopener noreferrer" className="l-btn-outline-white">
                    <MessageCircle size={18} /> WhatsApp
                  </a>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ═══ CONTACT ═══ */}
        <section id="iletisim" className="pb-20 sm:pb-28 scroll-mt-20">
          <div className="l-container grid lg:grid-cols-[0.9fr_1.1fr] gap-6">
            <div className="sr l-card p-6 sm:p-10 flex flex-col">
              <p className="l-kicker">İletişim</p>
              <h2 className="mt-4 text-3xl sm:text-4xl font-extrabold tracking-tight">Bize ulaşın</h2>
              <ul className="mt-8 space-y-6">
                <li>
                  <a href={`tel:${CONTACT.phone}`} className="flex gap-4 group">
                    <span className="l-contact-icon"><Phone size={18} /></span>
                    <span>
                      <span className="block text-sm text-[var(--l-muted)]">Telefon · 7/24</span>
                      <span className="block text-lg font-semibold group-hover:text-[var(--l-fire-2)] transition-colors">{CONTACT.phoneDisplay}</span>
                    </span>
                  </a>
                </li>
                <li>
                  <a href={`mailto:${CONTACT.email}`} className="flex gap-4 group">
                    <span className="l-contact-icon"><Mail size={18} /></span>
                    <span className="min-w-0">
                      <span className="block text-sm text-[var(--l-muted)]">E-posta</span>
                      <span className="block text-[15px] sm:text-lg font-semibold break-all group-hover:text-[var(--l-fire-2)] transition-colors">{CONTACT.email}</span>
                    </span>
                  </a>
                </li>
                <li>
                  <a href={CONTACT.mapsUrl} target="_blank" rel="noopener noreferrer" className="flex gap-4 group">
                    <span className="l-contact-icon"><MapPin size={18} /></span>
                    <span>
                      <span className="block text-sm text-[var(--l-muted)]">Merkez ofis &amp; atölye</span>
                      <span className="block text-lg font-semibold group-hover:text-[var(--l-fire-2)] transition-colors">{CONTACT.addressLine}</span>
                      <span className="block text-[var(--l-muted)]">{CONTACT.addressCity}</span>
                    </span>
                  </a>
                </li>
              </ul>
              <a href={CONTACT.mapsUrl} target="_blank" rel="noopener noreferrer" className="l-btn-fire mt-10 self-start">
                <Navigation size={16} /> Yol tarifi al
              </a>
            </div>
            <div className="sr l-card overflow-hidden min-h-[320px] lg:min-h-0">
              <iframe
                title="Ziva Yangın konumu"
                src={CONTACT.mapsEmbed}
                className="w-full h-full min-h-[320px] border-0 l-map"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
          </div>
        </section>
      </main>

      {/* ═══ FOOTER ═══ */}
      <footer className="border-t border-[var(--l-line)] pt-14 pb-28 lg:pb-10">
        <div className="l-container">
          <div className="grid gap-10 md:grid-cols-[1.4fr_1fr_1fr]">
            <div>
              <Logo />
              <p className="mt-5 text-sm text-[var(--l-muted)] max-w-sm leading-relaxed">
                25 yılı aşkın tecrübeyle İstanbul genelinde baca temizliği, yangın söndürme sistemleri, itfaiye raporu ve İSG eğitimi hizmetleri.
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--l-muted)]">Hizmetler</p>
              <ul className="mt-4 space-y-2.5 text-sm">
                {SERVICES.map(s => (
                  <li key={s.id}><a href={`#${s.id}`} className="hover:text-[var(--l-fire-2)] transition-colors">{s.title}</a></li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--l-muted)]">Kurumsal</p>
              <ul className="mt-4 space-y-2.5 text-sm">
                <li><a href="#hakkimizda" className="hover:text-[var(--l-fire-2)] transition-colors">Neden Biz</a></li>
                <li><a href="#sss" className="hover:text-[var(--l-fire-2)] transition-colors">Sık Sorulan Sorular</a></li>
                <li><a href="#iletisim" className="hover:text-[var(--l-fire-2)] transition-colors">İletişim</a></li>
                <li>
                  <Link href="/login" className="inline-flex items-center gap-1 hover:text-[var(--l-fire-2)] transition-colors">
                    Müşteri Portalı <ArrowUpRight size={14} />
                  </Link>
                </li>
              </ul>
            </div>
          </div>
          <div className="mt-12 pt-6 border-t border-[var(--l-line)] flex flex-col sm:flex-row gap-2 justify-between text-xs text-[var(--l-muted)]">
            <p>© {new Date().getFullYear()} {SITE_LEGAL_NAME}</p>
            <p>{CONTACT.addressLine}, {CONTACT.addressCity}</p>
          </div>
        </div>
      </footer>

      {/* ═══ MOBILE CALL BAR ═══ */}
      <div className="lg:hidden fixed inset-x-0 bottom-0 z-40 p-3 bg-gradient-to-t from-[var(--l-bg)] via-[var(--l-bg)]/95 to-transparent">
        <div className="grid grid-cols-2 gap-2">
          <a href={`tel:${CONTACT.phone}`} className="l-btn-fire justify-center !py-3.5">
            <Phone size={18} /> Ara
          </a>
          <a href={CONTACT.whatsapp} target="_blank" rel="noopener noreferrer" className="l-btn-ghost justify-center !py-3.5 bg-[var(--l-surface)]">
            <MessageCircle size={18} className="text-[#25d366]" /> WhatsApp
          </a>
        </div>
      </div>
    </div>
  );
}
