---
name: neenja-bootstrap
description: Use when a repository is initializing Neenja documentation or needs a full regeneration of `.neenja/documentation.md`. Inspect the real codebase, create or refresh the canonical documentation file inside `.neenja`, and accept one optional single-line preferences argument that must be written to frontmatter as `preferences:` directly under `summary:`.
---

# Neenja Bootstrap

Use this skill to create or fully refresh the canonical Neenja documentation
file.

## Optional input

This skill accepts one optional argument: a single-line string of user
documentation preferences.

- If the argument is provided, write it to the documentation file frontmatter as
  `preferences: <value>` immediately after `summary:`.
- Treat that string as documentation guidance for scope, taxonomy, tone,
  emphasis, exclusions, or audience.
- If no preferences string is provided, omit the `preferences:` line.

## Canonical output location

- Save the finished documentation file to `./.neenja/documentation.md`.
- The `.neenja/` directory stores recognized Neenja documents and build output
  for the project.
- Do not place the canonical documentation file in the repository root.
- Do not overwrite `./.neenja/project-plan.md`; that file is owned by the
  project plan workflow.

## Hard requirements

1. The canonical documentation must live in one file only.
2. Write the final documentation directly at `./.neenja/documentation.md`.
3. Do not create multiple documentation files, wiki pages, or split
   documentation across extra files.
4. Prefer updating the existing canonical file if it already exists.
5. Base the documentation on the real codebase, not on assumptions.
6. Write stable concept IDs and keep them unchanged across updates.
7. Every concept must have both a privacy level and a concept type.
8. Document architecture, workflows, important entities, and important APIs,
   functions, and types when that level of detail matters.
9. Keep the writing dense, factual, and useful for another coding AI agent.
10. Do not leave helper notes, scratch files, or temporary artifacts behind.

## Required documentation file format

```txt
---
title: <document title ending with "Documentation">
project: <project name>
version: 1
updated: <YYYY-MM-DD>
summary: <one-sentence summary of the whole project>
preferences: <optional single-line user documentation preferences>
---

# <Document Title>

<optional short introduction>

## Concept: <Human Title>
ID: <stable-machine-id>
Privacy: <public|private>
Type: <concept|functions|types>
Category: <single category name>
Tags: tag-one, tag-two, tag-three
Summary: <one-sentence summary>
Related: concept-id-one, concept-id-two
```

If there is no user preferences string, omit the `preferences:` line.

## Concept body rules

- `Type: concept`
  Use Markdown sections and free-form explanatory content.
- `Type: functions`
  Start with optional intro Markdown, then repeat function blocks:

```txt
#### Function: <name>
Kind: <function|method|handler|hook|endpoint|cli command>
Signature: <call signature or route shape>
Description: <description of the callable surface>
Parameters:
- <name>: <type (optional)> - <description>
```

- `Type: types`
  Start with optional intro Markdown, then repeat type blocks:

```txt
#### Type: <name>
Kind: <object|type alias|interface|enum|schema|payload>
Definition: <type shape, alias, or compact structure, optional>
Description: <description of what this type represents>
Fields:
- <field name>: <type> - <description>
```

## Concept authoring rules

- Every concept must start with `## Concept:`.
- Every concept must include `ID`, `Privacy`, `Type`, `Category`, `Tags`,
  `Summary`, and `Related`.
- Use exactly one category per concept.
- Use comma-separated tags and related concept IDs.
- Keep summaries short and specific.
- `Privacy: public` is for material that should ship to consumers,
  integrators, plugin authors, or developers who use the project without
  editing its internals.
- `Privacy: private` is for implementation details, internal files, concrete
  helper functions, maintainer guidance, and agent-only context.
- Do not mention the visibility split in reader-facing prose. Treat it as
  authoring metadata only.
- Do not use `### Functions` or `### Types` sections inside normal concepts.
- Use dedicated `Type: functions` concepts for callable surfaces.
- Use dedicated `Type: types` concepts for important data structures and
  schemas, even in dynamically typed languages.
- Function concepts should keep `Signature`.
- Type concepts may omit `Definition` when `Fields` already describe a large
  object or other verbose key-value structure well enough.
- Never set `Definition` to just the type name. Either write a real structural
  definition or omit the field.
- Use documented type names consistently so Neenja can link function
  signatures and field types back to their type reference entries.
- Prefer a few strong concepts over many shallow concepts.
- Merge duplicates instead of creating overlapping entries.

## Repository analysis workflow

1. Inspect the project structure before writing documentation.
2. Read `./.neenja/documentation.md` first if it already exists.
3. Read `./.neenja/project-plan.md` when it exists so documentation aligns with
   the current project intent.
4. Identify the main product purpose and user-facing capabilities.
5. Separate documentation that should be public from documentation that is only
   useful internally for maintainers and coding agents.
6. Identify architectural layers, data flows, and major modules.
7. Identify operational details, setup rules, integration constraints, and
   externally meaningful APIs, commands, and types.
8. Write or update the single canonical documentation file at the required
   path.

## Quality bar

- Another AI agent should be able to understand the project by reading only this
  file.
- A human should be able to browse it as a documentation reference without extra
  context.
- The file should balance breadth and signal: comprehensive, but not bloated.
- The document should reflect the current state of the codebase.
- Public concepts should be usable as product-facing reference material.
- Private concepts should help maintainers and agents work safely inside the
  repository.

## What to avoid

- vague statements with no implementation grounding
- duplicating the same idea in multiple concepts
- unstable IDs such as `concept-1`
- undocumented assumptions
- spreading documentation across multiple files

## Final rule

The finished deliverable is one documentation file saved at
`./.neenja/documentation.md`. If you generate helper notes during analysis,
do not keep them as separate artifacts.
