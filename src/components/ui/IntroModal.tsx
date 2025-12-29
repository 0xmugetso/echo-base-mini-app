import React, { useEffect, useState, useMemo } from "react";
import Image from "next/image";
import { RetroStatBox } from "./tabs/HomeTab";
import { RetroWindow } from "./RetroWindow";
import { RetroBanner } from "./RetroBanner";
import { PixelShareIcon } from "./PixelShareIcon";
import { PixelMintIcon } from "./PixelMintIcon";
import { useWriteContract, usePublicClient, useAccount } from "wagmi";
import { readContract } from "viem/actions";
import { parseEther, getAddress } from "viem";
import { base } from "viem/chains";
import { createPortal } from "react-dom";
import * as htmlToImage from 'html-to-image';
import { useMiniApp } from "@neynar/react";
import { useNeynarSigner } from "../../hooks/useNeynarSigner";
import { AURA_CONTRACT_ADDRESS, AURA_ABI } from "../../lib/contracts";
import { useToast } from "./ToastProvider";

const EyeIcon = ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M1 12C1 12 5 4 12 4C19 4 23 12 23 12C23 12 19 20 12 20C5 20 1 12 1 12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);

type IntroModalProps = {
    isOpen: boolean;
    onClose: () => void;
    baseStats: any;
    neynarUser: any;
    loading: boolean;
};

const CardHeader = React.memo(({ neynarUser }: { neynarUser: any }) => (
    <div className="window">
        <div className="window-header">
            <div className="flex items-center gap-2"><span>ECHO_OS_V1.0</span></div>
            <div className="flex gap-1"><div className="w-2 h-2 bg-white"></div><div className="w-2 h-2 bg-white"></div></div>
        </div>
        <div className="window-content bg-black flex items-center gap-4 p-3 border-2 border-t-0 border-white">
            {neynarUser?.pfp_url ? (
                <img src={neynarUser.pfp_url} crossOrigin="anonymous" className="w-12 h-12 border-2 border-white grayscale contrast-125" />
            ) : (
                <div className="w-12 h-12 border-2 border-white bg-primary"></div>
            )}
            <div>
                <p className="text-white text-base font-bold uppercase tracking-widest leading-none font-pixel">{neynarUser?.username || "ANON"}</p>
                <p className="text-primary text-xs font-mono mt-1">FID: {neynarUser?.fid || "---"}</p>
            </div>
        </div>
    </div>
));

export function IntroModal({ isOpen, onClose, baseStats, neynarUser, loading }: IntroModalProps) {
    // --- STATE ---
    const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);
    const [isMinting, setIsMinting] = useState(false);
    const [mounted, setMounted] = useState(false);
    const [calculatedPoints, setCalculatedPoints] = useState<number | null>(null);
    const [previewImage, setPreviewImage] = useState<string | null>(null);

    // Referral State
    const [inviteCode, setInviteCode] = useState<string[]>(new Array(6).fill(''));
    const [isReclaiming, setIsReclaiming] = useState(false);
    const [inviteStatus, setInviteStatus] = useState<'idle' | 'validating' | 'success' | 'invalid'>('idle');
    const [isNewUser, setIsNewUser] = useState(true);

    // --- HOOKS ---
    const { signerStatus, checkStatus } = useNeynarSigner();
    const { sdk } = useMiniApp() as any;
    const { writeContractAsync } = useWriteContract();
    const publicClient = usePublicClient();
    const { toast } = useToast();
    const { address: connectedAddress } = useAccount(); // Wagmi connected address
    // --- EFFECTS ---
    useEffect(() => {
        setMounted(true);
        let interval: NodeJS.Timeout;
        if (signerStatus.status === 'pending_approval' && signerStatus.signer_uuid) {
            interval = setInterval(async () => {
                const isApproved = await checkStatus(signerStatus.signer_uuid);
                if (isApproved) clearInterval(interval);
            }, 2000);
        }
        return () => {
            setMounted(false);
            clearInterval(interval);
        }
    }, [signerStatus.status, signerStatus.signer_uuid, checkStatus]);

    // Check if user already exists
    useEffect(() => {
        if (neynarUser?.fid) {
            fetch(`/api/echo/profile?fid=${neynarUser.fid}`)
                .then(r => r.json())
                .then(data => {
                    if (data && data.fid) {
                        setIsNewUser(false);
                    }
                })
                .catch(e => console.error("Profile check error", e));
        }
    }, [neynarUser?.fid]);

    // Handle Deep Link Invite Code
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const code = params.get('invite') || params.get('referral');
        if (code && code.length === 6) {
            const arr = code.toUpperCase().split('').slice(0, 6);
            setInviteCode(arr);
            setInviteStatus('success'); // Assume success if coming from link for now
        }
    }, []);

    const validateInvite = async (codeArr: string[]) => {
        const fullCode = codeArr.join('').toUpperCase();
        if (fullCode.length < 6) return;

        setInviteStatus('validating');
        try {
            // Check if code exists on bankend
            const res = await fetch(`/api/echo/profile?checkCode=${fullCode}`);
            const data = await res.json();
            if (data.exists) {
                setInviteStatus('success');
            } else {
                setInviteStatus('invalid');
                setTimeout(() => setInviteStatus('idle'), 2000);
            }
        } catch (e) {
            setInviteStatus('invalid');
            setTimeout(() => setInviteStatus('idle'), 2000);
        }
    };

    const handleInputChange = (val: string, index: number) => {
        const newCode = [...inviteCode];
        newCode[index] = val.toUpperCase().slice(-1);
        setInviteCode(newCode);

        // Move to next input
        if (val && index < 5) {
            const next = document.getElementById(`ref-input-${index + 1}`);
            next?.focus();
        }

        if (newCode.every(char => char !== '')) {
            validateInvite(newCode);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
        if (e.key === 'Backspace' && !inviteCode[index] && index > 0) {
            const prev = document.getElementById(`ref-input-${index - 1}`);
            prev?.focus();
        }
    };

    // Step 2 Loader Logic
    const [loadProgress, setLoadProgress] = useState(0);
    useEffect(() => {
        if (step !== 2) return;
        setLoadProgress(0);
        let current = 0;
        const interval = setInterval(() => {
            const isWaiting = loading || !baseStats;
            const target = isWaiting ? 90 : 100;
            if (current >= 100) {
                clearInterval(interval);
                setTimeout(() => setStep(3), 500);
            } else if (current < target) {
                const jump = Math.random() * 8;
                current = Math.min(current + jump, target);
                setLoadProgress(current);
            }
        }, 100);
        return () => clearInterval(interval);
    }, [step, loading, baseStats]);

    // Step 4 Calculation Logic
    useEffect(() => {
        if (step !== 4) return;
        const calculateProfile = async () => {
            if (!neynarUser?.fid || !neynarUser?.custody_address) return;
            try {
                const res = await fetch('/api/echo/profile', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        fid: neynarUser.fid,
                        username: neynarUser.username,
                        address: neynarUser.custody_address,
                        action: 'calculate',
                        referralCode: inviteCode.join('').toUpperCase(),
                        manualStats: JSON.parse(JSON.stringify(baseStats, (key, value) =>
                            typeof value === 'bigint' ? value.toString() : value
                        ))
                    })
                });
                const data = await res.json();
                if (data.profile) setCalculatedPoints(data.profile.points);
            } catch (e) {
                console.error("Calculation Error", e);
            }
        };
        setTimeout(calculateProfile, 1000);
    }, [step, neynarUser, baseStats]);

    // --- COUNT UP ANIMATION ---
    const useCountUp = (end: number, startAnim: boolean, duration: number = 2000) => {
        const [count, setCount] = useState(0);
        useEffect(() => {
            if (!startAnim) return;
            let startCount = 0;
            const increment = end / (duration / 30);
            const timer = setInterval(() => {
                startCount += increment;
                if (startCount >= end) {
                    setCount(end);
                    clearInterval(timer);
                } else {
                    setCount(startCount);
                }
            }, 30);
            return () => clearInterval(timer);
        }, [end, duration, startAnim]);
        return count;
    };

    const isStep3 = step === 3;
    const isStep4 = step === 4;
    const farcasterScore = neynarUser?.score || 0;
    const fcWalletValue = baseStats?.farcaster?.wallet_value_usd || 0;
    const castCount = baseStats?.farcaster?.cast_count || 0;
    const baseVolume = baseStats?.total_volume_usd || 0;
    const totalTx = baseStats?.total_tx || 0;
    const holdings = baseStats?.farcaster?.holdings || {};
    const walletAge = baseStats?.wallet_age_days ? Math.floor(baseStats.wallet_age_days) : 0;
    const biggestTx = baseStats?.biggest_single_tx || 0;
    const gasPaid = Number(baseStats?.total_fees_paid_wei || 0n) / 1e18;

    const animScore = useCountUp(farcasterScore, isStep3);
    const animWallet = useCountUp(fcWalletValue, isStep3);
    const animCastCount = useCountUp(castCount, isStep3);
    const animVolume = useCountUp(baseVolume, isStep3);
    const animTotalTx = useCountUp(totalTx, isStep3);
    const animBiggestTx = useCountUp(biggestTx, isStep3);
    const animGasPaid = useCountUp(gasPaid, isStep3);
    const animWalletAge = useCountUp(walletAge, isStep3);
    const animPoints = useCountUp(calculatedPoints || 0, isStep4 && calculatedPoints !== null);

    const formatNumber = (value?: number | null, digits = 0) => {
        if (value === null || value === undefined) return "—";
        return Number(value).toLocaleString(undefined, { maximumFractionDigits: digits, minimumFractionDigits: digits });
    };

    // --- ACTION HANDLERS ---
    const captureImage = async (download = false) => {
        // Use the persistent, off-screen capture target
        const templateNode = document.getElementById('nft-card-capture');
        if (!templateNode) {
            console.error("[Capture] Persistent capture template not found");
            return null;
        }

        // 1. CLONE for "Clean Capture"
        const clone = templateNode.cloneNode(true) as HTMLElement;

        // 2. STAGE the clone off-screen but FULLY RENDERED
        clone.id = 'stats-window-clone';
        clone.style.position = 'fixed';
        clone.style.top = '-9999px';
        clone.style.left = '-9999px';
        clone.style.zIndex = '9999';
        clone.style.display = 'block';
        clone.style.opacity = '1';
        clone.style.pointerEvents = 'none';
        clone.style.width = '380px';

        document.body.appendChild(clone);

        // 3. WAIT for basic render
        await new Promise(r => setTimeout(r, 200)); // Increased wait slightly

        try {
            // 4. CAPTURE
            const dataUrl = await htmlToImage.toPng(clone, {
                backgroundColor: '#000000',
                cacheBust: true,
                skipAutoScale: true,
                pixelRatio: 2,
                filter: (n: any) => !n.classList?.contains('exclude-capture'),
                fetchRequestInit: { mode: 'cors' } // Explicit CORS
            });

            if (download) {
                const link = document.createElement('a');
                link.download = `echo-stats-${neynarUser?.username || 'anon'}.png`;
                link.href = dataUrl;
                link.click();
            }
            return dataUrl;
        } catch (e: any) {
            console.error("[Capture] Error:", e.message);
            return null;
        } finally {
            if (document.body.contains(clone)) document.body.removeChild(clone);
        }
    };

    const uploadImage = async (dataUrl: string) => {
        try {
            const blob = await (await fetch(dataUrl)).blob();
            const filename = `echo-${Date.now()}.png`;
            const res = await fetch(`/api/upload?filename=${filename}`, { method: 'POST', body: blob });
            if (!res.ok) return null;
            const json = await res.json();
            return json.url;
        } catch (e) {
            console.error("[Upload] Error:", e);
            return null;
        }
    }

    const handleMint = async () => {
        setIsMinting(true);
        try {
            const dataUrl = await captureImage(false);
            if (!dataUrl) throw new Error("Capture failed");

            const imgRes = await uploadImage(dataUrl);
            if (!imgRes) throw new Error("Upload failed");

            // 1. Determine Recipient (Connected Address > SDK user address > Custody address)
            const recipientAddress = connectedAddress || (sdk as any)?.context?.user?.address || neynarUser.custody_address;
            console.log("[Mint] Recipient:", recipientAddress);
            console.log("[Mint] Sources - Connected:", connectedAddress, "SDK:", (sdk as any)?.context?.user?.address, "Custody:", neynarUser.custody_address);

            // 2. Fetch Next Token ID from Contract
            let nextTokenId = 1;
            try {
                if (publicClient) {
                    const id = await publicClient.readContract({
                        address: AURA_CONTRACT_ADDRESS,
                        abi: AURA_ABI,
                        functionName: 'getNextTokenId',
                    }) as bigint;
                    nextTokenId = Number(id);
                    console.log("[Mint] Next Token ID from contract:", nextTokenId);
                }
            } catch (e) {
                console.error("[Mint] ID Fetch Error:", e);
            }

            // 3. Register NFT & Get URI
            // IMPORTANT: Send RAW STATS to avoid animation-zeroing issues
            const regRes = await fetch('/api/echo/profile', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    fid: neynarUser.fid,
                    address: recipientAddress,
                    action: 'register_nft',
                    nftImage: imgRes,
                    tokenId: nextTokenId,
                    // Snapshot Stats (Raw Values)
                    neynarScore: farcasterScore, // Raw
                    castCount: castCount, // Raw
                    totalTx: totalTx, // Raw
                    totalVolume: baseVolume, // Raw
                    gasPaid: gasPaid, // Raw
                    biggestTx: biggestTx, // Raw
                    username: neynarUser.username,
                    joinDate: baseStats?.first_tx_date
                })
            });
            const { tokenId } = await regRes.json();
            if (!tokenId) throw new Error("Metadata registration failed");

            // 4. Mint (Using new signature: mint(address to))
            let hash: string;

            if ((sdk as any)?.actions?.sendTransaction) {
                console.log("[Mint] Using SDK sendTransaction");
                const { encodeFunctionData } = await import('viem');
                const data = encodeFunctionData({
                    abi: AURA_ABI,
                    functionName: 'mint',
                    args: [getAddress(recipientAddress)],
                });

                console.log("[Mint] Data:", data);

                console.log("[Mint] Sending via SDK to:", AURA_CONTRACT_ADDRESS);
                const result = await (sdk as any).actions.sendTransaction({
                    chainId: base.id,
                    to: AURA_CONTRACT_ADDRESS,
                    data,
                    value: 0n,
                });
                if (!result?.hash) throw new Error("Minting cancelled or failed");
                hash = result.hash;
            } else {
                console.log("[Mint] Falling back to wagmi writeContractAsync");
                hash = await (writeContractAsync as any)({
                    address: AURA_CONTRACT_ADDRESS,
                    abi: AURA_ABI,
                    functionName: 'mint',
                    args: [getAddress(recipientAddress)],
                    value: 0n,
                });
            }

            console.log("MINT SUBMITTED: " + hash);
            toast("MINT SUCCESSFUL! CARD IS YOURS", "SUCCESS");
        } catch (e: any) {
            console.error("[Mint] Error:", e.message);
            toast("MINT FAILED: " + e.message, "ERROR");
        } finally { setIsMinting(false); }
    };

    const handleShare = async () => {
        const dataUrl = await captureImage(false);
        const imageUrl = dataUrl ? await uploadImage(dataUrl) : null;
        const text = `Verifying my Onchain History on Echo.\n\nScore: ${formatNumber(farcasterScore, 2)}\nVol: $${formatNumber(baseVolume, 0)}\n\n@echo`;
        const url = "https://echo-base-mini-app.vercel.app";
        let intentUrl = `https://warpcast.com/~/compose?text=${encodeURIComponent(text)}&embeds[]=${encodeURIComponent(url)}`;
        if (imageUrl) intentUrl += `&embeds[]=${encodeURIComponent(imageUrl)}`;
        if (sdk?.actions?.openUrl) sdk.actions.openUrl(intentUrl);
        else window.open(intentUrl, "_blank");
    }

    // --- SUB-COMPONENTS ---
    const StatsCardContent = ({ captureId }: { captureId?: string }) => (
        <div id={captureId} className="space-y-6 bg-black p-4 mx-auto" style={{ width: '100%', maxWidth: '380px' }}>
            <CardHeader neynarUser={neynarUser} />

            <RetroWindow title="BASE_ACTIVITY">
                <div className="flex flex-col gap-4">
                    <div className="grid grid-cols-2 gap-4">
                        <RetroStatBox label="BIGGEST TX" value={`$${formatNumber(animBiggestTx, 0)}`} />
                        <RetroStatBox label="GAS PAID" value={`${formatNumber(animGasPaid, 4)}`} subValue="ETH" />
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                        <RetroStatBox label="TX COUNT" value={formatNumber(animTotalTx)} />
                        <RetroStatBox label="VOLUME" value={`$${formatNumber(animVolume, 0)}`} />
                        <RetroStatBox label="AGE" value={`${formatNumber(animWalletAge, 0)}`} subValue="DAYS" />
                    </div>
                </div>
            </RetroWindow>

            <RetroWindow title="FARCASTER_METRICS">
                <div className="flex flex-col gap-4">
                    <div className="grid grid-cols-2 gap-4">
                        <RetroStatBox label="SCORE" value={formatNumber(animScore, 2)} />
                        <RetroStatBox label="TOTAL CASTS" value={formatNumber(animCastCount)} />
                    </div>
                    <div className="border border-dashed border-white/30 p-4 relative bg-black">
                        <span className="absolute -top-3 left-3 bg-black px-2 text-[10px] text-primary font-bold border border-white/30 uppercase">TOP_CAST.LOG</span>
                        {baseStats?.farcaster?.best_cast ? (
                            <div className="mt-2 text-left">
                                <p className="text-xs text-gray-300 italic line-clamp-3 leading-relaxed">"{baseStats.farcaster.best_cast.text}"</p>
                                <div className="flex gap-4 mt-3 text-[8px] text-gray-500 font-mono border-t border-white/10 pt-2">
                                    <span>♥ LIKES: {baseStats.farcaster.best_cast.likes}</span>
                                    <span>↻ RECASTS: {baseStats.farcaster.best_cast.recasts}</span>
                                </div>
                            </div>
                        ) : <p className="text-[10px] text-gray-600 text-center py-2">NO_DATA</p>}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        <div className="border border-dashed border-white/50 p-2 bg-white/5">
                            <p className="text-[8px] text-gray-500 mb-1 uppercase">TOKENS</p>
                            <div className="flex flex-wrap gap-1">
                                {['clanker', 'toshi', 'degen', 'brett'].map(t => (
                                    <span key={t} className={`text-[6px] border px-0.5 ${holdings?.[t] ? 'border-primary text-primary bg-primary/10' : 'border-dashed border-gray-800 text-gray-800'}`}>{t.toUpperCase()}</span>
                                ))}
                            </div>
                        </div>
                        <div className="border border-dashed border-white/50 p-2 bg-white/5">
                            <p className="text-[8px] text-gray-500 mb-1 uppercase">NFTS</p>
                            <div className="flex flex-wrap gap-1">
                                {['warplets', 'pro_og', 'punk', 'bankr'].map(t => (
                                    <span key={t} className={`text-[6px] border px-0.5 ${holdings?.[t + '_club'] || holdings?.[t] ? 'border-yellow-500 text-yellow-500 bg-yellow-500/10' : 'border-dashed border-gray-800 text-gray-800'}`}>{t.toUpperCase()}</span>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </RetroWindow>
        </div>
    );

    const ProgressBar = () => (
        <div className="w-full flex items-center justify-center gap-2 mb-4 relative z-50">
            {[1, 2, 3, 4, 5].map(s => (
                <div key={s} onClick={() => s < step ? setStep(s as any) : null}
                    className={`h-2 border border-white transition-all duration-300 ${s === step ? 'w-12 bg-white' : 'w-6 bg-white/20'} ${s < step ? 'bg-primary border-primary cursor-pointer' : ''}`}
                />
            ))}
        </div>
    );

    const renderStep1 = () => (
        <div className="flex flex-col h-full bg-black text-white p-6 items-center justify-center relative overflow-hidden">
            <h1 className="text-7xl font-pixel text-white mb-2 tracking-widest z-10" style={{ textShadow: '4px 4px 0 #000, -2px -2px 0 #4d4dff' }}>ECHO</h1>
            <p className="font-pixel text-lg text-primary mb-8 animate-pulse z-10 uppercase">UNCOVER YOUR ONCHAIN LEGACY</p>
            <div className="w-full max-w-xs space-y-6 z-10">
                <div className="bg-black border-2 border-primary relative shadow-[4px_4px_0_0_theme('colors.primary')] p-1">
                    <div className="bg-primary px-2 py-1 flex justify-between items-center mb-1">
                        <span className="font-bold text-[10px] text-white uppercase">IDENTITY_MODULE</span>
                        {isNewUser && (
                            <div className="bg-white text-black px-1 text-[8px] font-bold animate-pulse">NEW_USER_DETECTED</div>
                        )}
                    </div>
                    <div className="border border-white/20 p-4 flex flex-col items-center gap-2 bg-[#08081a]">
                        <div className="w-16 h-16 border-2 border-white overflow-hidden relative grayscale contrast-125">
                            {neynarUser?.pfp_url ? <img src={neynarUser.pfp_url} className="w-full h-full object-cover" /> : <div className="w-full h-full bg-white/10" />}
                        </div>
                        <div className="text-center">
                            <p className="font-pixel text-xl text-white uppercase leading-none">{neynarUser?.username || "ANON"}</p>
                            <p className="font-mono text-[8px] text-gray-400 mt-1 uppercase">FID: {neynarUser?.fid || "---"}</p>
                        </div>
                    </div>
                </div>

                {isNewUser && (
                    <div className="space-y-3">
                        <div className="text-center">
                            <p className="font-pixel text-[10px] text-primary mb-2 uppercase tracking-tight">ENTER_INVITE_CODE_FOR_+20_PTS</p>
                            <div className="flex justify-center gap-1">
                                {inviteCode.map((char, i) => {
                                    const isSuccess = inviteStatus === 'success';
                                    const isInvalid = inviteStatus === 'invalid';
                                    return (
                                        <input
                                            key={i}
                                            id={`ref-input-${i}`}
                                            type="text"
                                            maxLength={1}
                                            value={char}
                                            onChange={(e) => handleInputChange(e.target.value, i)}
                                            onKeyDown={(e) => handleKeyDown(e, i)}
                                            className={`w-10 h-12 bg-black border-2 text-center font-pixel text-xl transition-all duration-300 outline-none
                                                ${isSuccess ? 'border-primary text-primary shadow-primary shadow-sm animate-bounce' :
                                                    isInvalid ? 'border-red-500 text-red-500 animate-shake' :
                                                        'border-white/30 text-white focus:border-primary'}`}
                                            style={{ animationDelay: `${i * 0.1}s` }}
                                        />
                                    );
                                })}
                            </div>
                        </div>
                        <div className="text-[7px] font-mono text-gray-500 text-center uppercase leading-tight italic">
                            <p>* Bonuses activate after your first Echo transaction.</p>
                            <p>referrals help you and your friends climb the leaderboard.</p>
                        </div>
                    </div>
                )}

                <button onClick={() => setStep(2)} className="btn btn-primary w-full py-4 text-xl shadow-[4px_4px_0_0_theme('colors.primary')] font-pixel uppercase">INITIALIZE {'>'}</button>
            </div>
            <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'linear-gradient(#222 1px, transparent 1px), linear-gradient(90deg, #222 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
        </div>
    );

    const renderStep2 = () => (
        <div className="flex flex-col h-full bg-black text-white p-8 items-center justify-center space-y-8">
            <div className="space-y-4 text-center">
                <h2 className="text-3xl font-pixel animate-pulse">SYSTEM_SCANNING</h2>
                <p className="font-mono text-xs text-gray-500 uppercase tracking-widest">ACCESSING BASE_CHAIN...</p>
            </div>
            <div className="w-full max-w-xs border-4 border-white p-2 bg-black shadow-[8px_8px_0_0_#fff]">
                <div className="h-6 w-full flex gap-1">
                    {Array.from({ length: 20 }).map((_, i) => (
                        <div key={i} className={`flex-1 h-full ${loadProgress > (i * 5) ? 'bg-primary' : 'bg-[#111]'}`} />
                    ))}
                </div>
            </div>
            <div className="h-4 font-mono text-[10px] text-gray-400 uppercase">
                {loadProgress < 30 ? "> INIT_CONNECTION..." :
                    loadProgress < 60 ? "> READING_ONCHAIN_DATA..." :
                        loadProgress < 90 ? "> ANALYZING_FARCASTER_GRAPH..." :
                            "> SYNCHRONIZING_ASSETS..."}
            </div>
        </div>
    );

    const renderStep3 = () => (
        <div className="flex flex-col h-full bg-black relative">
            <div className="p-4 flex flex-col items-center border-b border-white/10"><span className="font-pixel text-2xl tracking-widest text-white uppercase">YOUR STATS</span></div>
            <div className="flex-1 overflow-y-auto pb-24"><StatsCardContent captureId="nft-card" /></div>
            <div className="absolute top-4 right-4 z-50">
                <button onClick={onClose} className="text-white font-mono text-[10px] bg-black border border-white px-2 py-1 uppercase">[ X ]</button>
            </div>
            <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-white/20 bg-black z-20">
                <button onClick={() => setStep(4)} className="btn btn-primary w-full py-4 text-lg font-pixel uppercase tracking-tight">CALCULATE ECHO {'>'}</button>
            </div>
        </div>
    );

    const renderStep4 = () => (
        <div className="flex flex-col h-full bg-black text-white items-center justify-center p-6 relative">
            <div className="text-center space-y-8 z-10 w-full max-w-sm">
                <h2 className="text-3xl font-pixel animate-pulse uppercase">CALCULATING_ECHO</h2>
                <div className="border-4 border-white bg-black p-8 shadow-[8px_8px_0_0_theme('colors.primary')]">
                    <p className="font-mono text-xs text-gray-400 mb-2 uppercase">INITIAL_POINTS</p>
                    <div className="text-8xl font-pixel text-primary">{Math.floor(animPoints)}</div>
                </div>
                {calculatedPoints !== null && (
                    <button onClick={() => setStep(5)} className="btn btn-primary w-full py-4 text-xl shadow-[4px_4px_0_0_theme('colors.primary')] font-pixel uppercase">ENTER ECHO OS {'>'}</button>
                )}
                <button onClick={onClose} className="text-gray-500 font-mono text-[10px] uppercase underline hover:text-white">[ ABORT_PROCESS ]</button>
            </div>
        </div>
    );

    const renderStep5 = () => (
        <div className="flex flex-col h-full bg-black p-6 relative items-center justify-center">
            <h1 className="text-7xl font-pixel text-white mb-2 tracking-widest z-10 uppercase">ECHO</h1>
            <p className="font-pixel text-[10px] text-gray-400 mb-6 text-center max-w-xs z-10 uppercase leading-relaxed">IMMORTALIZE YOUR STATUS.<br />MINT YOUR LEGACY OR SHARE TO FLEX.</p>
            <div className="w-full max-w-sm mb-8 z-10"><RetroBanner src="/assets/banner-modal.JPG" alt="Echo Banner" /></div>
            <div className="w-full max-w-sm flex flex-col gap-4 z-10">
                <div className="grid grid-cols-2 gap-4">
                    <button onClick={handleShare} className="group border-2 border-white bg-black p-3 flex flex-col items-center gap-1 hover:bg-white hover:text-black transition-all shadow-[4px_4px_0_0_#fff]">
                        <PixelShareIcon className="w-6 h-6" /><span className="font-pixel text-sm uppercase">SHARE</span>
                    </button>
                    <button onClick={handleMint} disabled={isMinting} className="group border-2 border-primary bg-black p-3 flex flex-col items-center gap-1 hover:bg-primary hover:text-white transition-all shadow-[4px_4px_0_0_theme('colors.primary')]">
                        <PixelMintIcon className="w-6 h-6 text-primary group-hover:text-white" /><span className="font-pixel text-sm text-white uppercase">{isMinting ? "..." : "MINT"}</span>
                    </button>
                </div>
                <button onClick={async () => { const dataUrl = await captureImage(false); if (dataUrl) setPreviewImage(dataUrl); }} className="w-full flex items-center justify-center gap-2 border border-white/20 py-2 font-mono text-[10px] text-gray-400 hover:text-white hover:border-white transition-colors uppercase">
                    <EyeIcon className="w-3 h-3" /> PREVIEW ECHO_CARD
                </button>
            </div>
            <button onClick={onClose} className="absolute bottom-6 text-[10px] font-mono text-gray-600 hover:text-white uppercase">[ CLOSE_TERMINAL ]</button>
            {/* Template for capture (hidden normally, cloned during capture) */}
            <div style={{ position: 'absolute', top: 0, left: 0, opacity: 0, pointerEvents: 'none', zIndex: -100 }}>
                <StatsCardContent captureId="stats-window" />
            </div>
            {previewImage && (
                <div className="fixed inset-0 z-[100000] bg-black/98 flex flex-col items-center justify-center p-4 backdrop-blur-sm">
                    <div className="relative w-full max-w-[340px] border-2 border-white bg-black p-1 shadow-[8px_8px_0_0_#fff]">
                        <button onClick={() => setPreviewImage(null)} className="absolute -top-12 right-0 text-white font-pixel text-xs bg-black border-2 border-white px-3 py-1 uppercase hover:bg-white hover:text-black transition-colors">CLOSE_PREVIEW [X]</button>
                        <div className="max-h-[60vh] overflow-y-auto">
                            <img src={previewImage} className="w-full h-auto" />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );

    if (!isOpen || !mounted) return null;

    return createPortal(
        <div className="fixed inset-0 z-[99999] bg-black flex flex-col overflow-hidden">
            <div className="pt-6 px-4 pb-2 z-30"><ProgressBar /></div>
            <div className="flex-1 relative overflow-hidden">
                {step === 1 && renderStep1()}
                {step === 2 && renderStep2()}
                {step === 3 && renderStep3()}
                {step === 4 && renderStep4()}
                {step === 5 && renderStep5()}
            </div>
            <div className="fixed -left-[2000px] top-0 pointer-events-none" aria-hidden="true">
                <StatsCardContent captureId="nft-card-capture" />
            </div>
        </div>,
        document.body
    );
}

export default IntroModal;
