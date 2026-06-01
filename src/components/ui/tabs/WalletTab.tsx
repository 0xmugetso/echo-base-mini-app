"use client";

import { useMemo, useState, useEffect } from "react";
import { useAccount, useDisconnect, useConnect } from "wagmi";
import { useMiniApp } from "~/hooks/useMiniApp";
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

export function WalletTab({ isActive, neynarUser }: { isActive?: boolean; neynarUser?: any }) {
  const { context } = useMiniApp();
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const { connect, connectors } = useConnect();

  // Data State
  const [profile, setProfile] = useState<any>(null); // Quick 'any' for now, ideally EchoProfile type
  const [activityPoints, setActivityPoints] = useState(0);
  const [referrerUsername, setReferrerUsername] = useState<string>("");
  const [refreshingReferrals, setRefreshingReferrals] = useState(false);
  const [claimingReferral, setClaimingReferral] = useState(false);

  const { toast } = useToast();

  // Fetch Referrer Username if present
  useEffect(() => {
    if (profile?.referredBy) {
      fetch(`/api/echo/profile?fid=${profile.referredBy}`)
        .then(r => r.json())
        .then(data => {
          if (data && data.username) {
            setReferrerUsername(data.username);
          }
        })
        .catch(() => {});
    }
  }, [profile?.referredBy]);

  const handleRefreshReferrals = async () => {
    if (!user?.fid) return;
    setRefreshingReferrals(true);
    toast("REFRESHING REFERRAL STATS...", "PROCESS");
    try {
      const res = await fetch(`/api/echo/profile?fid=${user.fid}`);
      const data = await res.json();
      if (data && !data.error) {
        setProfile(data);
        if (data.points !== undefined) setActivityPoints(data.points);
        toast("STATS UPDATED", "SUCCESS");
      } else {
        toast("FAILED TO REFRESH", "ERROR");
      }
    } catch {
      toast("REFRESH ERROR", "ERROR");
    } finally {
      setRefreshingReferrals(false);
    }
  };

  const handleClaimReferral = async () => {
    if (!user?.fid) return;
    setClaimingReferral(true);
    toast("CLAIMING REFERRAL XP...", "PROCESS");
    try {
      const res = await fetch('/api/echo/referral/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fid: user.fid })
      });
      const data = await res.json();
      if (data.success && data.profile) {
        setProfile(data.profile);
        setActivityPoints(data.profile.points);
        toast(`SUCCESSFULLY CLAIMED +${data.claimed} PTS`, "SUCCESS");
        window.dispatchEvent(new CustomEvent("points-updated"));
      } else {
        toast(data.error || "CLAIM FAILED", "ERROR");
      }
    } catch {
      toast("CLAIM ERROR", "ERROR");
    } finally {
      setClaimingReferral(false);
    }
  };
  // Fetch Base Stats for Base Score
  const user = (context?.user as any);
  
  const primaryEthAddress =
    neynarUser?.verified_addresses?.primary?.eth_address ||
    neynarUser?.verified_addresses?.eth_addresses?.[0] ||
    user?.verified_addresses?.eth_addresses?.[0] ||
    user?.verifiedAddresses?.ethAddresses?.[0];

  const userAddress =
    primaryEthAddress ||
    user?.custody_address ||
    user?.custodyAddress ||
    address ||
    "0x0000000000000000000000000000000000000000";
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
    if (isActive) {
      fetchPoints();
    }
  }, [user?.fid, isActive]);

  // Use unified Base Score from hook
  const onchainRep = Number(profile?.onchainScore) || 0;

  // Calculate referral-related points (SOCIAL)
  const socialPoints = useMemo(() => {
    if (!profile?.dailyActions?.pointsHistory) return 0;
    return profile.dailyActions.pointsHistory
      .filter((p: any) => 
        p.action === 'referral_joining_bonus' || 
        p.action === 'referral_bonus' || 
        p.action === 'referral_claim'
      )
      .reduce((sum: number, p: any) => sum + (p.points || 0), 0);
  }, [profile]);

  // Actions points = total points - social points
  const actionPoints = useMemo(() => {
    return Math.max(0, activityPoints - socialPoints);
  }, [activityPoints, socialPoints]);

  const totalScore = activityPoints + onchainRep;

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
              {!isConnected && (
                <button onClick={handleConnect} className="text-[10px] text-primary hover:text-white border border-primary/50 px-2 py-1 bg-black hover:bg-primary transition-colors">
                  CONNECT WALLET
                </button>
              )}
            </div>
          </div>
        </div>
      </RetroWindow>      {/* REFERRAL PROGRAM */}
      <RetroWindow title="REFERRAL_SYSTEM_V2" icon="users">
        <div className="p-3 space-y-5">
          {(() => {
            const count = profile?.referralStats?.count || 0;
            let currentRate = 2;
            if (count >= 25) {
              currentRate = 10;
            } else if (count >= 15) {
              currentRate = 7.5;
            } else if (count >= 5) {
              currentRate = 5;
            }

            let nextTierGoal = 5;
            let currentTierStart = 0;
            let nextTierRate = "5%";
            let isMaxTier = false;

            if (count >= 25) {
              isMaxTier = true;
            } else if (count >= 15) {
              nextTierGoal = 25;
              currentTierStart = 15;
              nextTierRate = "10%";
            } else if (count >= 5) {
              nextTierGoal = 15;
              currentTierStart = 5;
              nextTierRate = "7.5%";
            } else {
              nextTierGoal = 5;
              currentTierStart = 0;
              nextTierRate = "5%";
            }

            const progressNumerator = count - currentTierStart;
            const progressDenominator = nextTierGoal - currentTierStart;
            const progressPercentage = isMaxTier ? 100 : Math.min(100, (progressNumerator / progressDenominator) * 100);

            return (
              <>
                <div className="flex justify-between items-start gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2 flex-wrap">
                      <p className="font-pixel text-xl text-white leading-none">ECHO_RECRUITMENT</p>
                      <button
                        onClick={handleRefreshReferrals}
                        disabled={refreshingReferrals}
                        className="px-2 py-0.5 border border-primary text-[10px] font-pixel text-primary bg-black hover:bg-primary hover:text-black transition-colors disabled:opacity-50"
                      >
                        {refreshingReferrals ? "SYNCING..." : "REFRESH ↻"}
                      </button>
                    </div>
                    <p className="text-xs text-gray-300 leading-relaxed">
                      Invite friends and earn a cut of their grind points. Every recruit increases your potential, scaling up as you build your squad.
                    </p>
                  </div>
                  <div className="bg-primary/10 border-2 border-primary px-3 py-2 flex flex-col items-center shadow-[4px_4px_0_0_theme('colors.primary')] shrink-0">
                    <span className="text-[9px] text-primary font-bold uppercase tracking-wider">CURRENT_RATE</span>
                    <span className="text-2xl font-pixel text-white mt-1">{currentRate}%</span>
                  </div>
                </div>

                {/* Tier Tracker */}
                <div className="bg-white/5 border border-white/10 p-3 rounded-none">
                  <div className="flex justify-between text-xs text-gray-300 font-bold uppercase mb-1.5">
                    <span>{isMaxTier ? "MAX TIER ACTIVE" : `Next Reward Tier: ${nextTierRate} Bonus`}</span>
                    <span>{isMaxTier ? "MAXED" : `${count} / ${nextTierGoal} refs`}</span>
                  </div>
                  <div className="h-3 w-full bg-black border border-white/20 p-[2px]">
                    <div 
                      className="h-full bg-primary shadow-[0_0_8px_theme('colors.primary')] transition-all duration-500" 
                      style={{ width: `${progressPercentage}%` }} 
                    />
                  </div>
                  <p className="text-[9px] text-gray-500 text-right mt-1.5 uppercase italic">* recruits must perform 1 txn to activate</p>
                </div>

                {/* Referral Stats (Invites & Earnings) */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-white/5 border border-white/10 p-3 text-center">
                    <p className="text-[11px] text-gray-400 font-bold uppercase mb-1">ACTIVE_REFS</p>
                    <p className="font-pixel text-2xl text-white">
                      {profile?.referralStats?.count || 0}
                    </p>
                  </div>
                  <div className="bg-white/5 border border-white/10 p-3 text-center">
                    <p className="text-[11px] text-gray-400 font-bold uppercase mb-1">TOTAL_EARNED</p>
                    <p className="font-pixel text-2xl text-white">
                      {profile?.referralStats?.earnings || 0} <span className="text-xs text-primary font-mono font-bold">PTS</span>
                    </p>
                  </div>
                </div>

                {/* CLAIMABLE REFERRAL COMMISSION BOX */}
                <div className="border-2 border-primary bg-primary/5 p-4 shadow-[4px_4px_0_0_theme('colors.primary')] relative overflow-hidden flex flex-col items-center justify-center text-center">
                  <div className="absolute inset-0 bg-primary/5 opacity-40 pointer-events-none z-0" />
                  <p className="text-xs text-gray-300 font-bold uppercase tracking-widest mb-1.5 z-10">CLAIMABLE_REFERRAL_XP</p>
                  <p className="font-pixel text-4xl text-primary tracking-wider text-shadow-glow mb-2 z-10">
                    {profile?.referralStats?.claimable || 0} <span className="text-sm">XP</span>
                  </p>
                  <p className="text-[10px] text-gray-400 mb-3 z-10 max-w-[90%] leading-normal">
                    Pending commissions are calculated and credited daily at midnight UTC via Vercel Cron based on active recruits' daily grind points.
                  </p>
                  <button
                    disabled={claimingReferral || !(profile?.referralStats?.claimable > 0)}
                    onClick={handleClaimReferral}
                    className="w-full py-2.5 font-pixel text-xs border-2 uppercase border-primary bg-black text-primary hover:bg-primary hover:text-black transition-all disabled:opacity-30 disabled:hover:bg-black disabled:hover:text-primary z-10"
                  >
                    {claimingReferral ? 'CLAIMING...' : 'CLAIM REFERRAL XP'}
                  </button>
                </div>

                {/* Invite Code & Link Buttons */}
                <div className="space-y-4">
                  <div className="flex flex-col gap-2 border-2 border-primary bg-primary/5 p-4 shadow-[4px_4px_0_0_theme('colors.primary')] relative overflow-hidden">
                    <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] z-0 bg-[length:100%_2px,3px_100%] pointer-events-none" />
                    
                    <div className="relative z-10 text-center mb-2">
                      <p className="text-xs text-gray-300 uppercase tracking-widest font-bold">YOUR_INVITE_CODE</p>
                      <p className="text-3xl text-primary font-pixel mt-1 tracking-wider text-shadow-glow">
                        {profile?.referralCode?.replace("ECHO_", "") || "---"}
                      </p>
                    </div>

                    <div className="relative z-10 grid grid-cols-2 gap-3 mt-1">
                      <button
                        onClick={() => {
                          if (!profile?.referralCode) return;
                          navigator.clipboard.writeText(profile.referralCode.replace("ECHO_", ""));
                          toast("CODE COPIED", "SUCCESS");
                        }}
                        className="w-full py-3 bg-white text-black text-xs font-bold font-pixel hover:bg-gray-200 transition-colors flex items-center justify-center gap-2 border-2 border-white"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                        COPY
                      </button>

                      <button
                        onClick={async () => {
                          if (!profile?.referralCode) return;
                          const cleanRefCode = profile.referralCode.replace("ECHO_", "");
                          const appUrl = typeof window !== 'undefined' ? window.location.origin : 'https://echo-mini-app.vercel.app';
                          const text = `Join me on Echo! 🛡️\n\nUse my invite code to get a +20 PTS bonus on sign up, and we both earn more points as we grind!\n\nInvite Code: ${cleanRefCode}`;
                          const embedUrl = `${appUrl}?ref=${cleanRefCode}`;
                          try {
                            const { sdk } = await import("@farcaster/miniapp-sdk");
                            await sdk.actions.composeCast({
                              text,
                              embeds: [embedUrl]
                            });
                          } catch (e) {
                            const composeUrl = `https://warpcast.com/~/compose?text=${encodeURIComponent(text)}&embeds[]=${encodeURIComponent(embedUrl)}`;
                            window.open(composeUrl, '_blank');
                          }
                        }}
                        className="w-full py-3 bg-primary text-black font-pixel text-xs hover:brightness-110 flex items-center justify-center gap-2 border-2 border-primary"
                      >
                        CAST INVITE
                      </button>
                    </div>
                  </div>
                </div>

                {/* Referral Input (For Existing Users) */}
                <div className="pt-4 border-t border-dashed border-gray-600">
                  <p className="text-[11px] text-gray-400 font-bold uppercase mb-2 block">REDEEM_INVITE_CODE</p>
                  {profile?.referredBy ? (
                    <div className="bg-green-500/10 border border-green-500 text-green-500 text-center py-2.5 font-pixel text-xs">
                      INVITED BY: {referrerUsername ? `@${referrerUsername.toUpperCase()}` : `FID ${profile.referredBy}`}
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <input
                        id="wallet-ref-input"
                        type="text"
                        maxLength={6}
                        placeholder="ENTER CODE"
                        className="flex-1 bg-black border border-white/20 p-2 font-pixel text-xs text-center text-white uppercase outline-none focus:border-primary"
                      />
                      <button
                        onClick={async () => {
                          const input = document.getElementById("wallet-ref-input") as HTMLInputElement;
                          const enteredCode = input?.value?.toUpperCase();
                          if (!enteredCode || enteredCode.length < 6) return;
                          
                          const fullCode = enteredCode.startsWith("ECHO_") ? enteredCode : `ECHO_${enteredCode}`;
                          try {
                            const res = await fetch(`/api/echo/profile?fid=${context?.user?.fid}&referralCode=${fullCode}`);
                            const data = await res.json();
                            if (data && data.fid) {
                               toast("REFERRAL APPLIED!", "SUCCESS");
                               setProfile(data);
                            } else {
                               toast("INVALID CODE", "ERROR");
                            }
                          } catch {
                            toast("ERROR", "ERROR");
                          }
                        }}
                        className="px-4 bg-white text-black font-pixel text-xs hover:bg-gray-200"
                      >
                        APPLY
                      </button>
                    </div>
                  )}
                </div>

                {/* Invitee List (NEW) */}
                {profile?.invitees && profile.invitees.length > 0 && (
                  <div className="mt-2">
                    <p className="text-[10px] text-gray-400 font-bold uppercase mb-2 border-b border-white/10 pb-1">RECENT_RECRUITS</p>
                    <div className="space-y-1.5">
                      {profile.invitees.map((inv: any) => (
                        <div key={inv.fid} className="flex justify-between items-center bg-white/5 py-1.5 px-2.5 border-l-2 border-primary">
                          <span className="text-xs font-mono text-white">@{inv.username || `UID_${inv.fid}`}</span>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] text-gray-400 font-bold uppercase">REFS:</span>
                            <span className="text-xs font-pixel text-primary">{inv.referralStats?.count || 0}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            );
          })()}
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
                <p className="text-2xl font-pixel text-white">+{formatNumber(actionPoints)}</p>
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
              <p className="text-2xl font-pixel text-white">+{formatNumber(socialPoints)}</p>
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
            { id: 'ECHO_OG', label: 'OG_V', icon: '👑', color: 'from-blue-600/40 to-blue-900/60', criteria: 'FID < 500,000', check: () => (user?.fid || 0) < 500000 },
            { id: 'STREAK_7', label: 'STRK', icon: '🔥', color: 'from-gray-600/40 to-gray-800/60', criteria: '7+ DAY STREAK', check: () => (profile?.streak?.current || 0) >= 7 },
            { id: 'MINT_MASTER', label: 'MINT', icon: '💎', color: 'from-blue-400/40 to-blue-600/60', criteria: 'MINTED ECHO NFT', check: () => (profile?.nftTokenId || 0) > 0 },
            { id: 'REC_ELITE', label: 'RECR', icon: '🤝', color: 'from-slate-600/40 to-slate-800/60', criteria: '5+ RECRUITS', check: () => (profile?.referralStats?.count || 0) >= 5 },
            { id: 'FEED_CONTRIB', label: 'FEED', icon: '🗣️', color: 'from-blue-800 to-black', criteria: '50+ CASTS', check: () => (baseStats?.farcaster?.cast_count || 0) >= 50 },
            { id: 'VOL_PIONEER', label: 'VOLU', icon: '🌊', color: 'from-zinc-500/40 to-zinc-700/60', criteria: '$1K+ BASE VOL', check: () => (baseStats?.total_volume_usd || 0) >= 1000 },
            { id: 'LEGACY_WAL', label: 'LGTC', icon: '🕰️', color: 'from-zinc-800 to-black', criteria: '1YR+ WALLET AGE', check: () => (baseStats?.wallet_age_days || 0) >= 365 },
            { id: 'EARLY_V1', label: 'V1_S', icon: '🌟', color: 'from-primary/20 to-blue-900/40', criteria: 'EARLY V1 USER', check: () => true }, // All current users are V1
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
                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 translate-y-full opacity-0 group-hover/badge:opacity-100 bg-white text-black text-[6px] font-pixel px-1 py-0.5 z-50 pointer-events-none whitespace-nowrap shadow-[2px_2px_0_0_rgba(0,0,0,0.5)] border border-black/10">
                  {badge.criteria}
                </div>
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