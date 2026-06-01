import { useState, useEffect } from 'react';
import { sdk } from '@farcaster/miniapp-sdk';
import { useAccount } from 'wagmi';

export interface MiniAppContext {
  isSDKLoaded: boolean;
  context: any;
  currentTab: string;
  setActiveTab: (tab: string) => void;
  setInitialTab: (tab: string) => void;
  actions: {
    ready: () => Promise<void>;
    addMiniApp: () => Promise<void>;
    composeCast: (options: any) => Promise<void>;
    openUrl: (url: string) => Promise<void>;
    sendTransaction: (options: any) => Promise<string>;
  };
  sdk: any;
  added?: boolean;
  notificationDetails?: any;
  haptics?: any;
  platform: 'warpcast' | 'base-app' | 'browser';
}

export function useMiniApp(): MiniAppContext {
  const [isSDKLoaded, setIsSDKLoaded] = useState(false);
  const [context, setContext] = useState<any>(null);
  const [isInFrame, setIsInFrame] = useState(false);
  const [currentTab, setCurrentTab] = useState<string>('home');
  const [platform, setPlatform] = useState<'warpcast' | 'base-app' | 'browser'>('browser');
  const { address, connector } = useAccount();

  useEffect(() => {
    if (isInFrame) {
      setPlatform('warpcast');
    } else if (typeof window !== 'undefined') {
      const isCbWallet = !!(
        (window.ethereum as any)?.isCoinbaseWallet ||
        (window.ethereum as any)?.isCoinbaseBrowser ||
        window.navigator.userAgent.toLowerCase().includes('coinbase')
      );
      const isCbConnector = connector?.id === 'coinbaseWalletSDK' || connector?.id === 'coinbaseWallet';
      
      if (isCbWallet || isCbConnector) {
        setPlatform('base-app');
      } else {
        setPlatform('browser');
      }
    }
  }, [isInFrame, connector]);

  useEffect(() => {
    let active = true;

    async function init() {
      try {
        // Try calling ready to initialize the SDK inside frame
        // We use a sentinel string to detect Farcaster SDK timeouts cleanly
        const readyPromise = sdk.actions.ready().then(() => 'ready');
        const timeoutPromise = new Promise<string>((resolve) => setTimeout(() => resolve('timeout'), 300));

        const raceResult = await Promise.race([readyPromise, timeoutPromise]);

        if (raceResult === 'timeout') {
          throw new Error("Farcaster SDK ready timed out");
        }

        if (!active) return;

        // Try getting frame context (only if ready was successful within 300ms)
        const ctx = await (sdk.context as any);
        if (ctx && ctx.user) {
          setContext(ctx);
          setIsInFrame(true);
          setPlatform('warpcast');
          if (ctx.client?.initialTab) {
            setCurrentTab(ctx.client.initialTab);
          }
          setIsSDKLoaded(true);
          return;
        }
      } catch (err) {
        console.warn("Farcaster SDK initialization skipped (not in Warpcast frame):", err);
      }

      // If we are not in a Farcaster frame, but we have a connected wallet address,
      // let's resolve their Farcaster profile via Neynar V2 bulk-by-address API.
      if (address) {
        try {
          const response = await fetch(`/api/users?address=${address}`);
          if (response.ok) {
            const data = await response.json();
            if (active && data.users?.[0]) {
              const user = data.users[0];
              // Map Neynar user profile properties to the standard Farcaster Mini App context.user schema
              const mockContext = {
                user: {
                  fid: user.fid,
                  username: user.username,
                  displayName: user.display_name || user.username,
                  pfpUrl: user.pfp_url,
                  custodyAddress: user.custody_address,
                  verifiedAddresses: {
                    ethAddresses: user.verified_addresses?.eth_addresses || [address],
                  }
                },
                client: {
                  safeAreaInsets: { top: 0, bottom: 0, left: 0, right: 0 }
                }
              };
              setContext(mockContext);
            }
          }
        } catch (e) {
          console.error("Failed to resolve Farcaster user profile from connected address:", e);
        }
      } else {
        // Clear context if wallet is disconnected
        setContext(null);
      }

      if (active) {
        setIsSDKLoaded(true);
      }
    }

    init();

    return () => {
      active = false;
    };
  }, [address]);

  const setActiveTab = (tab: string) => {
    setCurrentTab(tab);
    try {
      if (context && isInFrame) {
        // Sync tab change with frame client if possible
      }
    } catch (e) {
      console.warn("Error calling setActiveTab in frame:", e);
    }
  };

  const setInitialTab = (tab: string) => {
    // no-op or set locally
  };

  const actions = {
    ready: async () => {
      try {
        await sdk.actions.ready();
      } catch (e) {
        console.warn("sdk.actions.ready failed:", e);
      }
    },
    addMiniApp: async () => {
      try {
        if (isInFrame) {
          await sdk.actions.addMiniApp();
        } else {
          console.log("addMiniApp called outside of Farcaster Frame - ignoring");
        }
      } catch (e) {
        console.warn("addMiniApp failed:", e);
      }
    },
    composeCast: async (options: any) => {
      try {
        if (isInFrame) {
          await sdk.actions.composeCast(options);
        } else {
          // Fallback to Warpcast deep link compose cast!
          const text = encodeURIComponent(options.text || "");
          const embedUrl = options.embeds?.[0] ? encodeURIComponent(options.embeds[0]) : "";
          const url = `https://warpcast.com/~/compose?text=${text}${embedUrl ? `&embeds[]=${embedUrl}` : ''}`;
          window.open(url, '_blank');
        }
      } catch (e) {
        console.warn("composeCast failed:", e);
      }
    },
    openUrl: async (url: string) => {
      try {
        if (isInFrame) {
          await sdk.actions.openUrl(url);
        } else {
          window.open(url, '_blank');
        }
      } catch (e) {
        console.warn("openUrl failed:", e);
        window.open(url, '_blank');
      }
    },
    sendTransaction: async (options: any) => {
      try {
        if (isInFrame && (sdk.actions as any).sendTransaction) {
          // Auto-append Base Builder Code suffix (bc_uxvmter5) to calldata if present
          if (options.data && !options.data.includes("62635f7578766d746572350b0080218021802180218021802180218021")) {
            options.data = `${options.data}62635f7578766d746572350b0080218021802180218021802180218021`;
          }
          return await (sdk.actions as any).sendTransaction(options);
        }
      } catch (e) {
        console.warn("sendTransaction in frame failed:", e);
      }
      throw new Error("sendTransaction only supported in Farcaster frame or should use Wagmi hooks directly outside");
    }
  };

  return {
    isSDKLoaded,
    context,
    currentTab,
    setActiveTab,
    setInitialTab,
    actions,
    sdk,
    added: context?.client?.added || false,
    notificationDetails: context?.client?.notificationDetails || null,
    haptics: (sdk.actions as any)?.haptics || null,
    platform,
  };
}
