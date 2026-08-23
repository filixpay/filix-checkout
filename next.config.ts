import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  async rewrites() {
    return [
      {
        source: '/callback/:path*',
        destination: '/api/auth/callback/:path*',
      },
    ];
  },
  /* config options here */
};

export default nextConfig;
