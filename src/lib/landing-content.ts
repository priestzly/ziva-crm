/*
 * Ana sayfa içerikleri. Metinleri buradan güncelleyebilirsiniz.
 *
 * Fotoğraflar: public/images/ klasörüne WEBP olarak koyup aşağıdaki PHOTOS içinde yolunu yazın
 * (ör. hero: '/images/hero.webp'). Değer null ise yerine marka renklerinde bir görsel çizilir.
 * Hangi fotoğrafın nereye gideceği ve ChatGPT için hazır promptlar: docs/fotograf-promptlari.md
 */

export type PhotoSlot = 'hero' | 'baca' | 'sondurme' | 'itfaiye' | 'egitim' | 'ekip';

export const PHOTOS: Record<PhotoSlot, string | null> = {
  hero: '/images/hero.webp',
  baca: '/images/baca.webp',
  sondurme: '/images/sondurme.webp',
  itfaiye: '/images/itfaiye.webp',
  egitim: '/images/egitim.webp',
  ekip: '/images/ekip.webp',
};

export const STATS = [
  { value: '25+', label: 'Yıllık sektör tecrübesi' },
  { value: '7/24', label: 'Acil teknik destek' },
  { value: '%100', label: 'Müşteri memnuniyeti' },
  { value: 'İstanbul', label: 'Geneline hizmet' },
];

export const SERVICES: {
  id: string;
  photo: PhotoSlot;
  title: string;
  desc: string;
  items: string[];
}[] = [
  {
    id: 'baca-temizligi',
    photo: 'baca',
    title: 'Baca Temizliği',
    desc: 'Kurum ve yağ birikimi yangınların en sık sebeplerinden biri. Bacalarınızı düzenli temizleyerek riski ortadan kaldırıyoruz.',
    items: [
      'Katı yakıtlı ve doğalgazlı sistemler',
      'Endüstriyel mutfak davlumbaz ve kanalları',
      'Kazan ve kalorifer bacaları',
      'Servis sonrası fotoğraflı rapor',
    ],
  },
  {
    id: 'yangin-sondurme-sistemleri',
    photo: 'sondurme',
    title: 'Yangın Söndürme Sistemleri',
    desc: 'Tesisinize uygun söndürme sistemini projelendiriyor, kuruyor ve periyodik bakımını yapıyoruz.',
    items: [
      'Sprinkler sistemleri',
      'Gazlı söndürme sistemleri',
      'Yangın dolapları ve algılama',
      'Periyodik bakım ve test',
    ],
  },
  {
    id: 'itfaiye-raporu',
    photo: 'itfaiye',
    title: 'İtfaiye Raporu',
    desc: 'Yönetmeliğe uygunluk denetiminden ruhsat sürecine kadar itfaiye onayı için gereken her adımda yanınızdayız.',
    items: [
      'Ön denetim ve eksik tespiti',
      'Çalışma ruhsatı süreci',
      'Teknik onay desteği',
      'Gerekli düzeltmelerin uygulanması',
    ],
  },
  {
    id: 'isg-egitimi',
    photo: 'egitim',
    title: 'İSG ve Yangın Eğitimi',
    desc: 'Personelinizi yangına karşı bilinçlendiriyor, acil durumlarda doğru hareket etmeleri için tatbikatlar düzenliyoruz.',
    items: [
      'Temel yangın eğitimi',
      'Söndürücü kullanım uygulaması',
      'Acil durum planı',
      'Tahliye tatbikatı',
    ],
  },
];

export const REASONS = [
  { title: '25+ yıl tecrübe', desc: 'Konuttan AVM’ye, endüstriyel tesisten restorana kadar sahada edinilmiş deneyim.' },
  { title: 'Sertifikalı ekipman', desc: 'TSE & ISO onaylı, kalite belgeleriyle doğrulanmış malzeme ve ekipman.' },
  { title: 'Şeffaf raporlama', desc: 'Her servisin fotoğrafları ve raporu online portalda, istediğiniz an elinizde.' },
  { title: '7/24 ulaşılabilir', desc: 'Acil durumlarda gece gündüz telefonla ya da WhatsApp’tan bize ulaşabilirsiniz.' },
];

export const STEPS = [
  { title: 'Bize ulaşın', desc: 'Telefon ya da WhatsApp’tan talebinizi iletin.' },
  { title: 'Ücretsiz keşif', desc: 'Yerinizde inceleme yapıp ihtiyacı netleştirelim.' },
  { title: 'Uygulama', desc: 'Uzman ekibimiz işi planlanan tarihte tamamlasın.' },
  { title: 'Rapor', desc: 'Fotoğraflı servis raporunuz portala yüklensin.' },
];

export const FAQS = [
  {
    q: 'Baca ne sıklıkla temizlenmeli?',
    a: 'Kullanım yoğunluğuna göre değişir. Genel olarak ısıtma sezonu öncesinde yılda en az bir kez temizlik önerilir; yoğun kullanılan endüstriyel mutfak davlumbaz ve kanallarında daha sık periyotlar gerekir. Keşif sırasında size özel bir periyot belirliyoruz.',
  },
  {
    q: 'İtfaiye raporu almak için ne yapmam gerekiyor?',
    a: 'Bizi aramanız yeterli. Önce işyerinizde ön denetim yapıp eksikleri tespit ediyoruz, gerekli düzeltmeleri uyguluyor ve ruhsat sürecinde teknik destek veriyoruz.',
  },
  {
    q: 'Keşif ücretli mi?',
    a: 'Hayır, keşif ücretsizdir. Yerinizde inceleme yaptıktan sonra size net bir teklif sunuyoruz.',
  },
  {
    q: 'Hangi bölgelere hizmet veriyorsunuz?',
    a: 'Merkezimiz Arnavutköy’de; İstanbul’un tüm ilçelerine hizmet veriyoruz.',
  },
  {
    q: 'Servis sonrası rapor alabiliyor muyum?',
    a: 'Evet. Her servisin fotoğrafları ve raporu müşteri portalına yüklenir; geçmiş kayıtlarınıza istediğiniz zaman ulaşabilirsiniz.',
  },
  {
    q: 'Acil bir durumda size ulaşabilir miyim?',
    a: '7/24 telefon ve WhatsApp hattımızdan bize ulaşabilirsiniz.',
  },
];
