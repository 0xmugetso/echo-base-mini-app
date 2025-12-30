import { NeynarAPIClient } from "@neynar/nodejs-sdk";

const NEYNAR_API_KEY = process.env.NEYNAR_API_KEY;

export async function fetchUserCastCount(fid: number): Promise<number> {
  const client = getNeynarClient();
  let cursor: string | undefined;
  let totalCasts = 0;
  let hasMore = true;
  const MAX_PAGES = 1000; // High limit to ensure we get everything
  let page = 0;

  console.log(`[NEYNAR] SDK: Counting casts for FID: ${fid}...`);

  try {
    while (hasMore && page < MAX_PAGES) {
      const data = await client.fetchCastsForUser({
        fid,
        limit: 150,
        cursor
      });

      const casts = data.casts || [];
      totalCasts += casts.length;
      console.log(`[NEYNAR] Page ${page}: +${casts.length} casts (Total: ${totalCasts})`);

      cursor = data.next?.cursor || undefined;
      if (!cursor) hasMore = false;
      page++;
    }
    return totalCasts;

  } catch (e) {
    console.error("[NEYNAR] SDK Cast count failed", e);
    return totalCasts; // Return whatever we counted so far
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
