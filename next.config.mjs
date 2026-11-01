/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  transpilePackages: ['@phosphor-icons/react', 'mermaid'],
  async rewrites() {
    return [
      {
        source: '/local/:path*.csv',
        destination: '/404',
      },
      {
        source: '/:path*.csv',
        destination: '/404',
      },
    ]
  },
}

export default nextConfig
