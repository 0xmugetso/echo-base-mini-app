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

      {/* [REDESIGNED] TECHY STATS BREAKDOWN */}
      <div className="border-2 border-primary bg-black p-6 shadow-[0_0_20px_rgba(0,180,255,0.2)] relative overflow-hidden group">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.1)_50%)] z-0 bg-[length:100%_2px] pointer-events-none" />

        <div className="relative z-10">
          <div className="flex justify-between items-start mb-6">
            <div>
              <p className="text-[10px] font-pixel text-primary uppercase tracking-[0.2em] mb-2">TOTAL_ECHO_POWER</p>
              <div className="flex items-baseline gap-3">
                <h2 className="text-6xl font-pixel text-white tracking-tighter drop-shadow-[0_0_10px_rgba(255,255,255,0.5)]">
                  {(neynarUser?.score ? Math.floor(neynarUser.score) : 0) + (baseStats?.baseScore || 0)}
                </h2>
                <span className="text-xl font-pixel text-primary">PT</span>
              </div>
            </div>
            <div className="opacity-40 grayscale contrast-200">
              <Skull className="w-16 h-16 text-primary" />
            </div>
          </div>

          <div className="h-[2px] w-full bg-white/10 mb-6" />

          <div className="grid grid-cols-2 gap-8">
            <div>
              <p className="text-[9px] font-mono text-gray-500 uppercase tracking-widest mb-1">GRIND_PTS (EARNED)</p>
              <p className="text-2xl font-pixel text-white">+{neynarUser?.score ? Math.floor(neynarUser.score) : 0}</p>
            </div>
            <div>
              <p className="text-[9px] font-mono text-gray-500 uppercase tracking-widest mb-1">ONCHAIN_POWER (HISTORY)</p>
              <p className="text-2xl font-pixel text-white">+{baseStats?.baseScore || 0}</p>
            </div>
          </div>
        </div>
      </div>

      {/* [REDESIGNED] EARNED BADGES WINDOW */}
      <RetroWindow title="EARNED_BADGES" icon={<span className="text-primary text-xs mr-2">⊞</span>}>
        <div className="grid grid-cols-2 gap-4">
          {[
            { id: 'early', label: 'OG', sub: 'EARLY', color: 'bg-blue-600', active: true },
            { id: 'tester', label: 'V1', sub: 'TESTER', color: 'bg-purple-600', active: true },
            { id: 'locked1', label: '?', sub: 'LOCKED', color: 'bg-gray-900', active: false },
            { id: 'locked2', label: '?', sub: 'LOCKED', color: 'bg-gray-900', active: false },
          ].map((b) => (
            <div
              key={b.id}
              className={`aspect-square border-2 ${b.active ? 'border-white shadow-[4px_4px_0_0_rgba(255,255,255,0.2)]' : 'border-dashed border-gray-800'} p-1 relative group cursor-help`}
            >
              <div className={`w-full h-full flex flex-col items-center justify-center gap-1 ${b.active ? b.color : 'bg-black opacity-30'}`}>
                <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.1)_1px,transparent_1px)] bg-[length:100%_2px] pointer-events-none" />
                <h4 className="text-2xl font-pixel text-white">{b.label}</h4>
                <p className="text-[8px] font-mono text-white/70 uppercase tracking-tighter">{b.sub}</p>
              </div>
              {b.active && <div className="absolute -top-1 -left-1 w-2 h-2 bg-white" />}
            </div>
          ))}
        </div>
      </RetroWindow>

      {/* [NEW] GLOBAL RANKING SECTION */}
      <RetroWindow title="GLOBAL_RANKING" icon={<span className="text-primary text-xs mr-2">⌁</span>}>
        <div className="aspect-video bg-black/50 border-2 border-dashed border-white/10 flex items-center justify-center group">
          <div className="border-4 border-white/20 p-6 transform -rotate-2 group-hover:rotate-0 transition-transform duration-500">
            <h3 className="text-2xl font-pixel text-white/40 uppercase tracking-widest">COMING SOON</h3>
            <p className="text-center font-mono text-[10px] text-gray-600 mt-2 uppercase">SEASON 1 ACTIVATION</p>
          </div>
        </div>
      </RetroWindow>

      {/* NETWORK ACTIVITY WINDOW (MINIMIZED STYLE) */}
      <RetroWindow
        title="BASE_STATS"
        icon={<Image src="/assets/Base_basemark_white.svg" alt="Base" width={24} height={24} className="w-6 h-6 mr-2" />}
      >
        <div className="grid grid-cols-2 gap-3">
          <RetroStatBox label="TX_COUNT" value={baseLoading ? "..." : formatNumber(baseStats?.total_tx)} />
          <RetroStatBox label="AGE" value={baseLoading ? "..." : walletAgeText?.split(' ')[0] || "0"} subValue="D" />
          <RetroStatBox label="VOLUME" value={baseLoading ? "..." : `$${formatNumber(baseStats?.total_volume_usd, 0)}`} />
          <RetroStatBox label="GAS" value={baseLoading ? "..." : `${formatNumber(formatEth(baseStats?.total_fees_paid_wei || 0n), 4)}`} />
        </div>
      </RetroWindow>

      <RetroWindow
        title="SOCIAL_LOG"
        icon={<Image src="/assets/transparent-white.svg" alt="Echo" width={24} height={24} className="w-6 h-6 mr-0" />}
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <RetroStatBox label="SCORE" value={formatNumber(farcasterScore, 2)} />
            <RetroStatBox
              label="CASTS"
              value={baseLoading ? "..." : formatNumber(baseStats?.farcaster?.cast_count)}
            />
          </div>

          <div className="border-2 border-dashed border-white/10 p-4 bg-[#050505]">
            <span className="text-[10px] text-gray-600 font-pixel uppercase block mb-2">TOP_LOG</span>
            {baseStats?.farcaster?.best_cast ? (
              <div>
                <p className="text-xs text-gray-400 italic line-clamp-2 leading-relaxed">&quot;{baseStats.farcaster.best_cast.text}&quot;</p>
              </div>
            ) : (
              <p className="text-[10px] text-gray-800 italic">EMPTY_FEED</p>
            )}
          </div>
        </div>
      </RetroWindow>

    </div>
  );
}
