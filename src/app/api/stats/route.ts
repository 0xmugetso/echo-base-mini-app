import { NextResponse } from 'next/server';
import dbConnect from '../../../lib/db';
import UserStats from '../../../models/UserStats';
import { getBaseNativeVolume, getFarcasterHoldings } from '../../../lib/covalent';
import { getBestCast, getUserWalletValue } from '../../../lib/neynar';

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

        console.log(`[API] Cache MISS/STALE for ${address}. Fetching new data...`);

        // 3. Fetch fresh data (Cache Miss or Stale)
        // Run Parallel Fetches
        const [baseStats, farcasterHoldings, fcWalletValue] = await Promise.all([
            getBaseNativeVolume(address),
            getFarcasterHoldings(address),
            fidParam ? getUserWalletValue(parseInt(fidParam)) : Promise.resolve(0)
        ]);

        // Fetch Best Cast if FID provided
        let bestCast = null;
        if (fidParam) {
            bestCast = await getBestCast(parseInt(fidParam));
        }

        // 4. Transform BigInt to String and Merge
        const storageStats = {
            ...baseStats,
            total_volume_out_wei: baseStats.total_volume_out_wei.toString(),
            total_fees_paid_wei: baseStats.total_fees_paid_wei.toString(),
            first_tx_date: baseStats.first_tx_date || null,
            farcaster: {
                wallet_value_usd: fcWalletValue, // Now using Neynar
                holdings: farcasterHoldings.holdings, // Keeping holdings for badges
                best_cast: bestCast
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
