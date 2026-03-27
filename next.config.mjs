/** @type {import('next').NextConfig} */
const nextConfig = {
  distDir: process.env.NEXT_DIST_DIR || ".next",
  allowedDevOrigins: ["127.0.0.1", "127.0.0.1:3001", "localhost", "localhost:3000", "localhost:3001"],
  experimental: {
    serverActions: {
      allowedOrigins: ["localhost:3000", "127.0.0.1:3001"],
    },
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**" },
    ],
  },
};

export default nextConfig;
