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
      const url = `https://api.neynar.com/v2/farcaster/feed/user/replies_and_recasts?fid=${fid}&limit=100${cursor ? `&cursor=${cursor}` : ''}`;

      const res = await fetch(url, {
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
