/** @type {import('next').NextConfig} */
const nextConfig = {
  // output: 'export',
  transpilePackages: ['date-fns'],
  experimental: {
    esmExternals: 'loose'
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: { unoptimized: true },
  // Environment variables are automatically handled by Next.js when prefixed with NEXT_PUBLIC_
};

module.exports = nextConfig;
