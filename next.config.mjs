import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin();

/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },

  eslint: {
    ignoreDuringBuilds: true,
  },
  webpack: (config, { isServer, nextRuntime }) => {
    // Prevent firebase-admin from being bundled in Edge Runtime (Cloudflare Pages)
    if (nextRuntime === 'edge') {
      config.resolve.alias['firebase-admin'] = false;
    }
    return config;
  },
}

export default withNextIntl(nextConfig);