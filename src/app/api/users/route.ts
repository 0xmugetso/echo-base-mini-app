import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const fids = searchParams.get('fids');
  const apiKey = process.env.NEYNAR_API_KEY;

  if (!apiKey) {
    console.error("Missing NEYNAR_API_KEY");
    return NextResponse.json({ error: 'Server Configuration Error' }, { status: 500 });
  }

  if (!fids) {
    return NextResponse.json({ error: 'FIDs required' }, { status: 400 });
  }

  try {
    const response = await fetch(`https://api.neynar.com/v2/farcaster/user/bulk?fids=${fids}`, {
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
    if (data.users && data.users.length > 0) {
      console.log("Debug User Object Keys:", Object.keys(data.users[0]));
      console.log("Debug User Score:", data.users[0].score);
      console.log("Debug User Power Ranking:", data.users[0].power_ranking);
    }
    return NextResponse.json(data);
  } catch (error) {
    console.error("API User Fetch Error:", error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
