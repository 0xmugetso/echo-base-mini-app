import { NextResponse } from "next/server";

export function GET() {
  const appUrl = "https://echo-base-mini-app.vercel.app";

  const manifest = {
    accountAssociation: {
      header: "eyJmaWQiOjQ3OTA0NCwidHlwZSI6ImN1c3RvZHkiLCJrZXkiOiIweDBCRjk4QkY2Yjg4QjMxRDRCQzk2NUE1RTY2RUMwNkMyOTgwMEZCM0E3OWI0M0Y1NkQ3NTg2Q0QifQ", // This needs to be the actual header from the dev portal or generated
      payload: "eyJkb21haW4iOiJlY2hvLWJhc2UtbWluaS1hcHAudmVyY2VsLmFwcCJ9",
      signature: "MHhjNDliYmEzYTMxM2M3M2I3YjY5YmIyYmEzYTMxM2M3M2I3YjY5YmIyYmEzYTMxM2M3M2I3YjY5YmIyYmEzYTMxM2M3M2I3YjY5YmIyYmEzYTMxM2M3M2I3YjY5YmIyMQ" // Placeholder, real signature from Warpcast Dev Portal
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
