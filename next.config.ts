import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ['@zai/select-element'],
  trailingSlash: true,
  reactStrictMode: true,
  
  // Allow cross-domain requests from sandbox proxy (Z.ai preview panel)
  allowedDevOrigins: ["*"],
};

export default nextConfig;