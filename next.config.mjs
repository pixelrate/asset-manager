/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ["bwip-js", "exceljs"],
  experimental: {
    serverActions: {
      bodySizeLimit: "20mb",
    },
  },
};

export default nextConfig;
