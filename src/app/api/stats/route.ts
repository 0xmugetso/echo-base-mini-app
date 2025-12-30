import { NextResponse } from 'next/server';
import dbConnect from '../../../lib/db';
import UserStats from '../../../models/UserStats';
import { getBaseNativeVolume, getFarcasterHoldings } from '../../../lib/covalent';
import { getBestCast, getUserWalletValue, getNeynarUser } from '../../../lib/neynar';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const address = searchParams.get('address')?.toLowerCase();
    const fidParam = searchParams.get('fid');

    if (!address) {
        return NextResponse.json({ error: 'Address is required' }, { status: 400 });
    }

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

            if (results[3].status === 'fulfilled') bestCast = results[3].value;
            else console.error('[API] bestCast failed:', results[3].reason);

            if (results[4].status === 'fulfilled' && results[4].value) {
                const nUser = results[4].value as any; // Cast to any to access dynamic props
                // console.log(`[API] Neynar User Keys for ${fidParam}:`, Object.keys(nUser));

                // Robust extraction
                let extractedCastCount = 0;
                if (typeof nUser.cast_count === 'number') extractedCastCount = nUser.cast_count;
                else if (nUser.stats && typeof nUser.stats.cast_count === 'number') extractedCastCount = nUser.stats.cast_count;
                else if (nUser.profile?.stats?.cast_count) extractedCastCount = nUser.profile.stats.cast_count;

                console.log(`[API] Extracted Cast Count for ${fidParam}: ${extractedCastCount}`);
                (farcasterHoldings as any).cast_count = extractedCastCount;
            }

        } catch (err) {
            console.error('[API] Parallel fetch failed:', err);
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
                cast_count: (farcasterHoldings as any).cast_count || 0
            }
        };

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
