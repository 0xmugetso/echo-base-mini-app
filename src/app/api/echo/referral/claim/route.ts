import { NextResponse } from 'next/server';
import dbConnect from '../../../../../lib/db';
import EchoProfile from '../../../../../models/EchoProfile';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const fid = body.fid ? Number(body.fid) : null;

        if (!fid) {
            return NextResponse.json({ error: 'Missing FID parameter' }, { status: 400 });
        }

        await dbConnect();

        const profile = await EchoProfile.findOne({ fid });
        if (!profile) {
            return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
        }

        const claimable = profile.referralStats?.claimable || 0;
        if (claimable <= 0) {
            return NextResponse.json({ error: 'No claimable points available' }, { status: 400 });
        }

        // Credit main balance
        profile.points = (profile.points || 0) + claimable;

        // Reset claimable balance
        profile.referralStats.claimable = 0;

        // Initialize pointsHistory if missing
        if (!profile.dailyActions) {
            profile.dailyActions = { lastCastDate: null, completedTasks: [], pointsHistory: [] };
        }
        if (!profile.dailyActions.pointsHistory) {
            profile.dailyActions.pointsHistory = [];
        }

        // Push claim log
        profile.dailyActions.pointsHistory.push({
            action: 'referral_claim',
            points: claimable,
            date: new Date(),
            description: `Claimed pending referral commission`
        });

        await profile.save();

        return NextResponse.json({
            success: true,
            profile,
            claimed: claimable
        });

    } catch (e: any) {
        console.error("❌ Referral Claim Error:", e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
