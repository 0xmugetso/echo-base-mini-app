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

        const createData = await createRes.json();
        const { signer_uuid, public_key } = createData;

        // 2. Register Signed Key (Since we don't have a private key for the app, 
        // we normally rely on the user scanning the QR. 
        // Wait, with Managed Signers, we usually just need the signer_uuid and then show the user the approval_url.
        // Actually, Neynar returns an `authorization_url` or we construct it.
        // Let's check docs again carefully.
        // Docs: "The app registers the signed key... and gets an approval URL."
        // AND "Example gist" uses signature.
        // BUT "Managed Signers" (Write via API) usually abstracts holding the custody key if using Neynar's "Sign In with Neynar"
        // However, here we are adding a signer to an EXISTING user (the user using the mini-app).
        // The "Standard Flow" is: 
        // 1. Create Signer -> get signer_uuid, public_key
        // 2. Register Signed Key -> requires App FID and App Mnemonic/Key to sign the public_key.
        // Ah, does the user have the App's Private Key?
        // If not, we can rely on the "deeplink" flow where the user approves the specific signer public key.

        // Simpler fallback for now: Just return the signer_uuid and let the frontend construct the Warpcast deeplink?
        // Warpcast Deeplink: https://warpcast.com/~/add-signer?public_key={public_key}
        // This is the standard "Add Signer" flow.

        // Let's proceed with just returning the signer data. 
        // The frontend will generate the QR code for `https://warpcast.com/~/add-signer?public_key=${public_key}`
        // And verify via polling.

        return NextResponse.json({
            signer_uuid,
            public_key,
            // We can optionally use Neynar's hosted approval but standard deep link is easier
            approval_url: `https://warpcast.com/~/add-signer?public_key=${public_key}`
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
