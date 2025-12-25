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
