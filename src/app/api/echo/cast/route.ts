import { NextResponse } from 'next/server';
import { getNeynarClient } from '~/lib/neynar';

export async function POST(req: Request) {
    try {
        const { signer_uuid, text, parent, channelId } = await req.json();

        if (!signer_uuid || !text) {
            return NextResponse.json({ error: "Missing signer_uuid or text" }, { status: 400 });
        }

        console.log(`[CAST] Publishing cast with signer ${signer_uuid}...`);

        const client = getNeynarClient();

        const cast = await client.publishCast({
            signerUuid: signer_uuid,
            text,
            parent: parent || (channelId ? channelId : undefined),
            // SDK might handle 'channelId' differently in 'parent' param depending on version, 
            // but standard 'parent' as string hash/url works.
        });

        // SDK v2 return type structure check
        const castHash = cast.cast?.hash || (cast as any).hash;

        console.log("[CAST] Success:", castHash);

        return NextResponse.json({
            success: true,
            hash: castHash,
            cast: cast
        });

    } catch (error: any) {
        console.error("[CAST] SDK Error:", error);
        // Extract helpful message
        const msg = error.response?.data?.message || error.message || "Failed to publish";
        return NextResponse.json({ error: msg }, { status: 500 });
    }
}
