import path from "node:path";
import { createRequire } from "node:module";
import { defineConfig } from "astro/config";
import react from "@astrojs/react";

const requireFromConfig = createRequire(import.meta.url);
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
        // `npx neenja serve` may install `astro` next to the package, not inside it.
        // Allow Astro's runtime files so Vite can serve the dev toolbar entrypoint.
        allow: [astroPackageRoot],
      },
    },
    resolve: {
      alias: {
        "@": path.resolve("./"),
      },
    },
  },
});
