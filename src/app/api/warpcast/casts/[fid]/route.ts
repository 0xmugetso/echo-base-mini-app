import { NextRequest, NextResponse } from 'next/server';
import { getUserCasts } from '~/lib/warpcast';

export async function GET(req: NextRequest, { params }: { params: Promise<{ fid: string }> }) {
    const { fid: fidStr } = await params;
    const fid = parseInt(fidStr, 10);
    if (isNaN(fid)) {
        return NextResponse.json({ error: "Invalid FID" }, { status: 400 });
    }

    const casts = await getUserCasts(fid, 5); // Fetch last 5 casts

    if (!casts) {
        return NextResponse.json({ error: "Failed to fetch casts" }, { status: 500 });
    }

    return NextResponse.json({ casts });
}
