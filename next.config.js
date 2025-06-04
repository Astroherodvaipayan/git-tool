/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  images: {
    domains: ['avatars.githubusercontent.com', 'github.com'],
  },
  env: {
    // Expose environment variables to the browser
    // We only expose if the token exists or not, not the actual token
    // for security reasons
    GITHUB_AUTH_AVAILABLE: String(!!process.env.GITHUB_TOKEN),
  },
};

module.exports = nextConfig; 