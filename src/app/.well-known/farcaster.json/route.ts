import { NextResponse } from "next/server";

// Redirect to Farcaster-hosted manifest for registration
const HOSTED_MANIFEST_URL =
  "https://api.farcaster.xyz/miniapps/hosted-manifest/019b1fc1-2e5f-fcd9-451d-7faac80f1140";

export function GET() {
  return NextResponse.redirect(HOSTED_MANIFEST_URL, 307);
}
