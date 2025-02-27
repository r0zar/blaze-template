const path = require('path')

/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    ppr: 'incremental',
  },
  images: {
    remotePatterns: [
      {
        hostname: 'charisma.rocks',
      },
    ],
  },
  transpilePackages: ['blaze-sdk'],
  webpack: (config: any, { isServer }: any) => {
    config.resolve.symlinks = true
    config.resolve.alias['blaze-sdk'] = path.resolve('./node_modules/blaze-sdk')
    return config
  },
  eslint: {
    ignoreDuringBuilds: true, // This will ignore ESLint errors during builds
  },
}

module.exports = nextConfig