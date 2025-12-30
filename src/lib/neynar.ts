import { NeynarAPIClient } from "@neynar/nodejs-sdk";

const NEYNAR_API_KEY = process.env.NEYNAR_API_KEY;

export async function fetchUserCastCount(fid: number): Promise<number> {
  if (!NEYNAR_API_KEY) {
    console.error("NEYNAR_API_KEY missing");
    return 0;
  }

  let cursor: string | null = null;
  let totalCasts = 0;
  let hasMore = true;

  // Safety limit to prevent timeouts on huge profiles
  const MAX_PAGES = 20;
  let page = 0;

  console.log(`[NEYNAR] Counting casts for FID: ${fid}...`);

  try {
    while (hasMore && page < MAX_PAGES) {
      // Refactored to avoid TS "referenced in own initializer" error
      const baseUrl = "https://api.neynar.com/v2/farcaster/feed/user/replies_and_recasts";
      const params = new URLSearchParams();
      params.append("fid", fid.toString());
      params.append("limit", "100");
      if (cursor) {
        params.append("cursor", cursor);
      }

      const finalUrl = `${baseUrl}?${params.toString()}`;

      const res = await fetch(finalUrl, {
        headers: {
          'accept': 'application/json',
          'x-api-key': NEYNAR_API_KEY
        }
      });

      if (!res.ok) {
        console.error(`[NEYNAR] Error fetching casts: ${res.statusText}`);
        break;
      }

      const data = await res.json();
      const casts = data.casts || [];

      totalCasts += casts.length;

      cursor = data.next?.cursor;
      if (!cursor) hasMore = false;

      page++;
    }

    console.log(`[NEYNAR] Total Casts for ${fid}: ${totalCasts} (Pages: ${page})`);
    return totalCasts;

  } catch (e) {
    console.error("[NEYNAR] Cast count failed", e);
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
  return new NeynarAPIClient(NEYNAR_API_KEY);
}
