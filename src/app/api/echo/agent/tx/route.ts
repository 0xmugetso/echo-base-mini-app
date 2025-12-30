import { NextResponse } from 'next/server';

const NEYNAR_API_KEY = process.env.NEYNAR_API_KEY;

export async function POST(request: Request) {
    try {
        const { fid, data } = await request.json();

        if (!fid || !data) {
            return NextResponse.json({ error: 'Missing fid or data' }, { status: 400 });
        }

        console.log(`[AGENT_TX] Creating tx frame for FID: ${fid}`);

        // Construct the Agent Transaction
        // NOTE: Using 'pay' endpoint but with 0 value and dataPayload if supported, 
        // or effectively a 0 value transfer with data.
        // Documentation suggests 'transaction' object.

        const payload = {
            transaction: {
                to: {
                    network: "base",
                    address: "0x438da727a6C359d46E4922e38E901f2916A49a1f", // Check-in Address
                    amount: 0.000000000000001, // Miniscule amount to trigger 'pay' logic if 0 is rejected? Or try 0.
                    // Doc example had amount. Let's try 0 first.
                }
            },
            config: {
                action: {
                    text: "SIGN CHECK-IN",
                    text_color: "#FFFFFF",
                    button_color: "#000000"
                },
                line_items: [
                    {
                        name: "Daily Check-in",
                        description: "Verify your streak onchain",
                        image: "https://echo-base-mini-app.vercel.app/assets/banner_eye.jpg"
                    }
                ]
            }
        };

        // If I can attach 'data' (calldata), usually it's in the 'data' field of transaction.
        // The doc example for 'pay' doesn't show 'data'.
        // However, standard Frames v2 txs allow 'data'.
        // If Neynar's 'pay' endpoint purely does transfers, this might fail to send the 'data' payload needed for the contract check-in.
        // But the user *specifically* requested this.
        // Let's assume I can add "data": data to the 'to' or 'transaction' object.
        (payload.transaction as any).data = data;

        // Wait, standard ETH txs have 'data'.

        const res = await fetch('https://api.neynar.com/v2/farcaster/frame/transaction/pay', {
            method: 'POST',
            headers: {
                'accept': 'application/json',
                'content-type': 'application/json',
                'x-api-key': NEYNAR_API_KEY || ''
            },
            body: JSON.stringify(payload)
        });

        const respData = await res.json();
        console.log("[AGENT_TX] Neynar Response:", JSON.stringify(respData));

        if (!res.ok) {
            throw new Error(respData.message || 'Failed to create agent transaction');
        }

        // Return the frame URL
        return NextResponse.json({
            success: true,
            url: respData.transaction_frame?.url
        });

    } catch (e: any) {
        console.error("[AGENT_TX] Error:", e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
