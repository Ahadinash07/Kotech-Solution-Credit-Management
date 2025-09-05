import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Exclude problematic packages from webpack bundling
      config.externals = config.externals || [];
      config.externals.push('pg-native', 'sqlite3', 'tedious', 'pg-hstore');
    }
    return config;
  },
  serverExternalPackages: ['sequelize', 'pg', 'pg-hstore']
};

export default nextConfig;
