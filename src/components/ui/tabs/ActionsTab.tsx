'use client';

import { useState, useEffect } from 'react';
import { RetroWindow } from '../RetroWindow';
import { RetroBanner } from '../RetroBanner';
import { useNeynarSigner } from '~/hooks/useNeynarSigner';
import Image from 'next/image';
import { useToast } from '../ToastProvider';

type ActionTabProps = {
  context?: any;
};

export function ActionsTab({ context }: ActionTabProps) {
  const [castText, setCastText] = useState('');
  const [status, setStatus] = useState<'IDLE' | 'VALIDATING' | 'PUBLISHING' | 'CLAIMING' | 'SUCCESS'>('IDLE');
  const [lastCast, setLastCast] = useState<any>(null);
  const [viewHistory, setViewHistory] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const { signerStatus, createSigner } = useNeynarSigner();
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

  const handlePublish = async () => {
    // DEBUG: Confirm click
    console.log("Publish clicked. Valid:", isValid, "Signer:", signerStatus);

    if (!isValid) {
      if (!isLengthValid) toast(`Length invalid: ${length} chars (Need ${MIN_CHARS}-${MAX_CHARS})`, "ERROR");
      else if (!hasTag) toast("Missing @base tag!", "ERROR");
      else if (!hasHash) toast("Missing #echocast tag!", "ERROR");
      return;
    }

    // 1. Check Signer
    if (signerStatus.status !== 'approved') {
      toast("Signer required. Please connect above.", "INFO");
      if (signerStatus.status !== 'pending_approval') {
        await createSigner();
      }
      return;
    }

    setStatus('PUBLISHING');
    toast("INITIATING BROADCAST...", "PROCESS");

    try {
      // 2. Publish to Farcaster via Backend (Secure Proxy)
      const castRes = await fetch('/api/echo/cast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          signer_uuid: signerStatus.signer_uuid,
          text: castText,
          parent: 'https://warpcast.com/~/channel/base', // Optional channel
        })
      });

      const castData = await castRes.json();

      if (!castData.success || !castData.hash) {
        throw new Error(castData.error || "Unknown Cast Error");
      }

      const txHash = castData.hash;
      setStatus('CLAIMING');
      toast("CAST SENT! VERIFYING REWARD...", "PROCESS");

      // 3. Claim Points
      // Calculate score based on user effort
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
          castText: castText,
          castScore: score
        })
      });

      const data = await claimRes.json();
      if (data.success) {
        setStatus('SUCCESS');
        setLastCast({ points: score, hash: txHash, text: castText });
        fetchHistory();
        toast(`MISSION COMPLETE! +${score} PTS`, "SUCCESS");
      } else {
        console.error(data.error);
        setStatus('IDLE');
        toast("Verification Failed: " + data.error, "ERROR");
      }

    } catch (e: any) {
      console.error(e);
      setStatus('IDLE');
      toast("TRANSMISSION FAILED: " + (e.message || "Unknown error"), "ERROR");
    }
  };

  const calculateScore = () => {
    // Simple logic: 10 pts + bonus for perfect length
    /* 
    User Req: "score (1-10)"
    Let's make it 8 base + 2 for using keywords. 
    */
    return 10;
  }

  const handleShare = () => {
    const shareText = `I just earned ${lastCast?.points || 10} points on Echo! 🛡️\n\nDaily Cast Mission Complete.\n\nVerify yours: https://echo-base-mini-app.vercel.app`;
    // Use intent
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
                {signerStatus.status !== 'approved' && (
                  <div className={`p-3 border-2 ${signerStatus.status === 'pending_approval' ? 'border-yellow-500 bg-yellow-900/20' : 'border-red-900 bg-red-900/10'} mb-4`}>
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-pixel text-xs text-gray-400">SIGNER_STATUS</span>
                      <span className={`font-mono text-xs ${signerStatus.status === 'pending_approval' ? 'text-yellow-500 animate-pulse' : 'text-red-500'}`}>
                        {signerStatus.status === 'pending_approval' ? 'PENDING APPROVAL' : 'DISCONNECTED'}
                      </span>
                    </div>

                    {signerStatus.status === 'pending_approval' && signerStatus.approval_url ? (
                      <button
                        onClick={async () => {
                          // Reference Implementation Logic
                          // Use sdk.actions.openUrl for better mini-app support
                          // And replace the deeplink scheme if needed
                          const url = signerStatus.approval_url;
                          if (!url) {
                            console.error("No approval URL found");
                            return;
                          }
                          console.log("Opening approval URL:", url);

                          try {
                            // Try SDK Action first (if in mini-app)
                            // Replace strictly as per reference if it matches the pattern
                            const targetUrl = url.includes('client.farcaster.xyz')
                              ? url.replace('https://client.farcaster.xyz/deeplinks/signed-key-request', 'https://farcaster.xyz/~/connect')
                              : url;

                            if ((window as any).farcaster?.actions?.openUrl) {
                              await (window as any).farcaster.actions.openUrl(targetUrl);
                            } else {
                              window.open(targetUrl, '_blank');
                            }
                          } catch (e) {
                            console.error("Open URL failed", e);
                            window.open(url, '_blank'); // Fallback
                            toast("Redirect failed: " + (e as any).message, "ERROR");
                          }
                        }}
                        className="w-full py-3 bg-yellow-500 text-black font-pixel text-sm hover:bg-yellow-400 animate-pulse"
                      >
                        TAP TO APPROVE ACCESS
                      </button>
                    ) : (
                      <button
                        onClick={async () => {
                          setIsLoading(true);
                          toast("Requesting Access...", "PROCESS");
                          await createSigner();
                          setIsLoading(false);
                        }}
                        className="w-full py-2 border border-dashed border-gray-600 text-gray-400 font-pixel text-xs hover:border-white hover:text-white"
                        disabled={isLoading}
                      >
                        {isLoading ? 'GENERATING...' : 'REQUEST PERMISSION'}
                      </button>
                    )}
                  </div>
                )}

                {/* INPUT */}
                <div className="relative group">
                  <textarea
                    value={castText}
                    onChange={(e) => setCastText(e.target.value)}
                    disabled={status !== 'IDLE'}
                    placeholder="TYPE YOUR ECHO..."
                    className="w-full h-32 bg-black border-2 border-gray-800 p-4 font-mono text-white focus:border-primary focus:outline-none resize-none"
                    maxLength={MAX_CHARS} // Changed to MAX_CHARS for consistency
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

                {/* SUBMIT BUTTON */}
                <button
                  onClick={handlePublish}
                  disabled={!isValid || status !== 'IDLE'}
                  className={`relative w-full py-4 font-pixel text-sm uppercase transition-all ${isValid && status === 'IDLE'
                    ? 'bg-primary text-white hover:brightness-110 shadow-[0_0_10px_theme(\'colors.primary\')]'
                    : 'bg-gray-900 text-gray-600 cursor-not-allowed border border-gray-800'
                    }`}
                >
                  {status === 'IDLE' ? (isValid ? 'TRANSMIT_CAST' : 'AWAITING_INPUT') : status === 'PUBLISHING' ? 'BROADCASTING...' : 'VERIFYING...'}
                </button>
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
