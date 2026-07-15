/** @type {import('next').NextConfig} */
const nextConfig = {
  reactCompiler: true,
  serverExternalPackages: ["typeorm", "pg"],
};

export default nextConfig;
