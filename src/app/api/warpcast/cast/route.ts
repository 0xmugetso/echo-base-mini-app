import { NextRequest, NextResponse } from 'next/server';
import { publishWarpcastCast } from '~/lib/warpcast';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { text, embeds, parent } = body;

        if (!text) {
            return NextResponse.json({ error: 'Missing text' }, { status: 400 });
        }

        const cast = await publishWarpcastCast(text, embeds, parent);

        if (!cast) {
            return NextResponse.json({ error: 'Failed to publish cast' }, { status: 500 });
        }

        return NextResponse.json({ success: true, cast });
    } catch (error) {
        console.error('API Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
