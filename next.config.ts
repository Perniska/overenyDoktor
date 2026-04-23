import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: [
    "10.232.213.103",
    "10.28.160.103",
    "10.232.213.103:3000",
    "http://10.232.213.103:3000",
  ],
};

export default nextConfig;