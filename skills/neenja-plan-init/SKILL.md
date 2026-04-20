---
name: neenja-init
description: Use at the beginning of a project when the user describes what they want to build. Convert the user's detailed brief into structured `.neenja/project-plan.md` and `.neenja/task-tree.yaml`, save optional user preferences, and ask the user to review and correct both before treating them as approved.
---

# Neenja Project Plan Init

Use this skill when a user starts a project by describing the intended product,
tool, website, app, library, or workflow they want to create.

## Goal

Create the project plan candidate and task tree candidate from the user's
brief. The plan captures what the project is, why it exists, who it is for,
what success means, what is in scope, what is out of scope, and which
constraints define the approved implementation boundary. The task tree
decomposes that intent into small implementation tasks with statuses and graph
relationships.

The plan and task tree become final when the user approves them. After
approval, treat `./.neenja/project-plan.md` as finalized project intent and
`./.neenja/task-tree.yaml` as the implementation task graph.

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
preferences: <optional single-line user project preferences>
```

Use it for stable user preferences that apply to the project: product taste,
UX constraints, technical preferences, tone, exclusions, audience, pace, or
decision-making style.

If the user did not provide stable preferences, omit the `preferences:` line.

## Required project plan format

```txt
---
title: <project name> Project Plan
project: <project name>
version: 1
updated: <YYYY-MM-DD>
preferences: <optional single-line user project preferences>
---

# <project name> Project Plan

## Plan: <Human Section Title>
ID: <stable-machine-id>
Area: <Project|Goal|Audience|Scope|Experience|Technical|Delivery|Risks|Decisions>
<Additional Field>: <structured value>
<List Field>:
- <item>
- <item>

<Markdown body with useful detail.>
```

If there is no user preferences string, omit the `preferences:` line.

## Required task tree format

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
    area: <Project|Product|Frontend|Backend|Data|Infrastructure|Quality|Delivery|Docs|other useful area>
    dependsOn:
      - <optional dependency task ID>
    fields:
      <Additional Field>:
        - <item>
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

## Required sections

Write a practical plan candidate with these sections unless the user's brief
clearly calls for a different organization:

- `Project Definition`: what the project is and who it serves.
- `Primary Goal`: the main outcome and success criteria.
- `Scope`: what is in scope and out of scope.
- `User Experience`: expected workflows, UX qualities, or interface behavior
  when relevant.
- `Technical Direction`: preferred stack, architecture, integrations, data
  model, or constraints when known.
- `Acceptance Criteria`: the concrete checks that define a complete result.
- `Constraints`: assumptions, non-goals, risks, and hard boundaries.

## Required task tree shape

Write a practical task graph candidate unless the user's brief clearly calls
for a different decomposition:

- Create one or more root tasks that represent major deliverables.
- Decompose each root task into small tasks that a coding agent can complete.
- Use nested `children:` to express decomposition under a larger task.
- Use `dependsOn:` to express ordering or blocking relationships between
  tasks, even across different parents.
- Set initial statuses to `todo` unless the repository already contains work
  that clearly completes a task.
- Prefer small, verifiable tasks over vague phases.
- Include acceptance hints in the task body when they materially help
  implementation.

## Authoring rules

- Base the plan primarily on the user's brief.
- If there is an existing repository, inspect it only enough to avoid obvious
  conflicts with the current stack and structure.
- Preserve existing stable plan section IDs when updating a plan candidate.
- Preserve existing stable task IDs when updating a task tree candidate.
- Prefer concrete fields and bullet lists over vague prose.
- Keep the plan useful for a coding agent that implements the approved project.
- Keep tasks small enough that progress is meaningful from their statuses.
- Mark unknowns as assumptions or constraints instead of inventing details.
- Do not start implementation while using this skill unless the user explicitly
  asks you to continue after approving the plan.

## Completion response

After writing `./.neenja/project-plan.md` and `./.neenja/task-tree.yaml`, ask
the user to review them.

Your final response should briefly say that the plan was created and ask:

```txt
Посмотри, пожалуйста, все ли в плане и task tree ОК. Что поправить перед тем, как считать их финальными?
```
