import { NextRequest, NextResponse } from 'next/server';
import { sendDirectCast } from '@/lib/direct-casts';

export async function PUT(req: NextRequest) {
    try {
        const body = await req.json();
        const { recipientFid, message, idempotencyKey } = body;

        if (!recipientFid || !message) {
            return NextResponse.json(
                { error: 'Missing required fields: recipientFid, message' },
                { status: 400 }
            );
        }

        const fid = Number(recipientFid);
        if (isNaN(fid)) {
            return NextResponse.json(
                { error: 'Invalid recipientFid' },
                { status: 400 }
            );
        }

        const result = await sendDirectCast(fid, message, idempotencyKey);

        if (!result.success) {
            return NextResponse.json(
                { error: result.error },
                { status: 500 }
            );
        }

        return NextResponse.json({ success: true, data: result.result });
    } catch (error: any) {
        console.error('API Error:', error);
        return NextResponse.json(
            { error: 'Internal Server Error' },
            { status: 500 }
        );
    }
}
