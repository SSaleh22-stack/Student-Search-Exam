/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '50mb', // Increased for large Excel files
    },
  },
}

module.exports = nextConfig



