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

        if (!profile) {
            return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
        }

        const now = new Date();
        const lastCheckIn = profile.streak.lastCheckIn ? new Date(profile.streak.lastCheckIn) : null;

        // Check if already checked in today (UTC)
        if (lastCheckIn && lastCheckIn.toDateString() === now.toDateString()) {
            return NextResponse.json({ error: 'Already checked in today', profile }, { status: 400 });
        }

        // Streak Logic
        let newStreak = 1;
        if (lastCheckIn) {
            const diffTime = Math.abs(now.getTime() - lastCheckIn.getTime());
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            if (diffDays <= 2) { // Allow roughly 48 hours for leeway, or strictly 1 day? "Resets if < today - 1 day"
                // Actually simple check: Is last checkin yesterday?
                // Let's go with < 48 hours diff for "next day" continuity
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

        // Activate Referral if pending
        if (profile.referralStatus === 'pending') {
            profile.referralStatus = 'active';
            // Optional: Grant initial referral bonus here immediately?
            // For now, allow CRON to pick up earnings.
        }

        await profile.save();

        return NextResponse.json({
            success: true,
            pointsAdded: points,
            newStreak,
            txHash
        });

    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
