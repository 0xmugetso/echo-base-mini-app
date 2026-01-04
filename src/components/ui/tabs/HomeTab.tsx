import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { useMiniApp } from "@neynar/react";
import { useBaseStats } from "~/hooks/useCoinBaseData";
import { NeynarUser } from "~/hooks/useNeynarUser";
import { RetroBanner } from "../RetroBanner";
import { RetroWindow } from "../RetroWindow";
import { Skull } from "../Skull";
import { PixelMintIcon } from "../PixelMintIcon";
import { PixelShareIcon } from "../PixelShareIcon";
import { base64Grid } from "../gridPattern";

type HomeTabProps = {
  neynarUser?: NeynarUser | null;
  context?: any;
};

const formatNumber = (value?: number | null, digits = 0) => {
  if (value === null || value === undefined) return "—";
  return Number(value).toLocaleString(undefined, {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  });
};

const formatEth = (wei: bigint) => Number(wei) / 1e18;

export const RetroStatBox = ({ label, value, subValue }: { label: string; value: string; subValue?: string }) => (
  <div className="group relative border-2 border-white bg-black p-3 hover:border-primary transition-colors cursor-default">
    {/* Corner Decorations */}
    <div className="absolute top-0 left-0 w-2 h-2 border-t-2 border-l-2 border-white group-hover:border-primary" />
    <div className="absolute top-0 right-0 w-2 h-2 border-t-2 border-r-2 border-white group-hover:border-primary" />
    <div className="absolute bottom-0 left-0 w-2 h-2 border-b-2 border-l-2 border-white group-hover:border-primary" />
    <div className="absolute bottom-0 right-0 w-2 h-2 border-b-2 border-r-2 border-white group-hover:border-primary" />

    <span className="text-[10px] uppercase tracking-widest text-gray-400 group-hover:text-primary font-bold mb-1 block">{label}</span>
    <div className="flex items-baseline gap-1">
      <span className="text-lg font-pixel text-white tracking-wider group-hover:text-shadow-glow">{value}</span>
      {subValue && <span className="text-[10px] text-gray-500">{subValue}</span>}
    </div>

    {/* Scanline effect on hover */}
    <div className="absolute inset-0 bg-primary/10 opacity-0 group-hover:opacity-100 pointer-events-none" />
  </div>
);

// Internal Retro Loader Component
const RetroLoader = () => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 98) {
          clearInterval(interval);
          return 98; // Hold at 98% until data loads
        }
        return Math.min(prev + (Math.random() * 3 + 1), 98);
      });
    }, 40);
    return () => clearInterval(interval);
  }, []);

  return (
    // Fixed overlay covering the entire viewport with high z-index
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-sm">
      <div className="w-[90%] max-w-md bg-black border-4 border-white p-8 shadow-[12px_12px_0px_0px_rgba(255,255,255,0.2)] flex flex-col gap-8 transform scale-110">
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-pixel text-white uppercase tracking-widest animate-pulse">
            INITIALIZING_ECHO_OS
          </h2>
          <p className="text-xs font-mono text-gray-400">CONNECTING TO BASE NETWORK...</p>
        </div>

        {/* Big Progress Bar */}
        <div className="w-full h-16 border-4 border-white p-1 bg-gray-900 relative">
          <div
            className="h-full bg-primary relative overflow-hidden transition-all duration-75 ease-out"
            style={{ width: `${progress}%` }}
          >
            {/* Striped Animation */}
            <div className="absolute inset-0 w-full h-full"
              style={{
                backgroundImage: 'linear-gradient(45deg, rgba(0,0,0,0.2) 25%, transparent 25%, transparent 50%, rgba(0,0,0,0.2) 50%, rgba(0,0,0,0.2) 75%, transparent 75%, transparent)',
                backgroundSize: '30px 30px'
              }}
            />
          </div>
        </div>

        <div className="flex justify-between text-xs font-mono text-gray-400 uppercase">
          <span>LOADING_MODULES...</span>
          <span className="text-primary">{Math.round(progress)}%</span>
        </div>
      </div>
    </div>
  );
};


import { IntroModal } from "../IntroModal";

export function HomeTab({ neynarUser, context }: HomeTabProps) {
  const { actions, isSDKLoaded } = useMiniApp();
  const [promptedAdd, setPromptedAdd] = useState(false);
  const [introOpen, setIntroOpen] = useState(true);

  const isFallbackAddress = !context?.user?.custody_address && !context?.user?.verified_addresses?.eth_addresses?.[0];
  const address =
    context?.user?.custody_address ||
    context?.user?.verified_addresses?.eth_addresses?.[0] ||
    "0x6bD8965a5e66EC06c29800Fb3a79B43f56D758cd";

  if (isFallbackAddress && isSDKLoaded) {
    console.warn("[Echo] Custody address missing. Origin mismatch likely blocking SDK context.");
  }

  const { data: baseStats, loading: baseLoading, error: baseError } = useBaseStats(address, context?.user?.fid);

  const baseName = context?.user?.username || "Anon";
  const pfp = context?.user?.pfp_url;

  const walletAgeText = useMemo(() => {
    if (!baseStats?.first_tx_date) return "—";
    const date = baseStats.first_tx_date;
    return `${Math.floor(baseStats.wallet_age_days || 0)} DAYS`;
  }, [baseStats]);

  useEffect(() => {
    if (!isSDKLoaded || promptedAdd) return;
    if (actions?.addMiniApp) {
      void actions
        .addMiniApp()
        .catch(() => null)
        .finally(() => setPromptedAdd(true));
    } else {
      setPromptedAdd(true);
    }
  }, [actions, isSDKLoaded, promptedAdd]);

  // Initial Loader State (only show on first load, before we have data)
  const showLoader = baseLoading && !baseStats;

  // Neynar Score fallback
  const farcasterScore = neynarUser?.score || 0;
  const followers = neynarUser?.follower_count ?? null;
  const following = neynarUser?.following_count ?? null;
  const fid = neynarUser?.fid || context?.user?.fid;

  /* DEBUG LOGS */
  useEffect(() => {
    if (baseStats) {
      console.log("[HomeTab] Full Stats:", baseStats);
      console.log("[HomeTab] Cast Count Value:", baseStats?.farcaster?.cast_count);
    }
  }, [baseStats]);

  return (
    <div className="space-y-4 pb-4 relative min-h-[400px]">


      <IntroModal
        isOpen={introOpen}
        onClose={() => setIntroOpen(false)}
        baseStats={baseStats}
        neynarUser={neynarUser}
        loading={baseLoading}
      />

      {/* IDENTITY BANNER */}
      <RetroBanner src="/assets/banner_skull.jpg" alt="Identity Matrx" />


      {/* Action Buttons */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        {/* SHARE BUTTON: Retro Outline Style */}
        <button
          onClick={() => setIntroOpen(true)}
          className="group relative bg-black text-white font-pixel text-sm uppercase py-4 border-2 border-white shadow-[4px_4px_0px_0px_#ffffff] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none hover:bg-white hover:text-black transition-all duration-0"
        >
          <span className="relative z-10 flex flex-row items-center justify-center gap-2">
            <PixelShareIcon className="w-6 h-6" />
            <span>SHARE_STATS</span>
          </span>
        </button>

        {/* MINT BUTTON: Electric Blue Style */}
        <button
          onClick={() => setIntroOpen(true)}
          className="group relative bg-primary text-white font-pixel text-sm uppercase py-4 border-2 border-white shadow-[4px_4px_0px_0px_#ffffff] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none hover:brightness-110 transition-all duration-0"
        >
          <span className="relative z-10 flex flex-row items-center justify-center gap-2">
            <PixelMintIcon className="w-6 h-6 text-white" />
            <span>MINT_ECHO</span>
          </span>
          {/* Scanline overlay for that "electric" feel */}
          <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] z-0 bg-[length:100%_2px,3px_100%] pointer-events-none" />
        </button>
      </div>

      {/* Network Activity Window */}
      <RetroWindow
        title="BASE_ACTIVITY"
        icon={
          <Image
            src="/assets/Base_basemark_white.svg"
            alt="Base"
            width={48}
            height={48}
            className="w-12 h-12 mr-2"
          />
        }
      >
        <div className="bg-white/5 border border-white/10 p-2 mb-4 text-center">
          <p className="text-[10px] text-gray-400">CHECK YOUR ONCHAIN ACTIVITY</p>
          <p className="text-[10px] text-primary">DATA BROUGHT TO YOU BY ECHO</p>
        </div>

        <div className="flex flex-col gap-4">
          {/* Row 1: 2 Columns */}
          <div className="grid grid-cols-2 gap-4">
            <RetroStatBox
              label="BIGGEST TX"
              value={baseLoading ? "..." : `$${formatNumber(baseStats?.biggest_single_tx)}`}
            />
            <RetroStatBox
              label="GAS PAID"
              value={
                baseLoading
                  ? "..."
                  : `${formatNumber(formatEth(baseStats?.total_fees_paid_wei || 0n), 4)}`
              }
              subValue="ETH"
            />
          </div>

          {/* Row 2: 3 Columns */}
          <div className="grid grid-cols-3 gap-2">
            <RetroStatBox
              label="TX COUNT"
              value={baseLoading ? "..." : formatNumber(baseStats?.total_tx)}
            />
            <RetroStatBox
              label="VOLUME"
              value={
                baseLoading
                  ? "..."
                  : `$${formatNumber(baseStats?.total_volume_usd, 0)}`
              }
            />
            <RetroStatBox label="AGE" value={baseLoading ? "..." : walletAgeText?.split(' ')[0] || "0"} subValue="DAYS" />
          </div>
        </div>

        {baseError && (
          <div className="mt-2 border border-primary p-2 text-xs text-primary uppercase bg-primary/20">
            ERROR: CONNECTION_FAILED
          </div>
        )}
      </RetroWindow>

      <RetroWindow
        title="FARCASTER_METRICS"
        icon={
          <Image
            src="/assets/transparent-white.svg"
            alt="Echo"
            width={48}
            height={48}
            className="w-12 h-12 mr-0"
          />
        }
      >
        <div className="bg-white/5 border border-white/10 p-2 mb-4 text-center">
          <p className="text-[10px] text-gray-400">YOUR SOCIAL LAYER STATUS</p>
          <p className="text-[10px] text-primary">POWERED BY NEYNAR</p>
        </div>

        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4">
            <RetroStatBox label="NEYNAR SCORE" value={formatNumber(farcasterScore, 2)} />
            <RetroStatBox
              label="TOTAL CASTS"
              value={baseLoading ? "..." : formatNumber(baseStats?.farcaster?.cast_count)}
            />
          </div>

          {/* BEST CAST SECTION - UPDATED FOR READABILITY */}
          <div className="border-2 border-dashed border-white/30 p-4 relative bg-[#0a0a0a] shadow-inner">
            <span className="absolute -top-3 left-3 bg-black px-2 text-xs text-white font-bold border border-white/30">TOP_CAST.LOG</span>
            {baseStats?.farcaster?.best_cast ? (
              <div className="mt-2">
                <p className="text-base text-gray-200 italic line-clamp-3 leading-relaxed">&quot;{baseStats.farcaster.best_cast.text}&quot;</p>
                <div className="flex gap-4 mt-3 text-xs text-gray-400 font-mono border-t border-white/10 pt-2">
                  <span className="font-bold flex items-center gap-1 text-white">♥ LIKES: <span className="text-gray-300">{baseStats.farcaster.best_cast.likes}</span></span>
                  <span className="font-bold flex items-center gap-1 text-white">↻ RECASTS: <span className="text-gray-300">{baseStats.farcaster.best_cast.recasts}</span></span>
                </div>
              </div>
            ) : (
              <div className="mt-1 text-center py-4">
                <p className="text-sm text-gray-400 font-mono">NO_CASTS_FOUND</p>
              </div>
            )}
          </div>

          {/* [REDESIGNED] EARNED BADGES SECTION */}
          <div className="space-y-4 mt-6">
            <div className="flex items-center gap-2 mb-2">
              <div className="h-[2px] flex-1 bg-gradient-to-r from-transparent to-primary/30" />
              <h3 className="font-pixel text-xs text-primary uppercase tracking-[0.2em]">EARNED_BADGES</h3>
              <div className="h-[2px] flex-1 bg-gradient-to-l from-transparent to-primary/30" />
            </div>

            <div className="grid grid-cols-4 gap-3">
              {[
                { id: 'clanker', label: 'CLANKER', color: 'from-blue-600 to-blue-900', icon: '⚡' },
                { id: 'toshi', label: 'TOSHI', color: 'from-cyan-500 to-cyan-800', icon: '🐱' },
                { id: 'degen', label: 'DEGEN', color: 'from-purple-600 to-purple-900', icon: '🎩' },
                { id: 'pro_og', label: 'PRO_OG', color: 'from-yellow-500 to-yellow-800', icon: '👑' },
                { id: 'warplets', label: 'WARP', color: 'from-orange-500 to-orange-800', icon: '🌀' },
                { id: 'based_punk', label: 'PUNK', color: 'from-blue-400 to-blue-700', icon: '🎸' },
                { id: 'bankr_club', label: 'BANKR', color: 'from-red-500 to-red-800', icon: '🏦' },
                { id: 'jesse', label: 'JESSE', color: 'from-green-500 to-green-800', icon: '✨' },
              ].map((badge) => {
                const isOwned = baseStats?.farcaster?.holdings?.[badge.id as keyof typeof baseStats.farcaster.holdings];
                return (
                  <div
                    key={badge.id}
                    className={`relative aspect-square border-2 flex flex-col items-center justify-center gap-1 transition-all duration-500 ${isOwned ? `border-white bg-gradient-to-br ${badge.color} shadow-[0_0_10px_rgba(255,255,255,0.2)]` : 'border-white/10 bg-black grayscale opacity-40'}`}
                  >
                    {/* Badge Shine */}
                    {isOwned && <div className="absolute inset-0 bg-white/10 animate-pulse pointer-events-none" />}

                    <span className="text-lg">{badge.icon}</span>
                    <span className="text-[7px] font-pixel text-center px-1 leading-tight">{badge.label}</span>

                    {!isOwned && <div className="absolute inset-0 flex items-center justify-center"><span className="text-[10px] opacity-20">?</span></div>}
                  </div>
                );
              })}
            </div>

            <p className="text-[8px] text-center text-gray-600 font-mono uppercase tracking-widest leading-relaxed">
              Tokens & Collections detected via Base Network indexing.<br />
              Hold 10,000+ units or specific NFTs to unlock.
            </p>
          </div>
        </div>
      </RetroWindow>

    </div>
  );
}
