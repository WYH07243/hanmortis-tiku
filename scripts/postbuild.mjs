import { copyFile, mkdir, rm } from "node:fs/promises";
import { resolve } from "node:path";

const distDir = resolve("dist");
const indexPath = resolve(distDir, "index.html");
const notFoundPath = resolve(distDir, "404.html");
const redirectsPath = resolve(distDir, "_redirects");
const staticRoutes = ["dashboard", "practice", "wrong-questions", "import", "library"];

await copyFile(indexPath, notFoundPath);
await rm(redirectsPath, { force: true });

for (const route of staticRoutes) {
  const routeDir = resolve(distDir, route);
  await mkdir(routeDir, { recursive: true });
  await copyFile(indexPath, resolve(routeDir, "index.html"));
}
