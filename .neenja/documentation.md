---
title: Neenja Documentation
project: Neenja
version: 1
updated: 2026-04-20
summary: Neenja keeps AI-friendly project documents current and renders documentation, project plans, and task trees as a browsable reader.
---

# Neenja Documentation

Neenja stores canonical project memory in project files under `.neenja/` and
turns those files into a reader UI for humans and coding agents.

## Concept: Platform Overview
ID: platform-overview
Privacy: public
Type: concept
Category: Product
Tags: product, overview, workflow
Summary: Neenja reads a `.neenja/` documents folder and renders recognized project documents as a local or static project documentation site.
Related: documentation-file-format, prompt-workflow, cli-reference

### What it is
Neenja combines three things:

- a `.neenja/` document folder
- agent skills that create and maintain project documents
- a reader UI that parses recognized project files and exposes them as
  navigable project documentation

The reader currently recognizes these document filenames:

- `.neenja/documentation.md` for concept documentation
- `.neenja/project-plan.md` for a structured project plan
- `.neenja/task-tree.yaml` for a decomposed implementation task tree

The document type is determined by filename. Unknown files in the folder are
ignored by the reader.

### Typical usage
1. Run `npx skills add MesonWarrior/Neenja --all`.
2. Use `/neenja-init` at the start of a project when the user gives the
   product brief and wants a structured plan candidate for review.
3. Use `/neenja-bootstrap` once so an agent can generate
   `.neenja/documentation.md` from the actual repository.
4. Run `neenja serve` while working locally.
5. Run `neenja build` when you need a static reader bundle.

After the skills are installed, `neenja-sync` should be applied by the model
automatically on later tasks so documentation stays current.

### Rendering model
- `serve` reads `.neenja/` by default and shows the full documentation set,
  including private documentation concepts.
- `build` reads the same folder and emits only public documentation concepts by
  default, unless `--private` is passed.
- Project plan documents are not privacy-filtered; every `## Plan:` section in
  the plan file is rendered.
- Task tree documents are not privacy-filtered; every task in the YAML tree is
  rendered in a fullscreen graph workspace with status, progress,
  decomposition, and dependency links.
- The header navbar switches between recognized document types.
- Documentation and project-plan pages use a sidebar. Task-tree pages use the
  whole viewport as the graph workspace.

## Concept: Documentation File Format
ID: documentation-file-format
Privacy: public
Type: concept
Category: Authoring
Tags: format, markdown, schema, authoring
Summary: Neenja uses filename-based document schemas for documentation, project plans, and YAML task trees inside `.neenja/`.
Related: platform-overview, prompt-workflow, documentation-model-types

### Documents folder
The canonical document folder is:

```txt
./.neenja/
```

The reader recognizes document type by filename:

```txt
.neenja/documentation.md
.neenja/project-plan.md
.neenja/task-tree.yaml
```

If `.neenja/documentation.md` is missing, Neenja can still fall back to the
legacy root file `./neenja.knowledge.md` for documentation.

### Documentation file
The documentation file starts with frontmatter:

```txt
---
title: <document title>
project: <project name>
version: 1
updated: <YYYY-MM-DD>
summary: <one sentence summary>
preferences: <optional single-line user documentation preferences>
---
```

If `preferences:` is present, it stores one line of user guidance for Neenja's
documentation skills. The reader keeps it in metadata but does not render it in
the main document body.

After frontmatter, documentation uses concept blocks:

```txt
## Concept: <Human Title>
ID: <stable-machine-id>
Privacy: <public|private>
Type: <concept|functions|types>
Category: <navigation group>
Tags: tag-one, tag-two
Summary: <one sentence summary>
Related: concept-id-one, concept-id-two
```

### Documentation concept types
- `Type: concept` stores regular Markdown explanations, workflows, and notes.
- `Type: functions` stores important callable surfaces with repeatable
  `#### Function:` blocks.
- `Type: types` stores important project structures with repeatable
  `#### Type:` blocks.

### Project plan file
The project plan file starts with frontmatter:

```txt
---
title: <project name> Project Plan
project: <project name>
version: 1
updated: <YYYY-MM-DD>
summary: <one sentence project intent>
preferences: <optional single-line user project preferences>
---
```

`preferences:` is optional. It stores stable user preferences that apply to the
project, such as product taste, technical constraints, exclusions, or preferred
decision style.

After frontmatter, the plan uses `## Plan:` blocks:

```txt
## Plan: <Human Section Title>
ID: <stable-machine-id>
Area: <Project|Goal|Audience|Scope|Delivery|Risks|Decisions>
Summary: <one sentence section summary>
<Additional Field>: <structured value>
<List Field>:
- <item>
- <item>

<Markdown body with useful detail.>
```

The required section fields are `ID`, `Area`, and `Summary`. Any additional
fields are rendered as structured plan details. After user approval, the plan
is treated as finalized project intent.

### Task tree file
The task tree file is YAML and stores a real nested tree:

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
    area: <Project|Product|Frontend|Backend|Data|Infrastructure|Quality|Delivery|Docs>
    dependsOn:
      - <optional dependency task ID>
    fields:
      Acceptance Notes:
        - <item>
    details: |-
      <optional Markdown task detail>
    children:
      - id: <stable-machine-id>
        title: <Human Subtask Title>
        status: todo
        area: <area>
```

Nested `children:` creates decomposition edges. `dependsOn:` creates dependency
edges between tasks, including across different parents. The task tree does not
store `summary`; task details belong in optional `details` or structured
`fields`. The reader calculates progress from task statuses and treats
`status: done` as completed work.

### Type links
When a function signature or the type part of a `Parameters` or `Fields` list
item uses the same type name as a documented `#### Type:` entry, the reader
turns that type name into a link to the matching type reference.

## Concept: Skill Workflow
ID: prompt-workflow
Privacy: public
Type: concept
Category: Authoring
Tags: skills, ai, maintenance, workflow
Summary: Neenja uses separate skills for initial planning, documentation bootstrapping, and ongoing documentation maintenance.
Related: platform-overview, documentation-file-format, internal-runtime-functions

### Installing the skills
Install the Neenja skills with:

```bash
npx skills add MesonWarrior/Neenja --all
```

### `neenja-init`
`/neenja-init` is the project planning skill. Use it at the start of a
project after the user describes what they want to build.

The skill writes `.neenja/project-plan.md` in the structured `## Plan:` format
and `.neenja/task-tree.yaml` as a nested YAML tree. It may store one optional
single-line preferences value in each document. After writing both files, the
skill asks the user to review what must be corrected before the plan and task
tree are treated as final.

### `neenja-bootstrap`
`/neenja-bootstrap` is the one-time documentation generation skill. It tells the
agent to inspect the repository, classify each concept by visibility and type,
and write or refresh `.neenja/documentation.md`.

The skill accepts one optional single-line preferences argument. When present,
the agent writes that value into documentation frontmatter as `preferences:`.

### `neenja-sync`
`neenja-sync` is the ongoing maintenance skill. It tells working agents to read
`.neenja/documentation.md` at the start of each task, read
`.neenja/project-plan.md` and `.neenja/task-tree.yaml` when present, and update
documentation before finishing when documentable behavior changed.

The sync skill uses the task tree to orient work around relevant task status,
parent tasks, and `dependsOn:` relationships. When work changes task progress,
the agent should update the task status in `.neenja/task-tree.yaml`.

The sync skill reads saved `preferences:` frontmatter values when they exist
and uses that guidance while changing canonical documents.

### Maintenance rules
- keep canonical Neenja documents inside `.neenja/`
- preserve stable concept IDs, plan section IDs, and task IDs
- update the relevant frontmatter `updated` field whenever a document changes
- prefer editing existing concepts, plan sections, or tasks over creating
  duplicates
- keep public concepts usable as external-facing reference material
- keep private concepts implementation-grounded and useful to maintainers and
  agents

## Concept: CLI Reference
ID: cli-reference
Privacy: public
Type: functions
Category: Product
Tags: cli, commands, workflow
Summary: The Neenja CLI serves or builds the reader from a documents folder, with legacy support for a single documentation file.
Related: platform-overview, documentation-file-format

The CLI is the main external interface for working with Neenja as a tool.

#### Function: `neenja serve`
Kind: cli command
Signature: `neenja serve [--dir <path>] [--file <path>] [--private | --public]`
Description: Start the local reader UI against a Neenja documents folder.
Parameters:
- `--dir <path>`: `string` - Explicit path to a Neenja documents folder.
- `--file <path>`: `string` - Legacy path to one documentation file.
- `--private`: `boolean` - Include private concepts in rendered documentation.
- `--public`: `boolean` - Restrict rendered documentation concepts to public concepts only.
Behavior:
- Resolves `.neenja/` by default.
- Recognizes `documentation.md`, `project-plan.md`, and `task-tree.yaml` by filename.
- Falls back to `./neenja.knowledge.md` when no folder documentation file exists.
- Launches Astro in dev mode.
- Defaults to showing the full documentation set, including private concepts.

#### Function: `neenja build`
Kind: cli command
Signature: `neenja build [--dir <path>] [--file <path>] [--private | --public]`
Description: Build the reader as a static site in `.neenja/build`.
Parameters:
- `--dir <path>`: `string` - Explicit path to a Neenja documents folder.
- `--file <path>`: `string` - Legacy path to one documentation file.
- `--private`: `boolean` - Build the full documentation set, including private concepts.
- `--public`: `boolean` - Build only the public documentation subset.
Behavior:
- Uses the same parser and renderer as `serve`.
- Resolves `.neenja/` by default.
- Defaults to the public documentation subset so generated static docs can be published safely.
- Includes project plan routes whenever `.neenja/project-plan.md` exists.
- Includes task tree routes whenever `.neenja/task-tree.yaml` exists.

#### Function: `neenja build-github`
Kind: cli command
Signature: `neenja build-github --domain <url> --page <path> [--dir <path>] [--file <path>] [--private | --public]`
Description: Build the reader for GitHub Pages with explicit site and base-path values.
Parameters:
- `--domain <url>`: `string` - Site origin for the generated build.
- `--page <path>`: `string` - Base path under that origin.
- `--dir <path>`: `string` - Explicit path to a Neenja documents folder.
- `--file <path>`: `string` - Legacy path to one documentation file.
- `--private`: `boolean` - Include private concepts in the build.
- `--public`: `boolean` - Restrict the build to the public documentation subset.

## Concept: Documentation Model Types
ID: documentation-model-types
Privacy: public
Type: types
Category: Authoring
Tags: types, schema, model, renderer
Summary: Neenja parses recognized project files into a typed document collection that powers routing, navigation, search, and rendering.
Related: documentation-file-format, internal-runtime-functions

These are the main structured values used by the parser and reader.

#### Type: `DocumentMeta`
Kind: object
Definition: `{ title: string; project: string; version: string; updated: string; summary: string; preferences?: string }`
Description: Metadata exposed by every reader document.
Fields:
- title: `string` - Rendered document title.
- project: `string` - Project name from frontmatter.
- version: `string` - Schema version marker stored in the file.
- updated: `string` - Last canonical document update date.
- summary: `string` - Short description shown in the reader shell; task trees receive a parser default because YAML task trees do not store summary.
- preferences: `string | undefined` - Optional single-line user preferences stored by skills.

#### Type: `DocumentKind`
Kind: union
Definition: `"documentation" | "project-plan" | "task-tree"`
Description: Filename-derived document type used by the reader.

#### Type: `DocumentationVisibility`
Kind: union
Definition: `"public" | "private"`
Description: Active visibility mode used for documentation concepts.

#### Type: `ConceptKind`
Kind: union
Definition: `"concept" | "functions" | "types"`
Description: Renderer mode for a documentation concept body.

#### Type: `FunctionField`
Kind: object
Definition: `{ label: string; value: string; items: string[] }`
Description: Structured field captured from function, type, project-plan, or task blocks.
Fields:
- label: `string` - Original field name such as `Parameters`, `Fields`, or `Success Criteria`.
- value: `string` - Inline text stored on the same line as the field label.
- items: `string[]` - List items collected under that field.

#### Type: `Concept`
Kind: object
Description: Parsed documentation concept with metadata, Markdown content, and optional structured entries.
Fields:
- id: `string` - Stable machine-readable concept ID.
- title: `string` - Human-readable concept title.
- category: `string` - Sidebar category name.
- categorySlug: `string` - Normalized category key used by the UI.
- privacy: `ConceptPrivacy` - Visibility metadata for filtering.
- kind: `ConceptKind` - Concept renderer mode.
- tags: `string[]` - Searchable tag list.
- summary: `string` - Short description used in cards and search.
- related: `string[]` - Related concept IDs.
- contentBlocks: `ConceptContentBlock[]` - Markdown content rendered before structured entries.
- functions: `ConceptFunction[]` - Function entries owned by the concept.
- types: `ConceptType[]` - Type entries owned by the concept.

#### Type: `PlanSection`
Kind: object
Description: Parsed `## Plan:` section from `.neenja/project-plan.md`.
Fields:
- id: `string` - Stable machine-readable section ID.
- title: `string` - Human-readable section title.
- area: `string` - Sidebar group such as `Project`, `Goal`, `Scope`, or `Delivery`.
- areaSlug: `string` - Normalized area key used by the UI.
- summary: `string` - Short section summary.
- fields: `FunctionField[]` - Additional structured plan fields.
- contentBlocks: `ConceptContentBlock[]` - Markdown body content.

#### Type: `TaskNode`
Kind: object
Description: Parsed task entry from `.neenja/task-tree.yaml`.
Fields:
- id: `string` - Stable machine-readable task ID.
- title: `string` - Human-readable task title.
- status: `string` - Normalized status slug.
- statusLabel: `string` - Human-readable status label.
- statusSlug: `string` - CSS-safe status key used by the reader.
- area: `string` - Sidebar group such as `Frontend`, `Backend`, `Quality`, or `Docs`.
- areaSlug: `string` - Normalized area key used by the UI.
- parentId: `string | undefined` - Derived parent task ID from YAML nesting.
- dependsOn: `string[]` - Task IDs that must be completed or unblocked first.
- childrenIds: `string[]` - Child task IDs derived from nested `children`.
- blockingTaskIds: `string[]` - Task IDs that depend on this task.
- depth: `number` - Derived nesting depth in the decomposition tree.
- fields: `FunctionField[]` - Additional structured task fields.
- contentBlocks: `ConceptContentBlock[]` - Markdown body content.

#### Type: `TaskGraphEdge`
Kind: object
Definition: `{ from: string; to: string; kind: "decomposition" | "dependency" }`
Description: Derived graph edge between task IDs.
Fields:
- from: `string` - Source task ID.
- to: `string` - Target task ID.
- kind: `"decomposition" | "dependency"` - Edge meaning.

#### Type: `TaskProgressSummary`
Kind: object
Definition: `{ total: number; done: number; percent: number }`
Description: Completion metrics calculated from task statuses.
Fields:
- total: `number` - Number of parsed tasks.
- done: `number` - Number of tasks whose normalized status is `done`.
- percent: `number` - Rounded completion percentage.

#### Type: `TaskStatusSummary`
Kind: object
Definition: `{ status: string; label: string; count: number; percent: number }`
Description: Status bucket used by the task tree progress UI.
Fields:
- status: `string` - Normalized status slug.
- label: `string` - Human-readable status label.
- count: `number` - Number of tasks in this status.
- percent: `number` - Rounded share of all tasks.

#### Type: `DocumentationDocument`
Kind: object
Description: Parsed documentation payload consumed by the reader shell.
Fields:
- kind: `"documentation"` - Document discriminator.
- slug: `"documentation"` - Route segment for documentation pages.
- label: `string` - Navbar label.
- meta: `DocumentMeta` - Frontmatter metadata.
- visibility: `DocumentationVisibility` - Active visibility mode for this run.
- concepts: `Concept[]` - Visible concepts after privacy filtering.
- categories: `CategoryGroup[]` - Visible concepts grouped for navigation.
- conceptsById: `Record<string, Concept>` - Visible concepts keyed by ID.
- typeIndex: `Record<string, TypeReferenceTarget>` - Lookup table for inline type links.

#### Type: `ProjectPlanDocument`
Kind: object
Description: Parsed project plan payload consumed by the reader shell.
Fields:
- kind: `"project-plan"` - Document discriminator.
- slug: `"project-plan"` - Route segment for project plan pages.
- label: `string` - Navbar label.
- meta: `DocumentMeta` - Frontmatter metadata.
- sections: `PlanSection[]` - Parsed plan sections.
- areas: `PlanAreaGroup[]` - Sections grouped for sidebar navigation.
- sectionsById: `Record<string, PlanSection>` - Plan sections keyed by ID.

#### Type: `TaskTreeDocument`
Kind: object
Description: Parsed task tree payload consumed by the reader shell.
Fields:
- kind: `"task-tree"` - Document discriminator.
- slug: `"task-tree"` - Route segment for task tree pages.
- label: `string` - Navbar label.
- meta: `DocumentMeta` - Frontmatter metadata.
- tasks: `TaskNode[]` - Parsed tasks in document order.
- areas: `TaskAreaGroup[]` - Tasks grouped for sidebar navigation.
- tasksById: `Record<string, TaskNode>` - Tasks keyed by ID.
- rootTaskIds: `string[]` - Root task IDs used to render the decomposition graph.
- edges: `TaskGraphEdge[]` - Parent and dependency edges in the task graph.
- statusSummary: `TaskStatusSummary[]` - Task counts grouped by status.
- progress: `TaskProgressSummary` - Total, done count, and completion percentage.

#### Type: `DocumentCollection`
Kind: object
Description: Full set of recognized documents loaded from a Neenja documents folder.
Fields:
- visibility: `DocumentationVisibility` - Active documentation visibility mode.
- documents: `ReaderDocument[]` - Recognized documents in navbar order.
- documentsBySlug: `Record<string, ReaderDocument>` - Documents keyed by route slug.
- defaultDocument: `ReaderDocument` - Document rendered at the root route.

## Concept: Parser Pipeline
ID: parser-pipeline
Privacy: private
Type: concept
Category: Internal
Tags: parser, filtering, architecture
Summary: The parser reads a documents folder, recognizes document type by filename, and builds the reader document collection.
Related: documentation-file-format, documentation-model-types, internal-runtime-functions

### Main flow
The parser lives in `lib/documentation-file.ts`. It:

1. resolves the documents folder from `NEENJA_DOCUMENTS_DIR` or
   `NEENJA_DOCUMENTS_PATH`, otherwise `${projectRoot}/.neenja`
2. scans the folder for recognized filenames
3. parses `documentation.md` with the concept parser
4. parses `project-plan.md` with the plan-section parser
5. parses `task-tree.yaml` with the YAML task-tree parser
6. applies public/private filtering only to documentation concepts
7. groups documentation concepts by category, plan sections by area, and tasks
   by area
8. derives task graph edges, root task IDs, child IDs, reverse dependency IDs,
   status summaries, and progress
9. builds a `DocumentCollection` for routing, navbar switching, search, and
   rendering

### Legacy path
`NEENJA_DOCUMENTATION_PATH` and CLI `--file` are supported for a single
documentation file. When used, the reader builds a one-document collection with
only the documentation document. If no folder documentation file exists, the
reader can still fall back to the legacy root file `./neenja.knowledge.md`.

### Visibility defaults
- `NEENJA_DOCS_VISIBILITY=private` means documentation keeps both public and
  private concepts.
- `NEENJA_DOCS_VISIBILITY=public` means only public documentation concepts
  survive the final document model.
- When no explicit visibility flag is provided, dev mode defaults to the full
  set and production mode defaults to the public subset.

## Concept: Reader Navigation Internals
ID: reader-navigation-internals
Privacy: private
Type: concept
Category: Internal
Tags: ui, navigation, search, reader, routing
Summary: The reader shell switches documents from the navbar and renders document-specific sidebar navigation and routes.
Related: parser-pipeline, internal-runtime-functions, documentation-model-types

### Key files
- `components/docs-shell.tsx`
- `components/function-reference.tsx`
- `components/markdown-content.tsx`
- `src/pages/index.astro`
- `src/pages/[documentSlug]/index.astro`
- `src/pages/[documentSlug]/[entryId].astro`

### Routes
- `/` renders the default document and its first entry.
- `/documentation/` renders the first visible documentation concept.
- `/documentation/:conceptId/` renders a documentation concept.
- `/project-plan/` renders the first project plan section.
- `/project-plan/:sectionId/` renders a project plan section.
- `/task-tree/` renders the fullscreen task graph workspace.
- `/task-tree/:taskId/` renders the fullscreen task graph workspace with the
  selected task drawer open.
- Function and type entries use hash anchors under the owning documentation
  concept route.

### Behavior
- The header navbar lists every recognized document in the collection.
- The sidebar shows documentation categories for documentation pages.
- The sidebar shows project plan areas for project plan pages.
- Task tree pages do not use a sidebar; the graph is the primary workspace.
- Search is scoped to the active document.
- Documentation search returns concepts, function entries, and type entries.
- Project plan search returns plan sections.
- Task tree search returns tasks.
- Task tree pages render a pannable, zoomable SVG graph with task statuses,
  decomposition edges, dependency edges, and a right-side detail drawer.
- Inline type references inside function and type cards link back to the
  owning `TypeReferenceTarget`.

## Concept: Internal Runtime Functions
ID: internal-runtime-functions
Privacy: private
Type: functions
Category: Internal
Tags: parser, runtime, reader, internals
Summary: Internal runtime helpers resolve document sources, parse recognized files, and build reader models.
Related: parser-pipeline, reader-navigation-internals, documentation-model-types

These functions are implementation details of the bundled reader, not part of a
stable public API.

#### Function: `readDocumentCollection`
Kind: function
Signature: `readDocumentCollection(): Promise<DocumentCollection>`
Description: Load all recognized Neenja documents and return the full reader collection.
Behavior:
- Resolves the documents directory.
- Reads recognized document files.
- Parses documentation, project plan, and task tree documents.
- Builds `documents`, `documentsBySlug`, and `defaultDocument`.

#### Function: `readDocumentationDocument`
Kind: function
Signature: `readDocumentationDocument(): Promise<DocumentationDocument>`
Description: Load and parse the documentation document only.
Behavior:
- Supports single-document reader callers.
- Reads `NEENJA_DOCUMENTATION_PATH` or the default documentation path.
- Parses concepts, filters by visibility, and builds a type index.

#### Function: `parseConcept`
Kind: function
Signature: `parseConcept(block: string): Concept`
Description: Parse one `## Concept:` block into the in-memory documentation concept model.
Behavior:
- Reads concept metadata such as `ID`, `Privacy`, `Type`, and `Category`.
- Routes the body through the Markdown parser or structured entry parser based on `ConceptKind`.

#### Function: `parsePlanSection`
Kind: function
Signature: `parsePlanSection(block: string): PlanSection`
Description: Parse one `## Plan:` block into a structured project plan section.
Behavior:
- Reads `ID`, `Area`, and `Summary`.
- Keeps additional fields as structured plan details.
- Parses the remaining body as Markdown content.

#### Function: `parseYamlTaskNode`
Kind: function
Signature: `parseYamlTaskNode(rawTask: RawTaskNode, parentId: string | undefined, usedIds: Set<string>): { task: TaskNode; children: RawTaskNode[] }`
Description: Parse one YAML task object into a task node before derived graph relationships are applied.
Behavior:
- Reads `id`, `title`, `status`, `area`, `dependsOn`, `fields`, `details`,
  and nested `children`.
- Normalizes status aliases such as `doing` to `in-progress` and `completed` to `done`.
- Keeps additional fields as structured task details.
- Parses `details` as Markdown content.

#### Function: `resolveDocumentDirectoryPath`
Kind: function
Signature: `resolveDocumentDirectoryPath(): Promise<string>`
Description: Resolve the directory that should be scanned for recognized Neenja documents.
Behavior:
- Uses `NEENJA_DOCUMENTS_DIR` or `NEENJA_DOCUMENTS_PATH` when present.
- Falls back to `${NEENJA_PROJECT_ROOT}/.neenja` or `${process.cwd()}/.neenja`.

#### Function: `buildTypeIndex`
Kind: function
Signature: `buildTypeIndex(concepts: Concept[]): Record<string, TypeReferenceTarget>`
Description: Collect the first visible occurrence of each documented type name so inline type mentions can navigate to the matching type entry.
