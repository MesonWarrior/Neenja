---
name: neenja-bootstrap
description: Do not use this skill on its own. This skill is intended for generating Neenja documentation files, taking user settings into account, within an existing project under development.
---

# Neenja Bootstrap

User uses this skill to generate Neenja documentation files, based on they preferences, in already existing project.

## Documentation types

There are three types of documentation files:

1. documentation.md
2. project-plan.md
3. task-tree.yaml

All of them must be created in the .neenja folder at the root of the project.

## documentation.md

### documentation.md requirements

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

### documentation.md file format

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

### documentation.md concept body rules

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

### documentation.md concept authoring rules

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

### documentation.md what to avoid

- vague statements with no implementation grounding
- duplicating the same idea in multiple concepts
- unstable IDs such as `concept-1`
- undocumented assumptions
- spreading documentation across multiple files

## Repository analysis workflow

1. Inspect the project structure before writing documentation.
2. Read `./.neenja/documentation.md`, `./.neenja/project-plan.md` and `./.neenja/task-tree.yaml` first if they already exist.
5. Identify the main product purpose and user-facing capabilities.
6. For `documentation.md`, separate documentation that should be public from documentation that is only
   useful internally for maintainers and coding agents.
7. Identify architectural layers, data flows, and major modules.
8. Identify operational details, setup rules, integration constraints, and
   externally meaningful APIs, commands, and types.
9. Write or update the single canonical documentation file at `./.neenja/documentation.md`
10. Understand the project context and create or update the `project-plan`.md file, writing a high-level technical plan for the project.
11. Create an empty `task-tree.yaml` with the required fields, but without any tasks.

## Quality bar

- Another AI agent should be able to understand the project by reading only these files.
- A human should be able to browse them as a documentation reference without extra context.
- Documentation and project plan should balance breadth and signal: comprehensive, but not bloated.
- Documentation should reflect the current state of the codebase.
- Public concepts in documentation should be usable as product-facing reference material.
- Private concepts in documentation should help maintainers and agents work safely inside the repository.