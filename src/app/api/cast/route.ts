import { NextResponse } from 'next/server';

const NEYNAR_API_KEY = process.env.NEYNAR_API_KEY;

export async function POST(request: Request) {
    if (!NEYNAR_API_KEY) {
        return NextResponse.json({ error: 'Server Config Error' }, { status: 500 });
    }

    try {
        const body = await request.json();
        const { signer_uuid, text, parent } = body;

        if (!signer_uuid || !text) {
            return NextResponse.json({ error: 'Missing signer_uuid or text' }, { status: 400 });
        }

        const payload: any = {
            signer_uuid,
            text,
        };

        if (parent) {
            payload.parent = parent; // e.g. parent cast hash for reply
        }

        // Neynar Publish URL
        const res = await fetch("https://api.neynar.com/v2/farcaster/cast", {
            method: "POST",
            headers: {
                accept: "application/json",
                api_key: NEYNAR_API_KEY,
                "content-type": "application/json"
            },
            body: JSON.stringify(payload)
        });

        if (!res.ok) {
            const err = await res.text();
            console.error("[Cast] Publish failed:", err);
            return NextResponse.json({ error: "Failed to publish cast", details: err }, { status: res.status });
        }

        const data = await res.json();
        return NextResponse.json({ success: true, cast: data.cast });

    } catch (error) {
        console.error("[Cast] API Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
