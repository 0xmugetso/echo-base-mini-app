import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import dbConnect from '../../../../lib/db';
import EchoProfile from '../../../../models/EchoProfile';

async function checkAdminAuth() {
    const cookieStore = await cookies();
    const adminToken = cookieStore.get('admin_token')?.value;
    return adminToken === 'admin_session_active';
}

export async function POST(request: Request) {
    if (!(await checkAdminAuth())) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await request.json();
        const fid = body.fid ? Number(body.fid) : null;
        const amount = body.amount ? Number(body.amount) : null;
        const reason = body.reason || '';

        if (fid === null || amount === null) {
            return NextResponse.json({ error: 'Missing fid or amount parameters' }, { status: 400 });
        }

        await dbConnect();

        const profile = await EchoProfile.findOne({ fid });
        if (!profile) {
            return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
        }

        // Clamp points at 0 to avoid negative balances
        const oldPoints = profile.points || 0;
        const newPoints = Math.max(0, oldPoints + amount);
        profile.points = newPoints;

        // Initialize dailyActions if missing
        if (!profile.dailyActions) {
            profile.dailyActions = { lastCastDate: null, completedTasks: [], pointsHistory: [] };
        }
        if (!profile.dailyActions.pointsHistory) {
            profile.dailyActions.pointsHistory = [];
        }

        // Add history log entry for points change
        profile.dailyActions.pointsHistory.push({
            action: amount >= 0 ? 'admin_reward' : 'admin_deduction',
            points: amount,
            date: new Date(),
            description: reason || (amount >= 0 ? 'Manual reward by administrator' : 'Manual deduction by administrator')
        });

        await profile.save();

        console.log(`[ADMIN_POINTS] FID ${fid}: adjusted points by ${amount}. Old: ${oldPoints}, New: ${newPoints}`);

        return NextResponse.json({
            success: true,
            fid,
            oldPoints,
            newPoints,
            profile: {
                points: profile.points,
                dailyActions: profile.dailyActions
            }
        });

    } catch (e: any) {
        console.error("❌ Admin Points Modification Error:", e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
