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
- `skills/neenja-plan-init/SKILL.md`
- `skills/neenja-bootstrap/SKILL.md`
- `skills/neenja-sync/SKILL.md`

### Runtime Layers
Responsibilities:
- CLI resolves source paths, sets environment variables, and starts Astro dev/build commands.
- Parser reads recognized `.neenja/` files and converts them into typed reader documents.
- Astro routes build static paths for document slugs and entry IDs.
- React reader shell handles document switching, sidebars, search, and task graph interaction.
- Skills define how agents create and maintain the canonical Neenja documents.

The architecture is intentionally small and filename-based. The reader supports
three canonical documents and ignores unknown files in `.neenja/`.

### Data Flow
Steps:
- CLI or Astro runtime resolves `.neenja/` as the document directory.
- `readDocumentCollection` scans for recognized filenames.
- Each recognized file is parsed by its document-specific parser.
- Parsed documents are ordered for navbar rendering.
- Astro pages pass the collection into `DocsShell`.
- `DocsShell` chooses document-specific navigation and rendering behavior.

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
Fields:
- frontmatter stores `title`, `project`, `version`, `updated`, `summary`, and optional `preferences`
- body uses repeatable `## Concept:` blocks
- concept metadata includes `ID`, `Privacy`, `Type`, `Category`, `Tags`, `Summary`, and `Related`
- `Type: functions` uses repeatable `#### Function:` blocks
- `Type: types` uses repeatable `#### Type:` blocks

Documentation is the only privacy-filtered document. `serve` defaults to the
private set, while `build` defaults to public concepts.

### Project Plan Contract
Fields:
- frontmatter stores `title`, `project`, `version`, `updated`, and optional `preferences`
- body uses repeatable `## Plan:` sections
- each section requires stable `ID` and `Area`
- optional `Summary` is rendered below the section title
- leading structured fields are rendered as section details
- optional `###` detail blocks may contain their own leading structured fields and Markdown body

The project plan is a technical architecture and implementation-intent
document. It should not duplicate product positioning, marketing copy, user
personas, or task progress.

### Task Tree Contract
Fields:
- YAML root stores `title`, `project`, `version`, `updated`, optional `preferences`, and `tasks`
- tasks use stable `id`, `title`, `status`, `area`, optional `dependsOn`, `fields`, `details`, and nested `children`
- nested `children` creates decomposition edges
- `dependsOn` creates dependency edges across the graph
- `summary` is intentionally not part of the task tree schema

Task trees store execution state. Project plans store technical intent.

## Plan: Parser Pipeline
ID: parser-pipeline
Area: Runtime
Summary: `lib/documentation-file.ts` owns document discovery, frontmatter parsing, block splitting, structured field parsing, graph derivation, and collection assembly.
Primary Module: `lib/documentation-file.ts`
Entry Points:
- `readDocumentCollection`
- `readDocumentationDocument`
- `resolveDocumentDirectoryPath`
- `resolveDocumentationDocumentPath`

### Discovery
Behavior:
- `NEENJA_DOCUMENTS_DIR` and `NEENJA_DOCUMENTS_PATH` override the default `.neenja/` directory.
- `NEENJA_DOCUMENTATION_PATH` supports a legacy single-document path.
- recognized files are sorted in navbar order: documentation, project plan, task tree.
- unknown files in `.neenja/` are ignored.

Discovery should stay centralized so CLI flags, Astro routes, and reader state
continue to consume the same document model.

### Project Plan Parsing
Behavior:
- `splitPlanBlocks` finds `## Plan:` sections outside fenced code blocks.
- `parseLeadingReferenceFields` reads section metadata and stops when real Markdown body starts.
- `Summary` is parsed into `PlanSection.summary`.
- section body before the first `###` heading remains intro Markdown.
- each `###` heading becomes a `PlanDetailBlock`.
- detail blocks can carry their own structured fields before Markdown body content.

This structure keeps architecture plans readable as source Markdown while
giving the UI enough shape to render dense technical details cleanly.

### Task Graph Derivation
Derived Values:
- `childrenIds`
- `parentId`
- `blockingTaskIds`
- decomposition edges
- dependency edges
- root task IDs
- status summary
- progress summary

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
Route Contracts:
- `/` renders the default document and first available entry.
- `/documentation/` and `/documentation/:conceptId/` render concept documentation.
- `/project-plan/` and `/project-plan/:sectionId/` render technical plan sections.
- `/task-tree/` and `/task-tree/:taskId/` render the fullscreen task graph workspace.
- function and type references use hash anchors under their owning concept route.

Route generation must come from parsed document entries so static builds include
every recognized document type that exists in `.neenja/`.

### Reader Shell
Behavior:
- navbar exposes recognized documents only when their files exist.
- documentation and project plan documents use grouped sidebar navigation.
- task tree uses the full viewport for the graph workspace.
- search is scoped to the active document.
- plan search includes section titles, areas, summaries, fields, detail block titles, and detail block body content.
- project plan sections render summary, structured fields, intro Markdown, and `###` detail blocks.

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
Defaults:
- `serve` uses private documentation visibility.
- `build` uses public documentation visibility.
- project plan and task tree files are not privacy-filtered.
- generated static output goes to `.neenja/build`.

Privacy behavior belongs only to documentation concepts. Technical plans and
task trees are internal project files when present.

## Plan: Skill Contracts
ID: skill-contracts
Area: Skills
Summary: Neenja skills should produce and maintain technical project memory rather than product strategy prose.
Skill Files:
- `skills/neenja-plan-init/SKILL.md`
- `skills/neenja-bootstrap/SKILL.md`
- `skills/neenja-sync/SKILL.md`

### `neenja-init`
Behavior:
- converts a user brief into `.neenja/project-plan.md` and `.neenja/task-tree.yaml`
- writes the project plan as a technical architecture and implementation-intent document
- stores user-provided technical constraints, stack choices, exclusions, and decisions
- creates a task tree that decomposes the technical plan into implementation tasks
- asks the user to review before treating the plan and task tree as final

The init skill should avoid audience/persona/product-goal sections unless the
user explicitly asks to preserve them as technical constraints.

### `neenja-bootstrap`
Behavior:
- inspects the actual repository and writes `.neenja/documentation.md`
- reads the technical project plan when it exists
- does not overwrite `.neenja/project-plan.md` or `.neenja/task-tree.yaml`
- keeps documentation grounded in implemented architecture and public/private concept visibility

Bootstrap documentation can reference plan intent, but code remains the source
of truth for implemented behavior.

### `neenja-sync`
Behavior:
- reads documentation first, then the technical project plan and task tree when present
- uses the plan for architecture constraints, module boundaries, contracts, and user-specified technical decisions
- updates documentation when implemented behavior changes
- updates the task tree when task status changes
- updates the technical project plan only when the user changes approved architecture or constraints

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
- verify project plan routes render summary, fields, intro Markdown, and detail blocks
- verify documentation, project-plan, and task-tree tabs appear only when matching files exist

### Compatibility
Requirements:
- existing `## Plan:` files with only top-level fields and Markdown body still parse.
- legacy root `neenja.knowledge.md` can still load as documentation when `.neenja/documentation.md` is missing.
- `--file` remains a single-document documentation path, not a multi-document project plan path.
- `task-tree.yaml` and `task-tree.yml` both map to the task-tree document kind.

Backward compatibility should favor predictable parsing over silently inventing
new document semantics.
