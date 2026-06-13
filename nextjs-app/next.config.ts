import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ['echarts', 'echarts-for-react'],
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
