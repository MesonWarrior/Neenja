---
title: Neenja Documentation
project: Neenja
version: 1
updated: 2026-04-11
summary: Neenja is a tool that allows you to automatically generate a project documentation file using any AI coding agent, with automatic updates whenever changes are made.
---

# Neenja Documentation

This file is the single source of truth for the project. Every important concept
must live here so an AI agent can understand the codebase by reading one file.

## Concept: Platform Overview
ID: platform-overview
Category: For humans
Tags: product, overview, goal
Summary: Neenja is a documentation tool for vibecoding.
Related: knowledge-file-format, prompt-workflow

### What it is
The Neenja documentation tool allows you to automatically generate a project documentation file using any AI coding agent, with automatic updates whenever changes are made. It combines:

- one canonical project knowledge file
- a bootstrap prompt that creates or refreshes that file
- a runtime system prompt that makes working agents read and maintain that file
- a parser and reader UI for this file, so human can read it

### Why?
Over time, it becomes harder for humans to understand exactly what changes the coding agent has made, and the coding agent itself makes more mistakes in the project because it doesn’t understand the context. Neenja provides a simple documentation tool that allows the agent to understand the project’s structure and enables humans to verify whether the agent has completed its task correctly and whether the logic is working as intended.

### How to use?
1. Clone Neenja in your project.
2. Customize and run bootstrap prompt [`prompts/neenja-documentation-bootstrap-prompt.md`].
3. Set your agent's system prompt to this prompt: [`prompts/neenja-documentation-bootstrap-prompt.md`] or add this at the end if you're using the system prompt.
4. To use the UI, go to the Neenja folder and execute:
```bash
npm install
npm run dev
```
5. To build the UI, go to the Neenja folder and execute:
```bash
npm run build
```
Then you can copy `dist/` directory to serve it with a server.

### What does it run on?
This project is developed using React and uses Astro for building.

## Concept: Knowledge File Format
ID: knowledge-file-format
Category: For AI
Tags: format, markdown, structure, ai
Summary: The knowledge base is stored in one Markdown file with frontmatter metadata, repeatable concept blocks, and optional function reference sections.
Related: platform-overview, function-documentation

### Required structure
The file starts with YAML-like frontmatter:

```txt
---
title: <document title>
project: <project name>
version: <schema version>
updated: <YYYY-MM-DD>
summary: <one sentence summary>
---
```

After that, the file contains any introductory text and then one or more
repeatable concept blocks:

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

When a concept describes an API surface, service module, parser, exported
utility, hook, or other callable interface, the concept body may also include a
repeatable function reference section:

```txt
### Functions
#### Function: `readKnowledgeDocument`
Kind: async function
Signature: `readKnowledgeDocument(): Promise<KnowledgeDocument>`
Purpose: Parse the canonical knowledge file into the reader data model.
Parameters:
- none
Returns: Parsed metadata, concepts, category groups, and lookup maps.
Side Effects: Reads the canonical Markdown file from disk.
Errors: Propagates file read failures.
Related Files:
- `lib/knowledge-file.ts`
```

### Why this format works for AI
- It is plain text and easy to diff.
- Stable keys let an agent parse structure without guessing.
- Markdown content remains comfortable for humans to read and edit.
- Concepts can reference each other with `Related` IDs.
- Function reference blocks let agents capture API and callable behavior without
  breaking the one-file model.

### Authoring rules
1. Every concept must have a stable `ID`.
2. Every concept must belong to exactly one `Category`.
3. Summaries should stay short and descriptive.
4. Update the frontmatter `updated` value every time the canonical knowledge file changes.
5. The body should explain behavior, intent, and important files when relevant.
6. Add function reference blocks when function-level behavior matters for safe
   implementation or integration work.
7. Document important exported or operationally significant callables, not every
   trivial private helper.

## Concept: Prompt Workflow
ID: prompt-workflow
Category: For humans
Tags: ai, prompt, generation, authoring, maintenance
Summary: Neenja uses a one-time bootstrap prompt to create the knowledge file and a runtime system prompt that makes agents read and maintain it during normal work.
Related: knowledge-file-format, function-documentation

### Prompts
The prompt layer tells agents to:

- use the bootstrap prompt for the first canonical documentation pass or a full regeneration pass
- save the canonical documentation file at `/neenja/docs/neenja.knowledge.md`
- inspect the real codebase before writing or updating documentation
- read the canonical knowledge file before normal task execution
- preserve stable IDs when updating documentation
- add function reference blocks for APIs, handlers, services, hooks, and other
  important callables when interface-level behavior matters
- update the knowledge file at the end of a task when documentable behavior has
  changed

### Customization
The prompts include a section where users can customize the documentation process for their project. This is optional, but it’s best to do so to ensure the tool works properly.

### Important files
- `prompts/neenja-documentation-bootstrap-prompt.md` [Bootstrap prompt]
- `prompts/neenja-documentation-system-prompt.md` [System prompt]
- `docs/neenja.knowledge.md` [Documentation file]

## Concept: Function Documentation
ID: function-documentation
Category: For AI
Tags: functions, api, reference, interfaces
Summary: Concepts may embed repeatable function reference blocks to document APIs, handlers, services, and other important callable interfaces.
Related: knowledge-file-format, prompt-workflow

### When to use it
Use function documentation inside a concept when another engineer or AI agent
would need callable-level details to integrate safely or make changes without
re-reading implementation code.

Common cases include:

- API route handlers and RPC methods
- exported library functions and public utilities
- service methods with side effects
- React hooks and server actions
- CLI commands and job entry points

### Recommended shape
Start with a `### Functions` section inside the owning concept. Then describe
each important callable with a repeatable `#### Function:` block and include:

- callable kind such as function, method, handler, hook, or endpoint
- signature or route shape
- purpose
- parameters or request inputs
- return value or response contract
- side effects
- important error cases
- related implementation files when useful

### API-specific guidance
When the callable is an HTTP or RPC interface, adapt the same block to capture:

- method and path or RPC name
- authentication and authorization requirements
- request payload or query parameters
- response schema or status code expectations
- idempotency or retry behavior when relevant

### Scope rules
- Prefer documenting stable and externally meaningful callables over tiny
  private helpers.
- Group related functions inside the concept that owns the behavior rather than
  scattering standalone one-function concepts everywhere.
- Keep function docs grounded in real code, not hypothetical contracts.

### Why it matters
Function-level references let agents understand callable contracts, side
effects, and integration expectations without having to reverse-engineer every
important API or exported function from source code.
