import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Allow batched image uploads up to 50 MB so 10+ photos in one request
    // fit within the limit (default is 10 MB).
    proxyClientMaxBodySize: "50mb",
  },
};

export default nextConfig;
