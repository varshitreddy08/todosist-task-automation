import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  output: 'standalone',
  turbopack: {
    root: path.resolve(__dirname),
  },
  serverExternalPackages: ['@neondatabase/serverless', 'bcryptjs'],
};

export default nextConfig;
