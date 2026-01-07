import { NeynarAPIClient } from "@neynar/nodejs-sdk";

const NEYNAR_API_KEY = process.env.NEYNAR_API_KEY;

export async function fetchUserCastCount(fid: number): Promise<number> {
  if (!NEYNAR_API_KEY) {
    console.error("[NEYNAR] API key missing");
    return 0;
  }

  let totalCasts = 0;
  let cursor: string | null = null;
  let hasMore = true;
  let page = 0;
  const MAX_PAGES = 1000; // High safety limit

  console.log(`[NEYNAR] Starting comprehensive count for FID: ${fid}...`);

  try {
    while (hasMore && page < MAX_PAGES) {
      const cursorParam: string = cursor ? `&cursor=${cursor}` : '';
      const url: string = `https://api.neynar.com/v2/farcaster/feed/user/casts?fid=${fid}&limit=150&include_replies=true&include_recasts=true${cursorParam}`;

      const res: Response = await fetch(url, {
        headers: {
          'accept': 'application/json',
          'api_key': NEYNAR_API_KEY
        }
      });

      if (!res.ok) {
        console.error(`[NEYNAR] API error on page ${page}: ${res.status}`);
        break;
      }

      const data: any = await res.json();
      console.log(`[NEYNAR] DEBUG Page ${page} RAW DATA KEYS:`, Object.keys(data));
      console.log(`[NEYNAR] DEBUG Page ${page} RAW DATA:`, JSON.stringify(data, null, 2));

      // Check for common Neynar response structures
      const casts: any[] = data.casts || data.result?.casts || [];
      console.log(`[NEYNAR] Page ${page}: +${casts.length} casts found. (Total so far: ${totalCasts + casts.length})`);

      totalCasts += casts.length;

      cursor = data.next?.cursor || data.result?.next?.cursor || null;
      if (!cursor || casts.length === 0) {
        hasMore = false;
      }
      page++;
    }

    console.log(`[NEYNAR] Final Total for ${fid}: ${totalCasts}`);
    return totalCasts;

  } catch (e) {
    console.error("[NEYNAR] Comprehensive count failed:", e);
    return 0;
  }
}

// Internal Raw Fetch Helper
async function fetchUserCastCountRaw(fid: number): Promise<number> {
  if (!NEYNAR_API_KEY) return 0;
  try {
    let cursor: string | null = null;
    let total = 0;
    let hasMore = true;
    let page = 0;
    const MAX = 200; // Safety

    while (hasMore && page < MAX) {
      const cursorParam = cursor ? `&cursor=${cursor}` : '';
      const requestUrl: string = `https://api.neynar.com/v2/farcaster/feed/user/casts?fid=${fid}&limit=150&include_replies=true&include_recasts=true${cursorParam}`;

      const res: Response = await fetch(requestUrl, {
        headers: {
          'accept': 'application/json',
          'api_key': NEYNAR_API_KEY
        }
      });
      if (!res.ok) break;

      const data = await res.json();
      const list = data.casts || [];
      total += list.length;
      console.log(`[NEYNAR] RAW Page ${page}: +${list.length} (Total: ${total})`);

      cursor = data.next?.cursor;
      if (!cursor) hasMore = false;
      page++;
    }
    return total;
  } catch (e) {
    console.error("Raw fetch failed", e);
    return 0;
  }
}

type SendNotificationResult =
  | { state: "success" }
  | { state: "error"; error: string }
  | { state: "rate_limit" };

export async function sendNeynarMiniAppNotification({
  fid,
  title,
  body,
}: {
  fid: number;
  title: string;
  body: string;
}): Promise<SendNotificationResult> {
  if (!NEYNAR_API_KEY) {
    return { state: "error", error: "Missing NEYNAR_API_KEY" };
  }

  try {
    const response = await fetch(
      "https://api.neynar.com/v2/farcaster/frame/notification",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": NEYNAR_API_KEY,
        },
        body: JSON.stringify({
          fid,
          title,
          body,
        }),
      }
    );

    if (response.ok) {
      return { state: "success" };
    }

    if (response.status === 429) {
      return { state: "rate_limit" };
    }

    const data = await response.json();
    return { state: "error", error: data.message || "Failed to send notification" };

  } catch (error: any) {
    return { state: "error", error: error.message };
  }
}

export async function getUserWalletValue(fid: number): Promise<number> {
  return 0;
}

export async function getBestCast(fid: number): Promise<any> {
  if (!NEYNAR_API_KEY) return null;
  try {
    const requestUrl = `https://api.neynar.com/v2/farcaster/feed/user/popular?fid=${fid}&limit=1`;
    const res = await fetch(requestUrl, { headers: { 'accept': 'application/json', 'api_key': NEYNAR_API_KEY } });
    const data = await res.json();
    return data.casts?.[0] || null;
  } catch { return null; }
}

export async function getNeynarUser(fid: number): Promise<any> {
  if (!NEYNAR_API_KEY) return null;
  try {
    const requestUrl = `https://api.neynar.com/v2/farcaster/user/bulk?fids=${fid}`;
    const res = await fetch(requestUrl, { headers: { 'accept': 'application/json', 'api_key': NEYNAR_API_KEY } });
    const data = await res.json();
    return data.users?.[0] || null;
  } catch { return null; }
}

export function getNeynarClient() {
  if (!NEYNAR_API_KEY) {
    throw new Error("Make sure NEYNAR_API_KEY is set in your .env file");
  }
  return new NeynarAPIClient({ apiKey: NEYNAR_API_KEY });
}
