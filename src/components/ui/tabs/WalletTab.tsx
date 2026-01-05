"use client";

import { useMemo, useState, useEffect } from "react";
import { useAccount, useDisconnect, useConnect } from "wagmi";
import { useMiniApp } from "@neynar/react";
import { RetroWindow } from "../RetroWindow";
import { RetroBanner } from "../RetroBanner";
import { Skull } from "../Skull";
import { base64Grid } from "../gridPattern";
import { useBaseStats } from "~/hooks/useCoinBaseData";
import { truncateAddress } from "../../../lib/truncateAddress";
import { useToast } from "../ToastProvider";

const formatNumber = (value?: number | null, digits = 0) => {
  if (value === null || value === undefined) return "—";
  return Number(value).toLocaleString(undefined, {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  });
};

const formatEth = (wei: bigint) => Number(wei) / 1e18;

const RetroStatBox = ({ label, value, subValue }: { label: string; value: string; subValue?: string }) => (
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

export function WalletTab() {
  const { context } = useMiniApp();
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const { connect, connectors } = useConnect();

  // Data State
  const [profile, setProfile] = useState<any>(null); // Quick 'any' for now, ideally EchoProfile type
  const [activityPoints, setActivityPoints] = useState(0);

  const { toast } = useToast();
  // Fetch Base Stats for Base Score
  const user = (context?.user as any);
  const userAddress = address || user?.custody_address || user?.verified_addresses?.eth_addresses?.[0];
  const { data: baseStats, loading: baseLoading } = useBaseStats(userAddress || "0x0000000000000000000000000000000000000000");

  useEffect(() => {
    // We try to fetch live points and profile data
    const fetchPoints = async () => {
      if (!user?.fid) return;
      try {
        const res = await fetch(`/api/echo/profile?fid=${user.fid}`);
        const data = await res.json();
        if (data && !data.error) {
          setProfile(data);
          if (data.points !== undefined) setActivityPoints(data.points);
        }
      } catch (e) {
        const saved = localStorage.getItem("echo_points");
        setActivityPoints(saved ? parseInt(saved) : 0);
      }
    };
    fetchPoints();
  }, [user?.fid]);

  // Use unified Base Score from hook
  const neynarScore = Number(user?.score) || 0;
  const onchainRep = Number(profile?.onchainScore) || 0;
  const totalScore = activityPoints + onchainRep + neynarScore;

  const handleSyncPoints = async () => {
    if (!user?.fid) return;
    toast("SYNCING ONCHAIN REPUTATION...", "PROCESS");
    try {
      const res = await fetch('/api/echo/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fid: user.fid,
          username: user.username,
          address: userAddress,
          action: 'calculate',
          manualStats: JSON.parse(JSON.stringify(baseStats, (key, value) =>
            typeof value === 'bigint' ? value.toString() : value
          ))
        })
      });
      const data = await res.json();
      if (data.profile) {
        setProfile(data.profile);
        setActivityPoints(data.profile.points);
        toast("SYNC SUCCESSFUL", "SUCCESS");
      }
    } catch (e) {
      toast("SYNC FAILED", "ERROR");
    }
  };

  const handleDisconnect = () => disconnect();

  const handleConnect = () => {
    // Prefer Coinbase Wallet or Injected for Base
    const connector = connectors.find(c => c.name === 'Coinbase Wallet') || connectors[0];
    if (connector) connect({ connector });
  };

  return (
    <div className="space-y-6 pb-24">
      <RetroBanner src="/assets/banner_data.jpg" alt="Wallet Data" />

      {/* COMPACT PROFILE CARD */}
      <RetroWindow title="AGENT_PROFILE.DAT" icon="info">
        <div className="space-y-4">

          {/* Main Info Row */}
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-1">OPERATOR</p>
              <h1 className="text-2xl font-pixel text-white leading-none">
                {user?.displayName || "UNKNOWN_USER"}
              </h1>
              <p className="text-xs font-mono text-primary mt-1">@{user?.username?.toUpperCase() || "ANON"}</p>
            </div>

            {/* Status Badge */}
            <div className="flex flex-col items-end gap-2">
              <div className={`px-2 py-1 border ${isConnected ? 'border-primary bg-primary/20 text-primary' : 'border-red-500 text-red-500'} text-[10px] font-bold uppercase flex items-center gap-2`}>
                <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-primary animate-pulse' : 'bg-red-500'}`} />
                {isConnected ? 'ONLINE' : 'OFFLINE'}
              </div>
            </div>
          </div>

          {/* Details Grid (FID Removed, Disconnect Moved) */}
          <div className="flex justify-between items-center bg-white/5 p-3 border border-white/10">
            <div>
              <p className="text-[8px] text-gray-400 uppercase">WALLET_ADDR</p>
              <p className="font-mono text-xs text-white">
                {address ? `${address.slice(0, 6)}...${address.slice(-4)}` : "NOT_LINKED"}
              </p>
            </div>

            <div>
              {isConnected ? (
                <button onClick={handleDisconnect} className="text-[10px] text-red-400 hover:text-white border border-red-500/50 px-2 py-1 bg-black hover:bg-red-500 transition-colors">
                  UNLINK WALLET
                </button>
              ) : (
                <button onClick={handleConnect} className="text-[10px] text-primary hover:text-white border border-primary/50 px-2 py-1 bg-black hover:bg-primary transition-colors">
                  CONNECT WALLET
                </button>
              )}
            </div>
          </div>
        </div>
      </RetroWindow>

      {/* REFERRAL PROGRAM */}
      <RetroWindow title="REFERRAL_SYSTEM_V2" icon="users">
        <div className="p-2 space-y-4">
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <p className="font-pixel text-lg text-white mb-1">ECHO_RECRUITMENT</p>
              <p className="text-[10px] text-gray-400 leading-tight">
                Invite friends and earn a cut of their grind points. Every 5 active recruits gives you a <span className="text-primary font-bold">+2% BONUS</span>.
              </p>
            </div>
            <div className="bg-primary/10 border border-primary px-2 py-1 flex flex-col items-center shadow-[2px_2px_0_0_theme('colors.primary')]">
              <span className="text-[8px] text-primary font-bold uppercase">CURRENT_RATE</span>
              <span className="text-xl font-pixel text-white">{5 + (Math.floor((profile?.referralStats?.count || 0) / 5) * 2)}%</span>
            </div>
          </div>

          {/* Tier Tracker */}
          <div className="bg-white/5 border border-white/10 p-2">
            <div className="flex justify-between text-[8px] text-gray-500 uppercase mb-1">
              <span>Next Reward Tier</span>
              <span>{(profile?.referralStats?.count || 0) % 5} / 5</span>
            </div>
            <div className="h-2 w-full bg-black border border-white/20 flex gap-1 p-[1px]">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className={`flex-1 ${i < ((profile?.referralStats?.count || 0) % 5) ? 'bg-primary' : 'bg-white/5'}`} />
              ))}
            </div>
            <p className="text-[7px] text-gray-500 text-right mt-1 uppercase italic">* Friends must perform 1 txn to activate</p>
          </div>

          {/* Referral Stats (Invites & Earnings) */}
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-gray-900 border border-gray-700 p-2 text-center">
              <p className="text-[9px] text-gray-500 uppercase">ACTIVE_REFS</p>
              <p className="font-pixel text-xl text-white">
                {profile?.referralStats?.count || 0}
              </p>
            </div>
            <div className="bg-gray-900 border border-gray-700 p-2 text-center">
              <p className="text-[9px] text-gray-500 uppercase">COMMISSION_PTS</p>
              <p className="font-pixel text-xl text-white">
                {profile?.referralStats?.earnings || 0} <span className="text-sm text-primary">PT</span>
              </p>
            </div>
          </div>

          {/* Invite Code & Link Buttons */}
          <div className="space-y-2">
            <div className="flex gap-2">
              <div className="flex-1 bg-black border border-dashed border-gray-600 p-2 flex items-center justify-between overflow-hidden">
                <div>
                  <p className="text-[7px] text-gray-500 uppercase mb-1">INVITE_CODE</p>
                  <code className="text-lg text-primary font-pixel leading-none">
                    {profile?.referralCode || "---"}
                  </code>
                </div>
                <button
                  onClick={() => {
                    if (!profile?.referralCode) return;
                    navigator.clipboard.writeText(profile.referralCode);
                    toast("CODE COPIED", "SUCCESS");
                  }}
                  className="px-3 py-1 bg-white text-black text-[10px] font-bold font-pixel hover:bg-primary transition-colors h-fit flex items-center gap-1"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                  COPY CODE
                </button>
              </div>
            </div>

            <button
              onClick={() => {
                if (!profile?.referralCode) return;
                const deepLink = `https://warpcast.com/~/mini-app?url=${encodeURIComponent(`https://echo-base-mini-app.vercel.app?ref=${profile.referralCode}`)}`;
                navigator.clipboard.writeText(deepLink);
                toast("LINK COPIED TO CLIPBOARD", "SUCCESS");
              }}
              className="w-full py-2 bg-primary border-2 border-white/20 text-white text-[10px] font-bold font-pixel hover:bg-blue-600 transition-colors shadow-[4px_4px_0_0_theme('colors.primary')] flex items-center justify-center gap-2"
            >
              SHARE_FULL_INVITE_LINK
            </button>
          </div>

          {/* Invitee List (NEW) */}
          {profile?.invitees && profile.invitees.length > 0 && (
            <div className="mt-6">
              <p className="text-[8px] text-gray-500 uppercase mb-2 border-b border-white/10 pb-1">RECENT_RECRUITS</p>
              <div className="space-y-1">
                {profile.invitees.map((inv: any) => (
                  <div key={inv.fid} className="flex justify-between items-center bg-white/5 py-1 px-2 border-l-2 border-primary">
                    <span className="text-xs font-mono text-white">@{inv.username || `UID_${inv.fid}`}</span>
                    <div className="flex items-center gap-1">
                      <span className="text-[8px] text-gray-500 uppercase">REFS:</span>
                      <span className="text-xs font-pixel text-primary">{inv.referralStats?.count || 0}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </RetroWindow>

      {/* 1. TECHY POWER SCORE DASHBOARD */}
      <div className="relative border-4 border-white bg-black p-6 shadow-[8px_8px_0_0_rgba(255,255,255,0.1)] overflow-hidden group">
        {/* Animated Scanline Overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(transparent_0%,rgba(0,180,255,0.05)_50%,transparent_100%)] bg-[length:100%_4px] animate-[scanline_10s_linear_infinite] pointer-events-none z-10" />

        {/* Background Grid Accent */}
        <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: base64Grid, backgroundSize: '10px 10px' }} />

        <div className="relative z-20">
          <div className="flex justify-between items-start mb-8">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-primary animate-pulse" />
                <p className="text-[10px] font-pixel text-primary uppercase tracking-[0.3em]">REPUTATION_ENGINE.OS</p>
              </div>
              <div className="flex items-baseline gap-4">
                <h2 className="text-7xl font-pixel text-white tracking-tighter text-shadow-glow">
                  {formatNumber(totalScore)}
                </h2>
                <span className="text-2xl font-pixel text-primary animate-pulse">EP</span>
              </div>
              <p className="text-[9px] font-mono text-gray-500 uppercase tracking-widest pl-1">Aggregated Onchain + Social Power</p>
            </div>
            <div className="text-right flex flex-col items-end gap-2">
              <button
                onClick={handleSyncPoints}
                className="border border-white/20 p-2 bg-black/50 backdrop-blur-sm hover:border-primary hover:bg-primary/10 transition-all group/sync active:scale-95"
              >
                <Skull className="w-12 h-12 text-primary opacity-80 group-hover/sync:opacity-100 group-hover/sync:scale-110 transition-transform" />
                <p className="text-[7px] font-pixel text-primary mt-1 opacity-0 group-hover/sync:opacity-100 transition-opacity">SYNC_OS</p>
              </button>
              <span className="text-[8px] font-mono text-primary/50 uppercase tracking-[0.2em] leading-none">CORE_OS_V.4.2</span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 border-t border-b border-white/10 py-6">
            <div className="space-y-1 group/stat">
              <p className="text-[9px] font-mono text-gray-500 uppercase tracking-widest flex items-center gap-2">
                <span className="w-1 h-1 bg-gray-500 group-hover/stat:bg-white transition-colors" />
                ACTIONS
              </p>
              <div className="flex items-baseline gap-2">
                <p className="text-2xl font-pixel text-white">+{formatNumber(activityPoints)}</p>
                <div className="text-[8px] font-mono text-[#00ff00] animate-pulse">● LIVE</div>
              </div>
            </div>
            <div className="space-y-1 group/stat border-l border-white/10 pl-4">
              <p className="text-[9px] font-mono text-gray-500 uppercase tracking-widest flex items-center gap-2">
                <span className="w-1 h-1 bg-gray-500 group-hover/stat:bg-white transition-colors" />
                REPUTATION
              </p>
              <p className="text-2xl font-pixel text-white">+{baseLoading ? "..." : formatNumber(onchainRep)}</p>
            </div>
            <div className="space-y-1 group/stat border-l border-white/10 pl-4">
              <p className="text-[9px] font-mono text-gray-500 uppercase tracking-widest flex items-center gap-2">
                <span className="w-1 h-1 bg-gray-500 group-hover/stat:bg-white transition-colors" />
                SOCIAL
              </p>
              <p className="text-2xl font-pixel text-white">+{formatNumber(neynarScore)}</p>
            </div>
          </div>

          <div className="mt-4 flex justify-between items-center text-[8px] font-mono text-gray-600 uppercase tracking-[0.25em]">
            <span>NODE_ADDR: {userAddress?.slice(0, 10)}...</span>
            <span className="text-gray-400">ENCRYPTION: SHARDED_RSA</span>
          </div>
        </div>
      </div>

      {/* 2. PIXELATED BADGES GRID */}
      <RetroWindow title="EARNED_BADGES.SYS" icon={<span className="text-primary text-xs mr-2">◈</span>}>
        <div className="grid grid-cols-4 gap-2">
          {[
            { id: 'ECHO_OG', label: 'OG_V', icon: '👑', color: 'from-amber-400 to-yellow-600', check: () => (user?.fid || 0) < 500000 },
            { id: 'STREAK_7', label: 'STRK', icon: '🔥', color: 'from-orange-500 to-red-600', check: () => (profile?.streak?.current || 0) >= 7 },
            { id: 'MINT_MASTER', label: 'MINT', icon: '💎', color: 'from-blue-400 to-indigo-600', check: () => (profile?.nftTokenId || 0) > 0 },
            { id: 'REC_ELITE', label: 'RECR', icon: '🤝', color: 'from-emerald-500 to-teal-600', check: () => (profile?.referralStats?.count || 0) >= 5 },
            { id: 'FEED_CONTRIB', label: 'FEED', icon: '🗣️', color: 'from-purple-500 to-pink-600', check: () => (baseStats?.farcaster?.cast_count || 0) >= 50 },
            { id: 'VOL_PIONEER', label: 'VOLU', icon: '🌊', color: 'from-cyan-400 to-blue-500', check: () => (baseStats?.total_volume_usd || 0) >= 1000 },
            { id: 'LEGACY_WAL', label: 'LGTC', icon: '🕰️', color: 'from-gray-500 to-slate-700', check: () => (baseStats?.wallet_age_days || 0) >= 365 },
            { id: 'EARLY_V1', label: 'V1_S', icon: '🌟', color: 'from-pink-500 to-rose-600', check: () => true }, // All current users are V1
          ].map((badge) => {
            const isOwned = badge.check();
            return (
              <div
                key={badge.id}
                className={`relative aspect-square border-2 flex flex-col items-center justify-center gap-1 transition-all duration-700 transform hover:scale-105 active:scale-95 group/badge ${isOwned ? `border-white bg-gradient-to-br ${badge.color} shadow-[0_0_15px_rgba(255,255,255,0.3)] ring-1 ring-white/50` : 'border-white/5 bg-[#0a0a0a] grayscale opacity-20'}`}
              >
                {isOwned && (
                  <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/20 to-transparent -translate-x-full animate-[shimmer_3s_infinite] skew-x-[-45deg]" />
                  </div>
                )}
                <span className={`text-xl drop-shadow-[0_0_5px_rgba(255,255,255,0.5)] ${isOwned ? 'animate-bounce' : ''}`}>{badge.icon}</span>
                <span className="text-[7px] font-pixel text-center px-1 leading-tight text-white/90 uppercase">{badge.label}</span>
                {!isOwned && <div className="absolute inset-0 flex items-center justify-center font-pixel text-[8px] opacity-10 uppercase tracking-tighter">Locked</div>}

                {/* Micro-tooltip on hover */}
                {isOwned && (
                  <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 translate-y-full opacity-0 group-hover/badge:opacity-100 bg-white text-black text-[6px] font-pixel px-1 py-0.5 z-50 pointer-events-none whitespace-nowrap">
                    UNLOCK_VERIFIED
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </RetroWindow>

      {/* 3. GLOBAL RANKING SECTION */}
      <RetroWindow title="GLOBAL_RANKING.DAT" icon={<span className="text-primary text-xs mr-2">⌁</span>}>
        <div className="relative aspect-[21/9] bg-[#050505] border-2 border-white/10 flex items-center justify-center overflow-hidden">
          {/* Animated Matrix-like Background */}
          <div className="absolute inset-0 opacity-10 font-mono text-[10px] text-primary whitespace-pre overflow-hidden leading-none pointer-events-none">
            {Array(10).fill("ECHO_RANK_SYSTEM_V.1.0_INITIALIZING_DATA_STREAM_01010101\n").join("")}
          </div>

          <div className="relative z-10 border-4 border-white/20 p-6 backdrop-blur-sm group hover:border-white transition-colors duration-500">
            <h3 className="text-3xl font-pixel text-white/40 uppercase tracking-[0.2em] group-hover:text-white transition-colors">COMING_SOON</h3>
            <div className="h-1 w-full bg-white/10 mt-2 overflow-hidden">
              <div className="h-full bg-primary w-1/3 animate-[loading_2s_infinite]" />
            </div>
            <p className="text-center font-mono text-[9px] text-gray-600 mt-3 uppercase tracking-widest group-hover:text-primary/70 transition-colors">SEASON_01_CALIBRATION_IN_PROGRESS</p>
          </div>

          {/* Corner Elements */}
          <div className="absolute top-2 left-2 text-[6px] font-mono text-gray-500 uppercase">LATENCY: 42MS</div>
          <div className="absolute bottom-2 right-2 text-[6px] font-mono text-gray-500 uppercase">SERVER: BASE_MAINNET</div>
        </div>
      </RetroWindow>

    </div>
  );
}