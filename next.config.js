/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    // Cake photos are served from your Supabase Storage bucket's public URL.
    // Add your project's hostname here so next/image (if you use it later) is allowed to load them.
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
      },
    ],
  },
};

module.exports = nextConfig;
