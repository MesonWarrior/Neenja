#!/usr/bin/env node

import { spawn } from "node:child_process";
import { access, readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const defaultDocumentsDirectoryPath = ".neenja";
const defaultDocumentationFilePath = path.join(defaultDocumentsDirectoryPath, "documentation.md");
const defaultProjectPlanFilePath = path.join(defaultDocumentsDirectoryPath, "project-plan.md");
const defaultTaskTreeFilePath = path.join(defaultDocumentsDirectoryPath, "task-tree.yaml");
const defaultDocumentsDirectoryDisplayPath = ".neenja";
const legacyRootDocumentationFilePath = "neenja.knowledge.md";
const legacyRootDocumentationFileDisplayPath = "./neenja.knowledge.md";
const requireFromCli = createRequire(import.meta.url);

function printHelp() {
  console.log(`neenja <command> [options]

Commands:
  serve              Start the UI for the Neenja documents folder
  build              Build the UI
  build-github       Build for GitHub Pages
                     Requires: --domain <url> --page <path>

Options:
  -d, --dir <path>   Explicit path to the Neenja documents folder
  -f, --file <path>  Legacy: explicit path to one documentation file
  --private          Include private concepts, project plan, and task tree
  --public           Render only public documentation concepts
  -h, --help         Show this help

Notes:
  - If no folder is provided, Neenja reads ./${defaultDocumentsDirectoryDisplayPath}.
  - Recognized documents are ${defaultDocumentationFilePath}, ${defaultProjectPlanFilePath}, and ${defaultTaskTreeFilePath}.
  - Public mode includes only documentation, project plan and task tree are private developer documents.
  - If the documents folder has no documentation file, Neenja falls back to
    ${legacyRootDocumentationFileDisplayPath}.

Examples:
  neenja serve
  neenja serve --public
  neenja serve --dir ./some/other/.neenja --port 4010
  neenja build
  neenja build --private
  neenja build-github --domain https://your_name.github.io --page /your_repo/
`);
}

function parseCommandArgs(rawArgs) {
  const options = {
    domain: undefined,
    dir: undefined,
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

    if (arg === "-d" || arg === "--dir") {
      const value = rawArgs[index + 1];

      if (!value) {
        throw new Error(`Missing value for ${arg}.`);
      }

      options.dir = value;
      index += 1;
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
        `Unexpected positional argument: ${arg}.\nUse -d <path> or --dir <path> to specify the Neenja documents folder.`,
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

async function directoryHasRecognizedDocuments(directoryPath) {
  return (await pathExists(path.join(directoryPath, "documentation.md"))) ||
    (await pathExists(path.join(directoryPath, "project-plan.md"))) ||
    (await pathExists(path.join(directoryPath, "task-tree.yaml"))) ||
    (await pathExists(path.join(directoryPath, "task-tree.yml")));
}

async function resolveDocumentsTarget(projectRoot, options) {
  if (options.dir && options.file) {
    throw new Error("Use only one document source: either --dir or legacy --file.");
  }

  if (options.file) {
    const documentationFilePath = path.resolve(projectRoot, options.file);

    if (await pathExists(documentationFilePath)) {
      return {
        documentsDirectoryPath: path.dirname(documentationFilePath),
        documentationFilePath,
      };
    }

    throw new Error(
      [
        "Legacy documentation file was not found.",
        "",
        "Checked path:",
        `- ${documentationFilePath}`,
      ].join("\n"),
    );
  }

  const candidateDirectories = options.dir
    ? [path.resolve(projectRoot, options.dir)]
    : [path.join(projectRoot, defaultDocumentsDirectoryPath)];

  for (const candidateDirectory of candidateDirectories) {
    if (await directoryHasRecognizedDocuments(candidateDirectory)) {
      return {
        documentsDirectoryPath: candidateDirectory,
        documentationFilePath: undefined,
      };
    }
  }

  const legacyPath = path.join(projectRoot, legacyRootDocumentationFilePath);

  if (!options.dir && await pathExists(legacyPath)) {
    return {
      documentsDirectoryPath: projectRoot,
      documentationFilePath: legacyPath,
    };
  }

  throw new Error(
    [
      "Neenja documents were not found.",
      "",
      "Checked paths:",
      ...candidateDirectories.flatMap((candidateDirectory) => [
        `- ${path.join(candidateDirectory, "documentation.md")}`,
        `- ${path.join(candidateDirectory, "project-plan.md")}`,
        `- ${path.join(candidateDirectory, "task-tree.yaml")}`,
        `- ${path.join(candidateDirectory, "task-tree.yml")}`,
      ]),
      ...(!options.dir ? [`- ${legacyPath}`] : []),
      "",
      "Run \"npx skills add MesonWarrior/Neenja --all\" and then use \"/neenja-bootstrap\" to generate \".neenja/documentation.md\",",
      "or provide a custom folder with \"-d\" or \"--dir\".",
    ].join("\n"),
  );
}

function resolveVisibility(mode, fallbackVisibility) {
  return mode ?? fallbackVisibility;
}

function getSharedAstroEnv(projectRoot, documentsDirectoryPath, documentationFilePath, extraEnv = {}) {
  return {
    ...process.env,
    ...extraEnv,
    ASTRO_TELEMETRY_DISABLED: "1",
    NEENJA_PROJECT_ROOT: projectRoot,
    NEENJA_DOCUMENTS_DIR: documentsDirectoryPath,
    ...(documentationFilePath ? { NEENJA_DOCUMENTATION_PATH: documentationFilePath } : {}),
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

async function handleServe(projectRoot, args) {
  const target = await resolveDocumentsTarget(projectRoot, args.options);
  const env = getSharedAstroEnv(projectRoot, target.documentsDirectoryPath, target.documentationFilePath, {
    NEENJA_DOCS_VISIBILITY: resolveVisibility(args.options.visibility, "private"),
  });
  return runAstro("dev", args.passthroughArgs, env);
}

async function handleBuild(projectRoot, args) {
  const target = await resolveDocumentsTarget(projectRoot, args.options);
  const outDir = path.join(projectRoot, ".neenja", "build");
  const env = getSharedAstroEnv(projectRoot, target.documentsDirectoryPath, target.documentationFilePath, {
    NEENJA_DOCS_VISIBILITY: resolveVisibility(args.options.visibility, "public"),
  });
  return runAstro("build", ["--outDir", outDir, ...args.passthroughArgs], env);
}

async function handleBuildGithub(projectRoot, args) {
  const target = await resolveDocumentsTarget(projectRoot, args.options);
  const outDir = path.join(projectRoot, ".neenja", "build");
  const { domain, page } = args.options;

  if (!domain || !page) {
    throw new Error("Missing required options for build-github: --domain <url> and --page <path>.");
  }

  const env = getSharedAstroEnv(projectRoot, target.documentsDirectoryPath, target.documentationFilePath, {
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
