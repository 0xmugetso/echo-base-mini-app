import { NextResponse } from 'next/server';
import dbConnect from '../../../../lib/db';
import EchoProfile from '../../../../models/EchoProfile';
import { getNeynarUser } from '../../../../lib/neynar';

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
        if (actionType === 'follow_mugetso') {
            if (profile.dailyActions.completedTasks.includes('follow_mugetso')) {
                return NextResponse.json({ error: 'Already followed & claimed!', pointsAdded: 0 });
            }

            // Verify with Neynar
            // Target: mugetso (FID: 479044)
            const TARGET_FID = 479044;

            // We fetch the TARGET user (mugetso) with the requester as the VIEWER
            // Then check nUser.viewer_context.following

            // Manual fetch to support viewer_fid

            const API_KEY = process.env.NEYNAR_API_KEY;
            if (!API_KEY) throw new Error("Server Config Error");

            const res = await fetch(`https://api.neynar.com/v2/farcaster/user/bulk?fids=${TARGET_FID}&viewer_fid=${fid}`, {
                headers: { 'accept': 'application/json', 'api_key': API_KEY }
            });
            const data = await res.json();
            const isFollowing = data.users?.[0]?.viewer_context?.following;

            if (!isFollowing) {
                return NextResponse.json({ error: 'You are not following @mugetso yet!', pointsAdded: 0 });
            }

            points = 30;
            profile.dailyActions.completedTasks.push('follow_mugetso');
        }
        else if (actionType === 'follow_echo' || actionType === 'follow_khash') {
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
