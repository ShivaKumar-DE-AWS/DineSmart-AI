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
  typescript: { ignoreBuildErrors: false },
  async rewrites() {
    let backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || process.env.REACT_APP_BACKEND_URL || "https://api.smartdineai.co.in";
    if (backendUrl && !backendUrl.startsWith("http")) {
      backendUrl = "https://" + backendUrl;
    }
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
        source: "/r/mehfil-hyderabad/:path*",
        destination: "/r/mehfil/:path*",
        permanent: true,
      },
    ];
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Content-Security-Policy",
            value: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' wss: https:;"
          }
        ]
      }
    ];
  },
};
module.exports = nextConfig;
