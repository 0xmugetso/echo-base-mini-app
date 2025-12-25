import { NextResponse } from "next/server";

/**
 * Serving the Farcaster Manifest directly for domain verification.
 * 
 * IMPORTANT FOR THE USER:
 * You MUST replace the 'accountAssociation' object below with the one provided 
 * by the Warpcast Developer Portal (https://warpcast.com/~/developers/frames).
 * 
 * 1. Register your app with URL: https://echo-base-mini-app.vercel.app
 * 2. Copy the 'accountAssociation' object from the portal.
 * 3. Paste it below.
 */

export function GET() {
  const appUrl = "https://echo-base-mini-app.vercel.app";

  const manifest = {
    accountAssociation: {
      header: "eyJmaWQiOjQ3OTA0NCwidHlwZSI6ImN1c3RvZHkiLCJrZXkiOiIweDBCRjk4QkY2Yjg4QjMxRDRCQzk2NUE1RTY2RUMwNkMyOTgwMEZCM0E3OWI0M0Y1NkQ3NTg2Q0QifQ",
      payload: "eyJkb21haW4iOiJlY2hvLWJhc2UtbWluaS1hcHAudmVyY2VsLmFwcCJ9",
      signature: "PASTE_YOUR_SIGNATURE_FROM_WARPCAST_DEV_PORTAL_HERE"
    },
    frame: {
      version: "1",
      name: "Echo",
      iconUrl: `${appUrl}/assets/echo-logo.PNG`,
      splashImageUrl: `${appUrl}/splash.png`,
      splashBackgroundColor: "#000000",
      appUrl: appUrl,
    },
  };

  return NextResponse.json(manifest);
}
