import { NextResponse } from 'next/server';
import dbConnect from '../../../../../lib/db';
import EchoProfile from '../../../../../models/EchoProfile';

export async function GET(request: Request) {
    try {
        await dbConnect();

        // 1. Find all users who have referred others (optimized query?)
        // Ideally we'd group by `referredBy` but let's do simple iteration for now as volume is low.
        // Actually, let's find all profiles where `referredBy` is NOT null.
        const referrals = await EchoProfile.find({ referredBy: { $ne: null } });

        // Map: ReferrerFID -> { totalGrinded: number, activeCount: number }
        const referrerMap = new Map<number, { totalGrinded: number, activeCount: number }>();

        for (const ref of referrals) {
            if (!ref.referredBy) continue;

            const current = referrerMap.get(ref.referredBy) || { totalGrinded: 0, activeCount: 0 };

            current.totalGrinded += (ref.pointsGrinded || 0);
            if (ref.referralStatus === 'active') {
                current.activeCount += 1;
            }

            referrerMap.set(ref.referredBy, current);
        }

        let totalDistributed = 0;
        let referrersUpdated = 0;

        // 2. Iterate Referrers and Update
        for (const [fid, stats] of referrerMap.entries()) {
            const referrer = await EchoProfile.findOne({ fid });
            if (!referrer) continue;

            // Tiered Referral Rates:
            // 0–4 invites: 2%
            // 5–14 invites: 5%
            // 15–24 invites: 7.5%
            // 25+ invites: 10%
            let rate = 2;
            if (stats.activeCount >= 25) {
                rate = 10;
            } else if (stats.activeCount >= 15) {
                rate = 7.5;
            } else if (stats.activeCount >= 5) {
                rate = 5;
            }
            const rateDecimal = rate / 100;

            const totalCut = Math.floor(stats.totalGrinded * rateDecimal);
            const alreadyPaid = referrer.referralStats?.earnings || 0;
            const newEarnings = totalCut - alreadyPaid;

            if (newEarnings > 0 || referrer.referralStats?.count !== stats.activeCount) {
                // Initialize sub-doc if missing
                if (!referrer.referralStats) {
                    referrer.referralStats = { count: 0, earnings: 0, claimable: 0 };
                }

                if (newEarnings > 0) {
                    referrer.referralStats.claimable = (referrer.referralStats.claimable || 0) + newEarnings;
                    referrer.referralStats.earnings = totalCut;
                    totalDistributed += newEarnings;

                    // Initialize pointsHistory if missing
                    if (!referrer.dailyActions) {
                        referrer.dailyActions = { lastCastDate: null, completedTasks: [], pointsHistory: [] };
                    }
                    if (!referrer.dailyActions.pointsHistory) {
                        referrer.dailyActions.pointsHistory = [];
                    }

                    // Push a detailed cron cut history entry
                    referrer.dailyActions.pointsHistory.push({
                        action: 'referral_cut',
                        points: newEarnings,
                        date: new Date(),
                        description: `Daily ${rate}% commission from your active recruits' grind points`
                      });
                }

                // Update active count
                referrer.referralStats.count = stats.activeCount;

                await referrer.save();
                referrersUpdated++;
            }
        }

        return NextResponse.json({
            success: true,
            referrersUpdated,
            totalDistributed,
            message: "Referral calculation complete."
        });

    } catch (e: any) {
        console.error("Cron Error:", e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
