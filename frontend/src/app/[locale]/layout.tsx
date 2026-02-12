import { Outfit } from 'next/font/google';
import './globals.css';

import { SidebarProvider } from '@/context/SidebarContext';
import { ThemeProvider } from '@/context/ThemeContext';
import QueryProvider from '@/context/QueryProvider';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { notFound } from 'next/navigation';
import ScrollToTop from '@/components/common/ScrollToTop';
import Script from 'next/script';

const outfit = Outfit({
  subsets: ["latin"],
});

export default async function LocaleLayout({
  children,
  params
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  // Validate that the incoming `locale` parameter is valid
  if (!['en', 'ko'].includes(locale as any)) {
    notFound();
  }

  // Providing all messages to the client
  // side is the easiest way to get started
  const messages = await getMessages();

  return (
    <html lang={locale} suppressHydrationWarning>
      <head>
        {/* Google Analytics (GA4) */}
        <Script
          strategy="afterInteractive"
          src="https://www.googletagmanager.com/gtag/js?id=G-F4S9CBVLS8"
        />
        <Script
          id="gtag-init"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());

              // Consent Mode Default
              gtag('consent', 'default', {
                'ad_storage': 'granted',
                'ad_user_data': 'granted',
                'ad_personalization': 'granted',
                'analytics_storage': 'granted'
              });

              gtag('config', 'G-F4S9CBVLS8');
            `,
          }}
        />
        {/* Google AdSense - Replace with your own ca-pub ID */}
        <script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-1199110233969910"
          crossOrigin="anonymous"
        ></script>
      </head>
      <body className={`${outfit.className} dark:bg-gray-900 overflow-x-hidden`} suppressHydrationWarning>
        <NextIntlClientProvider messages={messages}>
          <QueryProvider>
            <ThemeProvider>
              <SidebarProvider>
                {children}
                <ScrollToTop />
              </SidebarProvider>
            </ThemeProvider>
          </QueryProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
