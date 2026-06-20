import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: [
    "@prisma/client",
    ".prisma/client",
    "@libsql/client",
    "@libsql/isomorphic-ws",
    "jose",
  ],
};

initOpenNextCloudflareForDev();

export default nextConfig;
