"use client";

import { useMemo, useState, useEffect } from "react";
import { useAccount, useDisconnect, useConnect } from "wagmi";
import { useMiniApp } from "@neynar/react";
import { RetroWindow } from "../RetroWindow";
import { RetroBanner } from "../RetroBanner";
import { useBaseStats } from "~/hooks/useCoinBaseData";
import { truncateAddress } from "../../../lib/truncateAddress";

export function WalletTab() {
  const { context } = useMiniApp();
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const { connect, connectors } = useConnect();

  // Data State
  const [profile, setProfile] = useState<any>(null); // Quick 'any' for now, ideally EchoProfile type
  const [activityPoints, setActivityPoints] = useState(0);

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

  // Calculate Base Score
  const baseScore = useMemo(() => {
    if (!baseStats) return 0;
    const ageScore = (baseStats.wallet_age_days || 0) * 10;
    const txScore = (baseStats.total_tx || 0) * 5;
    return Math.floor(ageScore + txScore);
  }, [baseStats]);

  const totalScore = activityPoints + baseScore;

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
      <RetroWindow title="REFERRAL_SYSTEM_V1" icon="users">
        <div className="p-2 space-y-4">
          <div>
            <p className="font-pixel text-lg text-white mb-1">INVITE & EARN</p>
            <p className="text-[10px] text-gray-300 leading-tight">
              Invite friends and earn <span className="text-primary font-bold">5% CUT</span> of all points they grind!
              <br />
              <span className="text-[9px] text-gray-400 mt-1 block">*Friend must complete 1 TX to activate. Updated every 12h.</span>
            </p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-gray-900 border border-gray-700 p-2 text-center">
              <p className="text-[9px] text-gray-500 uppercase">ACTIVE_REFS</p>
              <p className="font-pixel text-xl text-white">
                {profile?.referralStats?.count || 0}
              </p>
            </div>
            <div className="bg-gray-900 border border-gray-700 p-2 text-center">
              <p className="text-[9px] text-gray-500 uppercase">TOTAL_EARNED</p>
              <p className="font-pixel text-xl text-white">
                {profile?.referralStats?.earnings || 0} <span className="text-sm text-primary">PTS</span>
              </p>
            </div>
          </div>

          {/* Invite Link */}
          <div className="bg-black border border-dashed border-gray-600 p-2 flex items-center justify-between gap-2">
            <code className="text-[10px] text-gray-300 font-mono truncate">
              {`https://warpcast.com/~/mini-app?url=${encodeURIComponent(`https://echo-base-mini-app.vercel.app?ref=${profile?.referralCode || ""}`)}`}
            </code>
            <button
              onClick={() => {
                if (!profile?.referralCode) return;
                const deepLink = `https://warpcast.com/~/mini-app?url=${encodeURIComponent(`https://echo-base-mini-app.vercel.app?ref=${profile.referralCode}`)}`;
                navigator.clipboard.writeText(deepLink);
                alert("DEEP LINK COPIED! SHARE ON WARPCAST.");
              }}
              className="px-2 py-1 bg-white text-black text-[10px] font-bold font-pixel hover:bg-gray-200"
            >
              COPY
            </button>
          </div>
        </div>
      </RetroWindow>

      {/* SCORES */}
      <div className="grid grid-cols-2 gap-4">
        <div className="border-2 border-primary bg-black p-3 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-1 opacity-20 text-primary">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L2 7l10 5 10-5-10-5zm0 9l2.5-1.25L12 8.5l-2.5 1.25L12 11zm0 2.5l-5-2.5-5 2.5L12 22l10-8.5-5-2.5-5 2.5z" /></svg>
          </div>
          <p className="text-[10px] text-primary uppercase font-bold">ECHO_PTS</p>
          <p className="text-2xl font-pixel text-white">{activityPoints.toLocaleString()}</p>
        </div>
        <div className="border border-white bg-black/50 p-3">
          <p className="text-[10px] text-gray-500 uppercase font-bold">BASE_SCORE</p>
          <p className="text-2xl font-pixel text-gray-300">{baseLoading ? "..." : baseScore.toLocaleString()}</p>
        </div>
      </div>

      {/* BADGES (PROMINENT) */}
      <RetroWindow title="EARNED_BADGES" icon="star">
        <div className="grid grid-cols-4 gap-3 p-2">

          {/* OG Badge */}
          <div className="aspect-square bg-[#0052FF] border-2 border-white shadow-[4px_4px_0_0_rgba(255,255,255,0.2)] flex flex-col items-center justify-center p-1 group relative cursor-help">
            <span className="font-pixel text-lg text-white">OG</span>
            <span className="text-[8px] text-white/80 mt-1">EARLY</span>
            <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 bg-black border border-white px-2 py-1 text-[8px] whitespace-nowrap hidden group-hover:block z-20">
              FOUNDING MEMBER
            </div>
          </div>

          {/* V1 Badge (Placeholder) */}
          <div className="aspect-square bg-purple-900 border border-white/50 flex flex-col items-center justify-center p-1 opacity-80">
            <span className="font-pixel text-lg text-white">V1</span>
            <span className="text-[8px] text-white/60 mt-1">TESTER</span>
          </div>

          {/* Locked Slots */}
          <div className="aspect-square border border-dashed border-gray-700 bg-black/50 flex items-center justify-center">
            <span className="text-gray-700 text-xs">?</span>
          </div>
          <div className="aspect-square border border-dashed border-gray-700 bg-black/50 flex items-center justify-center">
            <span className="text-gray-700 text-xs">?</span>
          </div>

        </div>
      </RetroWindow>

      {/* LEADERBOARD (COMING SOON) */}
      <div className="relative opacity-60">
        <RetroWindow title="GLOBAL_RANKING" icon="list">
          <div className="h-32 flex items-center justify-center bg-stripes-gray">
            <div className="bg-black border border-white px-4 py-2 text-center transform rotate-[-2deg]">
              <p className="font-pixel text-lg text-white">COMING SOON</p>
              <p className="text-[8px] text-gray-400 uppercase tracking-widest">SEASON 1</p>
            </div>
          </div>
        </RetroWindow>
      </div>

    </div>
  );
}