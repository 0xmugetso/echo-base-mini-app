import { NextResponse } from 'next/server';
import dbConnect from '../../../../lib/db';
import EchoProfile from '../../../../models/EchoProfile';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { fid, day, txHash } = body; // day = 3, 7, 14, 30

        if (!fid || !day || !txHash) {
            return NextResponse.json({ error: 'Missing params' }, { status: 400 });
        }

        await dbConnect();
        const profile = await EchoProfile.findOne({ fid });

        if (!profile) {
            return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
        }

        // Validate Streak Requirement
        if (profile.streak.current < day) {
            return NextResponse.json({ error: `Streak too low. Need ${day} days.`, current: profile.streak.current }, { status: 400 });
        }

        // Validate Not Claimed
        const claimKey = `day${day}` as keyof typeof profile.rewards.claimedBoxes;
        if (profile.rewards.claimedBoxes[claimKey]) {
            return NextResponse.json({ error: 'Reward already claimed' }, { status: 400 });
        }

        // Random Point Logic
        let points = 0;
        let tier = 'COMMON';

        if (day === 3) { // Common: 1-10
            points = Math.floor(Math.random() * 10) + 1;
        } else if (day === 7) { // Rare: 20-40
            tier = 'RARE';
            points = Math.floor(Math.random() * 21) + 20;
        } else if (day === 14) { // Epic: 50-70
            tier = 'EPIC';
            points = Math.floor(Math.random() * 21) + 50;
        } else if (day === 30) { // Legendary: 80-100
            tier = 'LEGENDARY';
            points = Math.floor(Math.random() * 21) + 80;
        }

        // Grant Reward
        profile.points += points;
        profile.rewards.claimedBoxes[claimKey] = true;
        await profile.save();

        return NextResponse.json({
            success: true,
            pointsAdded: points,
            tier,
            newTotal: profile.points
        });

    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
