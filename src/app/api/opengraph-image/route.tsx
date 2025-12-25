import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";
import { getNeynarUser } from "~/lib/neynar";

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const fid = searchParams.get('fid');

  const user = fid ? await getNeynarUser(Number(fid)) : null;

  return new ImageResponse(
    (
      <div tw="flex h-full w-full flex-col justify-center items-center relative bg-primary">
        {user?.pfp_url && (
          <div tw="flex w-96 h-96 rounded-full overflow-hidden mb-8 border-8 border-white">
            <img src={user.pfp_url} alt="Profile" tw="w-full h-full object-cover" />
          </div>
        )}
        <div tw="flex items-center absolute bottom-12 right-12 bg-black/50 p-4 rounded-xl border border-white/20">
          <img src="https://echo-base-mini-app.vercel.app/assets/echo-logo.PNG" tw="w-16 h-16 mr-4" />
          <div tw="flex flex-col">
            <span tw="text-4xl text-white font-bold">ECHO</span>
            <span tw="text-xl text-primary font-mono opacity-80 uppercase">uncover your onchain legacy</span>
          </div>
        </div>
        <h1 tw="text-8xl text-white">{user?.display_name ? `Hello from ${user.display_name ?? user.username}!` : 'Hello!'}</h1>
        <p tw="text-4xl mt-4 text-white opacity-80 uppercase tracking-widest">Calculated by Echo OS</p>
      </div>
    ),
    {
      width: 1200,
      height: 800,
    }
  );
}