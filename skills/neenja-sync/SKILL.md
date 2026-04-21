---
name: neenja-sync
description: Use this skill EVERY TIME if the project root contains a `.neenja` folder.
---

# Neenja Sync

Use this skill on every task in a project with Neenja.

## Introduction

This project uses Neenja, a vibecoding framework that enables development with AI agents in a more structured way, with automatic documentation, a project plan, and a task tree with a task tracker.

## Documentation-first workflow

1. At the start of every task, read `./.neenja/documentation.md` before
   planning, editing code, or answering questions about the project.
2. If `./.neenja/project-plan.md` exists, read it too so implementation work
   aligns with the current technical architecture, contracts, constraints, and
   user-specified implementation details.
3. If `./.neenja/task-tree.yaml` exists, read it too and orient implementation
   around the relevant task, its status, its parent task, and its dependency
   edges.
4. Use the documentation, technical plan, and task tree to build context about
   the architecture, workflows, terminology, implementation order, module
   boundaries, data contracts, and important constraints.
5. If any document frontmatter contains `preferences:`, follow those
   saved user preferences whenever you add, remove, reorganize, or rewrite
   project documentation.
6. If the documentation conflicts with the code, treat the code as the current
   implementation and update the documentation before you finish the task.
7. Complete the assigned task using the codebase and canonical Neenja documents
   as context. When a task tree exists, prefer work that advances the relevant
   unblocked task and respects `dependsOn:` relationships.
8. Before you finish, decide whether your changes introduced or materially
   changed anything that belongs in the canonical documentation.
9. If the answer is yes, update `./.neenja/documentation.md` in the same
   task before your final response.
10. If the task status changed because of your work, update
    `./.neenja/task-tree.yaml` in the same task. Use `in-progress` while actively
    implementing, `review` when work is ready for user review, `done` when the
    task is complete, and `blocked` when a dependency or missing decision stops
    progress.
11. If the user changes approved architecture, module boundaries, data
    contracts, or durable technical constraints, update
    `./.neenja/project-plan.md` in the same task.
12. If the answer is no, do not churn canonical documents just to touch them.

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

## Required project plan file format

When `./.neenja/project-plan.md` exists, preserve it as a technical
architecture and implementation-intent document:

```txt
---
title: <project name> Technical Project Plan
project: <project name>
version: 1
updated: <YYYY-MM-DD>
preferences: <optional single-line user technical preferences>
---

# <project name> Technical Project Plan

## Plan: <Human Section Title>
ID: <stable-machine-id>
Area: <Architecture|Runtime|Frontend|Backend|Data Contracts|Integrations|Infrastructure|Quality|Skills|Decisions>
Summary: <one sentence technical summary>

<Free-form technical Markdown. Use paragraphs, bullets, tables, and code
blocks when they make the implementation intent clearer.>

### <Technical Detail Block>
<Free-form Markdown body for the detail block.>
```

The plan should capture architecture, module boundaries, contracts,
integrations, constraints, and explicit user technical decisions. Do not use it
as an implementation log. Task progress belongs in `./.neenja/task-tree.yaml`.
Only `ID`, `Area`, and `Summary` are structured plan metadata. Write all other
technical content as normal Markdown instead of custom structured field blocks.

## Required task tree file format

When `./.neenja/task-tree.yaml` exists, preserve this YAML tree schema:

```yaml
title: <project name> Task Tree
project: <project name>
version: 1
updated: <YYYY-MM-DD>
preferences: <optional single-line user project preferences>

tasks:
  - id: <stable-machine-id>
    title: <Human Task Title>
    status: <todo|in-progress|blocked|review|done|canceled>
    area: <Project|Frontend|Backend|Data|Infrastructure|Quality|Delivery|Docs|Skills|other useful area>
    dependsOn:
      - <optional dependency task ID>
    details: |-
      <optional Markdown task detail, acceptance notes, or implementation hints>
    children:
      - id: <stable-machine-id>
        title: <Human Subtask Title>
        status: todo
        area: <area>
```

Use nested `children:` for task decomposition and `dependsOn:` for graph
dependencies between tasks. Do not add a task-tree `summary` field.

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
- If the user is starting a project from a brief, use `/neenja-init`.
- If the task tree does not exist yet, do not invent it during sync unless the
  user asks for planning or task decomposition.

## Final rule

Always read the canonical documentation file first. When a task tree exists,
use it to guide implementation and update changed task statuses before
finishing. When a technical project plan exists, preserve its architecture and
contract constraints. Always update documentation before finishing a task when
you changed something that should be documented.
