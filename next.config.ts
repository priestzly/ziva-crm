import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'tbyofeypvkmmnuqyraew.supabase.co',
        port: '',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
  async redirects() {
    return [
      {
        source: '/contact-us',
        destination: '/#iletisim',
        permanent: true,
      },
      {
        source: '/contact',
        destination: '/#iletisim',
        permanent: true,
      },
      {
        source: '/about-us',
        destination: '/#hakkimizda',
        permanent: true,
      },
      {
        source: '/about',
        destination: '/#hakkimizda',
        permanent: true,
      },
      {
        source: '/building-maintenance',
        destination: '/#hizmetler',
        permanent: true,
      },
      {
        source: '/kadromuz',
        destination: '/',
        permanent: true,
      },
      {
        source: '/yangin-sondurme-sistemleri',
        destination: '/#hizmetler',
        permanent: true,
      },
      // Eski WordPress sitesinden kalan ve Google'da indekslenmiş adresler
      {
        source: '/services/:slug*',
        destination: '/#hizmetler',
        permanent: true,
      },
      {
        source: '/our-team',
        destination: '/#hakkimizda',
        permanent: true,
      },
      {
        source: '/:page(faqs|blog|sample-page|home-slider|home-video|feed)',
        destination: '/',
        permanent: true,
      },
      {
        source: '/:year(\\d{4})/:path*',
        destination: '/',
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
