import path from "node:path";
import { defineConfig } from "astro/config";
import react from "@astrojs/react";

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
    resolve: {
      alias: {
        "@": path.resolve("./"),
      },
    },
  },
});
