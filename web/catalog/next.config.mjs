/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: "standalone",
  basePath: '/catalog',
  experimental: {
    typedRoutes: true,
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