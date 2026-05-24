import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import dbConnect from '../../../../lib/db';
import EchoProfile from '../../../../models/EchoProfile';

async function checkAdminAuth() {
    const cookieStore = await cookies();
    const adminToken = cookieStore.get('admin_token')?.value;
    return adminToken === 'admin_session_active';
}

export async function GET() {
    if (!(await checkAdminAuth())) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        await dbConnect();
        
        // Fetch all EchoProfiles sorted by points descending
        const users = await EchoProfile.find({})
            .sort({ points: -1 })
            .select('fid username address points onchainScore streak referralStats referredBy pointsGrinded nftTokenId createdAt updatedAt')
            .lean();

        return NextResponse.json({
            success: true,
            users
        });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
