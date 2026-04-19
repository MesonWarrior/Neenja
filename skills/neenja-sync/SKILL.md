---
name: neenja-sync
description: Use on every task in a Neenja-enabled repository. Read `.neenja/documentation.md` and, when present, `.neenja/project-plan.md` before work; update documentation before finishing whenever the task changed behavior that belongs in the canonical documentation. Respect saved frontmatter `preferences:` values when they exist.
---

# Neenja Sync

Use this skill on every normal agent task after the documentation has been
bootstrapped.

## Canonical Neenja documents

- Repo-relative canonical path: `.neenja/documentation.md`
- Optional project plan path: `.neenja/project-plan.md`
- These files live inside `.neenja/`, alongside the build output.

## Documentation-first workflow

1. At the start of every task, read `./.neenja/documentation.md` before
   planning, editing code, or answering questions about the project.
2. If `./.neenja/project-plan.md` exists, read it too so implementation work
   aligns with the current project intent.
3. Use the documentation and plan to build context about the architecture, workflows,
   terminology, and important constraints.
4. If either document frontmatter contains `preferences:`, follow those
   saved user preferences whenever you add, remove, reorganize, or rewrite
   project documentation.
5. If the documentation conflicts with the code, treat the code as the current
   implementation and update the documentation before you finish the task.
6. Complete the assigned task using the codebase and canonical Neenja documents
   as context.
7. Before you finish, decide whether your changes introduced or materially
   changed anything that belongs in the canonical documentation.
8. If the answer is yes, update `./.neenja/documentation.md` in the same
   task before your final response.
9. If the answer is no, do not churn the documentation file just to touch it.

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

If there is no saved user preferences string, omit the `preferences:` line.

## Concept body rules

- `Type: concept`
  Use normal Markdown sections for explanatory documentation.
- `Type: functions`
  Write optional intro Markdown first, then repeat function blocks:

```txt
#### Function: <name>
Kind: <function|method|endpoint|cli command|hook|handler>
Signature: <call signature or route shape>
Description: <what it does and what it returns>
Parameters:
- <name>: <type (optional)> - <description>
```

- `Type: types`
  Write optional intro Markdown first, then repeat type blocks:

```txt
#### Type: <name>
Kind: <object|type alias|interface|enum|payload|schema>
Definition: <type shape, alias, or short structural form, optional>
Description: <what this type represents>
Fields:
- <field name>: <type> - <description>
```

## Authoring rules

- Every concept must include `ID`, `Privacy`, `Type`, `Category`, `Tags`,
  `Summary`, and `Related`.
- `Privacy: public` is for documentation that should ship to consumers,
  integrators, plugin authors, or developers who use the project without
  working inside its source code.
- `Privacy: private` is for internal implementation details, concrete file
  names, internal helpers, architecture details for maintainers, and agent-only
  guidance.
- Do not mention the public/private split in reader-facing prose. Treat it as
  authoring metadata only.
- Do not use `### Functions` or `### Types` sections inside normal concepts.
  Functions and types must live in dedicated concepts.
- Function concepts should keep `Signature`.
- Type concepts may omit `Definition` when `Fields` already describe a large
  object or other verbose key-value structure well enough.
- Never set `Definition` to just the type name. Either write a real structural
  definition or omit the field.
- Preserve stable concept IDs once introduced.
- Prefer editing existing concepts instead of creating near-duplicates.
- Add or update `Related` links when concepts depend on each other.
- Use documented type names consistently so function and type renderers can
  link them together.
- Keep the writing factual, implementation-grounded, and concise.

## What usually belongs in the documentation

- new or changed architecture, module responsibilities, or data flow
- new workflows, commands, setup rules, or operational constraints
- new integrations, external dependencies, or environment requirements
- new or changed APIs, handlers, RPC methods, hooks, exported functions, CLI
  commands, or other meaningful callable surfaces
- new or changed data structures, payloads, schemas, config formats, or domain
  entities that agents or developers need to reason about safely
- new side effects, permissions, auth rules, error cases, or behavioral caveats
- new concepts that another AI agent would need in order to work safely

## What usually does not need documentation

- trivial private helper refactors with no behavior change
- formatting-only or naming-only edits
- temporary debugging code
- implementation noise that does not change how the system works

## If the canonical documentation file does not exist yet

- Create `./.neenja/documentation.md`.
- Follow the bootstrap guidance from the `/neenja-bootstrap` skill.

## If the project plan does not exist yet

- Do not invent a project plan during sync unless the user asks for planning.
- If the user is starting a project from a brief, use `/neenja-plan-init`.

## Final rule

Always read the canonical documentation file first, and always update it before
finishing a task when you changed something that should be documented.
