const path = require('path')

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['blaze-sdk'],
  webpack: (config: any, { isServer }: any) => {
    config.resolve.symlinks = true
    config.resolve.alias['blaze-sdk'] = path.resolve('./node_modules/blaze-sdk')
    return config
  }
}

module.exports = nextConfig