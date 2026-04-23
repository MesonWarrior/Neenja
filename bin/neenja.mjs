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
const requireFromCli = createRequire(import.meta.url);
const packageMetadata = requireFromCli("../package.json");

const ansiCodes = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  gray: "\x1b[90m",
  orange: "\x1b[38;5;209m",
};

const packageLabel = (stream) => `🥷 ${accent("Neenja", stream)} v${packageMetadata.version}`;

function shouldUseColor(stream) {
  if (process.env.NO_COLOR) {
    return false;
  }

  if (process.env.FORCE_COLOR) {
    return process.env.FORCE_COLOR !== "0";
  }

  if (process.env.TERM === "dumb") {
    return false;
  }

  return Boolean(stream.isTTY);
}

function paint(value, styles, stream = process.stdout) {
  if (styles.length === 0 || !shouldUseColor(stream)) {
    return value;
  }

  return `${styles.map((style) => ansiCodes[style]).join("")}${value}${ansiCodes.reset}`;
}

function accent(value, stream = process.stdout) {
  return paint(value, ["bold", "orange"], stream);
}

function muted(value, stream = process.stdout) {
  return paint(value, ["gray"], stream);
}

function badge(label, stream = process.stdout) {
  return accent(`[${label}]`, stream);
}

function helpSection(title, stream = process.stdout) {
  return `✧ ${accent(`${title}`, stream)}`;
}

function helpCommand(command, stream = process.stdout) {
  return command.padEnd(18);
}

function helpOption(option, stream = process.stdout) {
  return option.padEnd(19);
}

function helpBullet(text, stream = process.stdout) {
  return `  ${muted("-", stream)} ${text}`;
}

function displayProjectPath(projectRoot, targetPath) {
  const relativePath = path.relative(projectRoot, targetPath);

  if (!relativePath) {
    return ".";
  }

  if (relativePath.startsWith("..") || path.isAbsolute(relativePath)) {
    return targetPath;
  }

  return path.join(".", relativePath);
}

function getDocumentSourceLabel(projectRoot, target) {
  return displayProjectPath(projectRoot, target.documentationFilePath ?? target.documentsDirectoryPath);
}

function formatDetailValue(value, tone, stream = process.stdout) {
  const toneStyles = {
    accent: ["bold", "orange"],
    muted: ["gray"],
    plain: [],
  };

  return paint(value, toneStyles[tone] ?? toneStyles.plain, stream);
}

function logCommandStart(title, details) {
  const stream = process.stdout;
  const lines = [
    "",
    `${packageLabel(stream)} ${accent(`⇒ ${title}`, stream)}`,
    ...details.map(({ label, tone = "plain", value }) => (
      `  ${muted(`${label.padEnd(11)}:`, stream)} ${formatDetailValue(value, tone, stream)}`
    )),
    "",
  ];

  stream.write(`${lines.join("\n")}\n`);
}

function logCommandEnd(successTitle, exitCode, failureTitle = successTitle) {
  const isSuccess = exitCode === 0;
  const stream = isSuccess ? process.stdout : process.stderr;
  const status = isSuccess ? "ok" : "fail";
  const symbol = isSuccess ? "✅" : "❌";
  const message = isSuccess ? successTitle : `${failureTitle} exited with code ${exitCode}`;
  const lines = [
    "",
    `${badge(status, stream)} ${accent(`${symbol} ${message}`, stream)}`,
  ];

  if (!isSuccess) {
    lines.push(`  ${muted("Astro output above has the details.", stream)}`);
  }

  stream.write(`${lines.join("\n")}\n`);
}

function printError(error) {
  const stream = process.stderr;
  const message = error instanceof Error ? error.message : String(error);
  const [headline = "Unexpected error.", ...details] = message.split("\n");
  const lines = [
    `${badge("error", stream)} ❌ ${headline}`,
    ...details.map((line) => {
      if (!line) {
        return "";
      }

      if (line.startsWith("- ")) {
        return `  ${muted("-", stream)} ${accent(line.slice(2), stream)}`;
      }

      return `  ${muted(line, stream)}`;
    }),
  ];

  stream.write(`${lines.join("\n")}\n`);
}

function printVersion() {
  process.stdout.write(`${packageLabel(process.stdout)}\n`);
}

function printHelp() {
  const stream = process.stdout;
  const commandPrefix = packageMetadata.name;

  stream.write(`${[
    `${packageLabel(stream)} ${muted("CLI", stream)}`,
    "",
    helpSection("Usage", stream),
    `  ${commandPrefix} <command> ${muted("[options]", stream)}`,
    "",
    helpSection("Commands", stream),
    `  ${helpCommand("serve", stream)} Start the local UI reader`,
    `  ${helpCommand("build", stream)} Build the UI`,
    `  ${helpCommand("build-github", stream)} Build for GitHub Pages`,
    `  ${"".padEnd(20)} ${muted("requires", stream)} --domain <url> --page <path>`,
    "",
    helpSection("Options", stream),
    `  ${helpOption("-d, --dir <path>", stream)} Explicit path to the Neenja documents folder`,
    `  ${helpOption("-f, --file <path>", stream)} Legacy: explicit path to one documentation file`,
    `  ${helpOption("--private", stream)} Include private concepts, project plan, and task tree`,
    `  ${helpOption("--public", stream)} Render only public documentation concepts`,
    `  ${helpOption("-v, --version", stream)} Show the current package version`,
    `  ${helpOption("-h, --help", stream)} Show this help`,
    "",
    helpSection("Notes", stream),
    helpBullet(`If no folder is provided, Neenja reads ${accent(`./${defaultDocumentsDirectoryDisplayPath}`, stream)}.`, stream),
    helpBullet(`Recognized documents are ${accent(defaultDocumentationFilePath, stream)}, ${accent(defaultProjectPlanFilePath, stream)}, and ${accent(defaultTaskTreeFilePath, stream)}.`, stream),
    helpBullet("Public mode includes only documentation; project plan and task tree are private developer documents.", stream),
    "",
    helpSection("Examples", stream),
    `  ${commandPrefix} serve`,
    `  ${commandPrefix} serve --public`,
    `  ${commandPrefix} serve --dir ./some/other/.neenja --port 4010`,
    `  ${commandPrefix} build`,
    `  ${commandPrefix} build --private`,
    `  ${commandPrefix} build-github --domain https://your_name.github.io --page /your_repo/`,
    `  ${commandPrefix} --version`,
  ].join("\n")}\n`);
}

function parseCommandArgs(rawArgs) {
  const options = {
    domain: undefined,
    dir: undefined,
    file: undefined,
    help: false,
    page: undefined,
    version: false,
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

    if (arg === "-v" || arg === "--version") {
      options.version = true;
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
      "Run \"npx skills add MesonWarrior/Neenja --all -g\" and then use \"/neenja-bootstrap\" to generate \".neenja/documentation.md\",",
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
  const visibility = resolveVisibility(args.options.visibility, "private");
  const env = getSharedAstroEnv(projectRoot, target.documentsDirectoryPath, target.documentationFilePath, {
    NEENJA_DOCS_VISIBILITY: visibility,
  });
  logCommandStart("Starting UI 🚀", [
    { label: "Source", value: getDocumentSourceLabel(projectRoot, target), tone: "accent" },
    { label: "Mode", value: visibility, tone: "accent" },
    ...(args.passthroughArgs.length > 0
      ? [{ label: "Astro args", value: args.passthroughArgs.join(" "), tone: "muted" }]
      : []),
  ]);

  const exitCode = await runAstro("dev", args.passthroughArgs, env);
  logCommandEnd("UI stopped 🛑", exitCode, "UI");
  return exitCode;
}

async function handleBuild(projectRoot, args) {
  const target = await resolveDocumentsTarget(projectRoot, args.options);
  const outDir = path.join(projectRoot, ".neenja", "build");
  const visibility = resolveVisibility(args.options.visibility, "public");
  const env = getSharedAstroEnv(projectRoot, target.documentsDirectoryPath, target.documentationFilePath, {
    NEENJA_DOCS_VISIBILITY: visibility,
  });
  logCommandStart("Building static reader", [
    { label: "Source", value: getDocumentSourceLabel(projectRoot, target), tone: "accent" },
    { label: "Output", value: displayProjectPath(projectRoot, outDir), tone: "accent" },
    { label: "Mode", value: visibility, tone: "accent" },
    ...(args.passthroughArgs.length > 0
      ? [{ label: "Astro args", value: args.passthroughArgs.join(" "), tone: "muted" }]
      : []),
  ]);

  const exitCode = await runAstro("build", ["--outDir", outDir, ...args.passthroughArgs], env);
  logCommandEnd("Static reader built", exitCode, "Static reader build");
  return exitCode;
}

async function handleBuildGithub(projectRoot, args) {
  const target = await resolveDocumentsTarget(projectRoot, args.options);
  const outDir = path.join(projectRoot, ".neenja", "build");
  const { domain, page } = args.options;

  if (!domain || !page) {
    throw new Error("Missing required options for build-github: --domain <url> and --page <path>.");
  }

  const visibility = resolveVisibility(args.options.visibility, "public");
  const env = getSharedAstroEnv(projectRoot, target.documentsDirectoryPath, target.documentationFilePath, {
    NEENJA_DOCS_VISIBILITY: visibility,
    PUBLIC_SITE_URL: domain,
    PUBLIC_BASE_PATH: page,
  });

  logCommandStart("Building GitHub Pages bundle", [
    { label: "Source", value: getDocumentSourceLabel(projectRoot, target), tone: "accent" },
    { label: "Output", value: displayProjectPath(projectRoot, outDir), tone: "accent" },
    { label: "Mode", value: visibility, tone: "accent" },
    { label: "Domain", value: domain, tone: "accent" },
    { label: "Page", value: page, tone: "accent" },
    ...(args.passthroughArgs.length > 0
      ? [{ label: "Astro args", value: args.passthroughArgs.join(" "), tone: "muted" }]
      : []),
  ]);

  const exitCode = await runAstro("build", ["--outDir", outDir, ...args.passthroughArgs], env);
  logCommandEnd("GitHub Pages bundle built", exitCode, "GitHub Pages build");
  return exitCode;
}

async function main() {
  const [, , rawCommand, ...rawArgs] = process.argv;
  const command = rawCommand ?? "help";
  const projectRoot = process.cwd();

  if (command === "-v" || command === "--version" || command === "version") {
    printVersion();
    return;
  }

  if (command === "-h" || command === "--help" || command === "help") {
    printHelp();
    return;
  }

  const parsedArgs = parseCommandArgs(rawArgs);

  if (parsedArgs.options.help) {
    printHelp();
    return;
  }

  if (parsedArgs.options.version) {
    printVersion();
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
  printError(error);
  process.exitCode = 1;
});
