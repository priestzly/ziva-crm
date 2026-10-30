import Landing from '@/components/landing/Landing';
import { SITE_URL, SITE_NAME, SITE_LEGAL_NAME, SITE_DESCRIPTION } from '@/lib/site';
import { FAQS } from '@/lib/landing-content';

// Google'ın işletme bilgilerini (adres, telefon, hizmetler) doğru okuması için yapılandırılmış veri
const localBusiness = {
  '@context': 'https://schema.org',
  '@type': 'LocalBusiness',
  '@id': `${SITE_URL}/#business`,
  name: SITE_NAME,
  legalName: SITE_LEGAL_NAME,
  description: SITE_DESCRIPTION,
  url: SITE_URL,
  logo: `${SITE_URL}/logo.png`,
  image: `${SITE_URL}/logo.png`,
  telephone: '+905324790828',
  email: 'admin@zivabacayangin.com',
  address: {
    '@type': 'PostalAddress',
    streetAddress: 'Balaban Mah. Boyalık Cad. No:70/A',
    addressLocality: 'Arnavutköy',
    addressRegion: 'İstanbul',
    addressCountry: 'TR',
  },
  geo: {
    '@type': 'GeoCoordinates',
    latitude: 41.3101786,
    longitude: 28.6125898,
  },
  hasMap: 'https://maps.app.goo.gl/dccgVUdVCitdABAn8',
  areaServed: { '@type': 'City', name: 'İstanbul' },
  openingHours: 'Mo-Su 00:00-23:59',
  knowsAbout: ['Baca Temizliği', 'Yangın Söndürme Sistemleri', 'İtfaiye Raporu', 'İSG Eğitimi'],
};

const faqPage = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: FAQS.map(f => ({
    '@type': 'Question',
    name: f.q,
    acceptedAnswer: { '@type': 'Answer', text: f.a },
  })),
};

export default function Home() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify([localBusiness, faqPage]) }}
      />
      <Landing />
    </>
  );
}
