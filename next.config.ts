import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // node-postgres resolves its driver at runtime; leave it to Node rather than
  // the bundler.
  serverExternalPackages: ["pg"],
};

export default nextConfig;
