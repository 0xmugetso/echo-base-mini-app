import { useState, useEffect } from "react";
import { RetroWindow } from "../RetroWindow";
import { RetroBanner } from "../RetroBanner";
import { useAccount, useSendTransaction } from "wagmi";
import { parseEther, stringToHex } from "viem";
import { useNeynarSigner } from "~/hooks/useNeynarSigner";
import { useMiniApp } from "@neynar/react";
import { useToast } from "../ToastProvider";

type Profile = {
  points: number;
  streak: { current: number; highest: number; lastCheckIn: string };
  rewards: { claimedBoxes: { day3: boolean; day7: boolean; day14: boolean; day30: boolean } };
  dailyActions: { lastCastDate: string };
};

export function TasksTab({ context }: { context?: any }) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(false);

  // Wagmi & Neynar
  const { address } = useAccount();
  const { sendTransactionAsync } = useSendTransaction();
  const { signerStatus, createSigner } = useNeynarSigner();
  const { sdk } = useMiniApp() as any;

  // --- FETCH PROFILE ---
  const fetchProfile = async () => {
    if (!context?.user?.fid) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/echo/profile?fid=${context.user.fid}`);
      const data = await res.json();
      if (data && !data.error) setProfile(data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchProfile(); }, [context?.user?.fid]);

  // --- ACTIONS ---
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const { toast } = useToast();

  const handleCheckIn = async () => {
    console.log("Check-in Clicked");
    if (!profile) {
      toast("Profile not loaded yet", "ERROR");
      return;
    }
    setActionLoading('checkin');
    toast("Initiating Transaction...", "PROCESS");

    try {
      // 1. On-chain Tx (Proof of Check-in)
      let hash: `0x${string}`;
      const txData = {
        to: "0x438da727a6C359d46E4922e38E901f2916A49a1f" as `0x${string}`,
        value: parseEther("0"),
        data: stringToHex(`Echo Checkin | FID: ${context?.user?.fid}`),
      };

      if (sdk?.actions?.sendTransaction) {
        console.log("[Checkin] Sending via Frame SDK actions");
        try {
          const result = await sdk.actions.sendTransaction(txData);
          if (!result?.hash) throw new Error("Transaction cancelled");
          hash = result.hash as `0x${string}`;
        } catch (sdkErr) {
          console.warn("[Checkin] SDK Error, falling back:", sdkErr);
          hash = await sendTransactionAsync(txData);
        }
      } else {
        console.log("[Checkin] Falling back to wagmi sendTransactionAsync");
        hash = await sendTransactionAsync(txData);
      }

      toast("TX_SUBMITTED: Waiting for verification...", "PROCESS");

      // 2. API Call
      const res = await fetch('/api/echo/checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fid: context?.user?.fid, txHash: hash })
      });
      const data = await res.json();
      if (data.success) {
        toast(`CHECK-IN SUCCESS! +${data.pointsAdded} PTS`, "SUCCESS");
        fetchProfile();
      } else {
        toast(data.error || "Verification failed", "ERROR");
      }
    } catch (e) {
      console.error(e);
      toast("CHECK-IN FAILED (Did you sign?)", "ERROR");
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

  const handleSocialTask = async (task: 'follow_echo' | 'follow_khash') => {
    // Open URL
    const url = task === 'follow_echo' ? 'https://warpcast.com/echo' : 'https://warpcast.com/khash';
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
            <p className="font-pixel text-2xl text-white">{profile?.points || 0}</p>
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
        {/* Check In */}
        <div className={`border-2 p-4 flex justify-between items-center transition-all ${isCheckedInToday() ? 'border-gray-800 bg-gray-900' : 'border-white bg-black hover:border-primary'}`}>
          <div>
            <h3 className="font-pixel text-lg text-white">DAILY_CHECK_IN</h3>
            <p className="font-mono text-[10px] text-gray-400">+10 PTS • REQUIRES TX</p>
          </div>
          <button
            disabled={actionLoading === 'checkin' || isCheckedInToday()}
            onClick={handleCheckIn}
            className={`px-4 py-2 font-pixel text-xs border uppercase ${isCheckedInToday() ? 'border-gray-700 text-gray-700' : 'border-primary text-primary hover:bg-primary hover:text-black'} ${!profile ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {isCheckedInToday() ? 'COMPLETED' : (actionLoading === 'checkin' ? 'SIGNING...' : 'SIGN TX')}
          </button>
        </div>

        {/* Daily Echo Cast */}
        <div className="border-2 border-white bg-black p-4 flex justify-between items-center relative overflow-hidden">
          <div>
            <h3 className="font-pixel text-lg text-white">DAILY_ECHO</h3>
            <p className="font-mono text-[10px] text-gray-400">+10 PTS • CAST ON FARCASTER</p>
          </div>
          <button
            onClick={() => alert("Coming Soon: Need to update Cast API to use EchoProfile points logic!")}
            className="px-4 py-2 font-pixel text-xs border border-gray-500 text-gray-500 cursor-not-allowed"
          >
            CLAIM (WIP)
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
  );
}
