---
title: Neenja Project Plan
project: Neenja
version: 1
updated: 2026-04-20
summary: Neenja is a project memory workspace that renders documentation, finalized project intent, and task trees side by side.
preferences: Keep project plans concise, structured, and implementation-ready for coding agents.
---

# Neenja Project Plan

## Plan: Project Definition
ID: project-definition
Area: Project
Summary: Neenja is a CLI and reader for canonical project documentation stored as project files under `.neenja`.
Project: Neenja
Audience:
- developers using coding agents
- coding agents that need stable project context
- maintainers publishing browsable project documentation

Neenja makes project memory explicit. The reader gives humans and agents one
place to inspect the repository documentation and the approved project intent.

## Plan: Primary Goal
ID: primary-goal
Area: Goal
Summary: The product goal is to render documentation, a finalized project plan, and a task tree from the same Neenja documents folder.
Primary Goal: Provide a reader that switches between current project documentation, approved project intent, and implementation task progress without changing tools.
Success Criteria:
- `neenja serve` reads `.neenja/` as a document folder.
- `documentation.md` renders as concept documentation.
- `project-plan.md` renders as structured plan sections.
- `task-tree.yaml` renders as a nested task tree and graph workspace with statuses.
- The navbar exposes recognized documents when their files exist.
- Static builds include routes for every recognized document type.

The project plan is not an implementation log. It captures the approved why,
target outcome, constraints, and scope that guide code changes.

## Plan: Scope
ID: scope
Area: Delivery
Summary: The project scope is multi-document reading, project-plan rendering, task-tree rendering, and planning skills.
In Scope:
- folder-based document discovery
- route namespace per document
- project-plan Markdown schema
- project-plan reader UI
- task-tree YAML tree schema
- fullscreen task-tree graph workspace with pan, zoom, task selection, and task status progress
- sample plan file for local testing
- `/neenja-init` skill for creating an approved project plan and task tree from user intent
- `neenja-sync` skill guidance to work from the task tree when present
Out Of Scope:
- editing documents inside the browser
- syncing with remote planning systems
- arbitrary custom document types

The document set is intentionally small. Document type discovery is
filename-based: `documentation.md`, `project-plan.md`, and `task-tree.yaml`.

## Plan: Acceptance Criteria
ID: acceptance-criteria
Area: Delivery
Summary: The reader and CLI satisfy the project plan when recognized document types render through stable folder-based routes.
Acceptance Criteria:
- `readDocumentCollection` returns recognized documents in navbar order.
- Documentation routes use `/documentation/:conceptId/`.
- Project plan routes use `/project-plan/:sectionId/`.
- Task tree routes use `/task-tree/:taskId/`.
- Project-plan sidebar navigation groups sections by `Area`.
- Task-tree sidebar navigation groups tasks by `Area`.
- Project-plan sections render their structured fields and Markdown body.
- Task-tree entries render in a fullscreen graph workspace; selecting a node opens a right-side task detail drawer.
- CLI commands accept `--dir` for document folders and keep `--file` as a legacy documentation path.
- Documentation, project-plan, and task-tree YAML files remain separate canonical documents inside `.neenja/`.

The reader preserves existing documentation behavior while presenting the
approved project plan as a peer document.

## Plan: Constraints
ID: constraints
Area: Delivery
Summary: The project plan favors predictable schemas and compatibility with existing documentation workflows.
Constraints:
- Existing concept parsing remains unchanged inside `documentation.md`.
- Project-plan sections require `ID`, `Area`, and `Summary`.
- Task-tree tasks require stable `id` values and should include `title`, `status`, and `area`; task trees do not store `summary`.
- Unknown files in `.neenja/` are ignored.
- Legacy `--file` support remains limited to single documentation files.

The reader prefers predictable behavior over broad schema flexibility.
