import React, { useEffect, useState } from "react";
import Image from "next/image";
import { RetroStatBox } from "./tabs/HomeTab";
import { RetroWindow } from "./RetroWindow";
import { RetroBanner } from "./RetroBanner";
import { PixelShareIcon } from "./PixelShareIcon";
import { PixelMintIcon } from "./PixelMintIcon";
import { useWriteContract } from "wagmi";
import { parseEther, getAddress } from "viem";
import { createPortal } from "react-dom";
import * as htmlToImage from 'html-to-image';
import { useMiniApp } from "@neynar/react";
import { useNeynarSigner } from "../../hooks/useNeynarSigner";
import { AURA_CONTRACT_ADDRESS, AURA_ABI } from "../../lib/contracts";

type IntroModalProps = {
    isOpen: boolean;
    onClose: () => void;
    baseStats: any;
    neynarUser: any;
    loading: boolean;
};

export function IntroModal({ isOpen, onClose, baseStats, neynarUser, loading }: IntroModalProps) {
    // --- STATE ---
    const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);
    const [isMinting, setIsMinting] = useState(false);
    const [isCasting, setIsCasting] = useState(false);
    const [mounted, setMounted] = useState(false);
    const [calculatedPoints, setCalculatedPoints] = useState<number | null>(null);
    const [pointsParam, setPointsParam] = useState(0);

    // --- HOOKS ---
    const { signerStatus, createSigner, checkStatus } = useNeynarSigner();
    const { sdk } = useMiniApp() as any;
    const { writeContractAsync } = useWriteContract();

    // --- EFFECTS ---
    useEffect(() => {
        setMounted(true);
        // Polling (kept generic)
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

    // Step 2 Loader Logic (Data Dependent)
    const [loadProgress, setLoadProgress] = useState(0);
    useEffect(() => {
        if (step !== 2) return;
        setLoadProgress(0);

        let current = 0;
        const interval = setInterval(() => {
            // Check if we are waiting for data
            const isWaiting = loading || !baseStats;

            // If waiting, cap at 90%
            const target = isWaiting ? 90 : 100;

            if (current >= 100) {
                clearInterval(interval);
                setTimeout(() => setStep(3), 500);
            } else if (current < target) {
                // Random jump
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

        const calculate = async () => {
            if (!neynarUser?.fid || !neynarUser?.custody_address) return;

            try {
                const res = await fetch('/api/echo/profile', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        fid: neynarUser.fid,
                        address: neynarUser.custody_address,
                        action: 'calculate',
                        manualStats: JSON.parse(JSON.stringify(baseStats, (key, value) =>
                            typeof value === 'bigint'
                                ? value.toString()
                                : value // return everything else unchanged
                        ))
                    })
                });
                const data = await res.json();
                if (data.profile) {
                    setCalculatedPoints(data.profile.points);
                }
            } catch (e) {
                console.error("Calculation Error", e);
            }
        };

        // Small delay to start animation
        setTimeout(calculate, 1000);
    }, [step, neynarUser]);

    // --- COUNT UP ANIMATION ---
    const useCountUp = (end: number, startAnim: boolean, duration: number = 2000) => {
        const [count, setCount] = useState(0);
        useEffect(() => {
            if (!startAnim) return;
            let start = 0;
            const increment = end / (duration / 30);
            const timer = setInterval(() => {
                start += increment;
                if (start >= end) {
                    setCount(end);
                    clearInterval(timer);
                } else {
                    setCount(start);
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
    const baseVolume = baseStats?.total_volume_usd || 0;
    const totalTx = baseStats?.total_tx || 0;
    const holdings = baseStats?.farcaster?.holdings || {};
    const walletAge = baseStats?.wallet_age_days ? Math.floor(baseStats.wallet_age_days) : 0;
    const biggestTx = baseStats?.biggest_single_tx || 0;
    const gasPaid = Number(baseStats?.total_fees_paid_wei || 0n) / 1e18;

    const animScore = useCountUp(farcasterScore, isStep3);
    const animWallet = useCountUp(fcWalletValue, isStep3);
    const animVolume = useCountUp(baseVolume, isStep3);
    const animTotalTx = useCountUp(totalTx, isStep3);
    const animBiggestTx = useCountUp(biggestTx, isStep3);
    const animGasPaid = useCountUp(gasPaid, isStep3);
    const animWalletAge = useCountUp(walletAge, isStep3);

    // Step 4 Points Animation
    const animPoints = useCountUp(calculatedPoints || 0, isStep4 && calculatedPoints !== null);

    // --- HELPERS ---
    const formatNumber = (value?: number | null, digits = 0) => {
        if (value === null || value === undefined) return "—";
        return Number(value).toLocaleString(undefined, { maximumFractionDigits: digits, minimumFractionDigits: digits });
    };

    // --- ACTION HANDLERS ---
    const captureImage = async (download = false) => {
        const node = document.getElementById('nft-card');
        try {
            if (node) {
                const dataUrl = await htmlToImage.toPng(node, { backgroundColor: '#000' });
                if (download) {
                    const link = document.createElement('a');
                    link.download = `echo-stats-${neynarUser?.username || 'anon'}.png`;
                    link.href = dataUrl;
                    link.click();
                }
                return dataUrl;
            }
        } catch (e) {
            console.error(e);
            return null;
        }
        return null;
    }

    const uploadImage = async (dataUrl: string) => {
        try {
            const blob = await (await fetch(dataUrl)).blob();
            const filename = `echo-${Date.now()}.png`;
            const res = await fetch(`/api/upload?filename=${filename}`, { method: 'POST', body: blob });
            if (!res.ok) return null;
            const json = await res.json();
            return json.url;
        } catch { return null; }
    }

    const handleMint = async () => {
        setIsMinting(true);
        try {
            // 1. Capture & Upload Image
            const dataUrl = await captureImage(false);
            if (!dataUrl) throw new Error("Image capture failed");

            const uploadRes = await uploadImage(dataUrl);
            if (!uploadRes) throw new Error("Upload failed");

            // 2. Mint on Highlight (Standard Mint)
            // Assumes Open Edition
            const hash = await writeContractAsync({
                address: "0xYOUR_HIGHLIGHT_CONTRACT_ADDRESS", // Placeholder
                abi: [{
                    inputs: [{ name: "recipient", type: "address" }],
                    name: "mintOne", // Adjust based on actual contract
                    outputs: [{ name: "tokenId", type: "uint256" }],
                    stateMutability: "payable",
                    type: "function"
                }],
                functionName: 'mintOne',
                args: [getAddress(neynarUser.custody_address)],
                value: parseEther("0.000777"), // Optional fee
            });

            // 3. Link Token ID to Profile (Server-side)
            // We need to listen for event or assume sequential?
            // Safer: Call backend to "claim mint" and pass the image URL.
            // Backend can verify ownership later or we update generic "pending" status.

            await fetch('/api/echo/profile', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    fid: neynarUser.fid,
                    action: 'register_nft',
                    nftImage: uploadRes
                })
            });

            alert("MINT SUBMITTED: " + hash);
        } catch (e) {
            console.error(e);
            alert("MINT FAILED");
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

    const handleCast = async () => {
        handleShare();
    }

    // --- RENDER STEPS ---

    // REDESIGNED PROGRESS NAV - Top aligned, minimal overlay
    const ProgressBar = () => (
        <div className="w-full flex items-center justify-center gap-2 mb-4 relative z-50">
            {[1, 2, 3, 4, 5].map(s => (
                <div key={s}
                    onClick={() => s < step ? setStep(s as any) : null}
                    className={`h-2 border border-white transition-all duration-300 ${s === step ? 'w-12 bg-white' : 'w-6 bg-white/20'} ${s < step ? 'bg-primary border-primary cursor-pointer' : ''}`}
                />
            ))}
        </div>
    );

    const renderStep1 = () => (
        <div className="flex flex-col h-full bg-black text-white p-6 relative overflow-hidden items-center justify-center">
            {/* BIG WHITE ECHO TITLE */}
            <h1 className="text-7xl font-pixel text-white mb-2 tracking-widest relative z-10" style={{ textShadow: '4px 4px 0 #000, -2px -2px 0 #4d4dff' }}>
                ECHO
            </h1>
            <p className="font-pixel text-lg text-primary mb-8 tracking-wider text-center animate-pulse relative z-10">
                UNCOVER YOUR ONCHAIN LEGACY
            </p>

            <div className="flex flex-col items-center space-y-8 z-10 w-full max-w-xs">
                {/* Identity Card - Using RetroWindow Look */}
                <div className="w-full bg-black border-2 border-primary relative shadow-[4px_4px_0_0_theme('colors.primary')] p-1">
                    <div className="bg-primary px-2 py-1 flex justify-between items-center mb-1">
                        <span className="font-bold text-xs text-white uppercase tracking-wider">IDENTITY_MODULE</span>
                        <div className="flex gap-1">
                            <div className="w-2 h-2 bg-white rounded-full" />
                            <div className="w-2 h-2 bg-white/50 rounded-full" />
                        </div>
                    </div>

                    <div className="border border-white/20 p-6 flex flex-col items-center gap-4 bg-[#08081a]">
                        <div className="w-24 h-24 border-2 border-white overflow-hidden relative shadow-[0_0_15px_rgba(255,255,255,0.2)]">
                            {neynarUser?.pfp_url ? (
                                <img src={neynarUser.pfp_url} className="w-full h-full object-cover grayscale contrast-125" />
                            ) : (
                                <div className="w-full h-full bg-white/10 flex items-center justify-center text-xs">NO IMG</div>
                            )}
                            {/* Corner Accents */}
                            <div className="absolute top-0 left-0 w-2 h-2 border-t-2 border-l-2 border-white" />
                            <div className="absolute top-0 right-0 w-2 h-2 border-t-2 border-r-2 border-white" />
                            <div className="absolute bottom-0 left-0 w-2 h-2 border-b-2 border-l-2 border-white" />
                            <div className="absolute bottom-0 right-0 w-2 h-2 border-b-2 border-r-2 border-white" />
                        </div>

                        <div className="text-center">
                            <p className="font-pixel text-2xl uppercase mb-1 text-white">{neynarUser?.username || "ANON"}</p>
                            <div className="flex items-center gap-2 justify-center bg-white/5 border border-dashed border-white/20 px-3 py-1 rounded-full">
                                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                                <p className="font-mono text-[10px] text-gray-400">{neynarUser?.custody_address?.slice(0, 6)}...{neynarUser?.custody_address?.slice(-4)}</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="w-full space-y-3">
                    <button
                        onClick={() => setStep(2)}
                        className="btn btn-primary w-full py-4 text-xl border-2 hover:bg-primary/80 transition-all font-pixel uppercase tracking-widest shadow-[4px_4px_0_0_theme('colors.primary')]"
                    >
                        INITIALIZE SYSTEM {'>'}
                    </button>

                    <button
                        onClick={() => alert("Please switch accounts in your Farcaster client.")}
                        className="w-full py-2 text-center font-mono text-[10px] text-gray-500 hover:text-white uppercase decoration-dashed underline"
                    >
                        SWITCH ACCOUNT
                    </button>
                </div>
            </div>

            {/* Background Grid */}
            <div className="absolute inset-0 opacity-20 pointer-events-none"
                style={{ backgroundImage: 'linear-gradient(#222 1px, transparent 1px), linear-gradient(90deg, #222 1px, transparent 1px)', backgroundSize: '40px 40px' }}>
            </div>
        </div>
    );

    const renderStep2 = () => (
        <div className="flex flex-col h-full bg-black text-white p-8 items-center justify-center space-y-12 relative overflow-hidden">
            <div className="space-y-4 text-center z-10">
                <h2 className="text-3xl font-pixel text-white animate-pulse">SYSTEM_SCANNING</h2>
                <p className="font-mono text-xs text-gray-400">ACCESSING BASE CHAIN HISTORY...</p>
            </div>

            {/* RETRO LOADING BAR - Redesigned */}
            <div className="w-full max-w-xs border-4 border-white p-2 bg-black z-10 shadow-[8px_8px_0_0_#4d4dff]">
                <div className="h-6 w-full flex gap-1">
                    {Array.from({ length: 20 }).map((_, i) => (
                        <div
                            key={i}
                            className={`flex-1 h-full transition-colors duration-75 ${loadProgress > (i * 5) ? 'bg-primary' : 'bg-[#111]'}`}
                        />
                    ))}
                </div>
            </div>

            {/* TERMINAL OUTPUT */}
            <div className="font-mono text-xs text-primary z-10 bg-black/50 p-4 border border-white/20 w-full max-w-xs h-32 overflow-hidden flex flex-col justify-end">
                {loadProgress > 10 && <p>{'>'} INIT_SEQUENCE_START...</p>}
                {loadProgress > 30 && <p>{'>'} CONNECTING_BASE_RPC... <span className="text-green-500">OK</span></p>}
                {loadProgress > 50 && <p>{'>'} PARSING_TX_HISTORY... <span className="text-green-500">OK</span></p>}
                {loadProgress > 70 && <p>{'>'} CALCULATING_SOCIAL_SCORE... <span className="text-green-500">OK</span></p>}
                {loadProgress > 90 && <p>{'>'} FINALIZING... <span className="animate-blink">_</span></p>}
            </div>
        </div>
    );

    const renderStep3 = () => (
        <div className="flex flex-col h-full bg-black relative">
            {/* Nav Header */}
            <div className="p-4 flex flex-col items-center bg-black z-10 border-b border-white/10 pb-2">
                <span className="font-pixel text-2xl text-white tracking-widest">YOUR STATS</span>
            </div>

            {/* Scrollable Content */}
            <div id="nft-card" className="flex-1 overflow-y-auto p-4 space-y-6 pb-24">

                {/* 0. IDENTITY HEADER (Mini) */}
                <div className="window">
                    <div className="window-header">
                        <div className="flex items-center gap-2">
                            <span>ECHO_OS_V1.0</span>
                        </div>
                        <div className="flex gap-1">
                            <div className="w-2 h-2 bg-white"></div>
                            <div className="w-2 h-2 bg-white"></div>
                        </div>
                    </div>
                    <div className="window-content bg-black flex items-center gap-4 p-3">
                        {neynarUser?.pfp_url ? (
                            <img src={neynarUser.pfp_url} alt="Profile" className="w-12 h-12 border-2 border-white grayscale contrast-125" />
                        ) : (
                            <div className="w-12 h-12 border-2 border-white bg-primary"></div>
                        )}
                        <div>
                            <p className="text-white text-base font-bold uppercase tracking-widest leading-none font-pixel">
                                {neynarUser?.username || "ANON"}
                            </p>
                            <p className="text-primary text-xs font-mono mt-1">FID: {neynarUser?.fid || "---"}</p>
                        </div>
                    </div>
                </div>

                {/* 1. BASE ACTIVITY WINDOW */}
                <RetroWindow title="BASE_ACTIVITY">
                    <div className="text-center font-mono text-[10px] text-gray-400 mb-4 border border-white/10 p-1">
                        CHECK YOUR ONCHAIN ACTIVITY<br /><span className="text-primary">DATA BROUGHT TO YOU BY ECHO</span>
                    </div>

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

                {/* 2. FARCASTER METRICS WINDOW */}
                <RetroWindow title="FARCASTER_METRICS">
                    <div className="text-center font-mono text-[10px] text-gray-400 mb-4 border border-white/10 p-1">
                        YOUR SOCIAL LAYER STATUS<br /><span className="text-primary">POWERED BY NEYNAR</span>
                    </div>

                    <div className="flex flex-col gap-4">
                        <div className="grid grid-cols-2 gap-4">
                            <RetroStatBox label="NEYNAR SCORE" value={formatNumber(animScore, 2)} />
                            <RetroStatBox label="FC WALLET ($)" value={`$${formatNumber(animWallet, 0)}`} />
                        </div>

                        {/* Best Cast Log */}
                        <div className="border border-dashed border-white/30 p-4 relative bg-[#0a0a0a]">
                            <span className="absolute -top-3 left-3 bg-black px-2 text-xs text-primary font-bold border border-white/30">TOP_CAST.LOG</span>
                            {baseStats?.farcaster?.best_cast ? (
                                <div className="mt-2">
                                    <p className="text-sm text-gray-200 italic line-clamp-3 leading-relaxed">&quot;{baseStats.farcaster.best_cast.text}&quot;</p>
                                    <div className="flex gap-4 mt-3 text-[10px] text-gray-400 font-mono border-t border-white/10 pt-2">
                                        <span className="flex items-center gap-1 text-white">♥ LIKES: <span className="text-gray-300">{baseStats.farcaster.best_cast.likes}</span></span>
                                        <span className="flex items-center gap-1 text-white">↻ RECASTS: <span className="text-gray-300">{baseStats.farcaster.best_cast.recasts}</span></span>
                                    </div>
                                </div>
                            ) : (
                                <p className="text-xs text-gray-500 text-center py-2">NO_CASTS_FOUND</p>
                            )}
                        </div>

                        {/* Token Cache */}
                        <div className="border border-dashed border-white/50 p-2 bg-white/5">
                            <p className="text-[10px] font-bold text-gray-500 mb-2 uppercase">TOKEN_CACHE</p>
                            <div className="flex flex-wrap gap-2">
                                {['clanker', 'toshi', 'degen', 'brett'].map(t => (
                                    <span key={t} className={`text-[8px] border px-1 ${holdings?.[t] ? 'border-primary text-primary bg-primary/10' : 'border-dashed border-gray-700 text-gray-700'}`}>{t.toUpperCase()}</span>
                                ))}
                            </div>
                        </div>

                        {/* NFT Cache */}
                        <div className="border border-dashed border-white/50 p-2 bg-white/5">
                            <p className="text-[10px] font-bold text-gray-500 mb-2 uppercase">NFT_COLLECTION</p>
                            <div className="flex flex-wrap gap-2">
                                {['warplets', 'pro_og', 'based_punk', 'bankr'].map(t => (
                                    <span key={t} className={`text-[8px] border px-1 ${holdings?.[t + '_club'] || holdings?.[t] ? 'border-yellow-500 text-yellow-500 bg-yellow-500/10' : 'border-dashed border-gray-700 text-gray-700'}`}>{t.toUpperCase()}</span>
                                ))}
                            </div>
                        </div>
                    </div>
                </RetroWindow>

            </div>

            {/* Next Button Footer */}
            <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-white/20 bg-black z-20">
                <button
                    onClick={() => setStep(4)}
                    className="btn btn-primary w-full py-4 text-lg"
                >
                    CALCULATE SIGMA {'>'}
                </button>
            </div>
        </div>
    );

    const renderStep4 = () => (
        <div className="flex flex-col h-full bg-black text-white items-center justify-center p-6 relative">
            <div className="text-center space-y-8 z-10 w-full max-w-sm">

                <h2 className="text-3xl font-pixel text-white uppercase tracking-widest animate-pulse">
                    CALCULATING_SIGMA
                </h2>

                <div className="relative border-4 border-white bg-black p-8 shadow-[8px_8px_0_0_theme('colors.primary')]">
                    <p className="font-mono text-xs text-center text-gray-400 mb-2">INITIAL_ECHO_POINTS</p>
                    <div className="text-8xl font-pixel text-center text-primary text-shadow-glow">
                        {Math.floor(animPoints)}
                    </div>
                    <p className="font-mono text-[10px] text-center text-gray-500 mt-2">BASED ON YOUR ONCHAIN ACTIVITY</p>
                </div>

                {calculatedPoints !== null && (
                    <button
                        onClick={() => setStep(5)}
                        className="btn btn-primary w-full py-4 text-xl border-2 hover:bg-primary/80 transition-all font-pixel uppercase tracking-widest shadow-[4px_4px_0_0_theme('colors.primary')]"
                    >
                        ENTER ECHO OS {'>'}
                    </button>
                )}
            </div>

            {/* Matrix Rain effect or grid */}
            <div className="absolute inset-0 opacity-10 pointer-events-none"
                style={{ backgroundImage: 'linear-gradient(#4d4dff 1px, transparent 1px), linear-gradient(90deg, #4d4dff 1px, transparent 1px)', backgroundSize: '20px 20px' }}>
            </div>
        </div>
    );

    const renderStep5 = () => (
        <div className="flex flex-col h-full bg-black p-6 relative items-center justify-center">

            <h1 className="text-7xl font-pixel text-white mb-2 tracking-widest relative z-10" style={{ textShadow: '4px 4px 0 #000, -2px -2px 0 #4d4dff' }}>
                ECHO
            </h1>
            <p className="font-pixel text-xs text-gray-400 mb-6 tracking-wide text-center max-w-xs relative z-10 uppercase">
                IMMORTALIZE YOUR STATUS.<br />MINT YOUR LEGACY OR SHARE TO FLEX.<br /><span className="text-white">START EXPLORING.</span>
            </p>

            <div className="w-full max-w-sm mb-8 z-10">
                <RetroBanner src="/assets/banner_skull.jpg" alt="Echo Banner" />
            </div>

            <div className="w-full max-w-sm flex flex-col gap-4 z-10">
                <div className="grid grid-cols-2 gap-4">
                    <button onClick={handleShare} className="group border-2 border-white bg-black p-3 flex flex-col items-center gap-1 hover:bg-white hover:text-black transition-all shadow-[4px_4px_0_0_#fff]">
                        <PixelShareIcon className="w-6 h-6" />
                        <span className="font-pixel text-base">SHARE</span>
                    </button>
                    <button onClick={handleMint} disabled={isMinting} className="group border-2 border-primary bg-black p-3 flex flex-col items-center gap-1 hover:bg-primary hover:text-white transition-all shadow-[4px_4px_0_0_theme('colors.primary')]">
                        <PixelMintIcon className="w-6 h-6 text-primary group-hover:text-white" />
                        <span className="font-pixel text-base text-white">{isMinting ? "..." : "MINT"}</span>
                    </button>
                </div>
            </div>

            <button onClick={onClose} className="absolute bottom-6 text-xs font-mono text-gray-600 hover:text-white text-center">
                [ CLOSE TERMINAL ]
            </button>
        </div>
    );

    if (!isOpen || !mounted) return null;

    return createPortal(
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black">
            {/* Full Screen Container */}
            <div className="w-full h-full flex flex-col relative overflow-hidden bg-black text-white">

                {/* PROGESS BAR (Always Top) */}
                <div className="pt-6 px-4 pb-2 bg-black z-30">
                    <ProgressBar />
                </div>

                {/* STEPS CONTENT */}
                <div className="flex-1 overflow-hidden relative">
                    {step === 1 && renderStep1()}
                    {step === 2 && renderStep2()}
                    {step === 3 && renderStep3()}
                    {step === 4 && renderStep4()}
                    {step === 5 && renderStep5()}
                </div>

                {/* Back button? */}
                {step > 1 && (
                    <button onClick={() => setStep(step - 1 as any)} className="absolute top-6 left-4 z-40 text-white/50 hover:text-white font-mono text-xs">
                        &lt;
                    </button>
                )}
            </div>
        </div>,
        document.body
    );
}

export default IntroModal;
