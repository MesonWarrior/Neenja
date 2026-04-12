#!/usr/bin/env node

import { spawn } from "node:child_process";
import { access, copyFile, mkdir, readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const promptsTemplateDir = path.join(packageRoot, "prompts");
const defaultKnowledgeFileName = "neenja.knowledge.md";
const requireFromCli = createRequire(import.meta.url);

function printHelp() {
  console.log(`neenja <command> [options]

Commands:
  init               Init Neenja in your project
  serve              Start the UI for knowledge file
  build              Build the UI
  build-github       Build for GitHub Pages
                     Requires: --domain <url> --page <path>

Options:
  -f, --file <path>  Explicit path to the knowledge file
  --private          Include private concepts in the rendered documentation
  --public           Render only public concepts
  -h, --help         Show this help

Notes:
  - If no file is provided, Neenja looks for ./neenja.knowledge.md.

Examples:
  neenja init
  neenja serve
  neenja serve --public
  neenja serve --file ./some/other/path.md --port 4010
  neenja build
  neenja build --private
  neenja build-github --domain https://your_name.github.io --page /your_repo/
`);
}

function parseCommandArgs(rawArgs) {
  const options = {
    domain: undefined,
    file: undefined,
    help: false,
    page: undefined,
    visibility: undefined,
  };
  const passthroughArgs = [];
  const flagsWithRequiredValue = new Set([
    "--allowed-hosts",
    "--base",
    "--config",
    "--mode",
    "--outDir",
    "--port",
    "--root",
    "--site",
  ]);
  const flagsWithOptionalValue = new Set([
    "--host",
  ]);

  for (let index = 0; index < rawArgs.length; index += 1) {
    const arg = rawArgs[index];

    if (arg === "-h" || arg === "--help") {
      options.help = true;
      continue;
    }

    if (arg === "-f" || arg === "--file") {
      const value = rawArgs[index + 1];

      if (!value) {
        throw new Error(`Missing value for ${arg}.`);
      }

      options.file = value;
      index += 1;
      continue;
    }

    if (arg === "--domain" || arg === "--page") {
      const value = rawArgs[index + 1];

      if (!value || value.startsWith("-")) {
        throw new Error(`Missing value for ${arg}.`);
      }

      if (arg === "--domain") {
        options.domain = value;
      } else {
        options.page = value;
      }

      index += 1;
      continue;
    }

    if (arg === "--private" || arg === "--public") {
      const nextVisibility = arg === "--private" ? "private" : "public";

      if (options.visibility && options.visibility !== nextVisibility) {
        throw new Error("Use only one visibility flag: either --private or --public.");
      }

      options.visibility = nextVisibility;
      continue;
    }

    if (flagsWithRequiredValue.has(arg)) {
      const value = rawArgs[index + 1];

      if (!value || value.startsWith("-")) {
        throw new Error(`Missing value for ${arg}.`);
      }

      passthroughArgs.push(arg, value);
      index += 1;
      continue;
    }

    if (flagsWithOptionalValue.has(arg)) {
      passthroughArgs.push(arg);

      const value = rawArgs[index + 1];

      if (value && !value.startsWith("-")) {
        passthroughArgs.push(value);
        index += 1;
      }

      continue;
    }

    if (!arg.startsWith("-")) {
      throw new Error(
        `Unexpected positional argument: ${arg}.\nUse -f <path> or --file <path> to specify the knowledge file.`,
      );
    }

    passthroughArgs.push(arg);
  }

  return {
    options,
    passthroughArgs,
  };
}

async function pathExists(targetPath) {
  try {
    await access(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function resolveKnowledgePath(projectRoot, explicitPath) {
  const candidatePaths = explicitPath
    ? [path.resolve(projectRoot, explicitPath)]
    : [path.join(projectRoot, defaultKnowledgeFileName)];

  for (const candidatePath of candidatePaths) {
    if (await pathExists(candidatePath)) {
      return candidatePath;
    }
  }

  throw new Error(
    [
      "Knowledge file was not found.",
      "",
      "Checked paths:",
      ...candidatePaths.map((candidatePath) => `- ${candidatePath}`),
      "",
      "Run \"neenja init\" and then generate \"neenja.knowledge.md\" in the project root,",
      "or provide a custom file with \"-f\" or \"--file\".",
    ].join("\n"),
  );
}

function resolveVisibility(mode, fallbackVisibility) {
  return mode ?? fallbackVisibility;
}

function getSharedAstroEnv(projectRoot, knowledgePath, extraEnv = {}) {
  return {
    ...process.env,
    ...extraEnv,
    ASTRO_TELEMETRY_DISABLED: "1",
    NEENJA_PROJECT_ROOT: projectRoot,
    NEENJA_KNOWLEDGE_PATH: knowledgePath,
  };
}

async function resolveAstroCliPath() {
  const astroPackageJsonPath = requireFromCli.resolve("astro/package.json", {
    paths: [packageRoot],
  });
  const astroPackageJson = JSON.parse(await readFile(astroPackageJsonPath, "utf8"));
  const astroBinEntry = typeof astroPackageJson.bin === "string"
    ? astroPackageJson.bin
    : astroPackageJson.bin?.astro;

  if (!astroBinEntry) {
    throw new Error("Could not determine Astro CLI entrypoint from astro/package.json.");
  }

  return path.resolve(path.dirname(astroPackageJsonPath), astroBinEntry);
}

async function runAstro(command, astroArgs, env) {
  const astroCliPath = await resolveAstroCliPath();

  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [astroCliPath, command, "--root", packageRoot, ...astroArgs], {
      stdio: "inherit",
      env,
      cwd: packageRoot,
    });

    child.on("error", reject);
    child.on("exit", (code, signal) => {
      if (signal) {
        reject(new Error(`Astro exited with signal ${signal}.`));
        return;
      }

      resolve(code ?? 0);
    });
  });
}

async function copyTemplateIfMissing(fromPath, toPath) {
  if (await pathExists(toPath)) {
    return false;
  }

  await copyFile(fromPath, toPath);
  return true;
}

async function handleInit(projectRoot) {
  const neenjaDir = path.join(projectRoot, ".neenja");
  const promptsDir = path.join(neenjaDir, "prompts");
  const bootstrapPath = path.join(promptsDir, "bootstrap.md");
  const systemPath = path.join(promptsDir, "system.md");

  await mkdir(promptsDir, { recursive: true });

  const bootstrapCreated = await copyTemplateIfMissing(
    path.join(promptsTemplateDir, "bootstrap.md"),
    bootstrapPath,
  );
  const systemCreated = await copyTemplateIfMissing(
    path.join(promptsTemplateDir, "system.md"),
    systemPath,
  );

  console.log(`Neenja has prepared your local bundle in ${path.relative(projectRoot, neenjaDir) || ".neenja"}`);
  console.log("");
  console.log(
    bootstrapCreated || systemCreated
      ? "Created prompt files:"
      : "Prompt files already existed, so they were left untouched:",
  );
  console.log(`- ${path.relative(projectRoot, bootstrapPath)}`);
  console.log(`- ${path.relative(projectRoot, systemPath)}`);
  console.log("");
  console.log("Next steps:");
  console.log(`1. Open ${path.relative(projectRoot, bootstrapPath)} and give it to your agent once.`);
  console.log(`2. The agent should create ${defaultKnowledgeFileName} in the project root.`);
  console.log(`3. Then use ${path.relative(projectRoot, systemPath)} as the ongoing system prompt.`);
  console.log(`4. Run "neenja serve" to view the UI or "neenja build" to build into ./.neenja/build.`);
}

async function handleServe(projectRoot, args) {
  const knowledgePath = await resolveKnowledgePath(projectRoot, args.options.file);
  const env = getSharedAstroEnv(projectRoot, knowledgePath, {
    NEENJA_DOCS_VISIBILITY: resolveVisibility(args.options.visibility, "private"),
  });
  return runAstro("dev", args.passthroughArgs, env);
}

async function handleBuild(projectRoot, args) {
  const knowledgePath = await resolveKnowledgePath(projectRoot, args.options.file);
  const outDir = path.join(projectRoot, ".neenja", "build");
  const env = getSharedAstroEnv(projectRoot, knowledgePath, {
    NEENJA_DOCS_VISIBILITY: resolveVisibility(args.options.visibility, "public"),
  });
  return runAstro("build", ["--outDir", outDir, ...args.passthroughArgs], env);
}

async function handleBuildGithub(projectRoot, args) {
  const knowledgePath = await resolveKnowledgePath(projectRoot, args.options.file);
  const outDir = path.join(projectRoot, ".neenja", "build");
  const { domain, page } = args.options;

  if (!domain || !page) {
    throw new Error("Missing required options for build-github: --domain <url> and --page <path>.");
  }

  const env = getSharedAstroEnv(projectRoot, knowledgePath, {
    NEENJA_DOCS_VISIBILITY: resolveVisibility(args.options.visibility, "public"),
    PUBLIC_SITE_URL: domain,
    PUBLIC_BASE_PATH: page,
  });

  return runAstro("build", ["--outDir", outDir, ...args.passthroughArgs], env);
}

async function main() {
  const [, , rawCommand, ...rawArgs] = process.argv;
  const command = rawCommand ?? "help";
  const projectRoot = process.cwd();

  if (command === "-h" || command === "--help" || command === "help") {
    printHelp();
    return;
  }

  const parsedArgs = parseCommandArgs(rawArgs);

  if (parsedArgs.options.help) {
    printHelp();
    return;
  }

  let exitCode = 0;

  switch (command) {
    case "init":
      await handleInit(projectRoot);
      break;
    case "serve":
      exitCode = await handleServe(projectRoot, parsedArgs);
      break;
    case "build":
      exitCode = await handleBuild(projectRoot, parsedArgs);
      break;
    case "build-github":
      exitCode = await handleBuildGithub(projectRoot, parsedArgs);
      break;
    default:
      throw new Error(`Unknown command: ${command}\n\nRun "neenja --help" to see the available commands.`);
  }

  process.exitCode = exitCode;
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
