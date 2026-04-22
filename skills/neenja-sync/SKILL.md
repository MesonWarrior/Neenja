---
name: neenja-sync
description: Use this skill EVERY TIME if the project root contains a `.neenja` folder. Do not use this skill when /neenja-init or /neenja-bootstrap are being used. Only one of these skills should be used at a time.
---

# Neenja Sync

Use this skill on every task in a project with Neenja.

## Introduction

This project uses Neenja, a vibecoding framework that enables development with AI agents in a more structured way, with automatic documentation, a project plan, and a task tree with a task tracker.

## Documentation types

There are three types of documentation files:

1. documentation.md
2. project-plan.md
3. task-tree.yaml

All of them are located in the .neenja folder at the root of the project.

- documentation.md contains the project canonical documentation.
- project-plan.md contains the technical plan of the project.
- task-tree.yaml contains a task tree required for implementing the project.

## Documentation-first workflow

1. At the start of every task, read all three documentation files before
   planning, editing code, or answering questions about the project.
2. Use the documentation, technical plan, and task tree to build context about
   the architecture, workflows, terminology, implementation order, module
   boundaries, data contracts, and important constraints.
3. If any document frontmatter contains `preferences:`, follow those
   saved user preferences whenever you add, remove, reorganize, or rewrite
   project documentation.
4. If the data in documentation files conflicts with the code, treat the code as the current
   implementation and update the files before you finish the task.
5. Prefer work that advances the relevant
   unblocked task and respects `dependsOn:` relationships, if the user does not directly indicate which task to perform.
6. Before you finish, decide whether your changes introduced or materially
   changed anything that belongs in the canonical documentation.
7. If the answer is yes, update `./.neenja/documentation.md` in the same
   task before your final response.
8. If the task status changed because of your work, update
    `./.neenja/task-tree.yaml` in the same task. Use `in-progress` while actively
    implementing, `review` when work is ready for user review, `done` when the
    task is complete, and `blocked` when a dependency or missing decision stops
    progress.
9. If the user changes approved architecture, module boundaries, data
    contracts, or durable technical constraints, update
    `./.neenja/project-plan.md` in the same task.
10. If the answer is no, do not churn canonical documents.

## documentation.md

### documentation.md requirements

1. The canonical documentation must live in this one file only.
2. Change documentation in `./.neenja/documentation.md`, only if needed.
3. Do not create multiple documentation files, wiki pages, or split
   documentation across extra files.
4. Base the documentation on the real code changes, not on assumptions.
5. Write stable concept IDs and keep them unchanged across updates.
6. Every concept must have both a privacy level and a concept type.
7. Document architecture, workflows, important entities, and important APIs,
   functions, and types when that level of detail matters.
8. Keep the writing dense, factual, and useful for another coding AI agent.
9. Do not leave helper notes, scratch files, or temporary artifacts behind.

### documentation.md format

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

If there is no saved user preferences regarding documentation, omit the `preferences:` line.

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

### documentation.md rules

- Avoid vague statements with no implementation grounding
- Avoid duplicating the same idea in multiple concepts
- Do not use unstable IDs such as `concept-1`
- Do not make undocumented assumptions
- Avoid spreading documentation across multiple files
- Do not make changes to the documentation unless they're truly necessary. Do not try to make as many changes as possible. Apply them only to the concepts intended for this, which already describe the concept related to the change or are connected to it. If none exist, create a new one.

### documentation.md What usually belongs in the documentation

- new or changed architecture, module responsibilities, or data flow
- new workflows, commands, setup rules, or operational constraints
- new integrations, external dependencies, or environment requirements
- new or changed APIs, handlers, RPC methods, hooks, exported functions, CLI
  commands, or other meaningful callable surfaces
- new or changed data structures, payloads, schemas, config formats, or domain
  entities that agents or developers need to reason about safely
- new side effects, permissions, auth rules, error cases, or behavioral caveats
- new concepts that another AI agent would need in order to work safely

### documentation.md What usually does not need documentation

- trivial private helper refactors with no behavior change
- formatting-only or naming-only edits
- temporary debugging code
- implementation noise that does not change how the system works

## project-plan.md

### project-plan.md requirements

1. Technical project plan must live in this one file only.
2. Change project plan in `./.neenja/project-plan.md`, if needed.
3. Do not create multiple project plan files.
4. Prefer updating the existing project plan file if it already exists.
5. Read the user's requests carefully and write them down in the project plan in a structured form.
6. Write stable plan IDs and keep them unchanged across updates.
7. Information provided by the user should be written into the project plan in a more proper, structured format. It should include all the information the user has shared, from architecture to design.
8. Keep the writing dense, factual, and useful for another coding AI agent.
9. Do not leave helper notes, scratch files, or temporary artifacts behind.

### project-plan.md format

```txt
---
title: <project name> Project Plan
project: <project name>
version: 1
updated: <YYYY-MM-DD>
preferences: <optional single-line user preferences>
---

# <project name> Project Plan

## Plan: <Human Section Title>
ID: <stable-machine-id>
Area: <Architecture|Runtime|Frontend|Backend|Data Contracts|Integrations|Infrastructure|Quality|Skills|Decisions>
Summary: <one sentence technical summary>

<Free-form technical Markdown. Use paragraphs, bullets, tables, and code
blocks when they make the implementation intent clearer.>

### <Technical Detail Block>
<Free-form Markdown body for the detail block.>
```

If there is no user preferences regarding project plan, omit the `preferences:` line.

### project-plan.md content

Write a practical technical plan candidate with similar sections unless the
user's brief clearly calls for a different organization:

- `Architecture Overview`: runtime layers, module boundaries, and main data flow.
- `UI`: project appearance, design, UI elements.
- `Document/Data Contracts`: schemas, persistence shape, events, API payloads,
  or other stable interfaces.
- `Implementation Surfaces`: CLI commands, routes, handlers, components,
  services, integrations, or exported functions that matter.
- `User-Specified Technical Details`: stack choices, constraints, exclusions,
  performance/security requirements, and important decisions from the brief.
- `Risks and Constraints`: hard boundaries, assumptions, unknowns, compatibility
  concerns, or migration limits.
- `Verification`: tests, typechecks, build checks, manual smoke paths, and
  acceptance criteria that prove the implementation works.

You can add or remove sections from this structure, depending on the project.

Use `###` detail blocks inside a section when it makes dense technical content
easier to scan.

### project-plan.md rules

- Do not change the project plan unless the user makes some new changes to the project.
- Base the plan primarily on the user's brief and details.
- Prefer concrete fields, file/module references, data-flow notes, and bullet
  lists over broad prose.
- Mark unknowns as assumptions, risks, or open decisions instead of inventing
  implementation facts.
- Keep the plan useful for a coding agent that must implement the approved
  architecture.

## task-tree.yaml

### task-tree.yaml requirements

- After changing the data associated with tasks, be sure to change their status.
- Don't create new tasks unless the user specifically requests new functionality, bug fixes, etc.
- If you notice an issue that requires creating a new task, please notify the user so they can confirm the need for creating it.
- By default, the task tree is considered complete to create the entire project, so there is no need to split existing tasks into subtasks, and creating new tasks requires confirmation.

### task-tree.yaml format

```yaml
title: <project name> Task Tree
project: <project name>
version: 1
updated: <YYYY-MM-DD>
preferences: <optional single-line user preferences>

tasks:
  - id: <stable-machine-id>
    title: <Human Task Title>
    status: <todo|in-progress|blocked|review|done|canceled>
    area: <Project|Frontend|Backend|Data|Infrastructure|Quality|Delivery|Docs|Skills|other useful area>
    dependsOn:
      - <optional dependency task ID>
    details: |-
      <Markdown task detail, acceptance notes, or implementation hints>
    children:
      - id: <stable-machine-id>
        title: <Human Subtask Title>
        status: todo
        area: <area>
```

If there is no user preferences regarding task tree, omit the `preferences:` line.

### task-tree.yaml shape

Write a practical task graph candidate unless the user's brief clearly calls
for a different decomposition:

- Use nested `children:` to express decomposition under a larger task.
- Use `dependsOn:` to express ordering or blocking relationships between
  tasks, including across different parents.
- Prefer small, verifiable tasks over vague phases.
- Include acceptance hints in task `details`.
- Do not be afraid to create deep task trees. Add enough subtasks under other subtasks when they are substantial. The tree does not need to be flat. Each task should be sized ideally so that an agent can complete it in one sitting without filling up the context window.
- Do not create extra tasks that go beyond what the user has described.
- The activity of creating or modifying documentation files is NOT a task. Do not create such items in the task tree, only tasks that directly affect the project itself.

## If the documentation files do not exist yet

- Follow the guidance from the `/neenja-init` or `/neenja-bootstrap` skill, depends on project status.

## Final rules

- Always read the documentation files first.
- Use task tree to guide implementation and update changed task statuses before finishing.
- Preserve project plan architecture and contract constraints. 
- Always update documentation before finishing a task when you changed something that should be documented.
- Do not write about things that do not exist or that you have removed. If you remove something, you must delete the text from the documentation, not add new explanations.
- Carefully check whether suitable tools or libraries already exist before implementing something from scratch.
- If you are unsure about something, ask the user what they meant before implementing, rather than guessing the most likely option.
- Do not hesitate to use existing libraries if something can be done more easily and quickly with them.
- Always clean up unused code. Do not leave behind dead or legacy code for backward compatibility if the project is still in development and has not been released publicly.
- Do not load documents again if they are already present in your context.