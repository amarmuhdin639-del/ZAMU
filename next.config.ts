import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  async rewrites() {
    // Heal legacy /uploads/* URLs: anything that is not a real file in
    // public/ is served from the MediaAsset database via /api/media/*.
    // Files that DO exist in public/ (the favicon set) keep winning, because
    // Next checks the filesystem before afterFiles rewrites.
    return [{ source: '/uploads/:path*', destination: '/api/media/:path*' }]
  },
};

export default nextConfig;
