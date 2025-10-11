const nextConfig = {
  experimental: {
    serverActions: true,
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals.push({
        'better-sqlite3': 'commonjs better-sqlite3'
      });
    }
    return config;
  },
}

module.exports = nextConfig