import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { AuthProvider } from "@/context/AuthContext";
import { SITE_URL, SITE_NAME, SITE_DESCRIPTION } from "@/lib/site";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Ziva Yangın | Baca Temizliği ve Yangın Söndürme Sistemleri – İstanbul",
    template: "%s | Ziva Yangın",
  },
  description: SITE_DESCRIPTION,
  keywords: ["baca temizliği", "yangın söndürme sistemleri", "itfaiye raporu", "İSG eğitimi", "Arnavutköy", "İstanbul"],
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "tr_TR",
    url: SITE_URL,
    siteName: SITE_NAME,
    title: "Ziva Yangın | Baca Temizliği ve Yangın Söndürme Sistemleri",
    description: SITE_DESCRIPTION,
    images: [{ url: "/logo.png", alt: SITE_NAME }],
  },
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Ziva CRM",
  },
};

export const viewport = {
  themeColor: "#050508",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

import { ThemeProvider } from "@/context/ThemeContext";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr" className={`${jakarta.variable} h-full antialiased`} suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  if (localStorage.getItem('ziva-theme') === 'light') {
                    document.documentElement.classList.add('light');
                  }
                } catch (e) {}
                
                if ('serviceWorker' in navigator) {
                  window.addEventListener('load', function() {
                    navigator.serviceWorker.register('/sw.js').then(function(reg) {
                      console.log('SW scope:', reg.scope);
                    }).catch(function(err) {
                      console.error('SW failed:', err);
                    });
                  });
                }
              })()
            `,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col">
        <AuthProvider>
          <ThemeProvider>
            {children}
          </ThemeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
