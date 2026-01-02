import { NextRequest, NextResponse } from 'next/server';
import { createSignedKeyRequest, getSignedKeyRequestStatus } from '~/lib/warpcast';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { publicKey, name } = body;

        if (!publicKey) return NextResponse.json({ error: "Missing publicKey" }, { status: 400 });

        const result = await createSignedKeyRequest(publicKey, name);
        // Result is guaranteed if no error thrown

        return NextResponse.json(result);
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get('token');

    if (!token) return NextResponse.json({ error: "Missing token" }, { status: 400 });

    const result = await getSignedKeyRequestStatus(token);
    if (!result) return NextResponse.json({ error: "Failed to get status" }, { status: 500 });

    return NextResponse.json(result);
}
