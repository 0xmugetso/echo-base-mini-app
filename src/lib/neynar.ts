import { NeynarAPIClient } from "@neynar/nodejs-sdk";

const NEYNAR_API_KEY = process.env.NEYNAR_API_KEY;

export async function fetchUserCastCount(fid: number): Promise<number> {
  console.log(`[NEYNAR] Fetching total cast count for FID: ${fid}...`);

  try {
    // 1. Try Storage API (Canonical Hubble count)
    // This is the most accurate way to get the total number of casts according to Farcaster docs.
    if (NEYNAR_API_KEY) {
      try {
        const storageUrl = `https://api.neynar.com/v2/farcaster/hub/storageLimitsByFid?fid=${fid}`;
        const res = await fetch(storageUrl, {
          headers: { 'accept': 'application/json', 'api_key': NEYNAR_API_KEY }
        });
        if (res.ok) {
          const data = await res.json();
          const castLimit = data.limits?.find((l: any) => l.storeType === 'Casts');
          if (castLimit && typeof castLimit.used === 'number') {
            console.log(`[NEYNAR] Success via Storage API: ${castLimit.used}`);
            return castLimit.used;
          }
        }
      } catch (err) {
        console.warn("[NEYNAR] Storage API failed, falling back to manual count...", err);
      }
    }

    // 2. Fallback: Manual Paging (User Suggested Method)
    // Paginates through all casts to count them.
    console.log("[NEYNAR] Starting manual cast pagination count...");
    const client = getNeynarClient();
    let totalCount = 0;
    let cursor: string | undefined;
    let hasMore = true;
    let pages = 0;
    const MAX_PAGES = 100; // Safety limit: 100 * 150 = 15,000 casts

    while (hasMore && pages < MAX_PAGES) {
      const data: any = await client.fetchCastsForUser({
        fid,
        limit: 150,
        ...(cursor && cursor.trim() !== "" ? { cursor } : {}),
      });

      totalCount += (data.casts || []).length;
      cursor = data.next?.cursor;
      hasMore = !!cursor;
      pages++;

      if (pages % 5 === 0) console.log(`[NEYNAR] Counted ${totalCount} casts so far... (${pages} pages)`);
    }

    console.log(`[NEYNAR] Final manual count: ${totalCount} (${pages} pages)`);

    // 3. Last Fallback: User Stats
    if (totalCount === 0) {
      const user = await getNeynarUser(fid);
      if (user?.stats?.cast_count) return user.stats.cast_count;
    }

    return totalCount;
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
