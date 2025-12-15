import { NextResponse } from 'next/server';
import dbConnect from '../../../../lib/db';
import EchoProfile from '../../../../models/EchoProfile';
import UserStats from '../../../../models/UserStats';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const fid = searchParams.get('fid');

    if (!fid) return NextResponse.json({ error: 'FID required' }, { status: 400 });

    try {
        await dbConnect();
        const profile = await EchoProfile.findOne({ fid: parseInt(fid) });
        return NextResponse.json(profile || { exists: false });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { fid, address, action } = body;

        if (!fid || !address) {
            return NextResponse.json({ error: 'Missing fid or address' }, { status: 400 });
        }

        await dbConnect();

        // 1. Find or Create Profile
        let profile = await EchoProfile.findOne({ fid });
        const { referralCode: incomingRef } = body;

        if (!profile) {
            // Check for referrer if provided
            let referrerFid = null;
            if (incomingRef) {
                const referrer = await EchoProfile.findOne({ referralCode: incomingRef });
                if (referrer) {
                    referrerFid = referrer.fid;
                }
            }

            // Generate unique code for new user
            // Simple random string for now (6 chars)
            const newRefCode = `ECHO_${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

            profile = new EchoProfile({
                fid,
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
        } else if (!profile.referralCode) {
            // Lazy Migration: Generate code for existing users
            profile.referralCode = `ECHO_${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
            await profile.save();
        }

        // 2. Calculate Initial Points (Only if requested and points are low/default)
        // Treating 10 as "default/failed" state to allow retries.
        if (action === 'calculate' && profile.points <= 10) {
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

            console.log(`[PROFILE_CALC] Stats Source: ${manualStats ? 'MANUAL' : (statsToUse ? 'DB' : 'NONE')}`);
            if (statsToUse) console.log(`[PROFILE_CALC] Stats Data:`, JSON.stringify(statsToUse).slice(0, 200));

            let initialPoints = 10; // Base welcome bonus

            if (statsToUse) {
                // Tier 1: Wallet Age
                const age = statsToUse.wallet_age_days || 0;
                if (age > 365) initialPoints += 50;
                else if (age > 30) initialPoints += 20;
                console.log(`[PROFILE_CALC] Age Bonus: ${age} days -> Points: ${initialPoints}`);

                // Tier 2: Tx Count
                const tx = statsToUse.total_tx || 0;
                if (tx > 100) initialPoints += 50;
                else if (tx > 10) initialPoints += 10;
                console.log(`[PROFILE_CALC] TX Bonus: ${tx} txs -> Points: ${initialPoints}`);

                // Tier 3: Farcaster Value
                const fcVal = statsToUse.farcaster?.wallet_value_usd || 0;
                if (fcVal > 1000) initialPoints += 100;
                else if (fcVal > 100) initialPoints += 30;
                console.log(`[PROFILE_CALC] FC Val Bonus: $${fcVal} -> Points: ${initialPoints}`);

                // Tier 4: Farcaster Badges
                const holdings = statsToUse.farcaster?.holdings || {};
                const badgeCount = Object.values(holdings).filter(Boolean).length;
                initialPoints += (badgeCount * 20);
                console.log(`[PROFILE_CALC] Badge Bonus: ${badgeCount} badges -> Points: ${initialPoints}`);
            } else {
                console.log("[PROFILE_CALC] No Stats provided or found, defaulting to 10.");
            }

            // Cap at 500
            profile.points = Math.min(initialPoints, 500);
            await profile.save();
            return NextResponse.json({ profile, calculated: true, initialPoints: profile.points });
        }

        // 3. Register NFT (Highlight Mint)
        if (action === 'register_nft') {
            const { nftImage, nftTokenId } = body;
            if (nftImage) profile.nftImage = nftImage;
            if (nftTokenId) profile.nftTokenId = nftTokenId; // Optional if we catch event client-side

            await profile.save();
            return NextResponse.json({ success: true, profile });
        }

        return NextResponse.json({ profile });

    } catch (e: any) {
        console.error("Profile Error:", e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
