/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: "standalone",
  experimental: {
    typedRoutes: true,
    // нужно для нативного модуля better-sqlite3 в серверных компонентов/роутах
    serverComponentsExternalPackages: ["better-sqlite3"],
  },
  images: { unoptimized: true },
  webpack: (config, { isServer }) => {
    // подстраховка: в клиентском бандле не подсовывать полифиллы для fs/path
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
      };
    }
    return config;
  },
};

export default nextConfig;