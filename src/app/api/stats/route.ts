import { NextResponse } from 'next/server';
import dbConnect from '../../../lib/db';
import UserStats from '../../../models/UserStats';
import { getBaseNativeVolume, getFarcasterHoldings } from '../../../lib/covalent';
import { getBestCast, getUserWalletValue, getNeynarUser, fetchUserCastCount } from '../../../lib/neynar';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const address = searchParams.get('address')?.toLowerCase();
    const fidParam = searchParams.get('fid');

    if (!address) {
        return NextResponse.json({ error: 'Address is required' }, { status: 400 });
    }

    const fid = (fidParam && fidParam !== 'undefined') ? parseInt(fidParam) : null;
    console.log(`[STATS_API] Request for ${address}, FID: ${fid}`);

    try {
        await dbConnect();

        // 1. Try to find existing stats
        let userDoc = await UserStats.findOne({ address });

        const now = new Date();
        const CACHE_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours

        // 2. Check if cache is fresh
        if (userDoc && userDoc.lastUpdated) {
            const age = now.getTime() - new Date(userDoc.lastUpdated).getTime();
            if (false) { // CACHE DISABLED FOR DEBUGGING
                //            if (age < CACHE_DURATION_MS) {
                console.log(`[API] Cache HIT for ${address} (Age: ${Math.round(age / 1000 / 60)}m)`);
                return NextResponse.json(userDoc.stats);
            }
        }

        // 3. Fresh Data Fetching with individual error handling for resilience
        let baseStats = { total_tx: 0, total_volume_out_wei: 0n, total_volume_usd: 0, total_fees_paid_wei: 0n, biggest_single_tx: 0 };
        let farcasterHoldings = { holdings: { warplets: false, pro_og: false, based_punk: false, bankr_club: false, clanker: false, jesse: false, degen: false, brett: false, toshi: false } };
        let fcWalletValue = 0;
        let bestCast = null;

        try {
            const results = await Promise.allSettled([
                getBaseNativeVolume(address),
                getFarcasterHoldings(address),
                fidParam ? getUserWalletValue(parseInt(fidParam)) : Promise.resolve(0),
                fidParam ? getBestCast(parseInt(fidParam)) : Promise.resolve(null),
                fidParam ? getNeynarUser(parseInt(fidParam)) : Promise.resolve(null)
            ]);

            if (results[0].status === 'fulfilled') baseStats = results[0].value;
            else console.error('[API] baseStats failed:', results[0].reason);

            if (results[1].status === 'fulfilled') farcasterHoldings = results[1].value;
            else console.error('[API] farcasterHoldings failed:', results[1].reason);

            if (results[2].status === 'fulfilled') fcWalletValue = results[2].value;
            else console.error('[API] fcWalletValue failed:', results[2].reason);

            if (results[3].status === 'fulfilled' && results[3].value) {
                const rawCast = results[3].value as any;
                // ... logic
                bestCast = {
                    hash: rawCast.hash,
                    text: rawCast.text,
                    impressions: rawCast.viewer_context?.likes ? 0 : (rawCast.reactions?.likes_count || 0),
                    likes: rawCast.reactions?.likes_count || rawCast.likes?.count || 0,
                    recasts: rawCast.reactions?.recasts_count || rawCast.recasts?.count || 0,
                    replies: rawCast.replies?.count || 0
                };
            }
            else if (results[3].status === 'rejected') {
                console.error('[API] bestCast failed:', results[3].reason);
            }

            if (results[4].status === 'fulfilled' && results[4].value) {
                const nUser = results[4].value as any;
                console.log(`[STATS_API] Neynar User found for ${fidParam}`);
            }

        } catch (err) {
            console.error('[API] Parallel fetch failed:', err);
        }

        // Calculate Real Cast Count using robust pagination
        let realCastCount = 0;
        if (fid) {
            try {
                console.log(`[STATS_API] Fetching robust cast count for FID: ${fid}`);
                realCastCount = await fetchUserCastCount(fid);
                console.log(`[STATS_API] Robust Cast Count Result: ${realCastCount}`);
            } catch (e) {
                console.error("[STATS_API] Cast count fetch failed", e);
            }
        }

        // 4. Transform and Merge
        const storageStats = {
            ...baseStats,
            total_volume_out_wei: baseStats.total_volume_out_wei.toString(),
            total_fees_paid_wei: baseStats.total_fees_paid_wei.toString(),
            first_tx_date: (baseStats as any).first_tx_date || null,
            farcaster: {
                wallet_value_usd: fcWalletValue,
                holdings: farcasterHoldings.holdings,
                best_cast: bestCast,
                cast_count: Number(realCastCount || 0) // Ensure number
            }
        };

        console.log(`[API] Returning stats for ${address}: Cast Count = ${storageStats.farcaster.cast_count}`);

        // 5. Update or Insert DB
        userDoc = await UserStats.findOneAndUpdate(
            { address },
            {
                stats: storageStats,
                lastUpdated: now
            },
            { upsert: true, new: true }
        );

        return NextResponse.json(userDoc.stats);

    } catch (error: any) {
        console.error('[API] Error in stats route:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
