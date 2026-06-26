/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  env: {
    NEXT_PUBLIC_BACKEND_URL: process.env.NEXT_PUBLIC_BACKEND_URL || process.env.REACT_APP_BACKEND_URL || "",
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "customer-assets.emergentagent.com" },
    ],
  },
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
  async rewrites() {
    // Attempt to use NEXT_PUBLIC_BACKEND_URL, fallback to REACT_APP_BACKEND_URL
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || process.env.REACT_APP_BACKEND_URL || "http://127.0.0.1:8000";
    return [
      {
        source: "/api/:path*",
        destination: backendUrl + "/api/:path*",
      },
    ];
  },
  async redirects() {
    return [
      {
        source: '/r/mehfil-hyderabad',
        destination: '/r/mehfil',
        permanent: true,
      },
      {
        source: '/r/mehfil-hyderabad/:path*',
        destination: '/r/mehfil/:path*',
        permanent: true,
      },
    ];
  },
};
module.exports = nextConfig;
