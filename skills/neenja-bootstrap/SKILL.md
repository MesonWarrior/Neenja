---
name: neenja-bootstrap
description: Do not use this skill on your own. This skill is intended for generating Neenja documentation files based on user-provided data within an existing project under development.
---

# Neenja Bootstrap

User uses this skill to generate Neenja documentation files, based on they preferences, in already existing project.

## Main rule

If the user is using this skill in an empty or nearly empty project with minimal data, ask them to use the `/neenja-init` skill and end the conversation.

## Goal

Your task is to create three documentation files for an existing project, based on the instructions below.

## Documentation types

There are three types of documentation files:

1. documentation.md
2. project-plan.md
3. task-tree.yaml

All of them must be created in the .neenja folder at the root of the project.

- documentation.md contains the project canonical documentation.
- project-plan.md contains the technical plan of the project.
- task-tree.yaml contains a task tree required for implementing the project.

## documentation.md

### documentation.md requirements

1. The canonical documentation must live in this one file only.
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

If there is no user preferences regarding documentation, omit the `preferences:` line.

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

## project-plan.md

### project-plan.md requirements

1. Technical project plan must live in this one file only.
2. Write the final project plan directly at `./.neenja/project-plan.md`.
3. Do not create multiple project plan files.
4. Prefer updating the existing project plan file if it already exists.
5. Review the project and describe what it represents. If the user has provided any additional information, include it in this file as well.
6. Write stable plan IDs and keep them unchanged across updates.
7. If the user has provided any additional information, add this information into the project plan in a more proper, structured format. It should include all the information the user has shared, from architecture to design.
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

- Base the plan on the existing project data and user's brief and details.
- Do not miss any detail the user provides. Document everything. 
- Inspect an existing repository, to align with the
  current stack, file layout, and architectural constraints.
- Prefer concrete fields, file/module references, data-flow notes, and bullet
  lists over broad prose.
- Mark unknowns as assumptions, risks, or open decisions instead of inventing
  implementation facts.
- Keep the plan useful for a coding agent that must implement the approved
  architecture.
- Do not start implementation while using this skill unless the user explicitly
  asks you to continue after approving the plan.

## task-tree.yaml

### task-tree.yaml requirements

1. Based on the created project plan, you need to fully describe the development of the entire project in the form of tasks. You need to break down the work into smaller tasks, decomposing larger ones into smaller units, to form a task tree.
2. Some of the tasks are already done, so you also need to look at what is already done in the project, create tasks for this and set them to "done".
3. After creating the tasks that are already completed, list the tasks that are still not implemented.

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

- The task tree must have a single root meta-task - creating the entire project. Do not create multiple separate trees. All branches must stem from that one meta-task.
- Create one or more root tasks that represent major technical deliverables.
- Decompose each root task into small tasks that a coding agent can complete.
- Use nested `children:` to express decomposition under a larger task.
- Use `dependsOn:` to express ordering or blocking relationships between
  tasks, including across different parents.
- Set initial statuses to `todo` unless the repository already contains work
  that clearly completes a task.
- Prefer small, verifiable tasks over vague phases.
- Include acceptance hints in task `details`.

### task-tree.yaml rules

- Do not be afraid to create deep task trees. Add enough subtasks under other subtasks when they are substantial. The tree does not need to be flat. Each task should be sized ideally so that an agent can complete it in one sitting without filling up the context window.
- Do not create extra tasks that go beyond what the user has described.
- The activity of creating or modifying documentation files is NOT a task. Do not create such items in the task tree, only tasks that directly affect the project itself.
- Create as many tasks as are truly necessary for proper implementation of the described project. Do not underestimate the number of tasks, they should fully cover the implementation.

## Quality bar

- Another AI agent should be able to understand the project by reading only these files.
- A human should be able to browse them as a documentation reference without extra context.
- Documentation and project plan should balance breadth and signal: comprehensive, but not bloated.
- Documentation should reflect the current state of the codebase.
- Public concepts in documentation should be usable as product-facing reference material.
- Private concepts in documentation should help maintainers and agents work safely inside the repository.

## Completion response

After writing these documents, ask the user to review them.

Your final response should briefly say that these document was created and ask in the user's language:

```txt
Please review whether the documentation and project plan look correct. What should change before we treat them as final?

To view them, run `npx neenja serve` in the console from the project folder, then open the address shown in the console in your browser.
```