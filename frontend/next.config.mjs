/** @type {import('next').NextConfig} */

const nextConfig = {
  reactStrictMode: true,

  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination:
          "https://sih26034-production.up.railway.app/api/:path*",
      },
      {
        source: "/media/:path*",
        destination:
          "https://sih26034-production.up.railway.app/media/:path*",
      },
      {
        source: "/health",
        destination:
          "https://sih26034-production.up.railway.app/health",
      },
    ];
  },
};

export default nextConfig;