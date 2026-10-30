import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Müşteri Paneli',
  robots: { index: false, follow: false },
};

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
