import { NextResponse } from 'next/server';
import dbConnect from '../../../../../lib/db';
import EchoProfile from '../../../../../models/EchoProfile';

export async function GET(request: Request) {
    // 1. Secure check for Vercel Cron in production
    if (process.env.NODE_ENV === 'production' && process.env.CRON_SECRET) {
        const authHeader = request.headers.get('authorization');
        if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
            return new Response('Unauthorized', { status: 401 });
        }
    }

    try {
        await dbConnect();

        // 1. Find all users who have referred others
        // Target only referred users with valid positive FIDs
        const referrals = await EchoProfile.find({ referredBy: { $gt: 0 } });

        // Map: ReferrerFID -> { totalGrinded: number, activeCount: number }
        const referrerMap = new Map<number, { totalGrinded: number, activeCount: number }>();

        for (const ref of referrals) {
            if (!ref.referredBy) continue;

            const current = referrerMap.get(ref.referredBy) || { totalGrinded: 0, activeCount: 0 };

            // Only add grind points and active count if the invitee's status is active
            if (ref.referralStatus === 'active') {
                current.totalGrinded += (ref.pointsGrinded || 0);
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
            // 0 active invites: 0%
            // 1-4 active invites: 2%
            // 5–14 active invites: 5%
            // 15–24 active invites: 7.5%
            // 25+ active invites: 10%
            let rate = 0;
            if (stats.activeCount >= 25) {
                rate = 10;
            } else if (stats.activeCount >= 15) {
                rate = 7.5;
            } else if (stats.activeCount >= 5) {
                rate = 5;
            } else if (stats.activeCount > 0) {
                rate = 2;
            }
            const rateDecimal = rate / 100;

            const totalCut = Math.floor(stats.totalGrinded * rateDecimal);
            
            // Exclude signup bonuses (20 XP per active invite) from already paid grind commissions
            const alreadyPaidGrind = Math.max(
                0,
                (referrer.referralStats?.earnings || 0) - (referrer.referralStats?.count || 0) * 20
            );
            const newEarnings = totalCut - alreadyPaidGrind;

            if (newEarnings > 0 || referrer.referralStats?.count !== stats.activeCount) {
                // Initialize sub-doc if missing
                if (!referrer.referralStats) {
                    referrer.referralStats = { count: 0, earnings: 0, claimable: 0 };
                }

                if (newEarnings > 0) {
                    referrer.referralStats.claimable = (referrer.referralStats.claimable || 0) + newEarnings;
                    referrer.referralStats.earnings = (referrer.referralStats.earnings || 0) + newEarnings;
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
