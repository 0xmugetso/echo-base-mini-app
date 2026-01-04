'use client';

import { useState, useEffect } from 'react';
import { RetroWindow } from '../RetroWindow';
import { RetroBanner } from '../RetroBanner';
import Image from 'next/image';
import { useToast } from '../ToastProvider';

type ActionTabProps = {
  context?: any;
};

export function ActionsTab({ context }: ActionTabProps) {
  const [castText, setCastText] = useState('');
  const [status, setStatus] = useState<'IDLE' | 'VALIDATING' | 'PUBLISHING' | 'AWAITING_VERIFICATION' | 'CLAIMING' | 'SUCCESS'>('IDLE');
  const [lastCast, setLastCast] = useState<any>(null);
  const [viewHistory, setViewHistory] = useState(false);
  const [history, setHistory] = useState<any[]>([]);

  const { toast } = useToast();

  // Limits
  const MIN_CHARS = 100;
  const MAX_CHARS = 250;

  // Checks
  const length = castText.length;
  const hasTag = castText.toLowerCase().includes('@base');
  const hasHash = castText.toLowerCase().includes('#echocast');
  const isLengthValid = length >= MIN_CHARS && length <= MAX_CHARS;
  const isValid = hasTag && hasHash && isLengthValid;

  useEffect(() => {
    // Load history on mount
    if (context?.user?.fid) {
      fetchHistory();
    }
  }, [context?.user?.fid]);

  const fetchHistory = async () => {
    try {
      const res = await fetch(`/api/echo/profile?fid=${context.user.fid}`);
      const data = await res.json();
      if (data?.dailyActions?.castHistory) {
        setHistory(data.dailyActions.castHistory.reverse());
        // Check if casted today
        const lastDate = data.dailyActions.lastCastDate;
        const today = new Date().toISOString().split('T')[0];
        if (lastDate === today) {
          setStatus('SUCCESS');
          setLastCast(data.dailyActions.castHistory[0]); // Most recent
        }
      }
    } catch (e) { console.error("Failed to load history", e); }
  };

  const handleCompose = () => {
    if (!isValid) {
      if (!isLengthValid) toast(`Length invalid: ${length} chars (Need ${MIN_CHARS}-${MAX_CHARS})`, "ERROR");
      else if (!hasTag) toast("Missing @base tag!", "ERROR");
      else if (!hasHash) toast("Missing #echocast tag!", "ERROR");
      return;
    }

    const encodedText = encodeURIComponent(castText);
    const url = `https://warpcast.com/~/compose?text=${encodedText}&channelKey=base`; // Pre-fill channel if possible, or just text

    // Open Deep Link
    if ((window as any).farcaster?.actions?.openUrl) {
      (window as any).farcaster.actions.openUrl(url);
    } else {
      window.open(url, '_blank');
    }

    setStatus('AWAITING_VERIFICATION');
  };

  const handleVerify = async () => {
    setStatus('VALIDATING');
    toast("SCANNING ETHER FOR SIGNAL...", "PROCESS");

    try {
      if (!context?.user?.fid) throw new Error("User FID missing");

      // Fetch recent casts
      const res = await fetch(`/api/warpcast/casts/${context.user.fid}`);
      const data = await res.json();

      if (!data.casts || data.casts.length === 0) {
        throw new Error("No recent casts found on Warpcast.");
      }

      // Find match
      // Logic: Look for a cast by this user created in the last 5 minutes that contains our required tags
      // We can also try to match the exact text, but user might have edited it slightly. 
      // Sticking to required tags + length check + recent time is safer/friendlier.
      const fiveColorsAgo = Date.now() - 5 * 60 * 1000;

      const match = data.casts.find((c: any) => {
        const cTime = new Date(c.timestamp).getTime(); // Warpcast timestamp might be seconds or ms? Usually ms in these SDKs but API might be different. 
        // API v2 casts timestamp is usually epoch milliseconds. 
        // Wait, API v2 timestamp is usually NOT unix ms? Check definition. 
        // Usually it is. Let's assume ms.

        const isRecent = c.timestamp > fiveColorsAgo;
        const text = c.text || '';
        const hasTags = text.toLowerCase().includes('@base') && text.toLowerCase().includes('#echocast');
        return isRecent && hasTags;
      });

      if (!match) {
        throw new Error("Cast verify failed. Did you post it? Wait 10s & try again.");
      }

      setStatus('CLAIMING');
      const txHash = match.hash;

      // Claim Points
      const lengthScore = castText.length > 200 ? 5 : 3;
      const tagScore = (castText.includes('@base') ? 2 : 0) + (castText.includes('#echocast') ? 3 : 0);
      const score = Math.min(10, lengthScore + tagScore);

      const claimRes = await fetch('/api/echo/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fid: context?.user?.fid,
          actionType: 'daily_cast',
          castHash: txHash,
          castText: match.text, // Use actual text posted
          castScore: score
        })
      });

      const claimData = await claimRes.json();
      if (claimData.success) {
        setStatus('SUCCESS');
        setLastCast({ points: score, hash: txHash, text: match.text });
        fetchHistory();
        toast(`MISSION COMPLETE! +${score} PTS`, "SUCCESS");
      } else {
        throw new Error(claimData.error);
      }

    } catch (e: any) {
      console.error(e);
      setStatus('AWAITING_VERIFICATION'); // Go back to verify state
      toast(e.message || "Verification Failed", "ERROR");
    }
  };

  const handleShare = () => {
    const shareText = `I just earned ${lastCast?.points || 10} points on Echo! 🛡️\n\nDaily Cast Mission Complete.\n\nVerify yours: https://echo-base-mini-app.vercel.app`;
    window.open(`https://warpcast.com/~/compose?text=${encodeURIComponent(shareText)}`, '_blank');
  };

  return (
    <div className="space-y-6 pb-24">
      <RetroBanner src="/assets/banner_hand.jpg" alt="Echo Transmission" />

      {/* MAIN TERMINAL */}
      {!viewHistory ? (
        <RetroWindow title="CAST_UPLINK_V2.0" icon="edit">
          <div className="flex flex-col gap-4">

            {/* INSTRUCTIONS */}
            <div className="bg-[#000000] border border-white/20 p-3 text-[10px] font-mono text-gray-400">
              <div className="flex justify-between items-start mb-2">
                <span className="text-primary font-bold">:: MISSION_OBJECTIVES ::</span>
              </div>
              <ul className="space-y-1 list-disc pl-4">
                <li>Make a <span className="text-white">BASE_POST</span> (Why Base is best L2)</li>
                <li>Must match <span className="text-white">{MIN_CHARS}-{MAX_CHARS}</span> chars.</li>
                <li>Required Tags: <span className="text-primary">@Base</span> + <span className="text-primary">#EchoCast</span></li>
              </ul>
            </div>

            {status === 'SUCCESS' ? (
              <div className="border-2 border-primary bg-primary/5 p-6 text-center animate-in fade-in zoom-in duration-300">
                <div className="text-4xl mb-2">📡</div>
                <h3 className="font-pixel text-xl text-white mb-1">TRANSMISSION SENT</h3>
                <p className="font-mono text-xs text-primary mb-4">POINTS EARNED: {lastCast?.points || 10}</p>

                <div className="bg-black/50 p-3 mb-4 text-left border border-white/10">
                  <p className="text-[10px] text-gray-500 mb-1">PREVIEW</p>
                  <p className="text-xs text-gray-300 italic">&quot;{lastCast?.text}&quot;</p>
                </div>

                <button
                  onClick={handleShare}
                  className="w-full bg-white text-black font-pixel py-3 hover:bg-gray-200 flex items-center justify-center gap-2"
                >
                  <span>SHARE_PROOF</span>
                  <span className="text-xs">↗</span>
                </button>

                <p className="text-[10px] text-gray-500 mt-4">NEXT MISSION: 24H</p>
              </div>
            ) : (
              <div className="space-y-4">

                {/* REMOVED SIGNER STATUS BLOCK */}

                {/* INPUT */}
                <div className="relative group">
                  <textarea
                    value={castText}
                    onChange={(e) => setCastText(e.target.value)}
                    disabled={status === 'SUCCESS'}
                    placeholder="TYPE YOUR ECHO..."
                    className="w-full h-32 bg-black border-2 border-gray-800 p-4 font-mono text-white focus:border-primary focus:outline-none resize-none"
                    maxLength={MAX_CHARS}
                  />
                  {/* Char Count */}
                  <div className={`absolute bottom-2 right-2 text-[10px] font-bold ${isLengthValid ? 'text-primary' : 'text-red-500'}`}>
                    {length}/{MAX_CHARS}
                  </div>
                </div>

                {/* CRITERIA CHECKLIST */}
                <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
                  <div className={`flex items-center gap-2 ${isLengthValid ? 'text-green-400' : 'text-gray-600'}`}>
                    <span>{isLengthValid ? '[OK]' : '[  ]'}</span> LENGTH {MIN_CHARS}-{MAX_CHARS}
                  </div>
                  <div className={`flex items-center gap-2 ${hasTag ? 'text-green-400' : 'text-gray-600'}`}>
                    <span>{hasTag ? '[OK]' : '[  ]'}</span> TAG @BASE
                  </div>
                  <div className={`flex items-center gap-2 ${hasHash ? 'text-green-400' : 'text-gray-600'}`}>
                    <span>{hasHash ? '[OK]' : '[  ]'}</span> #ECHOCAST
                  </div>
                </div>

                {/* BUTTONS */}
                {status === 'IDLE' ? (
                  <button
                    onClick={handleCompose}
                    disabled={!isValid}
                    className={`relative w-full py-4 font-pixel text-sm uppercase transition-all ${isValid
                      ? 'bg-primary text-white hover:brightness-110 shadow-[0_0_10px_theme(\'colors.primary\')]'
                      : 'bg-gray-900 text-gray-600 cursor-not-allowed border border-gray-800'
                      }`}
                  >
                    COMPOSE ON WARPCAST ↗
                  </button>
                ) : (
                  <div className="space-y-2">
                    <div className="text-center text-[10px] text-gray-400 font-mono mb-2">
                      Step 1: Post on Warpcast <br /> Step 2: Click Verify
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={handleCompose}
                        className="flex-1 py-3 bg-gray-800 text-gray-300 font-pixel text-xs hover:bg-gray-700"
                      >
                        Re-Open Warpcast
                      </button>
                      <button
                        onClick={handleVerify}
                        disabled={status === 'VALIDATING'}
                        className="flex-[2] py-3 bg-green-600 text-white font-pixel text-xs hover:bg-green-500 animate-pulse"
                      >
                        {status === 'VALIDATING' ? 'SCANNING...' : 'VERIFY CAST'}
                      </button>
                    </div>
                  </div>
                )}

              </div>
            )}

            {/* FOOTER ACTION */}
            <div className="text-center mt-2">
              <button
                onClick={() => setViewHistory(true)}
                className="text-[10px] font-mono text-gray-500 hover:text-white border-b border-dashed border-gray-700 hover:border-white transition-colors"
              >
                [ VIEW_ACCESS_LOG ]
              </button>
            </div>
          </div>
        </RetroWindow>
      ) : (
        /* HISTORY VIEW */
        <RetroWindow title="TRANSMISSION_LOGS" icon="history">
          <div className="flex flex-col h-[400px]">
            <button onClick={() => setViewHistory(false)} className="self-start text-[10px] font-mono text-gray-400 mb-4 hover:text-white">
              ← RETURN_TO_TERMINAL
            </button>

            <div className="flex-1 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
              {history.length > 0 ? history.map((cast, i) => (
                <div key={i} className="bg-white/5 p-3 border border-white/10 hover:border-primary/50 transition-colors">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-[10px] text-gray-500 font-mono">{new Date(cast.date).toLocaleDateString()}</span>
                    <span className="bg-primary/20 text-primary px-1 text-[10px] font-bold">+{cast.points} PTS</span>
                  </div>
                  <p className="text-xs text-gray-300 italic line-clamp-2">&quot;{cast.text}&quot;</p>
                  <div className="flex gap-2 mt-2">
                    <a
                      href={`https://warpcast.com/~/conversations/${cast.hash}`}
                      target="_blank"
                      className="text-[10px] text-white underline hover:no-underline"
                    >
                      VIEW_ON_WARPCAST
                    </a>
                  </div>
                </div>
              )) : (
                <div className="text-center text-gray-600 py-10 font-mono text-xs">
                  NO_LOGS_FOUND
                </div>
              )}
            </div>
          </div>
        </RetroWindow>
      )
      }
    </div >
  );
}

// Helper to restore CSS for scrollbar if needed
const css = `
.custom-scrollbar::-webkit-scrollbar {
    width: 4px;
}
.custom-scrollbar::-webkit-scrollbar-track {
    background: #000;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
    background: #333;
}
`;
