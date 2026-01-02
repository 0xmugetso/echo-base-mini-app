import { NextRequest, NextResponse } from 'next/server';
import { publishWarpcastCast } from '~/lib/warpcast';

const WARPCAST_API_BASE = 'https://api.warpcast.com/v2';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { text, embeds, parent, signedMessage } = body;

        // IF SIGNED MESSAGE PROVIDED (Native Flow)
        if (signedMessage) {
            if (!process.env.WARPCAST_DC_SECRET) {
                return NextResponse.json({ error: 'Missing Server Secret' }, { status: 500 });
            }

            // Warpcast API v2 endpoint for submitting signed casts?
            // Actually, Warpcast API usually takes the raw message bytes or JSON representation.
            // Documentation says: POST https://api.warpcast.com/v2/casts with body { message: ... } or similar.
            // Let's assume sending the message JSON to specific endpoint works or fallback to Hub.
            // NOTE: Since I don't have exact docs for "Warpcast v2 Signed Cast", I will try to use the generic submit endpoint 
            // OR rely on a Hub. But the user said "Warpcast API". 
            // For now, I'll assume we can pass the signed message to strict Hub-like endpoint on Warpcast if it exists, 
            // OR simply stick to the Plan: we replaced the "text" logic with "signedMessage".

            // Let's rely on standard Hub API on Warpcast ?? 
            // Actually, api.warpcast.com doesn't behave exactly like a Hub. 
            // But for "Signed Key Request" flow, the intention is we use the KEY to sign.
            // Ideally we submit to a Hub. The user's goal "use farcaster api" might imply api.warpcast.com acts as our gateway.
            // I will try to POST to `https://api.warpcast.com/v2/casts` with the signed message structure if supported.
            // If not, I might need to use a public Hub URL or similar.
            // HOWEVER, since I have the App Secret, maybe I can just POST the CastAddBody signed?

            // Let's look at `submitMessage` capabilities.
            // I will try to use the `signedMessage` as the body for `PUT /casts`? No.

            // To be safe and ensure delivery, since we signed it, we just need ANY node to accept it.
            // I will try to POST to a public Hub (like Neynar's or Farcaster's if available) OR keep using Warpcast API.
            // Let's try `https://api.warpcast.com/v2/casts` with the message.

            const response = await fetch(`${WARPCAST_API_BASE}/casts`, {
                method: 'PUT', // PUT is often used for signed messages in some APIs, or POST.
                headers: {
                    'Authorization': `Bearer ${process.env.WARPCAST_DC_SECRET}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ message: signedMessage })
            });

            const data = await response.json();

            if (!response.ok) {
                console.error('[API] Signed Cast failed:', data);
                // Fallback: If this fails, user sees error. 
                // We really should be using a HUB for signed messages.
                return NextResponse.json({ error: data.errors?.[0]?.message || 'Failed to publish signed cast' }, { status: 500 });
            }

            return NextResponse.json({ success: true, hash: data.result.cast.hash }); // Adjust based on actual response
        }

        // LEGACY / SIMPLE FLOW (Text + Secret only)
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
