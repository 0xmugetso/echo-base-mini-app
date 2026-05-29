'use client';

import dynamic from 'next/dynamic';
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
      <ToastProvider>
        {children}
      </ToastProvider>
    </WagmiProvider>
  );
}
