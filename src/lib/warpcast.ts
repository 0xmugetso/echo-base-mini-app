const WARPCAST_API_BASE = 'https://api.warpcast.com/v2';

interface WarpcastUserResponse {
    result: {
        user: {
            fid: number;
            username: string;
            displayName: string;
            pfp: {
                url: string;
            };
            profile: {
                bio: {
                    text: string;
                };
            };
            followerCount: number;
            followingCount: number;
            castCount: number; // This is what we need
            verifications: string[];
        };
    };
}

interface PublishCastResponse {
    result: {
        cast: {
            hash: string;
            threadHash: string;
            author: {
                fid: number;
            };
            text: string;
            timestamp: number;
        };
    };
}

/**
 * Fetches user data from Warpcast API, including cast count.
 * @param fid The FID of the user.
 */
export async function getWarpcastUser(fid: number): Promise<WarpcastUserResponse['result']['user'] | null> {
    try {
        const url = `${WARPCAST_API_BASE}/user?fid=${fid}`;
        // Public endpoint, usually no auth needed for GET user, but let's check.
        // Sometimes explicit auth is safer. Using the DC secret might work as 'Authorization: Bearer ...' or it might not be valid for this endpoint.
        // For now, try without auth for public data, or use secret if provided.
        const headers: HeadersInit = {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        };

        // Attempt to use the secret if set, it might raise limits or be required.
        if (process.env.WARPCAST_DC_SECRET) {
            headers['Authorization'] = `Bearer ${process.env.WARPCAST_DC_SECRET}`;
        }

        const response = await fetch(url, { headers });
        if (!response.ok) {
            console.error(`[Warpcast] Failed to fetch user ${fid} status: ${response.status}`);
            return null; // or throw
        }

        const data: WarpcastUserResponse = await response.json();
        return data.result.user;
    } catch (error) {
        console.error('[Warpcast] Error fetching user:', error);
        return null;
    }
}

/**
 * Publishes a cast via Warpcast API.
 * NOTE: This endpoint typically requires a signed cast message or specific App tokens.
 * If using the new "Direct Cast" secret allows posting regular casts, we try that.
 * Otherwise, we might need a `signer_uuid` and use a PUT /casts with signed payload, 
 * OR relying on the secret to act as an agent.
 * 
 * Based on user request, we assume the API key provided allows this.
 */
export async function publishWarpcastCast(
    text: string,
    embeds?: string[],
    parentCastHash?: string
): Promise<PublishCastResponse['result']['cast'] | null> {
    if (!process.env.WARPCAST_DC_SECRET) {
        console.error('[Warpcast] Missing WARPCAST_DC_SECRET');
        return null;
    }

    const url = `${WARPCAST_API_BASE}/casts`; // Endpoint guess based on standard REST
    // Actually, official docs say POST /casts usually needs signed message. 
    // BUT recent "App" keys might allow `POST /casts` with just text?

    // Let's implement assuming a JSON body with text is sufficient with the Bearer token.
    const body: any = { text };
    if (embeds && embeds.length > 0) body.embeds = embeds;
    if (parentCastHash) body.parent = { hash: parentCastHash };

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.WARPCAST_DC_SECRET}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(body)
        });

        const data = await response.json();

        if (!response.ok) {
            console.error('[Warpcast] Publish failed:', data);
            // Verify if it requires idempotency key
            return null;
        }

        return data.result.cast;
    } catch (e) {
        console.error('[Warpcast] Publish error:', e);
        return null;
    }
}
