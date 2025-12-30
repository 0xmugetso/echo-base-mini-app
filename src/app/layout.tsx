import type { Metadata } from 'next';

import localFont from 'next/font/local';
import '~/app/globals.css';
import { Providers } from '~/app/providers';
import { APP_NAME, APP_DESCRIPTION } from '~/lib/constants';

const boldPixels = localFont({
  src: '../../public/fonts/BoldPixels.otf',
  variable: '--font-pixel',
  display: 'swap',
});

export const metadata: Metadata = {
  title: APP_NAME,
  description: APP_DESCRIPTION,
  icons: {
    icon: '/echo-logo.png',
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${boldPixels.variable} font-pixel`}>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
