import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
      {
        protocol: "https",
        hostname: "wccfcxzxtfdxuxbttdte.supabase.co",
      },
    ],
  },
};

export default nextConfig;
