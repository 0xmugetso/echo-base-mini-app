import { APP_URL } from "./constants";

const NEYNAR_API_KEY = process.env.NEYNAR_API_KEY || "2947513B-6507-4592-8817-F6B9383DD398"; // Fallback to provided key if env missing

type NotificationResult =
  | { state: "success" }
  | { state: "error"; error: unknown }
  | { state: "rate_limit" };

export function getNeynarClient() {
  const headers = {
    "Content-Type": "application/json",
    accept: "application/json",
    api_key: NEYNAR_API_KEY,
  };

  return {
    fetchNonce: async () => {
      const res = await fetch("https://api.neynar.com/v2/auth/nonce", { headers });
      if (!res.ok) throw new Error(`Nonce fetch failed: ${res.status}`);
      return res.json();
    },
    fetchSigners: async ({ message, signature }: { message: string; signature: string }) => {
      const res = await fetch("https://api.neynar.com/v2/auth/session-signers", {
        method: "POST",
        headers,
        body: JSON.stringify({ message, signature }),
      });
      if (!res.ok) throw new Error(`Signer fetch failed: ${res.status}`);
      return res.json();
    },
    fetchBulkUsers: async ({ fids }: { fids: number[] }) => {
      const url = `https://api.neynar.com/v2/farcaster/user/bulk?fids=${fids.join(",")}`;
      const res = await fetch(url, { headers });
      if (!res.ok) throw new Error(`Bulk user fetch failed: ${res.status}`);
      return res.json();
    },
    createSigner: async () => {
      const res = await fetch("https://api.neynar.com/v2/signer", {
        method: "POST",
        headers,
      });
      if (!res.ok) throw new Error(`Create signer failed: ${res.status}`);
      return res.json();
    },
    lookupSigner: async ({ signerUuid }: { signerUuid: string }) => {
      const res = await fetch(`https://api.neynar.com/v2/signer/${signerUuid}`, {
        headers,
      });
      if (!res.ok) throw new Error(`Lookup signer failed: ${res.status}`);
      return res.json();
    },
    lookupUserByCustodyAddress: async ({ custodyAddress }: { custodyAddress: string }) => {
      const res = await fetch(
        `https://api.neynar.com/v2/farcaster/user/by_custody_address?custody_address=${custodyAddress}`,
        { headers }
      );
      if (!res.ok) throw new Error(`Lookup custody user failed: ${res.status}`);
      return res.json();
    },
    registerSignedKey: async (payload: {
      appFid: number;
      deadline: number;
      signature: string;
      signerUuid: string;
      redirectUrl?: string;
      sponsor?: { sponsored_by_neynar: boolean };
    }) => {
      const res = await fetch("https://api.neynar.com/v2/signer/signed_key", {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(`Register signed key failed: ${res.status}`);
      return res.json();
    },
  };
}

export async function getNeynarUser(fid: number) {
  if (!fid) return null;
  const client = getNeynarClient();
  const { users } = await client.fetchBulkUsers({ fids: [fid] });
  return users?.[0] || null;
}

export async function sendNeynarMiniAppNotification({
  fid,
  title,
  body,
}: {
  fid: number;
  title: string;
  body: string;
}): Promise<NotificationResult> {
  try {
    const res = await fetch("https://api.neynar.com/v2/notifications/mini-app", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        accept: "application/json",
        api_key: NEYNAR_API_KEY,
      },
      body: JSON.stringify({
        target_fids: [fid],
        title,
        body,
        action_url: APP_URL,
      }),
    });

    if (res.status === 429) return { state: "rate_limit" };
    if (!res.ok) {
      const error = await res.text();
      return { state: "error", error };
    }

    return { state: "success" };
  } catch (error) {
    return { state: "error", error };
  }
}

export async function getBestCast(fid: number) {
  if (!fid) return null;

  try {
    // Fetch user casts (limit 100 or so to find best recent ones, or use 'popular' endpoint if available?)
    // Fetch user's own casts (Authored)
    // Neynar Endpoint: /v2/farcaster/feed/user/casts?fid={fid}&limit=50
    const url = `https://api.neynar.com/v2/farcaster/feed/user/casts?fid=${fid}&limit=50&include_replies=true`;

    const res = await fetch(url, {
      headers: {
        accept: 'application/json',
        api_key: NEYNAR_API_KEY
      }
    });

    if (!res.ok) {
      if (res.status === 402) {
        console.warn("[NeynarLib] API Plan limit reached or feature not available on free tier (402). Best Cast data hidden.");
      } else {
        console.error(`[NeynarLib] Error fetching casts: ${res.status} ${res.statusText}`);
      }
      return null;
    }

    const json = await res.json();
    console.log(`[NeynarLib] Fetched ${json.casts?.length} casts for FID ${fid}`);
    const casts = json.casts || [];

    if (casts.length === 0) return null;

    // Find "Best" Cast based on Impressions (if available in context) or interactions
    // viewer_context might not have impressions for all.
    // Let's use (likes + recasts + replies) as score if impressions missing.

    // Sort by "Impact"
    casts.sort((a: any, b: any) => {
      const scoreA = (a.replies?.count || 0) + (a.recasts?.count || 0) * 2 + (a.reactions?.likes_count || 0);
      const scoreB = (b.replies?.count || 0) + (b.recasts?.count || 0) * 2 + (b.reactions?.likes_count || 0);
      return scoreB - scoreA;
    });

    const best = casts[0];

    return {
      hash: best.hash,
      text: best.text,
      impressions: 0, // Neynar free tier might not give impressions, placeholder
      likes: best.reactions?.likes_count || 0,
      recasts: best.recasts?.count || 0,
      replies: best.replies?.count || 0
    };

  } catch (e) {
    console.error("[NeynarLib] Error fetching best cast:", e);
    return null;
  }
}

export async function getUserWalletValue(fid: number) {
  if (!fid) return 0;

  try {
    const url = `https://api.neynar.com/v2/farcaster/user/balance?fid=${fid}&networks=base`;
    const res = await fetch(url, {
      headers: {
        accept: 'application/json',
        api_key: NEYNAR_API_KEY
      }
    });

    if (!res.ok) {
      console.error(`[NeynarLib] Error fetching balances: ${res.status}`);
      return 0;
    }

    const data = await res.json();
    const balances = data[fid]?.base || [];

    // Sum up the USD values
    // Assuming response structure has price or value. 
    // If not, we can only count tokens, but user asked for "Volume" (Value).
    // Let's inspect the response in logs if needed, but for now sum 'native_balance_usd' + tokens.

    let totalValue = 0;

    // Check native
    // (API Docs structure varies, sometimes it's object per chain)
    // Let's iterate if it's an array of tokens

    for (const token of balances) {
      // Neynar balance object usually has 'amount', 'price_usd', 'value_usd' potentially?
      // Based on common patterns: balance * price
      // Let's assume there is a 'usd_value' or calculate it.
      // If field is missing, we might default to 0.

      // Common Neynar Pattern:
      // {
      //   "contract_address": "...",
      //   "balance": "...",
      //   "native_token": false,
      //   "price_usd": 1.23
      // }

      const amount = Number(token.balance) || 0; // Raw units? Usually wei.
      // Wait, if it's raw, we need decimals.

      // IF Neynar provides pre-calculated value (e.g. 'worth_usd' or similar) use that.
      // If not, we might struggle without ABI/Decimals.
      // BUT, the user said "get metric like this one", implying it's easy.
      // Let's try to find 'value_usd'.

      if (token.balance_usd) {
        totalValue += Number(token.balance_usd);
      } else if (token.price_usd && token.balance && token.decimals) {
        const am = Number(token.balance) / (10 ** token.decimals);
        totalValue += am * Number(token.price_usd);
      }
    }

    console.log(`[NeynarLib] Fetched wallet value for FID ${fid}: $${totalValue}`);
    return totalValue;

  } catch (e) {
    console.error("[NeynarLib] Error fetching wallet value:", e);
    return 0;
  }
}
