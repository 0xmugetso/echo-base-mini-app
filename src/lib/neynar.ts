import { NeynarAPIClient } from "@neynar/nodejs-sdk";

const NEYNAR_API_KEY = process.env.NEYNAR_API_KEY;

export async function fetchUserCastCount(fid: number): Promise<number> {
  console.log(`[NEYNAR] Fetching total cast count for FID: ${fid}...`);

  try {
    // 1. Try getting from Neynar User Stats (Most reliable total)
    const user = await getNeynarUser(fid);

    if (!user) {
      console.warn(`[NEYNAR] User not found for FID: ${fid}`);
      return 0;
    }

    console.log(`[NEYNAR] User data for FID ${fid}:`, JSON.stringify(user).slice(0, 500));

    // Try all possible paths for cast count in Neynar response
    const castCount =
      user.stats?.cast_count ??
      user.stats?.castCount ??
      user.cast_count ??
      user.castCount ??
      user.profile?.stats?.cast_count ??
      0;

    if (typeof castCount === 'number' && castCount > 0) {
      console.log(`[NEYNAR] Success via Stats: ${castCount}`);
      return castCount;
    }

    // 2. Fallback to manual counting ONLY if stats missing or 0
    console.log("[NEYNAR] Stats missing or 0, falling back to manual pagination...");
    const client = getNeynarClient();
    let cursor: string | undefined;
    let totalCasts = 0;
    let hasMore = true;
    let page = 0;

    while (hasMore && page < 20) { // Limit pages for fallback
      const data = await client.fetchCastsForUser({
        fid,
        limit: 150,
        cursor,
        includeReplies: true,
        includeRecasts: true
      } as any);

      const pageCount = (data.casts || []).length;
      totalCasts += pageCount;
      console.log(`[NEYNAR] Manual Page ${page}: +${pageCount} (Total: ${totalCasts})`);

      cursor = data.next?.cursor || undefined;
      if (!cursor || pageCount === 0) hasMore = false;
      page++;
    }

    return totalCasts;
  } catch (e) {
    console.error("[NEYNAR] Cast count failed", e);
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
