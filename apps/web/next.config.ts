import type { NextConfig } from "next"
import path from "node:path"

const nextConfig: NextConfig = {
  async rewrites() {
    const apiURL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api").replace(/\/$/, "")
    return [
      { source: "/api/auth/:path*", destination: `${apiURL}/auth/:path*` },
      { source: "/api/teams/:path*", destination: `${apiURL}/teams/:path*` },
    ]
  },
  turbopack: {
    resolveAlias: {
      "next-intl/config": "./i18n/request.ts",
    },
  },
  webpack: (config) => {
    config.resolve = config.resolve || {}
    config.resolve.alias = {
      ...config.resolve.alias,
      "next-intl/config": path.resolve("./i18n/request.ts"),
    }
    return config
  },
}

export default nextConfig
