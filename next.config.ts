import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingRoot: __dirname,
  async redirects() {
    return [
      {
        source: '/.well-known/farcaster.json',
        destination: 'https://api.farcaster.xyz/miniapps/hosted-manifest/019b1fc1-2e5f-fcd9-451d-7faac80f1140',
        permanent: false, // 307 Temporary Redirect
      },
    ];
  },
};

export default nextConfig;
