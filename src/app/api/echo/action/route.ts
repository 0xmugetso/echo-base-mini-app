import { NextResponse } from 'next/server';
import dbConnect from '../../../../lib/db';
import EchoProfile from '../../../../models/EchoProfile';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { fid, actionType } = body;

        if (!fid || !actionType) return NextResponse.json({ error: 'Missing params' }, { status: 400 });

        await dbConnect();
        const profile = await EchoProfile.findOne({ fid });
        if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });

        const now = new Date();
        const todayStr = now.toISOString().split('T')[0];

        let points = 0;

        // Daily Cast Logic
        if (actionType === 'daily_cast') {
            const { castHash, castText, castScore } = body;

            if (!castHash || !castText) return NextResponse.json({ error: 'Missing cast data' }, { status: 400 });

            // Check if already rewarded today
            if (profile.dailyActions?.lastCastDate === todayStr) {
                return NextResponse.json({ error: 'Daily cast already rewarded', pointsAdded: 0 });
            }

            // Check if hash already used (Duplicate cast)
            const hashExists = profile.dailyActions?.castHistory?.some((c: any) => c.hash === castHash);
            if (hashExists) {
                return NextResponse.json({ error: 'Cast already claimed', pointsAdded: 0 });
            }

            points = castScore || 5; // Default 5 if no score provided

            profile.dailyActions.lastCastDate = todayStr;
            profile.dailyActions.castHistory.push({
                hash: castHash,
                text: castText,
                points: points,
                date: new Date(),
                likes: 0,
                recasts: 0
            });
        }

        // Generic Task Logic
        if (actionType === 'follow_echo' || actionType === 'follow_khash') {
            if (profile.dailyActions.completedTasks.includes(actionType)) {
                return NextResponse.json({ error: 'Task already completed', pointsAdded: 0 });
            }
            points = 50;
            profile.dailyActions.completedTasks.push(actionType);
        }

        if (points > 0) {
            profile.points += points;
            profile.pointsGrinded = (profile.pointsGrinded || 0) + points;

            if (profile.referralStatus === 'pending') profile.referralStatus = 'active';

            await profile.save();
        }

        return NextResponse.json({ success: true, pointsAdded: points, newTotal: profile.points });

    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
