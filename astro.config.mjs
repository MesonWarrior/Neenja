import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { defineConfig } from "astro/config";
import react from "@astrojs/react";

const requireFromConfig = createRequire(import.meta.url);
const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)));
const astroPackageRoot = path.dirname(requireFromConfig.resolve("astro/package.json"));
const githubRepository = process.env.GITHUB_REPOSITORY;
const githubRepositoryOwner = process.env.GITHUB_REPOSITORY_OWNER;
const githubRepositoryName = githubRepository?.split("/")[1];
const isGitHubActionsBuild = process.env.GITHUB_ACTIONS === "true";

const base = process.env.PUBLIC_BASE_PATH ?? (isGitHubActionsBuild && githubRepositoryName ? `/${githubRepositoryName}/` : "/");
const site =
  process.env.PUBLIC_SITE_URL ??
  (isGitHubActionsBuild && githubRepositoryOwner ? `https://${githubRepositoryOwner}.github.io` : undefined);

export default defineConfig({
  base,
  site,
  integrations: [react()],
  trailingSlash: "always",
  vite: {
    server: {
      fs: {
        // Setting a custom allow list replaces Vite defaults, so include both the
        // Neenja package itself and Astro's installed package directory.
        // This keeps dev imports and the Astro dev toolbar working under `npx`.
        allow: [packageRoot, astroPackageRoot],
      },
    },
    resolve: {
      alias: {
        "@": path.resolve("./"),
      },
    },
  },
});
