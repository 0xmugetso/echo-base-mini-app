import { NextResponse } from 'next/server';
import dbConnect from '../../../../../lib/db';
import EchoNFT from '../../../../../models/EchoNFT';

export async function GET(
    request: Request,
    { params }: { params: { id: string } }
) {
    const tokenId = parseInt(params.id);

    try {
        await dbConnect();
        const nftRecord = await EchoNFT.findOne({ tokenId });

        if (!nftRecord) {
            return NextResponse.json({ error: 'NFT not found' }, { status: 404 });
        }

        // Return standard ERC-721 Metadata
        return NextResponse.json({
            name: `Echo Onchain Stats #${tokenId}`,
            description: `A snapshot of ${nftRecord.address}'s onchain legacy on Base and Farcaster. Verified by Echo.`,
            image: nftRecord.imageUrl,
            external_url: `https://echo-base-mini-app.vercel.app/profile/${nftRecord.fid}`,
            attributes: [
                {
                    trait_type: "Points",
                    value: nftRecord.points
                },
                {
                    trait_type: "FID",
                    value: nftRecord.fid
                }
            ]
        });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
