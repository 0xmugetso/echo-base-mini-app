import { useState, useEffect } from "react";
import { RetroWindow } from "../RetroWindow";
import { RetroBanner } from "../RetroBanner";
import { RetroTimer } from "../RetroTimer";
import { useAccount, useSendTransaction } from "wagmi";
import { parseEther, stringToHex } from "viem";
import { useNeynarSigner } from "~/hooks/useNeynarSigner";
import { useMiniApp } from "@neynar/react";
import { useToast } from "../ToastProvider";

type Profile = {
  fid: number;
  points: number;
  castCount?: number;
  streak: { current: number; highest: number; lastCheckIn: string };
  rewards: { claimedBoxes: { day3: boolean; day7: boolean; day14: boolean; day30: boolean } };
  dailyActions: { lastCastDate: string; completedTasks: string[] };
};

export function TasksTab({ context, neynarUser }: { context?: any, neynarUser?: any }) {
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
        to: "0x438Da72724D6331A47073286333241BD788A8340",
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
      if (data.success) {
        toast(`UNLOCKED ${data.tier} BOX! +${data.pointsAdded} PTS`, "SUCCESS");
        fetchProfile();
      } else {
        toast(data.error || "Failed to open box", "ERROR");
      }
    } catch (e) {
      console.error(e);
      toast("BOX OPEN FAILED", "ERROR");
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
    const last = new Date(profile.streak.lastCheckIn);
    const now = new Date();
    return last.toDateString() === now.toDateString();
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
            <p className="font-mono text-[10px] text-gray-500">TOTAL PTS</p>
            <div className="flex items-center gap-2 justify-end">
              <p className="font-pixel text-2xl text-white">{profile?.points || 0}</p>
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
          </div>
        </div>

      </div>

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
          {/* Check In */}
          <div className={`border-2 p-4 flex justify-between items-center transition-all min-h-[80px] ${isCheckedInToday() ? 'border-gray-800 bg-gray-900' : 'border-white bg-black hover:border-primary'}`}>
            <div>
              <h3 className="font-pixel text-lg text-white">DAILY_CHECK_IN</h3>
              <p className="font-mono text-[10px] text-gray-400">+10 PTS • REQUIRES TX</p>
            </div>

            <div className="flex flex-col items-end gap-2 min-w-[120px]">
              {isCheckedInToday() && (
                <button disabled className="w-full px-3 py-2 font-pixel text-xs border border-gray-700 text-gray-600 bg-black opacity-50 cursor-not-allowed">
                  COMPLETED
                </button>
              )}

              {isCheckedInToday() ? (
                <RetroTimer />
              ) : (
                <button
                  disabled={actionLoading === 'checkin'}
                  onClick={handleCheckIn}
                  className={`w-full px-4 py-2 font-pixel text-xs border uppercase border-primary text-primary hover:bg-primary hover:text-black ${!profile ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {actionLoading === 'checkin' ? 'SIGNING...' : 'SIGN TX'}
                </button>
              )}
            </div>
          </div>

          {/* LIMITED MISSION */}
          <div className="border-2 border-dashed border-yellow-500/50 bg-yellow-900/10 p-4 relative overflow-hidden group">
            <div className="absolute top-0 right-0 bg-yellow-500 text-black text-[9px] font-bold px-2 py-0.5">LIMITED</div>
            <div className="flex justify-between items-center relative z-10">
              <div>
                <h3 className="font-pixel text-sm text-yellow-500">FOLLOW_DEVELOPER</h3>
                <p className="font-mono text-[10px] text-gray-400">FOLLOW @MUGETSO • +30 PTS</p>
              </div>
              <button
                onClick={() => handleSocialTask('follow_mugetso')}
                disabled={actionLoading === 'follow_mugetso' || profile?.dailyActions?.completedTasks?.includes('follow_mugetso')}
                className="px-3 py-1.5 bg-yellow-500 text-black font-pixel text-xs hover:bg-yellow-400 disabled:opacity-50 disabled:bg-gray-700 disabled:text-gray-500"
              >
                {profile?.dailyActions?.completedTasks?.includes('follow_mugetso') ? 'CLAIMED' : (actionLoading === 'follow_mugetso' ? 'VERIFYING...' : 'FOLLOW & CLAIM')}
              </button>
            </div>
          </div>

          {/* Daily Echo Cast */}
          <div className="border-2 border-white bg-black p-4 flex justify-between items-center relative overflow-hidden">
            <div>
              <h3 className="font-pixel text-lg text-white">DAILY_ECHO</h3>
              <p className="font-mono text-[10px] text-gray-400">+10 PTS • CAST ON FARCASTER</p>
            </div>
            <button
              onClick={() => alert("Check 'Actions' Tab to Cast!")}
              className="px-4 py-2 font-pixel text-xs border border-gray-500 text-gray-500 cursor-not-allowed"
            >
              GO TO ACTIONS
            </button>
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
