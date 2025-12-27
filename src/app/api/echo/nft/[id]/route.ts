import { NextResponse } from 'next/server';
import dbConnect from '../../../../../lib/db';
import EchoNFT from '../../../../../models/EchoNFT';
import EchoProfile from '../../../../../models/EchoProfile';
import UserStats from '../../../../../models/UserStats';

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const tokenId = parseInt(id);

    try {
        await dbConnect();
        const nftRecord = await EchoNFT.findOne({ tokenId });

        if (!nftRecord) {
            return NextResponse.json({ error: 'NFT not found' }, { status: 404 });
        }

        // Fetch additional profile and stats data
        const profile = await EchoProfile.findOne({ fid: nftRecord.fid });
        const userStats = await UserStats.findOne({ address: nftRecord.address });

        const attributes = [
            { trait_type: "Points", value: nftRecord.points },
            { trait_type: "FID", value: nftRecord.fid },
            { trait_type: "Username", value: profile?.username || "Anon" },
            { trait_type: "Join Date", value: profile?.createdAt ? new Date(profile.createdAt).toISOString().split('T')[0] : "Unknown" },
        ];

        if (userStats?.stats) {
            attributes.push(
                { trait_type: "Total Transactions", value: userStats.stats.total_tx },
                { trait_type: "Wallet Age (Days)", value: userStats.stats.wallet_age_days || 0 },
                { trait_type: "Volume (USD)", value: Math.round(userStats.stats.total_volume_usd || 0) },
                { trait_type: "Degen Holder", value: userStats.stats.farcaster?.holdings?.degen ? "Yes" : "No" },
                { trait_type: "Warplets Holder", value: userStats.stats.farcaster?.holdings?.warplets ? "Yes" : "No" },
                { trait_type: "Best Cast Likes", value: userStats.stats.farcaster?.best_cast?.likes || 0 }
            );
        }

        if (profile) {
            attributes.push(
                { trait_type: "Referrals", value: profile.referralStats?.count || 0 },
                { trait_type: "Streak Current", value: profile.streak?.current || 0 },
                { trait_type: "Streak Highest", value: profile.streak?.highest || 0 }
            );
        }

        // Return standard ERC-721 Metadata
        return NextResponse.json({
            name: `Echo # ${profile?.username?.toUpperCase() || nftRecord.fid}`,
            description: `Echo Card for ${profile?.username || nftRecord.address}. Verifying onchain activity on Base and Farcaster.`,
            image: nftRecord.imageUrl,
            external_url: `https://echo-base-mini-app.vercel.app/profile/${nftRecord.fid}`,
            attributes: attributes
        });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
