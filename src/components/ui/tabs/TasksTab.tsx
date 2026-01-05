import { useState, useEffect } from "react";
import { RetroWindow } from "../RetroWindow";
import { RetroBanner } from "../RetroBanner";
import { RetroTimer } from "../RetroTimer";
import { useAccount, useSendTransaction } from "wagmi";
import { parseEther, stringToHex, getAddress } from "viem";
import { useNeynarSigner } from "~/hooks/useNeynarSigner";
import { useMiniApp } from "@neynar/react";
import { useToast } from "../ToastProvider";

type Profile = {
  fid: number;
  points: number;
  onchainScore?: number;
  castCount?: number;
  streak: { current: number; highest: number; lastCheckIn: string };
  rewards: { claimedBoxes: { day3: boolean; day7: boolean; day14: boolean; day30: boolean } };
  dailyActions: {
    lastCastDate: string;
    completedTasks: string[];
    pointsHistory?: {
      action: string;
      points: number;
      date: string;
      description: string;
    }[];
  };
};

export function TasksTab({ context, neynarUser, setActiveTab }: { context?: any, neynarUser?: any, setActiveTab?: (tab: string) => void }) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(false);

  // Wagmi & Neynar
  const { address } = useAccount();
  const { sendTransactionAsync } = useSendTransaction();
  const { sdk } = useMiniApp() as any;

  // --- FETCH PROFILE ---
  const fetchProfile = async () => {
    const targetFid = neynarUser?.fid || context?.user?.fid;
    console.log("[TasksTab] Fetching for FID:", targetFid);

    if (!targetFid) {
      console.warn("[TasksTab] No FID found");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/echo/profile?fid=${targetFid}`);
      const data = await res.json();
      if (data && !data.error) {
        setProfile(data);
        console.log("[TasksTab] Profile Loaded:", data.username);
      } else {
        console.error("[TasksTab] Profile API Error:", data.error);
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  // Force Calculation to fetch latest Cast Count
  useEffect(() => {
    if (profile && (profile.castCount === undefined || profile.castCount === 0)) {
      const triggerCalc = async () => {
        try {
          console.log("[TasksTab] Triggering Stat Calculation...");
          await fetch('/api/echo/profile', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'calculate',
              fid: profile.fid,
              address: (context?.user?.verifications?.[0] || '0x0000000000000000000000000000000000000000')
            })
          });
          // Re-fetch after short delay
          setTimeout(fetchProfile, 2000);
        } catch (e) { console.error("Calc trigger failed", e); }
      };
      triggerCalc();
    }
  }, [profile?.fid]); // Only run when profile loaded/changed

  useEffect(() => {
    if (neynarUser?.fid || context?.user?.fid) {
      fetchProfile();
    }
  }, [context?.user?.fid, neynarUser?.fid]);

  // --- ACTIONS ---
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const { toast } = useToast();

  const handleCheckIn = async () => {
    if (!profile) {
      toast("Error: Profile loading...", "ERROR");
      fetchProfile(); // Retry fetch
      return;
    }

    // Prevent double clicking
    if (actionLoading === 'checkin') return;

    setActionLoading('checkin');

    // ---------------------------------------------------------
    // AGENT TRANSACTION FLOW (Primary for Farcaster Native)
    // ---------------------------------------------------------
    if ((sdk as any)?.actions?.openUrl) {
      toast("Initializing Agent Transaction...", "PROCESS");
      console.log("[Checkin] Starting Agent Flow...");
      try {
        // 1. Create Agent Frame
        const agentRes = await fetch('/api/echo/agent/tx', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fid: neynarUser?.fid || context?.user?.fid,
            data: stringToHex(`Echo Checkin | FID: ${context?.user?.fid}`)
          })
        });
        const agentData = await agentRes.json();

        if (!agentData.success || !agentData.url) throw new Error("Agent creation failed");

        console.log("[Checkin] Agent URL:", agentData.url);

        // 2. Open Frame
        await (sdk as any).actions.openUrl(agentData.url);
        toast("Sign in the opened Window...", "PROCESS");

        // 3. Poll for Completion (Optimistic UI)
        let attempts = 0;
        const pollInterval = setInterval(async () => {
          attempts++;
          try {
            const statusRes = await fetch(`/api/echo/agent/status?frame_id=${agentData.id}`);
            const statusData = await statusRes.json();
            const tf = statusData?.transaction_frame;

            console.log(`[Checkin] Polling Attempt ${attempts}:`, tf?.status);

            if (tf?.status === 'filled' || tf?.status === 'paid' || tf?.transaction?.hash) {
              clearInterval(pollInterval);
              const hash = tf?.transaction?.hash;

              if (hash) {
                toast("TX Verified! Finalizing...", "PROCESS");
                await finalizeCheckIn(hash);
              } else {
                toast("Frame Signed! Processing...", "PROCESS");
                // Fallback: If status is 'paid' but no hash yet, maybe wait or assume success if API allows?
                // For now, we strictly need a hash for the /checkin API.
              }
            }
          } catch (err) { console.error("Polling error", err); }

          if (attempts > 20) { // 60s timeout
            clearInterval(pollInterval);
            toast("Polling timed out. Check manually.", "INFO");
            setActionLoading(null);
          }
        }, 3000);

        return; // Exit main flow, polling handles rest

      } catch (e) {
        console.warn("Agent Flow Failed, falling back to Wagmi...", e);
        toast("Agent failed, using Wallet fallback...", "INFO");
      }
    }

    // ---------------------------------------------------------
    // WAGMI FALLBACK (Legacy/Web)
    // ---------------------------------------------------------
    toast("Requesting Wallet Signature...", "PROCESS");

    try {
      // 1. On-chain Tx (Proof of Check-in)
      let hash: `0x${string}`;
      const txData = {
        to: "0x438da727a6C359d46E4922e38E901f2916A49a1f" as `0x${string}`,
        value: parseEther("0"),
        data: stringToHex(`Echo Checkin | FID: ${context?.user?.fid}`),
      };

      console.log("[Checkin] Using Wagmi...");
      toast("Please sign in your wallet...", "PROCESS");
      hash = await sendTransactionAsync(txData);

      toast("Verifying Transaction...", "PROCESS");
      await finalizeCheckIn(hash);

    } catch (e: any) {
      console.error(e);
      if (e.message?.includes("User rejected")) {
        toast("Signature Cancelled", "INFO");
      } else {
        toast("Transaction Failed. Try again.", "ERROR");
      }
      setActionLoading(null);
    }
  };

  const finalizeCheckIn = async (hash: string) => {
    try {
      const targetFid = neynarUser?.fid || context?.user?.fid;
      const res = await fetch('/api/echo/checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fid: targetFid, txHash: hash })
      });
      const data = await res.json();

      if (data.success) {
        toast(`✅ CHECK-IN COMPLETE! +${data.pointsAdded} PTS`, "SUCCESS");
        await fetchProfile();
      } else {
        toast(`❌ Verification Failed: ${data.error}`, "ERROR");
      }
    } catch (e) {
      toast("Backend Verification Error", "ERROR");
    } finally {
      setActionLoading(null);
    }
  };

  const handleOpenBox = async (day: number) => {
    setActionLoading(`box-${day}`);
    toast(`Opening Day ${day} Box...`, "PROCESS");
    try {
      // 1. On-chain Tx
      const hash = await sendTransactionAsync({
        to: getAddress("0x438Da72724D6331A47073286333241BD788A8340"),
        value: parseEther("0"),
        data: stringToHex(`ECHO_BOX_DAY_${day}`),
      });

      toast("TX_SUBMITTED: Verifying loot...", "PROCESS");

      // 2. API Call
      const res = await fetch('/api/echo/box', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fid: context?.user?.fid, day, txHash: hash })
      });
      const data = await res.json();
      console.log(`[BOX] Response for Day ${day}:`, data);

      if (data.success) {
        toast(`UNLOCKED ${data.tier} BOX! +${data.pointsAdded} PTS`, "SUCCESS");
        await fetchProfile();
      } else {
        console.error(`[BOX] Failed:`, data);
        toast(`Failed: ${data.error || "Unknown Error"}`, "ERROR");
      }
    } catch (e: any) {
      console.error("[BOX] Exception:", e);
      toast(`BOX ERROR: ${e.message}`, "ERROR");
    } finally {
      setActionLoading(null);
    }
  };

  const handleSocialTask = async (task: 'follow_echo' | 'follow_khash' | 'follow_mugetso') => {
    // Open URL
    let url = '';
    if (task === 'follow_echo') url = 'https://warpcast.com/echo';
    else if (task === 'follow_khash') url = 'https://warpcast.com/khash';
    else if (task === 'follow_mugetso') url = 'https://farcaster.xyz/mugetso';

    window.open(url, '_blank');

    setActionLoading(task);
    toast("Verifying mission...", "PROCESS");

    try {
      const res = await fetch('/api/echo/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fid: context?.user?.fid, actionType: task })
      });
      const data = await res.json();
      if (data.success) {
        toast(`MISSION COMPLETE! +${data.pointsAdded} PTS`, "SUCCESS");
        fetchProfile();
      } else {
        toast(data.error || "Quest already claimed!", "INFO");
      }
    } catch (e) {
      console.error(e);
      toast("Verification error", "ERROR");
    } finally {
      setActionLoading(null);
    }
  };


  // --- RENDER HELPERS ---
  const isCheckedInToday = () => {
    if (!profile?.streak?.lastCheckIn) return false;
    const last = new Date(profile.streak.lastCheckIn).toISOString().split('T')[0];
    const now = new Date().toISOString().split('T')[0];
    return last === now;
  };

  const BoxButton = ({ day, label }: { day: number, label: string }) => {
    const claimKey = `day${day}` as keyof Profile['rewards']['claimedBoxes'];
    const isClaimed = profile?.rewards?.claimedBoxes?.[claimKey];
    const canClaim = (profile?.streak.current || 0) >= day;
    const isLoading = actionLoading === `box-${day}`;

    return (
      <div className={`border p-2 flex flex-col items-center justify-center gap-1 w-full relative ${isClaimed ? 'border-gray-700 opacity-50' : canClaim ? 'border-primary bg-primary/10 animate-pulse' : 'border-gray-800'}`}>
        <span className="text-[10px] font-mono text-gray-400">DAY {day}</span>
        <div className={`w-8 h-8 border-2 flex items-center justify-center font-pixel text-xs ${isClaimed ? 'border-gray-700 bg-gray-900' : canClaim ? 'border-primary bg-primary text-black cursor-pointer' : 'border-gray-800 text-gray-800'}`}
          onClick={() => !isClaimed && canClaim && !isLoading && handleOpenBox(day)}
        >
          {isLoading ? '...' : (isClaimed ? '✓' : '?')}
        </div>
        <span className="text-[8px] uppercase">{label}</span>
      </div>
    )
  };

  return (
    <div className="space-y-6 pb-20 min-h-[500px]">
      {/* 0. BANNER */}
      <RetroBanner src="/assets/banner_eye.jpg" alt="Echo Vision" />

      {/* 1. STREAK HEADER */}
      <div className="bg-black border-2 border-primary p-4 shadow-[4px_4px_0_0_theme('colors.primary')] relative overflow-hidden">
        <div className="flex justify-between items-end relative z-10">
          <div>
            <p className="font-pixel text-sm text-gray-400 mb-1">CURRENT STREAK</p>
            <h2 className="font-pixel text-5xl text-white text-shadow-glow flex items-center gap-2">
              {profile?.streak?.current || 0} <span className="text-2xl text-primary">DAYS</span>
            </h2>
          </div>
          <div className="text-right">
            <p className="font-mono text-[10px] text-gray-500 uppercase">Total Echo Power</p>
            <div className="flex items-center gap-2 justify-end">
              <p className="font-pixel text-2xl text-white">
                {(profile?.points || 0) + (profile?.onchainScore || 0)}
              </p>
              <button
                onClick={async () => {
                  toast("SYNCING DATA...", "PROCESS");
                  await fetch('/api/echo/profile', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      action: 'calculate',
                      fid: neynarUser?.fid || context?.user?.fid,
                      address: (context?.user?.verifications?.[0] || '0x0000000000000000000000000000000000000000')
                    })
                  });
                  await fetchProfile();
                  toast("DATA SYNCED", "SUCCESS");
                }}
                className="text-[10px] text-gray-500 hover:text-white border border-gray-800 hover:border-white px-1"
              >
                ↻
              </button>
            </div>
            <p className="text-[8px] text-gray-500 uppercase mt-1 leading-tight">Points + Reputation</p>
          </div>
        </div>
      </div>

      {/* POINTS HISTORY TABLE - RIGHT AFTER SCORE */}
      <RetroWindow title="POINTS_LOG.HIST" icon={<span className="text-primary text-xs mr-2">Σ</span>}>
        <div className="overflow-x-auto max-h-[200px] overflow-y-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b-2 border-white/20 text-[10px] font-mono text-gray-500 uppercase">
                <th className="py-2 pl-2">DATE</th>
                <th className="py-2">ACTIVITY</th>
                <th className="py-2 text-right pr-2">PTS</th>
              </tr>
            </thead>
            <tbody className="text-[11px] font-mono">
              {profile?.dailyActions?.pointsHistory && profile.dailyActions.pointsHistory.length > 0 ? (
                profile.dailyActions.pointsHistory.slice().reverse().map((item: any, i: number) => (
                  <tr key={i} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                    <td className="py-2 pl-2 text-gray-400">
                      {new Date(item.date).toLocaleDateString(undefined, { month: '2-digit', day: '2-digit' })}
                    </td>
                    <td className="py-2">
                      <div className="uppercase font-bold text-white leading-tight">{item.action.replace(/_/g, ' ')}</div>
                      <div className="text-[8px] text-gray-500 italic lowercase truncate max-w-[120px]">{item.description}</div>
                    </td>
                    <td className={`py-2 text-right pr-2 font-pixel text-[#00ff00]`}>
                      +{item.points}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={3} className="py-8 text-center text-gray-500 uppercase italic">
                    NO_HISTORY_FOUND
                  </td>
                </tr>
              )}
              {/* Onchain Row if present */}
              {profile?.onchainScore && profile.onchainScore > 0 && (
                <tr className="bg-yellow-500/10 border-t-2 border-yellow-500/20">
                  <td className="py-2 pl-2 text-yellow-500 font-bold">LEGACY</td>
                  <td className="py-2">
                    <div className="uppercase font-pixel text-yellow-500">ONCHAIN_REPUTATION</div>
                    <div className="text-[8px] text-yellow-500/70 italic">Verified wallet activity score</div>
                  </td>
                  <td className="py-2 text-right pr-2 font-pixel text-yellow-500">
                    +{profile.onchainScore}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </RetroWindow>

      {/* 2. CALENDAR / REWARD PATH */}
      <RetroWindow title="MONTHLY_GRID">
        <div className="p-1">
          <div className="grid grid-cols-7 gap-1 mb-4">
            {Array.from({ length: 30 }).map((_, i) => {
              const dayNum = i + 1;
              const isActive = dayNum <= (profile?.streak.current || 0);

              return (
                <div key={i} className={`h-2 w-full ${isActive ? "bg-primary shadow-[0_0_5px_theme('colors.primary')]" : "bg-gray-900"}`} />
              )
            })}
          </div>

          <p className="font-mono text-[10px] text-center text-gray-400 mb-2">- REWARD MILESTONES -</p>
          <div className="grid grid-cols-4 gap-2">
            <BoxButton day={3} label="COMMON" />
            <BoxButton day={7} label="RARE" />
            <BoxButton day={14} label="EPIC" />
            <BoxButton day={30} label="LEGEND" />
          </div>
        </div>
      </RetroWindow>

      {/* 3. DAILY ACTIONS */}
      <div className="space-y-3">
        <div className="space-y-3">
          {/* Daily Tasks Row */}
          <div className="grid grid-cols-2 gap-3">
            {/* Check In */}
            <div className={`border-2 p-3 flex flex-col justify-between transition-all min-h-[140px] ${isCheckedInToday() ? 'border-gray-800 bg-gray-900' : 'border-white bg-black hover:border-primary'}`}>
              <div className="mb-2">
                <h3 className="font-pixel text-sm text-white">CHECK_IN</h3>
                <p className="font-mono text-[8px] text-gray-400 uppercase">+10 PTS • TX REQUIRED</p>
              </div>

              <div className="w-full">
                {isCheckedInToday() ? (
                  <div className="space-y-2">
                    <div className="text-[9px] text-gray-600 font-pixel text-center">COMPLETED</div>
                    <RetroTimer />
                  </div>
                ) : (
                  <button
                    disabled={actionLoading === 'checkin'}
                    onClick={handleCheckIn}
                    className={`w-full py-2 font-pixel text-[10px] border uppercase border-primary text-primary hover:bg-primary hover:text-black ${!profile ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    {actionLoading === 'checkin' ? 'SIGNING' : 'SIGN TX'}
                  </button>
                )}
              </div>
            </div>

            {/* Daily Echo Cast */}
            <div className={`border-2 p-3 flex flex-col justify-between transition-all min-h-[140px] ${profile?.dailyActions?.lastCastDate === new Date().toISOString().split('T')[0] ? 'border-gray-800 bg-gray-900' : 'border-white bg-black hover:border-primary'}`}>
              <div className="mb-2">
                <h3 className="font-pixel text-sm text-white">DAILY_ECHO</h3>
                <p className="font-mono text-[8px] text-gray-400 uppercase">+5-10 PTS • CAST</p>
              </div>
              <div className="w-full">
                {profile?.dailyActions?.lastCastDate === new Date().toISOString().split('T')[0] ? (
                  <div className="space-y-2">
                    <div className="text-[9px] text-gray-600 font-pixel text-center">COMPLETED</div>
                    <RetroTimer />
                  </div>
                ) : (
                  <button
                    onClick={() => setActiveTab?.('actions')}
                    className="w-full py-2 font-pixel text-[10px] border uppercase border-primary text-primary hover:bg-primary hover:text-black"
                  >
                    GO TO CAST
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* LIMITED MISSION - YELLOW STYLE */}
          <div className="border-2 border-dashed border-yellow-500/50 bg-yellow-900/10 p-4 relative overflow-hidden group">
            <div className="absolute top-0 right-0 bg-yellow-500 text-black text-[9px] font-bold px-2 py-0.5">LIMITED</div>
            <div className="flex justify-between items-center relative z-10">
              <div>
                <h3 className="font-pixel text-sm text-yellow-500">FOLLOW_DEVELOPER</h3>
                <p className="font-mono text-[10px] text-gray-400 uppercase tracking-tighter">FOLLOW @MUGETSO • +30 PTS</p>
              </div>
              <button
                onClick={() => handleSocialTask('follow_mugetso')}
                disabled={actionLoading === 'follow_mugetso' || profile?.dailyActions?.completedTasks?.includes('follow_mugetso')}
                className="px-3 py-1.5 bg-yellow-500 text-black font-pixel text-xs hover:bg-yellow-400 disabled:opacity-50 disabled:bg-gray-700 disabled:text-gray-500 transition-all shadow-[2px_2px_0_0_#000]"
              >
                {profile?.dailyActions?.completedTasks?.includes('follow_mugetso') ? 'CLAIMED' : (actionLoading === 'follow_mugetso' ? '...' : 'CLAIM')}
              </button>
            </div>
          </div>

          {/* SOCIAL TASKS */}
          <RetroWindow title="ONE_TIME_QUESTS" icon="star">
            <div className="space-y-2">
              {/* Follow Echo */}
              <div className="flex justify-between items-center border-b border-white/10 pb-2 last:border-0 last:pb-0">
                <div>
                  <p className="font-bold text-xs">FOLLOW @ECHO</p>
                  <p className="text-[9px] text-primary font-mono">+50 PTS</p>
                </div>
                <button
                  onClick={() => handleSocialTask('follow_echo')}
                  disabled={actionLoading === 'follow_echo'} // Needs 'claimed' check from profile in future
                  className="px-2 py-1 bg-white text-black font-pixel text-[10px] hover:bg-gray-200"
                >
                  {actionLoading === 'follow_echo' ? '...' : 'FOLLOW'}
                </button>
              </div>
              {/* Follow Dev */}
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-bold text-xs">FOLLOW @KHASH</p>
                  <p className="text-[9px] text-primary font-mono">+50 PTS</p>
                </div>
                <button
                  onClick={() => handleSocialTask('follow_khash')}
                  disabled={actionLoading === 'follow_khash'}
                  className="px-2 py-1 bg-white text-black font-pixel text-[10px] hover:bg-gray-200"
                >
                  {actionLoading === 'follow_khash' ? '...' : 'FOLLOW'}
                </button>
              </div>
            </div>
          </RetroWindow>

        </div>
      </div>
    </div>
  );
}
