import { NextResponse } from 'next/server';

export async function POST(req: Request) {
    try {
        const { signer_uuid, text, parent, channelId } = await req.json();

        if (!signer_uuid || !text) {
            return NextResponse.json({ error: "Missing signer_uuid or text" }, { status: 400 });
        }

        const API_KEY = process.env.NEYNAR_API_KEY;
        if (!API_KEY) {
            return NextResponse.json({ error: "Server config error: Missing API Key" }, { status: 500 });
        }

        console.log(`[CAST] Publishing cast with signer ${signer_uuid}...`);

        const response = await fetch("https://api.neynar.com/v2/farcaster/cast", {
            method: "POST",
            headers: {
                "accept": "application/json",
                "api_key": API_KEY,
                "content-type": "application/json"
            },
            body: JSON.stringify({
                signer_uuid,
                text,
                parent: parent || (channelId ? `https://warpcast.com/~/channel/${channelId}` : undefined),
            }),
        });

        const data = await response.json();

        if (!response.ok) {
            console.error("[CAST] Neynar API Error:", data);
            return NextResponse.json({ error: data.message || "Failed to publish cast" }, { status: response.status });
        }

        console.log("[CAST] Success:", data.cast?.hash);

        return NextResponse.json({
            success: true,
            hash: data.cast?.hash,
            cast: data.cast
        });

    } catch (error: any) {
        console.error("[CAST] Server Error:", error);
        return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
    }
}
