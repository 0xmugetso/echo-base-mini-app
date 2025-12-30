import { NextResponse } from 'next/server';
import { getNeynarClient } from '~/lib/neynar';

// POST: Create Signer & Request Signed Key
export async function POST(request: Request) {
    try {
        const client = getNeynarClient();
        console.log("[Signer] Creating signer via SDK...");

        // 1. Create Signer
        const signer = await client.createSigner();
        console.log("[Signer] Created UUID:", signer.signer_uuid);

        // 2. Generate Signed Key Request (Crucial for approval URL)
        // This registers the key on behalf of the app and gets the approval link
        const signedKey = await client.createSignedKeyRequest({
            signerUuid: signer.signer_uuid,
            publicKey: signer.public_key
        });

        console.log("[Signer] Signed Key Response:", JSON.stringify(signedKey));

        return NextResponse.json({
            signer_uuid: signer.signer_uuid,
            public_key: signer.public_key,
            approval_url: signedKey.signer_approval_url
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
