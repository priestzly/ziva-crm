import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Portal Girişi - Ziva Yangın',
  description: 'Ziva Yangın müşteri ve personel takip portalı giriş sayfası.',
};

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
