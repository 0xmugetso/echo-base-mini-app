import { NextResponse } from 'next/server';

export async function GET() {
    return NextResponse.json({
        name: "Echo Cards",
        description: "Echo Cards capture your onchain legacy on Base and Farcaster. Verified by Echo.",
        image: "https://echo-base-mini-app.vercel.app/logo.png", // Fallback/Project Logo
        external_link: "https://echo-base-mini-app.vercel.app",
        seller_fee_basis_points: 0, // No royalties for now
        fee_recipient: "0x0000000000000000000000000000000000000000"
    });
}
