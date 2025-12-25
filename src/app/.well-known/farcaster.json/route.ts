import { NextResponse } from "next/server";

/**
 * Serving the Farcaster Manifest directly for domain verification.
 */

export function GET() {
  const appUrl = "https://echo-base-mini-app.vercel.app";

  const manifest = {
    accountAssociation: {
      header: "eyJmaWQiOjQ3OTA0NCwidHlwZSI6ImF1dGgiLCJrZXkiOiIweGY4NDgzMzQwMEE2QkU2ZWY4NUJDZTNFQTEzOThGMDU3ZjQxOEY5N2QifQ",
      payload: "eyJkb21haW4iOiJlY2hvLWJhc2UtbWluaS1hcHAudmVyY2VsLmFwcCJ9",
      signature: "8/Wz7Nq+tmuAm9y3431ompFIz63xU4LHBW0oRKlrNQ5Hc1FNFVdl15B2DnwMRIeKoz6N7FmP9YCNRSW9hyv8ths="
    },
    "frame": {
      "name": "Echo ",
      "version": "1",
      "iconUrl": "https://echo-base-mini-app.vercel.app/icon.png",
      "homeUrl": "https://echo-base-mini-app.vercel.app",
      "imageUrl": "https://echo-base-mini-app.vercel.app/image.png",
      "buttonTitle": "Launch Echo",
      "splashImageUrl": "https://echo-base-mini-app.vercel.app/splash.png",
      "splashBackgroundColor": "#6200EA",
      "webhookUrl": "https://echo-base-mini-app.vercel.app/api/webhook",
      "subtitle": "Immortalize your status. ",
      "description": "Mint your legacy or share to flex. Start exploring echo now.",
      "primaryCategory": "social",
      "tags": [
        "social",
        "community",
        "score",
        "activity",
        "base"
      ],
      "ogTitle": "Echo - Immortalize your status",
      "ogDescription": "Immortalize your on-chain base status and farcaster metrics in awesome mintable Echo card. "
    },
  };

  return NextResponse.json(manifest);
}
