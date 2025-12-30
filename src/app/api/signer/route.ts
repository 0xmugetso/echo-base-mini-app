import { NextResponse } from 'next/server';

const NEYNAR_API_KEY = process.env.NEYNAR_API_KEY;

// POST: Create Signer & Register Signed Key
export async function POST(request: Request) {
    if (!NEYNAR_API_KEY) {
        return NextResponse.json({ error: 'Server Config Error: Missing API Key' }, { status: 500 });
    }

    try {
        // 1. Create Signer
        console.log("[Signer] Creating signer...");
        const createRes = await fetch("https://api.neynar.com/v2/farcaster/signer", {
            method: "POST",
            headers: {
                accept: "application/json",
                api_key: NEYNAR_API_KEY,
            },
        });

        if (!createRes.ok) {
            const err = await createRes.text();
            console.error("[Signer] Creation failed:", err);
            return NextResponse.json({ error: `Failed to create signer: ${err}` }, { status: createRes.status });
        }

        console.log("[Signer] Neynar Response:", JSON.stringify(createData));

        const { signer_uuid, public_key } = createData;

        // Fallback construction for Hosted Signer if API doesn't return explicit field
        const fallbackUrl = `https://app.neynar.com/login?signer_uuid=${signer_uuid}&client_id=${process.env.NEXT_PUBLIC_NEYNAR_CLIENT_ID}`;

        return NextResponse.json({
            signer_uuid,
            public_key,
            // Prefer API returned URL, otherwise construct the Hosted Auth URL.
            // NEVER use the raw warpcast deeplink as we don't hold the app key.
            approval_url: (createData as any).signer_approval_url || (createData as any).link || fallbackUrl
        });


    } catch (error: any) {
        console.error("[Signer] API Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

// GET: Check Signer Status
export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const signer_uuid = searchParams.get('signer_uuid');

    if (!signer_uuid || !NEYNAR_API_KEY) {
        return NextResponse.json({ error: 'Missing uuid or key' }, { status: 400 });
    }

    try {
        const res = await fetch(`https://api.neynar.com/v2/farcaster/signer?signer_uuid=${signer_uuid}`, {
            method: "GET",
            headers: {
                accept: "application/json",
                api_key: NEYNAR_API_KEY,
            },
        });

        const data = await res.json();
        const status = data.status || data.signer_status; // Handle potential schema variations

        return NextResponse.json({ status, fid: data.fid, user: data.user });
    } catch (error) {
        return NextResponse.json({ error: "Failed to fetch status" }, { status: 500 });
    }
}
