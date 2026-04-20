---
name: neenja-init
description: Use at the beginning of a project when the user describes what they want to build. Convert the user's brief into `.neenja/project-plan.md` plus `.neenja/task-tree.yaml`, save optional preferences, and ask the user to review both before treating them as approved.
---

# Neenja Init

Use this skill when a user starts a project by describing the intended product,
tool, website, app, library, automation, or workflow they want implemented.

## Goal

Create a technical project plan candidate and task tree candidate from the
user's brief. The plan captures architecture, module responsibilities, data
contracts, runtime flows, integrations, constraints, technical decisions, and
user-specified implementation details. The task tree decomposes that technical
intent into small implementation tasks with statuses and graph relationships.

The plan and task tree become final only when the user approves them. After
approval, treat `./.neenja/project-plan.md` as the approved technical intent and
`./.neenja/task-tree.yaml` as the implementation task graph.

Do not write a product strategy document here. Product goals, audience notes,
brand voice, or UX preferences belong in the plan only when they create a
technical constraint, acceptance requirement, interface contract, or explicit
implementation decision.

## Canonical output location

- Save the project plan to `./.neenja/project-plan.md`.
- Save the task tree to `./.neenja/task-tree.yaml`.
- Create `./.neenja/` if it does not exist.
- Do not put the plan or task tree in the repository root.
- Do not create extra planning files unless the user explicitly asks for them.

## Optional preferences

The project plan supports one optional single-line frontmatter property. The
task tree supports the same optional top-level YAML property:

```txt
preferences: <optional single-line user preferences>
```

Use it for stable technical preferences: stack choices, architecture style,
performance targets, security posture, testing expectations, deployment
constraints, exclusions, preferred decision style, or implementation boundaries.

If the user did not provide stable preferences, omit the
`preferences:` line.

## Required project plan format

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

If there is no user preferences string, omit the `preferences:` line.
Only `ID`, `Area`, and `Summary` are structured plan metadata. Write all other
technical content as normal Markdown instead of custom structured field blocks.

## Required task tree format

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
      <optional Markdown task detail, acceptance notes, or implementation hints>
    children:
      - id: <stable-machine-id>
        title: <Human Subtask Title>
        status: todo
        area: <area>
```

If there is no user preferences string, omit the `preferences:` line.
Do not add a task-tree `summary` field.

## Required plan content

Write a practical technical plan candidate with these sections unless the
user's brief clearly calls for a different organization:

- `Architecture Overview`: runtime layers, module boundaries, and main data flow.
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

Use `###` detail blocks inside a section when it makes dense technical content
easier to scan.

## Required task tree shape

Write a practical task graph candidate unless the user's brief clearly calls
for a different decomposition:

- Create one or more root tasks that represent major technical deliverables.
- Decompose each root task into small tasks that a coding agent can complete.
- Use nested `children:` to express decomposition under a larger task.
- Use `dependsOn:` to express ordering or blocking relationships between
  tasks, including across different parents.
- Set initial statuses to `todo` unless the repository already contains work
  that clearly completes a task.
- Prefer small, verifiable tasks over vague phases.
- Include acceptance hints in task `details` when they materially help
  implementation.

## Authoring rules

- Base the plan primarily on the user's brief and explicit technical details.
- If there is an existing repository, inspect it enough to align with the
  current stack, file layout, and architectural constraints.
- Preserve existing stable plan section IDs and task IDs when updating a
  candidate.
- Prefer concrete fields, file/module references, data-flow notes, and bullet
  lists over broad prose.
- Mark unknowns as assumptions, risks, or open decisions instead of inventing
  implementation facts.
- Keep the plan useful for a coding agent that must implement the approved
  architecture.
- Keep task status and implementation progress in the task tree, not in the
  project plan.
- Do not start implementation while using this skill unless the user explicitly
  asks you to continue after approving the plan.

## Completion response

After writing `./.neenja/project-plan.md` and `./.neenja/task-tree.yaml`, ask
the user to review them.

Your final response should briefly say that the technical plan was created and
ask:

```txt
Please review whether the technical plan and task tree look correct. What should change before we treat them as final?
```
