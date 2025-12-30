import { NextResponse } from 'next/server';
import { getNeynarClient } from '~/lib/neynar';

// POST: Create Signer
export async function POST(request: Request) {
    try {
        const client = getNeynarClient();
        console.log("[Signer] Creating signer via SDK...");

        const signer = await client.createSigner();
        console.log("[Signer] SDK Response:", JSON.stringify(signer));

        return NextResponse.json({
            signer_uuid: signer.signer_uuid,
            public_key: signer.public_key,
            approval_url: signer.signer_approval_url || (signer as any).link
        });

    } catch (error: any) {
        console.error("[Signer] SDK Error:", error);
        // Fallback for clearer error messaging
        const msg = error.response?.data?.message || error.message;
        return NextResponse.json({ error: msg }, { status: 500 });
    }
}

// GET: Check Signer Status
export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const signer_uuid = searchParams.get('signer_uuid');

    if (!signer_uuid) {
        return NextResponse.json({ error: 'Missing signer_uuid' }, { status: 400 });
    }

    try {
        const client = getNeynarClient();
        const signer = await client.lookupSigner({ signerUuid: signer_uuid });

        return NextResponse.json({
            status: signer.status,
            fid: signer.fid,
            user: (signer as any).user
        });
    } catch (error: any) {
        console.error("[Signer] Status Check Error:", error);
        return NextResponse.json({ error: "Failed to fetch status" }, { status: 500 });
    }
}
