import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const fids = searchParams.get('fids');
  const address = searchParams.get('address');
  const apiKey = process.env.NEYNAR_API_KEY;

  if (!apiKey) {
    console.error("Missing NEYNAR_API_KEY");
    return NextResponse.json({ error: 'Server Configuration Error' }, { status: 500 });
  }

  if (!fids && !address) {
    return NextResponse.json({ error: 'FIDs or address required' }, { status: 400 });
  }

  try {
    const url = fids
      ? `https://api.neynar.com/v2/farcaster/user/bulk?fids=${fids}`
      : `https://api.neynar.com/v2/farcaster/user/bulk-by-address?addresses=${address}`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        accept: 'application/json',
        api_key: apiKey,
      },
    });

    if (!response.ok) {
      console.error(`Neynar API Error: ${response.status} ${response.statusText}`);
      const text = await response.text();
      console.error("Response body:", text);
      return NextResponse.json({ error: `Neynar API Failed: ${response.statusText}` }, { status: response.status });
    }

    const data = await response.json();
    
    // Robustly normalize any format into a flat array of standard users
    let normalizedUsers = [];
    if (data && Array.isArray(data.users)) {
      normalizedUsers = data.users;
    } else if (data && typeof data === 'object') {
      // If it's a map (e.g. address to user details), extract all user records
      const values = Object.values(data);
      for (const val of values) {
        if (Array.isArray(val)) {
          normalizedUsers.push(...val);
        } else if (val && typeof val === 'object' && (val as any).object === 'user') {
          normalizedUsers.push(val);
        }
      }
    }

    return NextResponse.json({ users: normalizedUsers });
  } catch (error) {
    console.error("API User Fetch Error:", error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
