---
title: Neenja Bundle Documentation
project: Neenja
version: 1
updated: 2026-04-11
summary: Neenja is a portable bundle that keeps prompts in .neenja, keeps the canonical knowledge file in the project root, and serves or builds a reader UI for it.
---

# Neenja Bundle Documentation

This file intentionally documents the bundle workflow that other projects use.
It does not aim to describe every internal implementation detail of Neenja
itself.

## Concept: Bundle Overview
ID: platform-overview
Category: For humans
Tags: bundle, overview, workflow
Summary: Neenja is used as a project-local bundle with prompts inside `.neenja/` and the canonical knowledge file in the project root.
Related: bundle-cli-workflow, prompt-workflow, knowledge-file-format

### What it is
Neenja is a portable documentation bundle for AI-assisted development. A user
keeps one canonical `neenja.knowledge.md` file in the root of their project and
stores Neenja-owned bundle assets inside `.neenja/`.

### Bundle layout
Common bundle paths are:

- `neenja.knowledge.md` for the canonical project knowledge file
- `.neenja/prompts/bootstrap.md` for the one-time documentation generation prompt
- `.neenja/prompts/system.md` for the ongoing maintenance prompt
- `.neenja/build/` for static reader UI output

### Why this layout
The root-level knowledge file stays close to the user's codebase and is easy
for agents to discover. The `.neenja/` directory keeps bundle-owned assets
separate from user code while still living inside the same repository.

## Concept: Bundle CLI Workflow
ID: bundle-cli-workflow
Category: For humans
Tags: cli, commands, ui, build
Summary: Neenja exposes CLI commands for initializing prompts, serving the UI, building a static bundle, and preparing a GitHub Pages build.
Related: platform-overview, prompt-workflow, knowledge-file-format, function-documentation

### Commands
- `neenja init` creates `.neenja/prompts/bootstrap.md` and `.neenja/prompts/system.md`
- `neenja serve` starts the local UI server for `./neenja.knowledge.md`
- `neenja build` builds the static UI into `.neenja/build`
- `neenja build-github` builds a GitHub Pages-ready bundle into `.neenja/build`
- `neenja help` prints the available commands and usage

### Knowledge file resolution
By default, `serve` and `build` read `neenja.knowledge.md` from the current
project root. They may also receive a custom file path through a positional
argument or `--file <path>`.

### Functions
#### Function: `neenja init`
Kind: CLI command
Signature: `neenja init`
Purpose: Scaffold the local Neenja bundle assets inside the current project.
Parameters:
- none
Returns: Creates the prompt directory structure if needed and prints setup instructions.
Side Effects: Creates `.neenja/`, `.neenja/prompts/bootstrap.md`, and `.neenja/prompts/system.md`.
Errors: Propagates filesystem permission or write failures.
Related Files:
- `.neenja/prompts/bootstrap.md`
- `.neenja/prompts/system.md`

#### Function: `neenja serve`
Kind: CLI command
Signature: `neenja serve [path]` or `neenja serve --file <path>`
Purpose: Start a local UI server for browsing the knowledge file.
Parameters:
- `path`: Optional custom path to a knowledge Markdown file.
Returns: Runs the local reader UI server until the process is stopped.
Side Effects: Reads the knowledge file and starts a local HTTP server.
Errors: Fails when the target knowledge file is missing or unreadable.
Related Files:
- `neenja.knowledge.md`

#### Function: `neenja build`
Kind: CLI command
Signature: `neenja build [path]` or `neenja build --file <path>`
Purpose: Produce a static reader bundle for the selected knowledge file.
Parameters:
- `path`: Optional custom path to a knowledge Markdown file.
Returns: Writes a static UI bundle into `.neenja/build`.
Side Effects: Reads the knowledge file and writes generated build assets into `.neenja/build`.
Errors: Fails when the target knowledge file is missing or unreadable, or when build output cannot be written.
Related Files:
- `neenja.knowledge.md`
- `.neenja/build/`

#### Function: `neenja build-github`
Kind: CLI command
Signature: `neenja build-github [path]` or `neenja build-github --file <path>`
Purpose: Produce a GitHub Pages-ready static bundle using the same knowledge-file workflow as `build`.
Parameters:
- `path`: Optional custom path to a knowledge Markdown file.
Returns: Writes a GitHub Pages-targeted UI bundle into `.neenja/build`.
Side Effects: Reads the knowledge file, uses `PUBLIC_SITE_URL` and `PUBLIC_BASE_PATH` when present, and writes generated build assets into `.neenja/build`.
Errors: Fails when the target knowledge file is missing or unreadable, or when build output cannot be written.
Related Files:
- `neenja.knowledge.md`
- `.neenja/build/`

## Concept: Prompt Workflow
ID: prompt-workflow
Category: For AI
Tags: prompts, bootstrap, system, ai
Summary: Neenja separates one-time documentation generation from ongoing maintenance through two project-local prompt files.
Related: platform-overview, bundle-cli-workflow, knowledge-file-format, function-documentation

### Prompt roles
- `.neenja/prompts/bootstrap.md` is given to an agent once to create or fully refresh `neenja.knowledge.md`
- `.neenja/prompts/system.md` is used during normal coding sessions so the agent reads and maintains `neenja.knowledge.md`

### Workflow
1. Run `neenja init`.
2. Give `.neenja/prompts/bootstrap.md` to an agent.
3. The agent creates `neenja.knowledge.md` in the project root.
4. Reuse `.neenja/prompts/system.md` for normal work so the agent reads the
   knowledge file first and updates it when behavior changes.

### Important rule
Prompt files live inside `.neenja/`, but the canonical knowledge file itself
stays at the top level of the project. This keeps the agent-facing source of
truth easy to locate without mixing it into bundle-owned assets.

## Concept: Knowledge File Format
ID: knowledge-file-format
Category: For AI
Tags: format, markdown, structure, knowledge
Summary: The canonical knowledge base lives in root-level `neenja.knowledge.md` and uses frontmatter plus repeatable concept blocks.
Related: platform-overview, bundle-cli-workflow, prompt-workflow, function-documentation

### Required structure
The file starts with frontmatter:

```txt
---
title: <document title>
project: <project name>
version: <schema version>
updated: <YYYY-MM-DD>
summary: <one sentence summary>
---
```

After that, the document may include intro text and then repeatable concept
blocks:

```txt
## Concept: <Human Title>
ID: <stable-machine-id>
Category: <navigation group>
Tags: tag-one, tag-two
Summary: <one sentence summary>
Related: concept-id-one, concept-id-two

### Main section
Concept explanation in Markdown.
```

### Placement and defaults
- The canonical file path is `./neenja.knowledge.md`
- `neenja serve` and `neenja build` use that path by default
- A custom file path may be supplied when the user wants to inspect or build a
  different knowledge document

### Why this format works
- It stays diff-friendly and easy for agents to parse
- Stable IDs let prompts update concepts without guessing
- Humans can browse the same file in raw Markdown or through the Neenja UI
- One-file documentation keeps the AI-facing source of truth explicit

## Concept: Function Documentation
ID: function-documentation
Category: For AI
Tags: functions, api, commands, reference
Summary: Concepts can embed function reference blocks to describe CLI commands, integration surfaces, and other important callable interfaces.
Related: knowledge-file-format, prompt-workflow, bundle-cli-workflow

### When to use it
Use function reference blocks when another engineer or agent needs callable
contracts without re-reading implementation code. In bundle-oriented projects,
that commonly includes:

- CLI commands such as `init`, `serve`, `build`, and deployment-oriented build commands
- APIs that control the UI or trigger AI-facing workflows
- exported utilities with side effects or important integration contracts

### Recommended shape
Inside the owning concept, describe each important callable with:

- callable kind such as command, function, method, handler, hook, or endpoint
- signature or invocation shape
- purpose
- parameters or inputs
- return value or output contract
- side effects
- important error cases
- related bundle paths when they help another agent navigate safely

### Scope rules
- Prefer documenting stable, user-facing, or integration-relevant callables
- Avoid documenting trivial private helpers
- Keep the documentation grounded in real behavior, not hypothetical APIs
