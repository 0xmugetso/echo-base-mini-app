const WARPCAST_API_BASE = 'https://api.warpcast.com/v2';
const WARPCAST_DC_SECRET = process.env.WARPCAST_DC_SECRET;

interface SendDirectCastResult {
    success: boolean;
    error?: string;
    result?: any;
}

/**
 * Sends a Direct Cast (private message) to a user via Warpcast API.
 * @param recipientFid The FID of the user to send the message to.
 * @param message The text content of the message.
 * @param idempotencyKey Optional idempotency key. If not provided, a random UUID will be generated.
 */
export async function sendDirectCast(
    recipientFid: number,
    message: string,
    idempotencyKey?: string
): Promise<SendDirectCastResult> {
    if (!WARPCAST_DC_SECRET) {
        console.error('WARPCAST_DC_SECRET is not set');
        return { success: false, error: 'Configuration error: Missing Secret' };
    }

    const key = idempotencyKey || crypto.randomUUID();
    const url = `${WARPCAST_API_BASE}/ext-send-direct-cast`;

    try {
        const response = await fetch(url, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${WARPCAST_DC_SECRET}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                recipientFid,
                message,
                idempotencyKey: key,
            }),
        });

        const data = await response.json();

        if (!response.ok) {
            console.error('Failed to send direct cast:', data);
            return {
                success: false,
                error: data.errors?.[0]?.message || 'Unknown error from Warpcast API',
                result: data
            };
        }

        return { success: true, result: data.result };

    } catch (error: any) {
        console.error('Error sending direct cast:', error);
        return { success: false, error: error.message || 'Network error' };
    }
}
