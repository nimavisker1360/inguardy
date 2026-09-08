/** @type {import('next').NextConfig} */
const nextConfig = {
  distDir: process.env.NEXT_BUILD_DIR || ".next",
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  experimental: {
    cpus: 1,
    workerThreads: false,
    webpackMemoryOptimizations: true,
  },
  outputFileTracingIncludes: {
    "/api/downloads/trade-journal-recorder": [
      "./ea/TradeJournalRecorder.mq5",
      "./ea/README_MT5_SETUP.md",
    ],
  },
  images: {
    domains: [
      "placehold.co",
      "images.unsplash.com",
      "img.etimg.com",
      "s.yimg.com",
      "media.cnn.com",
      "image.cnbcfm.com",
      "www.ft.com",
      "images.wsj.net",
      "ichef.bbci.co.uk",
      "static.reuters.com",
      "cdn.cnn.com",
      "assets.bwbx.io",
      "www.investors.com",
      "static01.nyt.com",
      "www.nasdaq.com",
      "a.c-dn.net",
      "static.seekingalpha.com",
      "s1.reutersmedia.net",
      "s2.reutersmedia.net",
      "s3.reutersmedia.net",
      "s4.reutersmedia.net",
      "thumbor.forbes.com",
      "www.americanbankingnews.com",
      "www.marketbeat.com",
      "biztoc.com",
      "nypost.com",
      "wp-content.nypost.com",
      "werd.io",
      "english.khabarhub.com",
    ],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "nypost.com",
        pathname: "/wp-content/**",
      },
      {
        protocol: "https",
        hostname: "werd.io",
        pathname: "/file/**",
      },
      {
        protocol: "https",
        hostname: "english.khabarhub.com",
        pathname: "/wp-content/**",
      },
    ],
  },
  webpack: (config, { isServer }) => {
    // Add resolver for @radix-ui/react-use-effect-event
    config.resolve.alias = {
      ...config.resolve.alias,
      "@radix-ui/react-use-effect-event": require.resolve(
        "./src/lib/use-effect-event-patch.js"
      ),
    };

    return config;
  },
};

module.exports = nextConfig;
