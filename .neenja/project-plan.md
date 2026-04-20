---
title: Neenja Project Plan
project: Neenja
version: 1
updated: 2026-04-20
preferences: Keep project plans technical, architecture-first, and implementation-ready for coding agents.
---

# Neenja Project Plan

## Plan: Architecture Overview
ID: architecture-overview
Area: Architecture
Summary: Neenja is a filename-driven documents reader with a CLI runtime, a shared parser/model layer, an Astro/React reader shell, and agent skills that maintain the canonical files.
Source Files:
- `bin/neenja.mjs`
- `lib/documentation-file.ts`
- `components/docs-shell.tsx`
- `src/pages/index.astro`
- `src/pages/[documentSlug]/index.astro`
- `src/pages/[documentSlug]/[entryId].astro`
- `skills/neenja-init/SKILL.md`
- `skills/neenja-bootstrap/SKILL.md`
- `skills/neenja-sync/SKILL.md`

### Runtime Layers
Runtime responsibility is split across a small chain: the CLI resolves source
paths, sets environment variables, and starts Astro dev/build commands; the
parser reads recognized `.neenja/` files and converts them into typed reader
documents; Astro routes build static paths for document slugs and entry IDs;
the React reader shell handles document switching, sidebars, search, and task
graph interaction; and the skills define how agents create and maintain the
canonical Neenja documents.

The architecture is intentionally small and filename-based. The reader supports
three canonical documents and ignores unknown files in `.neenja/`.

### Data Flow
The runtime flow starts when the CLI or Astro runtime resolves `.neenja/` as
the document directory. `readDocumentCollection` scans for recognized
filenames, sends each recognized file through its document-specific parser, and
orders the parsed documents for navbar rendering. Astro pages then pass that
collection into `DocsShell`, which chooses the document-specific navigation and
rendering behavior.

The document collection is the shared boundary between the parser, routing, and
reader UI. New behavior should keep that model explicit instead of spreading
filename decisions through UI components.

## Plan: Document Contracts
ID: document-contracts
Area: Data Contracts
Summary: Neenja stores canonical project memory as separate, typed files under `.neenja/`.
Recognized Files:
- `.neenja/documentation.md`
- `.neenja/project-plan.md`
- `.neenja/task-tree.yaml`
- `.neenja/task-tree.yml`

### Documentation Contract
Documentation frontmatter stores `title`, `project`, `version`, `updated`,
`summary`, and optional `preferences`. The body uses repeatable `## Concept:`
blocks whose metadata includes `ID`, `Privacy`, `Type`, `Category`, `Tags`,
`Summary`, and `Related`; function and type concepts add repeatable
`#### Function:` and `#### Type:` blocks respectively.

Documentation is the only privacy-filtered document. `serve` defaults to the
private set, while `build` defaults to public concepts.

### Project Plan Contract
Project-plan frontmatter stores `title`, `project`, `version`, `updated`, and
optional `preferences`. The body uses repeatable `## Plan:` sections with
stable `ID` and `Area` metadata, optional `Summary` text rendered below the
section title, normal Markdown for all non-metadata content, and optional
`###` detail blocks with free-form Markdown bodies.

The project plan is a technical architecture and implementation-intent
document. It should not duplicate product positioning, marketing copy, user
personas, or task progress.

### Task Tree Contract
The YAML root stores `title`, `project`, `version`, `updated`, optional
`preferences`, and `tasks`. Each task uses stable `id`, `title`, `status`, and
`area` values, with optional `dependsOn`, Markdown `details`, and nested
`children`; nested children create decomposition edges, while `dependsOn`
creates dependency edges across the graph. `summary` is intentionally not part
of the task tree schema.

Task trees store execution state. Project plans store technical intent.

## Plan: Parser Pipeline
ID: parser-pipeline
Area: Runtime
Summary: `lib/documentation-file.ts` owns document discovery, frontmatter parsing, block splitting, Markdown content parsing, graph derivation, and collection assembly.
Primary Module: `lib/documentation-file.ts`
Entry Points:
- `readDocumentCollection`
- `readDocumentationDocument`
- `resolveDocumentDirectoryPath`
- `resolveDocumentationDocumentPath`

### Discovery
`NEENJA_DOCUMENTS_DIR` and `NEENJA_DOCUMENTS_PATH` override the default
`.neenja/` directory, while `NEENJA_DOCUMENTATION_PATH` supports the legacy
single-document path. Recognized files are sorted in navbar order
documentation, project plan, task tree, and unknown files in `.neenja/` are
ignored.

Discovery should stay centralized so CLI flags, Astro routes, and reader state
continue to consume the same document model.

### Project Plan Parsing
`splitPlanBlocks` finds `## Plan:` sections outside fenced code blocks, and
`parsePlanMetadataFields` reads only `ID`, `Area`, and optional `Summary`.
`Summary` becomes `PlanSection.summary`, while all other section content stays
as normal Markdown. Section body content before the first `###` heading remains
intro Markdown; each `###` heading becomes a `PlanDetailBlock` whose body stays
free-form Markdown.

This structure keeps architecture plans readable as source Markdown while
giving the UI enough shape to render dense technical details cleanly.

### Task Graph Derivation
Task parsing derives `childrenIds`, `parentId`, `blockingTaskIds`,
decomposition edges, dependency edges, root task IDs, status summaries, and
progress summaries.

Task graph data is derived during parsing rather than stored redundantly in the
YAML file.

## Plan: Reader UI and Routing
ID: reader-ui-routing
Area: Frontend
Summary: Astro owns static route generation while `DocsShell` owns interactive document navigation and document-specific readers.
Primary Files:
- `components/docs-shell.tsx`
- `components/function-reference.tsx`
- `components/markdown-content.tsx`
- `src/pages/index.astro`
- `src/pages/[documentSlug]/index.astro`
- `src/pages/[documentSlug]/[entryId].astro`

### Routes
The root route renders the default document and first available entry.
Documentation lives under `/documentation/` and `/documentation/:conceptId/`,
technical plan sections live under `/project-plan/` and
`/project-plan/:sectionId/`, and task graphs live under `/task-tree/` and
`/task-tree/:taskId/`. Function and type references use hash anchors under
their owning concept route.

Route generation must come from parsed document entries so static builds include
every recognized document type that exists in `.neenja/`.

### Reader Shell
The navbar exposes recognized documents only when their files exist.
Documentation and project plan documents use grouped sidebar navigation, while
the task tree uses the full viewport for the graph workspace. Search is scoped
to the active document; plan search covers section titles, areas, summaries,
intro Markdown, detail block titles, and detail block body content. Project
plan sections render the summary, intro Markdown, and `###` detail blocks.

The plan reader should optimize for scanning technical contracts, not for
long-form product narrative.

## Plan: CLI and Build Runtime
ID: cli-build-runtime
Area: CLI
Summary: The CLI exposes local serving, static builds, and GitHub Pages builds while preserving legacy single-file documentation support.
Primary File: `bin/neenja.mjs`
Commands:
- `neenja serve [--dir <path>] [--file <path>] [--private | --public]`
- `neenja build [--dir <path>] [--file <path>] [--private | --public]`
- `neenja build-github --domain <url> --page <path> [--dir <path>] [--file <path>] [--private | --public]`

### Runtime Environment
Environment:
- `NEENJA_PROJECT_ROOT`
- `NEENJA_DOCUMENTS_DIR`
- `NEENJA_DOCUMENTATION_PATH`
- `NEENJA_DOCS_VISIBILITY`
- `PUBLIC_SITE_URL`
- `PUBLIC_BASE_PATH`

The CLI should continue to map flags into environment variables consumed by
the shared parser and Astro config.

### Build Behavior
`serve` uses private documentation visibility by default, while `build` uses
public documentation visibility. Project plan and task tree files are not
privacy-filtered, and generated static output goes to `.neenja/build`.

Privacy behavior belongs only to documentation concepts. Technical plans and
task trees are internal project files when present.

## Plan: Skill Contracts
ID: skill-contracts
Area: Skills
Summary: Neenja skills should produce and maintain technical project memory rather than product strategy prose.
Skill Files:
- `skills/neenja-init/SKILL.md`
- `skills/neenja-bootstrap/SKILL.md`
- `skills/neenja-sync/SKILL.md`

### `neenja-init`
`neenja-init` converts a user brief into `.neenja/project-plan.md` and
`.neenja/task-tree.yaml`. It writes the project plan as a technical
architecture and implementation-intent document, stores user-provided technical
constraints, stack choices, exclusions, and decisions, creates a task tree that
decomposes the technical plan into implementation tasks, and asks the user to
review before treating the plan and task tree as final.

The init skill should avoid audience/persona/product-goal sections unless the
user explicitly asks to preserve them as technical constraints.

### `neenja-bootstrap`
`neenja-bootstrap` inspects the actual repository, reads the technical project
plan when it exists, and writes `.neenja/documentation.md` without overwriting
`.neenja/project-plan.md` or `.neenja/task-tree.yaml`. Its documentation should
stay grounded in implemented architecture and public/private concept visibility.

Bootstrap documentation can reference plan intent, but code remains the source
of truth for implemented behavior.

### `neenja-sync`
`neenja-sync` reads documentation first, then the technical project plan and
task tree when present. It uses the plan for architecture constraints, module
boundaries, contracts, and user-specified technical decisions; updates
documentation when implemented behavior changes; updates the task tree when
task status changes; and updates the technical project plan only when the user
changes approved architecture or constraints.

Sync should not churn the plan for ordinary implementation progress; that
belongs in the task tree.

## Plan: Constraints and Verification
ID: constraints-verification
Area: Quality
Summary: Changes should preserve filename-based discovery, legacy documentation support, and predictable static rendering.
Constraints:
- keep canonical Neenja documents inside `.neenja/`
- preserve stable concept IDs, plan section IDs, plan detail headings, and task IDs
- keep project plans technical and architecture-focused
- keep task progress in `task-tree.yaml`, not in `project-plan.md`
- keep public/private filtering limited to documentation concepts
- avoid arbitrary custom document types until the document collection model is intentionally extended

### Verification
Checks:
- `npm run typecheck`
- `npm run build`
- manual smoke test of `neenja serve` when UI behavior changes
- verify project plan routes render summary, intro Markdown, and detail blocks
- verify documentation, project-plan, and task-tree tabs appear only when matching files exist

### Compatibility
Requirements:
- existing `## Plan:` files with `ID`, `Area`, `Summary`, and Markdown body still parse.
- non-metadata lines at the start of a plan section render as Markdown content instead of hidden structured fields.
- legacy root `neenja.knowledge.md` can still load as documentation when `.neenja/documentation.md` is missing.
- `--file` remains a single-document documentation path, not a multi-document project plan path.
- `task-tree.yaml` and `task-tree.yml` both map to the task-tree document kind.

Backward compatibility should favor predictable parsing over silently inventing
new document semantics.
