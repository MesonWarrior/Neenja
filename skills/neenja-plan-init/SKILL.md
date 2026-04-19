---
name: neenja-plan-init
description: Use at the beginning of a project when the user describes what they want to build. Convert the user's detailed brief into a structured `.neenja/project-plan.md`, save optional user preferences in frontmatter, and ask the user to review and correct the plan before treating it as approved.
---

# Neenja Project Plan Init

Use this skill when a user starts a project by describing the intended product,
tool, website, app, library, or workflow they want to create.

## Goal

Create the project plan candidate from the user's brief. The plan captures what
the project is, why it exists, who it is for, what success means, what is in
scope, what is out of scope, and which constraints define the approved
implementation boundary.

The plan becomes final when the user approves it. After approval, treat
`./.neenja/project-plan.md` as a finalized source of project intent.

## Canonical output location

- Save the project plan to `./.neenja/project-plan.md`.
- Create `./.neenja/` if it does not exist.
- Do not put the plan in the repository root.
- Do not create extra planning files unless the user explicitly asks for them.

## Optional preferences

The project plan supports one optional single-line frontmatter property:

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
summary: <one-sentence project intent>
preferences: <optional single-line user project preferences>
---

# <project name> Project Plan

## Plan: <Human Section Title>
ID: <stable-machine-id>
Area: <Project|Goal|Audience|Scope|Experience|Technical|Delivery|Risks|Decisions>
Summary: <one-sentence section summary>
<Additional Field>: <structured value>
<List Field>:
- <item>
- <item>

<Markdown body with useful detail.>
```

If there is no user preferences string, omit the `preferences:` line.

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

## Authoring rules

- Base the plan primarily on the user's brief.
- If there is an existing repository, inspect it only enough to avoid obvious
  conflicts with the current stack and structure.
- Preserve existing stable plan section IDs when updating a plan candidate.
- Prefer concrete fields and bullet lists over vague prose.
- Keep the plan useful for a coding agent that implements the approved project.
- Mark unknowns as assumptions or constraints instead of inventing details.
- Do not start implementation while using this skill unless the user explicitly
  asks you to continue after approving the plan.

## Completion response

After writing `./.neenja/project-plan.md`, ask the user to review it.

Your final response should briefly say that the plan was created and ask:

```txt
Посмотри, пожалуйста, все ли в плане ОК. Что поправить перед тем, как считать его финальным?
```
