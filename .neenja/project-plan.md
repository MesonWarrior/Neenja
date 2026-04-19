---
title: Neenja Project Plan
project: Neenja
version: 1
updated: 2026-04-19
summary: Neenja is a project memory workspace that renders documentation and finalized project intent side by side.
preferences: Keep project plans concise, structured, and implementation-ready for coding agents.
---

# Neenja Project Plan

## Plan: Project Definition
ID: project-definition
Area: Project
Summary: Neenja is a CLI and reader for canonical project documentation stored as Markdown files under `.neenja`.
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
Summary: The product goal is to render documentation and a finalized project plan from the same Neenja documents folder.
Primary Goal: Provide a reader that switches between current project documentation and approved project intent without changing tools.
Success Criteria:
- `neenja serve` reads `.neenja/` as a document folder.
- `documentation.md` renders as concept documentation.
- `project-plan.md` renders as structured plan sections.
- The navbar exposes both documents when both files exist.
- Static builds include routes for both document types.

The project plan is not an implementation log. It captures the approved why,
target outcome, constraints, and scope that guide code changes.

## Plan: Scope
ID: scope
Area: Delivery
Summary: The project scope is multi-document reading, project-plan rendering, and a planning init skill.
In Scope:
- folder-based document discovery
- route namespace per document
- project-plan Markdown schema
- project-plan reader UI
- sample plan file for local testing
- `/neenja-plan-init` skill for creating an approved project plan from user intent
Out Of Scope:
- editing documents inside the browser
- syncing with remote planning systems
- arbitrary custom document types

The document set is intentionally small. Document type discovery is
filename-based: `documentation.md` and `project-plan.md`.

## Plan: Acceptance Criteria
ID: acceptance-criteria
Area: Delivery
Summary: The reader and CLI satisfy the project plan when both document types render through stable folder-based routes.
Acceptance Criteria:
- `readDocumentCollection` returns recognized documents in navbar order.
- Documentation routes use `/documentation/:conceptId/`.
- Project plan routes use `/project-plan/:sectionId/`.
- Project-plan sidebar navigation groups sections by `Area`.
- Project-plan sections render their structured fields and Markdown body.
- CLI commands accept `--dir` for document folders and keep `--file` as a legacy documentation path.
- Documentation and project-plan files remain separate canonical documents inside `.neenja/`.

The reader preserves existing documentation behavior while presenting the
approved project plan as a peer document.

## Plan: Constraints
ID: constraints
Area: Delivery
Summary: The project plan favors predictable schemas and compatibility with existing documentation workflows.
Constraints:
- Existing concept parsing remains unchanged inside `documentation.md`.
- Project-plan sections require `ID`, `Area`, and `Summary`.
- Unknown Markdown files in `.neenja/` are ignored.
- Legacy `--file` support remains limited to single documentation files.

The reader prefers predictable behavior over broad schema flexibility.
