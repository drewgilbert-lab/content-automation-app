import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Buffer enough for a single multipart file under Vercel’s ~4.5 MB limit.
    proxyClientMaxBodySize: "5mb",
  },
};

export default nextConfig;
