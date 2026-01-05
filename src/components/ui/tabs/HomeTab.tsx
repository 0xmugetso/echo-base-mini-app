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
      <div className="border-4 border-white bg-black p-8 shadow-[8px_8px_0px_0px_rgba(255,255,255,0.1)] relative overflow-hidden group">
        {/* Animated matrix/scanline background */}
        <div className="absolute inset-0 opacity-10 pointer-events-none"
          style={{ backgroundImage: `url("${base64Grid}")`, backgroundSize: '20px 20px' }} />
        <div className="absolute inset-0 bg-gradient-to-t from-primary/5 to-transparent pointer-events-none" />

        <div className="relative z-10">
          <div className="flex justify-between items-start mb-8">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-primary animate-pulse" />
                <p className="text-[10px] font-pixel text-primary uppercase tracking-[0.3em]">USER_ECHO_CORE_v1.0</p>
              </div>
              <h2 className="text-7xl font-pixel text-white tracking-tighter text-shadow-glow">
                {(neynarUser?.score ? Math.floor(neynarUser.score) : 0) + (baseStats?.baseScore || 0)}
              </h2>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono text-gray-500 uppercase">SYSTEM_STABILITY:</span>
                <span className="text-[10px] font-mono text-primary">OPTIMAL</span>
              </div>
            </div>
            <div className="p-4 border-2 border-primary/30 rounded-full animate-[spin_10s_linear_infinite]">
              <Skull className="w-12 h-12 text-primary opacity-50" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="border-2 border-white/10 p-4 bg-white/5 backdrop-blur-sm group-hover:border-primary/50 transition-colors">
              <p className="text-[9px] font-mono text-primary uppercase tracking-widest mb-2 flex items-center gap-1">
                <span className="w-1 h-1 bg-primary" /> GRIND_PTS
              </p>
              <p className="text-3xl font-pixel text-white">+{neynarUser?.score ? Math.floor(neynarUser.score) : 0}</p>
              <div className="w-full h-1 bg-white/5 mt-2">
                <div className="h-full bg-primary/50" style={{ width: '65%' }} />
              </div>
            </div>
            <div className="border-2 border-white/10 p-4 bg-white/5 backdrop-blur-sm group-hover:border-primary/50 transition-colors">
              <p className="text-[9px] font-mono text-primary uppercase tracking-widest mb-2 flex items-center gap-1">
                <span className="w-1 h-1 bg-primary" /> ONCHAIN_POWER
              </p>
              <p className="text-3xl font-pixel text-white">+{baseStats?.baseScore || 0}</p>
              <div className="w-full h-1 bg-white/5 mt-2">
                <div className="h-full bg-primary/50" style={{ width: '85%' }} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* [NEW] GLOBAL RANKING SECTION */}
      <div className="relative">
        <div className="absolute -top-2 left-4 px-2 bg-black border-2 border-white z-10">
          <span className="text-[9px] font-pixel text-white uppercase tracking-widest">GLOBAL_LEADERBOARD</span>
        </div>
        <div className="border-2 border-white bg-black p-6 shadow-[4px_4px_0px_0px_rgba(255,255,255,0.05)]">
          <div className="aspect-[21/9] bg-[#0a0a0a] border border-white/10 flex items-center justify-center relative overflow-hidden group">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-primary/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />

            <div className="flex flex-col items-center gap-2 z-10">
              <div className="flex items-center gap-4">
                <div className="h-px w-8 bg-white/20" />
                <h3 className="text-2xl font-pixel text-white/30 uppercase tracking-[0.4em] group-hover:text-white/60 transition-colors">COMING SOON</h3>
                <div className="h-px w-8 bg-white/20" />
              </div>
              <div className="px-3 py-1 bg-primary/10 border border-primary/20">
                <p className="text-[8px] font-mono text-primary uppercase tracking-[0.2em] animate-pulse">SEASON 1 ACTIVATION IN PROGRESS</p>
              </div>
            </div>

            {/* Retro glitch lines */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
              <div className="absolute top-1/4 left-0 w-full h-px bg-white/5 animate-[scan_4s_linear_infinite]" />
              <div className="absolute top-3/4 left-0 w-full h-px bg-white/5 animate-[scan_3s_linear_infinite_delay-1000]" />
            </div>
          </div>
        </div>
      </div>

      {/* [REDESIGNED] EARNED BADGES WINDOW */}
      <RetroWindow title="COLLECTED_OPERATIONS" icon={<div className="w-2 h-2 bg-primary mr-2" />}>
        <div className="grid grid-cols-2 gap-6 p-2">
          {[
            { id: 'og', label: 'GENESIS_OG', sub: 'PHASE_0', color: 'bg-blue-900/50', active: true, desc: 'Early adopter status' },
            { id: 'v1', label: 'ALPHA_V1', sub: 'PHASE_1', color: 'bg-emerald-900/50', active: true, desc: 'Core system tester' },
            { id: 'l1', label: 'UNKNOWN', sub: 'PHASE_2', color: 'bg-zinc-900/50', active: false, desc: 'Data encrypted' },
            { id: 'l2', label: 'ENCRYPTED', sub: 'PHASE_3', color: 'bg-zinc-900/50', active: false, desc: 'System offline' },
          ].map((b) => (
            <div
              key={b.id}
              className={`group relative aspect-square border-2 transition-all duration-300 ${b.active
                  ? 'border-white shadow-[6px_6px_0_0_rgba(255,255,255,0.1)] hover:-translate-y-1'
                  : 'border-white/5 grayscale opacity-40'
                }`}
            >
              <div className={`w-full h-full flex flex-col p-4 ${b.active ? b.color : 'bg-black'}`}>
                {/* Background Pattern */}
                <div className="absolute inset-0 opacity-20 group-hover:opacity-40 transition-opacity pointer-events-none"
                  style={{ backgroundImage: `radial-gradient(circle, white 1px, transparent 1px)`, backgroundSize: '8px 8px' }} />

                <div className="mb-auto">
                  <div className="flex justify-between items-start">
                    <span className="text-[8px] font-mono text-white/50">{b.sub}</span>
                    {b.active && <div className="w-1.5 h-1.5 bg-primary shadow-[0_0_8px_theme('colors.primary')]" />}
                  </div>
                  <h4 className="text-xl font-pixel text-white mt-1 group-hover:text-shadow-glow transition-all">{b.label}</h4>
                </div>

                <p className="text-[7px] font-mono text-white/40 uppercase tracking-tighter leading-tight mt-2">{b.desc}</p>
              </div>

              {/* Corner Accents */}
              {b.active && (
                <>
                  <div className="absolute -top-1 -left-1 w-2 h-2 border-t-2 border-l-2 border-white" />
                  <div className="absolute -bottom-1 -right-1 w-2 h-2 border-b-2 border-r-2 border-white" />
                </>
              )}
            </div>
          ))}
        </div>
      </RetroWindow>

      {/* NETWORK ACTIVITY WINDOW (MINIMIZED STYLE) */}
      <RetroWindow
        title="BASE_STATS.DAT"
        icon={<Image src="/assets/Base_basemark_white.svg" alt="Base" width={24} height={24} className="w-4 h-4 mr-2" />}
      >
        <div className="grid grid-cols-2 gap-3">
          <RetroStatBox label="TX_METRIC" value={baseLoading ? "..." : formatNumber(baseStats?.total_tx)} />
          <RetroStatBox label="AGE_STAMP" value={baseLoading ? "..." : walletAgeText?.split(' ')[0] || "0"} subValue="D" />
          <RetroStatBox label="VOL_USD" value={baseLoading ? "..." : `$${formatNumber(baseStats?.total_volume_usd, 0)}`} />
          <RetroStatBox label="FEE_BURN" value={baseLoading ? "..." : `${formatNumber(formatEth(baseStats?.total_fees_paid_wei || 0n), 4)}`} />
        </div>
      </RetroWindow>

      <RetroWindow
        title="SOCIAL_NETWORK.LOG"
        icon={<div className="w-4 h-px bg-primary mr-2" />}
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <RetroStatBox label="GLOBAL_RANK" value={formatNumber(farcasterScore, 2)} />
            <RetroStatBox
              label="TOTAL_CASTS"
              value={baseLoading ? "..." : formatNumber(baseStats?.farcaster?.cast_count)}
            />
          </div>

          <div className="border border-white/10 p-4 bg-[#050505] relative group overflow-hidden">
            <div className="absolute inset-0 bg-primary/5 translate-y-full group-hover:translate-y-0 transition-transform duration-500" />
            <span className="text-[9px] text-gray-600 font-pixel uppercase block mb-2 relative z-10">LAST_BEST_BROADCAST</span>
            {baseStats?.farcaster?.best_cast ? (
              <div className="relative z-10">
                <p className="text-xs text-gray-400 italic font-mono line-clamp-2 leading-relaxed">&quot;{baseStats.farcaster.best_cast.text}&quot;</p>
              </div>
            ) : (
              <p className="text-[9px] text-gray-800 italic font-mono relative z-10">NULL_FEED_EXCEPTION</p>
            )}
          </div>
        </div>
      </RetroWindow>

    </div>
  );
}
