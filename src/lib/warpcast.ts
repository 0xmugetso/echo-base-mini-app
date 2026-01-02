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

interface SignedKeyRequestResponse {
    result: {
        signedKeyRequest: {
            token: string;
            deeplinkUrl: string;
            key: string;
            requestFid: number;
            state: 'pending' | 'approved' | 'completed';
            isSponsored: boolean;
            userFid?: number;
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
        const headers: HeadersInit = {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        };

        if (process.env.WARPCAST_DC_SECRET) {
            headers['Authorization'] = `Bearer ${process.env.WARPCAST_DC_SECRET}`;
        }

        const response = await fetch(url, { headers });
        if (!response.ok) {
            console.error(`[Warpcast] Failed to fetch user ${fid} status: ${response.status}`);
            return null;
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

    const url = `${WARPCAST_API_BASE}/casts`;

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
            return null;
        }

        return data.result.cast;
    } catch (e) {
        console.error('[Warpcast] Publish error:', e);
        return null;
    }
}

/**
 * Creates a Signed Key Request via Warpcast API.
 * @param publicKey The public key (hex) of the keypair to approve.
 * @param name Optional name for the key.
 */
export async function createSignedKeyRequest(publicKey: string, name: string = 'Echo Mini App'): Promise<SignedKeyRequestResponse['result']['signedKeyRequest'] | null> {
    if (!process.env.WARPCAST_DC_SECRET) {
        console.error('[Warpcast] Missing WARPCAST_DC_SECRET');
        throw new Error("Server Error: Missing WARPCAST_DC_SECRET");
    }

    if (!process.env.WARPCAST_APP_FID) {
        console.error('[Warpcast] Missing WARPCAST_APP_FID');
        throw new Error("Server Error: Missing WARPCAST_APP_FID");
    }

    const requestFid = parseInt(process.env.WARPCAST_APP_FID, 10);

    try {
        console.log(`[Warpcast] Creating signer for ${publicKey} with secret length ${process.env.WARPCAST_DC_SECRET.length} and App FID ${requestFid}`);

        const response = await fetch(`${WARPCAST_API_BASE}/signed-key-requests`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.WARPCAST_DC_SECRET}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ key: publicKey, name, requestFid })
        });

        const data = await response.json();
        if (!response.ok) {
            console.error('[Warpcast] Create Signer failed:', JSON.stringify(data));
            const msg = data.errors?.[0]?.message || 'Unknown Warpcast Error';
            throw new Error(`Warpcast API Error: ${msg}`);
        }
        return data.result.signedKeyRequest;
    } catch (e: any) {
        console.error('[Warpcast] Create Signer error:', e);
        throw e; // Re-throw to be caught by API route
    }
}

/**
 * Checks the status of a Signed Key Request.
 * @param token The token from the create request.
 */
export async function getSignedKeyRequestStatus(token: string): Promise<SignedKeyRequestResponse['result']['signedKeyRequest'] | null> {
    if (!process.env.WARPCAST_DC_SECRET) return null;

    try {
        const response = await fetch(`${WARPCAST_API_BASE}/signed-key-requests?token=${token}`, {
            headers: {
                'Authorization': `Bearer ${process.env.WARPCAST_DC_SECRET}`,
                'Content-Type': 'application/json'
            }
        });

        const data = await response.json();
        if (!response.ok) {
            console.error('[Warpcast] Get Signer Status failed:', data);
            return null;
        }
        return data.result.signedKeyRequest;
    } catch (e) {
        console.error('[Warpcast] Get Signer Status error:', e);
        return null;
    }
}
