import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { hostname: "lh3.googleusercontent.com" },
      { hostname: "images.unsplash.com" },
      { hostname: "res.cloudinary.com" }
    ]
  },
  experimental: {
    reactCompiler: true,
  },
};

export default nextConfig;
