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
  referredBy?: number;
};

export function TasksTab({ context, neynarUser, setActiveTab, isActive }: { context?: any, neynarUser?: any, setActiveTab?: (tab: string) => void, isActive?: boolean }) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(false);
  const [dynamicTasks, setDynamicTasks] = useState<any[]>([]);
  const [loadingDynamicTasks, setLoadingDynamicTasks] = useState(false);
  const [inputs, setInputs] = useState<{[key: string]: string}>({});
  const [cooldowns, setCooldowns] = useState<{[key: string]: number}>({});
  const [engageClicked, setEngageClicked] = useState<{[key: string]: boolean}>({});

  const startCooldown = (taskId: string) => {
    setCooldowns(prev => ({ ...prev, [taskId]: 15 }));
    const interval = setInterval(() => {
      setCooldowns(prev => {
        const current = prev[taskId];
        if (current <= 1) {
          clearInterval(interval);
          const updated = { ...prev };
          delete updated[taskId];
          return updated;
        }
        return { ...prev, [taskId]: current - 1 };
      });
    }, 1000);
  };

  // Wagmi & Neynar
  const { address } = useAccount();
  const { sendTransactionAsync } = useSendTransaction();
  const { sdk } = useMiniApp() as any;

  const primaryEthAddress =
    neynarUser?.verified_addresses?.primary?.eth_address ||
    neynarUser?.verified_addresses?.eth_addresses?.[0] ||
    context?.user?.verified_addresses?.eth_addresses?.[0] ||
    (context?.user as any)?.verifiedAddresses?.ethAddresses?.[0] ||
    (context?.user as any)?.custodyAddress ||
    '0x0000000000000000000000000000000000000000';

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
        setActiveTab?.("onboarding");
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  // --- FETCH DYNAMIC TASKS ---
  const fetchDynamicTasks = async () => {
    const targetFid = neynarUser?.fid || context?.user?.fid;
    if (!targetFid) return;
    setLoadingDynamicTasks(true);
    try {
      const res = await fetch(`/api/echo/tasks?fid=${targetFid}`);
      const data = await res.json();
      if (data && data.success) {
        setDynamicTasks(data.tasks);
      }
    } catch (e) {
      console.error("Failed to load dynamic tasks", e);
    } finally {
      setLoadingDynamicTasks(false);
    }
  };

  const handleDynamicTask = async (task: any) => {
    const targetFid = neynarUser?.fid || context?.user?.fid;
    if (!targetFid) {
      toast("Error: No FID found", "ERROR");
      return;
    }

    if (task.buttonType === 'input') {
      const val = inputs[task._id] || '';
      if (val.trim().toLowerCase() !== task.actionLink.trim().toLowerCase()) {
        toast("❌ Invalid code! Try again.", "ERROR");
        return;
      }
    }

    // Open URL if button type with a link
    if (task.buttonType === 'button' && task.actionLink) {
      window.open(task.actionLink, '_blank');
    }

    setActionLoading(task._id);
    toast("Verifying mission...", "PROCESS");

    try {
      const res = await fetch('/api/echo/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fid: targetFid, actionType: task._id })
      });
      const data = await res.json();
      if (data.success) {
        toast(`MISSION COMPLETE! +${data.pointsAdded} PTS`, "SUCCESS");
        await fetchProfile();
        await fetchDynamicTasks();
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
              address: primaryEthAddress
            })
          });
          // Re-fetch after short delay
          setTimeout(() => {
            fetchProfile();
            fetchDynamicTasks();
          }, 2000);
        } catch (e) { console.error("Calc trigger failed", e); }
      };
      triggerCalc();
    }
  }, [profile?.fid]); // Only run when profile loaded/changed

  useEffect(() => {
    if ((neynarUser?.fid || context?.user?.fid) && isActive) {
      fetchProfile();
      fetchDynamicTasks();
    }
  }, [context?.user?.fid, neynarUser?.fid, isActive]);

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
        await fetchDynamicTasks();
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
        await fetchDynamicTasks();
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


  // --- RENDER HELPERS ---
  const isCheckedInToday = () => {
    if (!profile?.streak?.lastCheckIn) return false;
    const last = new Date(profile.streak.lastCheckIn).toISOString().split('T')[0];
    const now = new Date().toISOString().split('T')[0];
    return last === now;
  };

  const BoxButton = ({ day, label }: { day: number, label: string }) => {
    const claimKey = `day${day}` as keyof Profile['rewards']['claimedBoxes'];
    const isClaimed = profile?.rewards?.claimedBoxes?.[claimKey] || false;
    const canClaim = (profile?.streak?.current || 0) >= day;
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
                      address: primaryEthAddress
                    })
                  });
                  await fetchProfile();
                  await fetchDynamicTasks();
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
              {(() => {
                const pointsList = [...(profile?.dailyActions?.pointsHistory || [])];
                
                // If referredBy is set but referral_joining_bonus is not in pointsHistory, synthesize it
                const hasReferralBonus = pointsList.some((item: any) => item.action === 'referral_joining_bonus');
                if (profile?.referredBy && !hasReferralBonus) {
                  pointsList.push({
                    action: 'referral_joining_bonus',
                    points: 20,
                    date: new Date(2026, 4, 24).toISOString(), // Use fallback date
                    description: 'Bonus points for signing up with an invite code'
                  });
                }

                if (pointsList.length > 0) {
                  return pointsList.slice().reverse().map((item: any, i: number) => (
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
                  ));
                } else {
                  return (
                    <tr>
                      <td colSpan={3} className="py-8 text-center text-gray-500 uppercase italic">
                        NO_HISTORY_FOUND
                      </td>
                    </tr>
                  );
                }
              })()}
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
              const isActive = dayNum <= (profile?.streak?.current || 0);

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
          {/* Check In (Streak Task) */}
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

          {/* DYNAMIC DATABASE MISSIONS */}
          <RetroWindow title="DYNAMIC_MISSIONS" icon="⚡">
            {loadingDynamicTasks && dynamicTasks.length === 0 ? (
              <div className="text-center py-4 font-pixel text-[10px] text-gray-500 uppercase animate-pulse">
                LOADING_MISSIONS_DATABASE...
              </div>
            ) : dynamicTasks.length === 0 ? (
              <div className="text-center py-4 font-pixel text-[10px] text-gray-500 uppercase italic">
                NO_ACTIVE_MISSIONS_FOUND
              </div>
            ) : (
              <div className="space-y-4">
                {dynamicTasks.map((task) => {
                  const isClaimLoading = actionLoading === task._id;
                  
                  return (
                    <div
                      key={task._id}
                      className={`border p-3 relative flex flex-col justify-between transition-all ${
                        task.isCompleted
                          ? 'border-gray-800 bg-gray-900/60 opacity-60'
                          : !task.isEligible
                          ? 'border-red-950 bg-red-950/5 opacity-50'
                          : 'border-white bg-black hover:border-primary'
                      }`}
                    >
                      {/* Priority % Indicator on top right */}
                      {task.isActive && (
                        <div className="absolute top-1 right-2 text-[7px] font-mono text-gray-500 uppercase">
                          Priority: {task.relativePriority}%
                        </div>
                      )}

                      <div className="mb-2">
                        <div className="flex items-center gap-1.5">
                          {!task.isEligible && <span className="text-[10px]">🔒</span>}
                          <h3 className={`font-pixel text-xs ${task.isCompleted ? 'text-gray-500 line-through' : 'text-white'}`}>
                            {task.title}
                          </h3>
                        </div>
                        <p className="font-mono text-[9px] text-gray-400 mt-0.5 lowercase">{task.description}</p>
                        <p className="font-mono text-[8px] text-primary uppercase mt-1">
                          +{task.points} PTS {task.timeSpan?.type === 'custom' && task.timeSpan?.deadline ? `• EXPIRES: ${new Date(task.timeSpan.deadline).toLocaleDateString()}` : ''}
                        </p>
                      </div>

                      {/* LOCKED DETAILS DISPLAY */}
                      {!task.isEligible && task.conditions && task.conditions.length > 0 && (
                        <div className="border border-red-900/30 bg-red-950/20 p-2 mb-2 text-[8px] text-red-400 font-mono uppercase">
                          <p className="font-bold mb-1">Locked! Requirement unsatisfied:</p>
                          <div className="flex flex-wrap gap-1 items-center">
                            {task.conditions.map((c: any, index: number) => (
                              <span key={index} className="leading-tight">
                                {index > 0 && <strong className="text-red-500 px-0.5">{c.logicalOperator}</strong>}
                                <span>{c.field.replace(/(profile\.|userStats\.stats\.)/, '')}</span>
                                <strong className="text-white px-0.5">{c.operator}</strong>
                                {!['true', 'false'].includes(c.operator) && (
                                  <span>"{c.value}"</span>
                                )}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* ACTION TYPE RENDERING */}
                      {task.isCompleted ? (
                        <div className="text-[9px] text-gray-600 font-pixel text-center py-1 uppercase">COMPLETED</div>
                      ) : !task.isEligible ? (
                        <div className="text-[9px] text-red-900 font-pixel text-center py-1 uppercase">UNSATISFIED CONDITIONS</div>
                      ) : (
                        <div className="w-full mt-2 space-y-2">
                          
                          {/* 1. FOLLOW MISSION */}
                          {task.actionType === 'follow' && (
                            <div className="flex gap-2">
                              <button
                                onClick={() => window.open('https://warpcast.com/' + task.actionTarget, '_blank')}
                                className="flex-1 py-1.5 font-pixel text-[9px] border border-white text-white hover:bg-white hover:text-black transition-all"
                              >
                                FOLLOW @{task.actionTarget}
                              </button>
                              <button
                                disabled={isClaimLoading}
                                onClick={() => handleDynamicTask(task)}
                                className="flex-1 py-1.5 font-pixel text-[9px] border border-primary bg-primary/10 text-primary hover:bg-primary hover:text-black transition-all disabled:opacity-50"
                              >
                                {isClaimLoading ? '...' : 'CLAIM MISSION'}
                              </button>
                            </div>
                          )}

                          {/* 2. ENGAGEMENT MISSION */}
                          {task.actionType === 'engage' && (
                            <div className="w-full">
                              {cooldowns[task._id] ? (
                                <button
                                  disabled
                                  className="w-full py-1.5 font-pixel text-[9px] border border-yellow-500/50 bg-yellow-500/10 text-yellow-500 uppercase animate-pulse"
                                >
                                  ⏳ ENGAGING... {cooldowns[task._id]}S
                                </button>
                              ) : engageClicked[task._id] ? (
                                <button
                                  disabled={isClaimLoading}
                                  onClick={() => handleDynamicTask(task)}
                                  className="w-full py-1.5 font-pixel text-[9px] border border-primary bg-primary/10 text-primary hover:bg-primary hover:text-black transition-all disabled:opacity-50"
                                >
                                  {isClaimLoading ? 'CLAIMING...' : 'CLAIM POINT'}
                                </button>
                              ) : (
                                <button
                                  onClick={() => {
                                    window.open(task.actionTarget, '_blank');
                                    setEngageClicked(prev => ({ ...prev, [task._id]: true }));
                                    startCooldown(task._id);
                                  }}
                                  className="w-full py-1.5 font-pixel text-[9px] border border-white text-white hover:bg-white hover:text-black transition-all"
                                >
                                  GO TO CAST ({task.actionSubtype || 'like'})
                                </button>
                              )}
                            </div>
                          )}

                          {/* 3. RAID MISSION */}
                          {task.actionType === 'raid' && (
                            <div className="space-y-2">
                              <div className="border border-dashed border-primary/20 bg-primary/5 p-2 rounded-none">
                                <p className="text-[7px] text-gray-500 font-bold mb-1 uppercase">Raid Text Template:</p>
                                <p className="font-mono text-[9px] text-white select-all break-all">{task.actionTarget}</p>
                              </div>
                              <div className="flex gap-2">
                                <button
                                  onClick={() => {
                                    navigator.clipboard.writeText(task.actionTarget);
                                    toast("✅ RAID TEMPLATE COPIED!", "SUCCESS");
                                    window.open('https://warpcast.com/', '_blank');
                                  }}
                                  className="flex-1 py-1.5 font-pixel text-[9px] border border-white text-white hover:bg-white hover:text-black transition-all"
                                >
                                  COPY & RAID
                                </button>
                                <button
                                  disabled={isClaimLoading}
                                  onClick={() => handleDynamicTask(task)}
                                  className="flex-1 py-1.5 font-pixel text-[9px] border border-primary bg-primary/10 text-primary hover:bg-primary hover:text-black transition-all disabled:opacity-50"
                                >
                                  {isClaimLoading ? '...' : 'CLAIM MISSION'}
                                </button>
                              </div>
                            </div>
                          )}

                          {/* 4. DEFAULT CLAIM OR FALLBACK QUESTS */}
                          {(!task.actionType || task.actionType === 'claim') && (
                            <div className="w-full">
                              {/* SWITCH STYLE */}
                              {task.buttonType === 'switch' && (
                                <div className="flex items-center justify-between border border-primary/20 bg-primary/5 px-3 py-1.5">
                                  <span className="font-pixel text-[9px] text-primary uppercase">ACTIVATE QUEST:</span>
                                  <label className="relative inline-flex items-center cursor-pointer select-none">
                                    <input
                                      type="checkbox"
                                      disabled={isClaimLoading}
                                      onChange={(e) => {
                                        if (e.target.checked) handleDynamicTask(task);
                                      }}
                                      className="sr-only peer"
                                    />
                                    <div className="w-9 h-5 bg-gray-900 peer-focus:outline-none border-2 border-primary/40 peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-primary after:border-primary after:border after:h-3 after:w-3 after:transition-all peer-checked:bg-primary/20 peer-checked:border-primary"></div>
                                  </label>
                                </div>
                              )}

                              {/* BUTTON STYLE */}
                              {task.buttonType === 'button' && (
                                <button
                                  disabled={isClaimLoading}
                                  onClick={() => handleDynamicTask(task)}
                                  className="w-full py-2 font-pixel text-[10px] border uppercase border-primary text-primary hover:bg-primary hover:text-black transition-all"
                                >
                                  {isClaimLoading ? 'CLAIMING...' : task.actionLink ? 'GO TO MISSION' : 'CLAIM MISSION'}
                                </button>
                              )}

                              {/* INPUT STYLE */}
                              {task.buttonType === 'input' && (
                                <div className="flex gap-2">
                                  <input
                                    type="text"
                                    placeholder="ENTER VERIFICATION CODE"
                                    value={inputs[task._id] || ''}
                                    onChange={(e) => setInputs({ ...inputs, [task._id]: e.target.value })}
                                    className="flex-1 bg-black border border-white/30 text-white px-2 py-1.5 font-mono text-[9px] focus:outline-none focus:border-primary placeholder-gray-800"
                                  />
                                  <button
                                    disabled={isClaimLoading}
                                    onClick={() => handleDynamicTask(task)}
                                    className="px-3 bg-primary text-black font-pixel text-[9px] hover:bg-white uppercase font-bold"
                                  >
                                    {isClaimLoading ? '...' : 'VERIFY'}
                                  </button>
                                </div>
                              )}
                            </div>
                          )}

                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </RetroWindow>

        </div>
      </div>
    </div>
  );
}
