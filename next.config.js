/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '50mb', // Increased for large Excel files
    },
  },
  // Increase API route timeout (if supported by deployment platform)
  api: {
    responseLimit: false,
    bodyParser: {
      sizeLimit: '50mb',
    },
  },
}

module.exports = nextConfig



