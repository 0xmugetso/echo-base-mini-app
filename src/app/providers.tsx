'use client';

import dynamic from 'next/dynamic';
import { MiniAppProvider } from '@neynar/react';

import { ANALYTICS_ENABLED, RETURN_URL } from '~/lib/constants';
import { ToastProvider } from '~/components/ui/ToastProvider';

const WagmiProvider = dynamic(
  () => import('~/components/providers/WagmiProvider'),
  {
    ssr: false,
  }
);

export function Providers({
  children,
}: {
  children: React.ReactNode;
}) {

  return (
    <WagmiProvider>
      <MiniAppProvider
        analyticsEnabled={ANALYTICS_ENABLED}
        backButtonEnabled={true}
        returnUrl={RETURN_URL}
      >
        <ToastProvider>
          {children}
        </ToastProvider>
      </MiniAppProvider>
    </WagmiProvider>
  );
}
