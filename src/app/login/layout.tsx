import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Portal Girişi',
  description: 'Ziva Yangın müşteri ve personel takip portalı giriş sayfası.',
  robots: { index: false, follow: false },
};

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
