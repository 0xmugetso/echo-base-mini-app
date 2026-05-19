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

            // Check if already rewarded in the current 12hr UTC block
            if (profile.dailyActions?.lastCastDate) {
                const lastCastDateObj = new Date(profile.dailyActions.lastCastDate);
                const lastCastBlock = Math.floor(lastCastDateObj.getUTCHours() / 12);
                const currentBlock = Math.floor(now.getUTCHours() / 12);
                
                const isSameDay = lastCastDateObj.getUTCFullYear() === now.getUTCFullYear() && 
                                  lastCastDateObj.getUTCMonth() === now.getUTCMonth() && 
                                  lastCastDateObj.getUTCDate() === now.getUTCDate();
                
                if (isSameDay && lastCastBlock === currentBlock) {
                    return NextResponse.json({ error: 'Daily cast already rewarded in this block (resets at 00:00 and 12:00 UTC)', pointsAdded: 0 });
                }
            }

            // Check if hash already used (Duplicate cast)
            const hashExists = profile.dailyActions?.castHistory?.some((c: any) => c.hash === castHash);
            if (hashExists) {
                return NextResponse.json({ error: 'Cast already claimed', pointsAdded: 0 });
            }

            points = castScore || 20; // Default 20 if no score provided

            profile.dailyActions.lastCastDate = now.toISOString();
            profile.dailyActions.castHistory.push({
                hash: castHash,
                text: castText,
                points: points,
                date: new Date(),
                likes: 0,
                recasts: 0
            });
            profile.dailyActions.pointsHistory.push({
                action: 'daily_cast',
                points: points,
                date: new Date(),
                description: 'Daily Cast on Farcaster'
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
            profile.dailyActions.pointsHistory.push({
                action: 'follow_mugetso',
                points: points,
                date: new Date(),
                description: 'Followed @mugetso'
            });
        }
        else if (actionType === 'follow_echo' || actionType === 'follow_khash') {
            if (profile.dailyActions.completedTasks.includes(actionType)) {
                return NextResponse.json({ error: 'Task already completed', pointsAdded: 0 });
            }

            const usernameToFollow = actionType === 'follow_echo' ? 'echo' : 'khash';
            const API_KEY = process.env.NEYNAR_API_KEY;
            if (!API_KEY) throw new Error("Server Config Error");

            const res = await fetch(`https://api.neynar.com/v2/farcaster/user/search?q=${usernameToFollow}&viewer_fid=${fid}`, {
                headers: { 'accept': 'application/json', 'api_key': API_KEY }
            });
            const data = await res.json();
            const targetUser = data.result?.users?.find((u: any) => u.username.toLowerCase() === usernameToFollow.toLowerCase());
            
            if (!targetUser || !targetUser.viewer_context?.following) {
                return NextResponse.json({ error: `You are not following @${usernameToFollow} yet!`, pointsAdded: 0 });
            }

            points = 50;
            profile.dailyActions.completedTasks.push(actionType);
            profile.dailyActions.pointsHistory.push({
                action: actionType,
                points: points,
                date: new Date(),
                description: `Followed @${usernameToFollow}`
            });
        }
        else if (actionType === 'save_scan') {
            const { address, stats } = body;
            if (!address || !stats) {
                return NextResponse.json({ error: 'Missing scan data' }, { status: 400 });
            }
            if (!profile.scanHistory) profile.scanHistory = [];
            
            // Check if already in history, if so update it
            const existingIndex = profile.scanHistory.findIndex((s: any) => s.address.toLowerCase() === address.toLowerCase());
            if (existingIndex >= 0) {
                profile.scanHistory[existingIndex].stats = stats;
                profile.scanHistory[existingIndex].timestamp = new Date();
            } else {
                profile.scanHistory.push({
                    address,
                    stats,
                    timestamp: new Date()
                });
            }
            
            await profile.save();
            return NextResponse.json({ success: true, scanHistory: profile.scanHistory });
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
