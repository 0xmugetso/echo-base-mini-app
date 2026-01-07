import { NextResponse } from 'next/server';
import { fetchUserCastCount } from '~/lib/neynar';
import dbConnect from '../../../../lib/db';
import EchoProfile from '../../../../models/EchoProfile';
import UserStats from '../../../../models/UserStats';
import EchoNFT from '../../../../models/EchoNFT';
import Counter from '../../../../models/Counter';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const fid = searchParams.get('fid');

    if (!fid) return NextResponse.json({ error: 'FID required' }, { status: 400 });

    try {
        await dbConnect();

        // 1. Check if referral code exists
        const checkCode = searchParams.get('checkCode');
        if (checkCode) {
            const referrer = await EchoProfile.findOne({ referralCode: checkCode.toUpperCase() });
            return NextResponse.json({ exists: !!referrer });
        }

        const profile = await EchoProfile.findOne({ fid: parseInt(fid) });

        // 2. Fetch Invitees if profile exists
        let invitees: any[] = [];
        if (profile) {
            invitees = await EchoProfile.find({ referredBy: profile.fid })
                .select('username fid referralStats')
                .limit(10) // Limit to 10 for performance
                .lean();
        }

        return NextResponse.json({
            ...(profile?.toObject() || { exists: false }),
            invitees
        });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { action, username } = body;
        const fid = body.fid ? Number(body.fid) : null;
        const address = body.address;

        console.log(`[PROFILE_API] Action: ${action}, FID: ${fid}, Address: ${address}`);

        if (!fid || !address) {
            return NextResponse.json({ error: 'Missing fid or address' }, { status: 400 });
        }

        await dbConnect();

        // 1. Find or Create Profile
        let profile = await EchoProfile.findOne({ fid });
        const { referralCode: incomingRef } = body;

        if (!profile) {
            console.log(`[PROFILE_API] Creating new profile for FID: ${fid}`);
            // Check for referrer if provided
            let referrerFid = null;
            if (incomingRef) {
                const referrer = await EchoProfile.findOne({ referralCode: incomingRef.toUpperCase() });
                if (referrer) {
                    referrerFid = referrer.fid;
                    console.log(`[PROFILE_API] Referrer found: ${referrerFid} for code: ${incomingRef}`);
                } else {
                    console.log(`[PROFILE_API] Referrer NOT found for code: ${incomingRef}`);
                }
            }

            // Generate unique code for new user
            const newRefCode = `ECHO_${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

            profile = new EchoProfile({
                fid,
                username,
                address,
                points: 0,
                streak: { current: 0, highest: 0, lastCheckIn: null },

                // Referral Data
                referralCode: newRefCode,
                referredBy: referrerFid,
                referralStatus: 'pending',
                pointsGrinded: 0
            });
            await profile.save();
        } else {
            // Update username if provided and different
            if (username && profile.username !== username) {
                profile.username = username;
                await profile.save();
            }

            if (!profile.referralCode) {
                // Lazy Migration: Generate code for existing users
                profile.referralCode = `ECHO_${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
                await profile.save();
            }
        }



        // ... (existing imports)

        // Inside POST function, 'calculate' block:

        // 2. Calculate Initial Points (Idempotent Recalculation)
        if (action === 'calculate') {
            console.log(`[PROFILE_CALC] Starting calc for FID: ${fid}, Address: ${address}`);

            const { manualStats } = body;

            // Priority: Manual Stats (Client verified) -> DB Stats (Fallback)
            let statsToUse = manualStats;

            if (!statsToUse) {
                // Fetch stats case-insensitively
                const userStats = await UserStats.findOne({
                    address: { $regex: new RegExp(`^${address}$`, 'i') }
                });
                statsToUse = userStats?.stats;
            }

            // NEW: Fetch Real Cast Count via Neynar
            let realCastCount = 0;
            try {
                const result = await fetchUserCastCount(fid);
                realCastCount = result.total;
            } catch (err) { console.error("Cast count error", err); }


            console.log(`[PROFILE_CALC] Stats Source: ${manualStats ? 'MANUAL' : (statsToUse ? 'DB' : 'NONE')}`);
            if (statsToUse) console.log(`[PROFILE_CALC] Stats Data:`, JSON.stringify(statsToUse).slice(0, 200));

            // ---------------------------------------------------------
            // 2. Calculate Onchain Power (0-1000 Scale)
            // ---------------------------------------------------------
            // This score reflects the wallet's legacy and activity. 
            // It is SEPARATE from "Grind Points" (Echo Points).

            let onchainScore = 0;

            if (statsToUse) {
                // A. Wallet Age (Max 300)
                // 1 year = 100 pts, 3 years = 300 pts
                const age = statsToUse.wallet_age_days || 0;
                onchainScore += Math.min(Math.floor(age / 3.65), 300);

                // B. Transaction Count (Max 300)
                // 100 tx = 50 pts, 1000 tx = 300 pts
                const tx = statsToUse.total_tx || 0;
                onchainScore += Math.min(Math.floor(tx * 0.3), 300);

                // C. Farcaster Value / Volume (Max 300)
                // $1000 = 100 pts, $5000 = 300 pts
                const fcVal = statsToUse.farcaster?.wallet_value_usd || 0;
                const volume = statsToUse.total_volume_usd || 0;
                const valueMetric = Math.max(fcVal, volume);
                onchainScore += Math.min(Math.floor(valueMetric / 10), 300);

                // D. Badges / Holdings (Max 100)
                const holdings = statsToUse.farcaster?.holdings || {};
                const badgeCount = Object.values(holdings).filter(Boolean).length;
                onchainScore += Math.min(badgeCount * 25, 100);
            } else {
                // Minimal fallback for fresh wallets connected manually
                onchainScore = 10;
            }

            console.log(`[PROFILE_CALC] Onchain Score: ${onchainScore}/1000`);

            // Save Onchain Score to Profile for persistence (if we add a field)
            // For now, we return it to be displayed. 
            // Ideally we should save it. Let's add 'baseScore' to profile schema later if needed.
            // For this session, we'll return it and let the Frontend sum it up.
            // BUT: If the user refreshes, we need this stored.
            // Hack: Store it in a new field if possible, or assume frontend calls 'calculate' on load.
            // User 'profile.points' should be ONLY grind points.
            // The previous logic was `profile.points = newScore` which merged them.
            // We need to STOP merging. `profile.points` is strictly actions (like intro, daily cast).

            // If this is the FIRST calculation (Intro), we might want to give them some starting 'Grind Points' too?
            // User said: "110 got calculated... and 10 added for check in". 
            // So Intro gave 110 (Grind) + 30 (Onchain) ? No, currently it was mixed.

            // Proposal:
            // profile.points = Earned Points (Referrals, Daily, Intro Task)
            // profile.onchainScore = persistent score based on stats (New Field? or just returned?)

            // We will save it to `profile.onchainScore` if schema allows, otherwise just return it.
            // Looking at `EchoProfile`, I don't see `onchainScore`.
            // I'll assume we return it and the frontend manages the display sum.

            // SAVE STATS
            // NEW: Persist Onchain Score (Take max to avoid perceived deductions)
            const currentOnchain = Number(profile.onchainScore) || 0;
            profile.onchainScore = Math.max(currentOnchain, Math.floor(onchainScore));

            // Logic to award Welcome Points if this is the first calculation
            if (!profile.dailyActions.completedTasks.includes('welcome_bonus')) {
                const welcomePoints = 50;
                profile.points += welcomePoints;
                profile.pointsGrinded = (profile.pointsGrinded || 0) + welcomePoints;
                profile.dailyActions.completedTasks.push('welcome_bonus');
                profile.dailyActions.pointsHistory.push({
                    action: 'welcome_bonus',
                    points: welcomePoints,
                    date: new Date(),
                    description: 'Welcome Bonus for Joining Echo'
                });
            }

            await profile.save();
            return NextResponse.json({
                profile,
                calculated: true,
                onchainScore: profile.onchainScore,
                realCastCount
            });
        }

        // 3. Register NFT (Independent Mint)
        if (action === 'register_nft') {
            const { nftImage, tokenId: providedTokenId, neynarScore, castCount, totalTx, totalVolume, gasPaid, biggestTx, username: nftUsername, joinDate } = body;
            if (!nftImage) return NextResponse.json({ error: 'nftImage required' }, { status: 400 });

            let nextTokenId: number;

            if (providedTokenId) {
                nextTokenId = providedTokenId;
                console.log(`[NFT_REG] Using provided tokenId: ${nextTokenId}`);
            } else {
                // Increment Token ID (Fallback/Legacy)
                const counter = await Counter.findOneAndUpdate(
                    { name: 'nft_token_id' },
                    { $inc: { seq: 1 } },
                    { upsert: true, new: true }
                );
                nextTokenId = counter.seq;
                console.log(`[NFT_REG] Using Counter tokenId: ${nextTokenId}`);
            }

            if (!profile) {
                console.error(`[NFT_REG] CRITICAL: Profile not found for FID: ${fid} during NFT registration`);
                return NextResponse.json({ error: 'Profile not found. Please register first.' }, { status: 404 });
            }

            console.log(`[NFT_REG] Registering NFT for FID: ${profile.fid}, Address: ${profile.address}, TokenId: ${nextTokenId}`);

            // Create or Update NFT Record (Idempotent for redeployments)
            const nftEntry = await EchoNFT.findOneAndUpdate(
                { tokenId: nextTokenId },
                {
                    fid: profile.fid,
                    address: profile.address,
                    imageUrl: nftImage,
                    points: profile.points,
                    mintedAt: new Date(),
                    // Snapshot Fields
                    neynarScore,
                    castCount,
                    totalTx,
                    totalVolume,
                    gasPaid,
                    biggestTx,
                    username: nftUsername, // Use nftUsername to avoid conflict with profile.username
                    joinDate
                },
                { upsert: true, new: true }
            );

            console.log(`[NFT_REG] SUCCESS: TokenId ${nextTokenId} registered for FID ${profile.fid}`);

            // Legacy support: update profile with latest
            profile.nftImage = nftImage;
            profile.nftTokenId = nextTokenId;
            await profile.save();

            const baseUrl = process.env.NEXT_PUBLIC_URL || 'https://echo-base-mini-app.vercel.app';
            const tokenURI = `${baseUrl}/api/echo/nft/${nextTokenId}`;

            return NextResponse.json({ success: true, tokenURI, tokenId: nextTokenId });
        }

        return NextResponse.json({ profile });

    } catch (e: any) {
        console.error("❌ Profile API Error:", e);
        return NextResponse.json({ error: e.message, stack: e.stack }, { status: 500 });
    }
}
