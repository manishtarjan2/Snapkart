/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { hostname: "lh3.googleusercontent.com" },
      { hostname: "images.unsplash.com" },
      { hostname: "res.cloudinary.com" },
    ],
  },
  allowedDevOrigins: ['local-origin.dev', '*.local-origin.dev', '_mongodb._tcp.cluster0.v3p7nue.mongodb.net', 'localhost', '_mongodb._tcp.cluster0.v3p7nue.mongodb.net', 'snapkart-rust.vercel.app'],
  typescript: {
    ignoreBuildErrors: true,
  },
};

module.exports = nextConfig;
