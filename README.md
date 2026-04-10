# Neenja Docs Tool

Neenja is a minimal pre-rendered documentation tool for projects that want one
canonical, AI-friendly documentation file and a human-readable interface on top
of it.

## What it includes

- a single-file knowledge base format in [`docs/neenja.knowledge.md`](./docs/neenja.knowledge.md)
- a parser that converts concept blocks into structured data
- a reader UI with categories, search, and related concept links
- a one-time bootstrap prompt in [`prompts/neenja-documentation-bootstrap-prompt.md`](./prompts/neenja-documentation-bootstrap-prompt.md)
- a runtime system prompt in [`prompts/neenja-documentation-system-prompt.md`](./prompts/neenja-documentation-system-prompt.md)

## Local usage

```bash
npm install
npm run dev
```

Open `http://localhost:4321`.

## Build output

```bash
npm run build
```

Astro writes a static site into `dist/`. You can copy that directory into
another project or serve it with any static file server.

## Main routes

- `/` - opens the reader with the first concept selected
- `/<concept-id>/` - pre-rendered reader page for a single concept

## Authoring flow

1. Use the bootstrap prompt to create or refresh the canonical knowledge file in `docs/neenja.knowledge.md`.
2. Give working agents the runtime system prompt so they read the knowledge file before each task.
3. Ask those agents to update the canonical knowledge file whenever they make documentable changes.
4. Let the UI render that file for human browsing.
