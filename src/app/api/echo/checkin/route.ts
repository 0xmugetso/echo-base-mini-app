import { NextResponse } from 'next/server';
import dbConnect from '../../../../lib/db';
import EchoProfile from '../../../../models/EchoProfile';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { fid, txHash } = body;

        if (!fid || !txHash) {
            return NextResponse.json({ error: 'Missing fid or txHash' }, { status: 400 });
        }

        await dbConnect();
        const profile = await EchoProfile.findOne({ fid });

        const now = new Date();
        const lastCheckIn = profile.streak.lastCheckIn ? new Date(profile.streak.lastCheckIn) : null;
        const nowUtcStr = now.toISOString().split('T')[0];
        const lastUtcStr = lastCheckIn ? lastCheckIn.toISOString().split('T')[0] : null;

        // Check if already checked in today (UTC)
        if (lastUtcStr === nowUtcStr) {
            return NextResponse.json({ error: 'Already checked in today', profile }, { status: 400 });
        }

        // Streak Logic strictly based on UTC calendar days
        let newStreak = 1;
        if (lastCheckIn) {
            const yesterday = new Date(now);
            yesterday.setUTCDate(yesterday.getUTCDate() - 1);
            const yesterdayUtcStr = yesterday.toISOString().split('T')[0];

            if (lastUtcStr === yesterdayUtcStr) {
                newStreak = profile.streak.current + 1;
            } else {
                newStreak = 1; // Reset
            }
        }

        // Update Profile
        const points = 10; // Daily Check-in Reward
        profile.streak.current = newStreak;
        if (newStreak > profile.streak.highest) {
            profile.streak.highest = newStreak;
        }
        profile.streak.lastCheckIn = now;
        profile.points += points;
        profile.pointsGrinded = (profile.pointsGrinded || 0) + points;

        profile.dailyActions.pointsHistory.push({
            action: 'checkin',
            points: points,
            date: now,
            description: `Daily Check-in (Streak: ${newStreak})`
        });

        // Activate Referral if pending
        let bonusPoints = 0;
        if (profile.referralStatus === 'pending') {
            profile.referralStatus = 'active';
            // Grant 20pt bonus to new user upon their first "onchain" action
            if (profile.referredBy) {
                bonusPoints = 20;
                profile.points += bonusPoints;
                profile.dailyActions.pointsHistory.push({
                    action: 'referral_activation',
                    points: bonusPoints,
                    date: now,
                    description: 'New User Referral Bonus'
                });
                console.log(`[CHECKIN] Activating referral bonus for FID ${fid}: +20pts`);
            }
        }

        await profile.save();

        return NextResponse.json({
            success: true,
            pointsAdded: points + bonusPoints,
            newStreak,
            txHash
        });

    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
