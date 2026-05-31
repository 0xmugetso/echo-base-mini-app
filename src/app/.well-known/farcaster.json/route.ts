import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

/**
 * Serving the Farcaster Manifest dynamically by reading the public/.well-known/farcaster.json file.
 * This ensures that updates to the public static manifest are immediately reflected and served.
 */
export function GET() {
  try {
    const filePath = path.join(process.cwd(), "public", ".well-known", "farcaster.json");
    const fileContent = fs.readFileSync(filePath, "utf8");
    const manifest = JSON.parse(fileContent);
    
    return new NextResponse(JSON.stringify(manifest), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
      },
    });
  } catch (error) {
    console.error("Error reading farcaster.json:", error);
    return NextResponse.json({ error: "Manifest not found" }, { status: 500 });
  }
}
