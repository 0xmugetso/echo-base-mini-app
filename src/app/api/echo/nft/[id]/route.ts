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
            { trait_type: "FID", value: nftRecord.fid },
            { trait_type: "Username", value: nftRecord.username || profile?.username || "Anon" },
            { trait_type: "Join Date", value: nftRecord.joinDate || (profile?.createdAt ? new Date(profile.createdAt).toISOString().split('T')[0] : "Unknown") },

            // Snapshot Stats (Rounded & Clean)
            { trait_type: "Neynar Score", value: Math.round(nftRecord.neynarScore ?? 0) },
            { trait_type: "Total Casts", value: Math.round(nftRecord.castCount ?? 0) },
            { trait_type: "Total Transactions", value: Math.round(nftRecord.totalTx ?? userStats?.stats?.total_tx ?? 0) },
            { trait_type: "Volume (USD)", value: Math.round(nftRecord.totalVolume ?? userStats?.stats?.total_volume_usd ?? 0) },
            { trait_type: "Gas Paid (ETH)", value: parseFloat(nftRecord.gasPaid || "0").toFixed(4) }, // Keep 4 decimals for ETH as it's small
            { trait_type: "Biggest Tx (USD)", value: Math.round(nftRecord.biggestTx ?? userStats?.stats?.biggest_single_tx ?? 0) },
        ];

        if (userStats?.stats) {
            attributes.push(
                { trait_type: "Wallet Age (Days)", value: Math.round(userStats.stats.wallet_age_days || 0) },
                { trait_type: "Degen Holder", value: userStats.stats.farcaster?.holdings?.degen ? "Yes" : "No" },
                { trait_type: "Warplets Holder", value: userStats.stats.farcaster?.holdings?.warplets ? "Yes" : "No" },
                { trait_type: "Best Cast Likes", value: Math.round(userStats.stats.farcaster?.best_cast?.likes || 0) }
            );
        }

        // Profile stats removed as requested (kept minimal)

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
