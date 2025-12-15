import { NextResponse } from 'next/server';
import dbConnect from '../../../../lib/db';
import EchoProfile from '../../../../models/EchoProfile';

export async function GET(request: Request, { params }: { params: { id: string } }) {
    try {
        const tokenId = parseInt(params.id);

        await dbConnect();

        // Find profile associated with this Token ID
        // Note: This requires the minting process to call back and save the tokenId to the profile
        const profile = await EchoProfile.findOne({ nftTokenId: tokenId });

        if (!profile) {
            // Fallback or pending metadata
            return NextResponse.json({
                name: `Echo Pioneer #${tokenId}`,
                description: "This Echo has not yet been revealed.",
                image: "https://echo-mini-app.vercel.app/assets/placeholder_nft.png"
            });
        }

        return NextResponse.json({
            name: `Echo Pioneer #${tokenId}`,
            description: `Onchain History for ${profile.fid}. Verified by Echo.`,
            image: profile.nftImage || "https://echo-mini-app.vercel.app/assets/placeholder_nft.png",
            attributes: [
                { trait_type: "Points", value: profile.points },
                { trait_type: "Streak", value: profile.streak.current },
                { trait_type: "Join Date", value: new Date(profile.createdAt).toISOString().split('T')[0] }
            ]
        });

    } catch (e) {
        return NextResponse.json({ error: "Metadata Error" }, { status: 500 });
    }
}
