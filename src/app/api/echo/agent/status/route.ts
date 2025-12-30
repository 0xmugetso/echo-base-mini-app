import { NextResponse } from 'next/server';

const NEYNAR_API_KEY = process.env.NEYNAR_API_KEY;

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const frameId = searchParams.get('frame_id');

    if (!frameId) return NextResponse.json({ error: 'Missing frame_id' }, { status: 400 });

    try {
        const res = await fetch(`https://api.neynar.com/v2/farcaster/frame/transaction/pay?transaction_frame_id=${frameId}`, {
            method: 'GET',
            headers: {
                'accept': 'application/json',
                'x-api-key': NEYNAR_API_KEY || ''
            }
        });

        const data = await res.json();

        // Log status for debugging
        // console.log(`[AGENT_STATUS] Frame: ${frameId}, Status:`, data?.status);

        // Check if we have a hash
        // Structure based on assumption of Neynar response. 
        // Usually 'status' is 'created', 'paying', 'paid'. 
        // And 'transaction' might have 'hash'.

        return NextResponse.json(data);

    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
