import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["remotion", "@remotion/player"],
  serverExternalPackages: ["ws"],
};

export default nextConfig;
