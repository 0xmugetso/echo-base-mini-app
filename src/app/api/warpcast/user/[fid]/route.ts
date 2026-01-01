import { NextRequest, NextResponse } from 'next/server';
import { getWarpcastUser } from '@/lib/warpcast';

export async function GET(req: NextRequest, { params }: { params: Promise<{ fid: string }> }) {
    const fid = (await params).fid;
    if (!fid) {
        return NextResponse.json({ error: 'Missing FID' }, { status: 400 });
    }

    const user = await getWarpcastUser(Number(fid));

    if (!user) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ user });
}
