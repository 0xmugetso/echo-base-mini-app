import { NextResponse } from 'next/server';
import dbConnect from '../../../../lib/db';
import PaidScan from '../../../../models/PaidScan';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const fidParam = searchParams.get('fid');
        const addressParam = searchParams.get('address');

        if (!fidParam) {
            return NextResponse.json({ error: 'Missing fid' }, { status: 400 });
        }

        const fid = parseInt(fidParam);
        await dbConnect();

        if (addressParam) {
            const address = addressParam.toLowerCase().trim();
            const scan = await PaidScan.findOne({ fid, address });
            if (scan) {
                return NextResponse.json({ exists: true, stats: scan.stats, txHash: scan.txHash });
            }
            return NextResponse.json({ exists: false });
        }

        // Fetch all history for this user
        const history = await PaidScan.find({ fid })
            .sort({ scannedAt: -1 })
            .lean();

        return NextResponse.json({ success: true, history });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { fid, address, stats, txHash } = body;

        if (!fid || !address || !stats) {
            return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
        }

        await dbConnect();

        const scan = await PaidScan.findOneAndUpdate(
            { fid: Number(fid), address: address.toLowerCase().trim() },
            {
                stats,
                txHash,
                scannedAt: new Date()
            },
            { upsert: true, new: true }
        );

        return NextResponse.json({ success: true, scan });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
