---
title: Neenja Documentation
project: Neenja
version: 1
updated: 2026-04-18
summary: Neenja keeps one AI-friendly project knowledge file current and renders it as a browsable documentation site.
---

# Neenja Documentation

Neenja stores project knowledge in one Markdown file and turns that file into a
reader UI that humans and coding agents can both use.

## Concept: Platform Overview
ID: platform-overview
Privacy: public
Type: concept
Category: Product
Tags: product, overview, workflow
Summary: Neenja keeps one canonical knowledge file in sync with a project and renders it as a readable documentation site.
Related: knowledge-file-format, prompt-workflow, cli-reference

### What it is
Neenja combines three things:

- one canonical `.neenja/documentation.md` file
- agent skills that tell agents how to create and maintain that file
- a reader UI that parses the file and exposes it as searchable documentation

### Typical usage
1. Run `npx skills add MesonWarrior/Neenja --all`.
2. Use `/neenja-bootstrap` once so an agent can generate the first
   `.neenja/documentation.md`.
3. Optionally pass `/neenja-bootstrap` one single-line user preferences string
   so it gets saved in the knowledge file frontmatter as `preferences:`.
4. Run `neenja serve` while working locally.
5. Run `neenja build` when you need a static docs bundle.

After the skills are installed, `neenja-sync` should be applied by the model
automatically on later tasks so the documentation stays current.

If `.neenja/documentation.md` is missing, the CLI still falls back to the
legacy root file `./neenja.knowledge.md` for `serve` and `build`.

### Rendering model
- `serve` shows the whole documentation set by default, including internal
  concepts.
- `build` emits only the public subset by default, unless `--private` is passed
  explicitly.
- The sidebar marks private concepts with a dedicated icon.

## Concept: Knowledge File Format
ID: knowledge-file-format
Privacy: public
Type: concept
Category: Authoring
Tags: format, markdown, schema, authoring
Summary: The canonical knowledge file uses frontmatter plus typed concepts that can store prose, callable references, or structural type references.
Related: platform-overview, prompt-workflow, knowledge-model-types

### Required structure
The canonical documentation file lives at `./.neenja/documentation.md`.

Every documentation file starts with frontmatter:

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
agent skills. The reader UI does not render that field.

After that, the file contains one or more concept blocks:

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

### Concept types
- `Type: concept` stores regular Markdown explanations, workflows, and notes.
- `Type: functions` stores important callable surfaces with repeatable
  `#### Function:` blocks.
- `Type: types` stores important project structures with repeatable
  `#### Type:` blocks.

`### Functions` sections are not part of the schema. Functions and types live in
dedicated concepts.

### Structured reference blocks
Functions concept bodies start with optional intro Markdown and then repeat this
block:

```txt
#### Function: `neenja serve`
Kind: cli command
Signature: `neenja serve [--file <path>] [--private | --public]`
Description: Start the reader UI for the canonical knowledge file.
Parameters:
- --file <path>: string - Explicit path to the knowledge file.
```

Types concept bodies start with optional intro Markdown and then repeat this
block:

```txt
#### Type: `KnowledgeDocument`
Kind: object
Description: Parsed documentation payload exposed to the reader UI.
Fields:
- concepts: `Concept[]` - Visible concepts after privacy filtering.
```

`Definition` is optional. It should contain a real structural shape or alias
when that adds value, and it should be omitted when `Fields` already explain a
large object clearly enough. Writing only the type name in `Definition` is not
useful.

### Visibility metadata
- `Privacy: public` is for information that should ship to consumers,
  integrators, and developers who use the project without editing its internals.
- `Privacy: private` is for implementation details, exact file names, internal
  helper behavior, maintainer guidance, and agent-only context.

Visibility is authoring metadata. It controls filtering, but it is not rendered
inside the main document body. The sidebar only marks concepts that are
private.

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
Summary: Neenja uses `/neenja-bootstrap` for initial generation and `neenja-sync` for ongoing documentation maintenance, while the CLI keeps a legacy fallback for root-level `neenja.knowledge.md`.
Related: platform-overview, knowledge-file-format, internal-runtime-functions

### Installing the skills
Install the Neenja skills with:

```bash
npx skills add MesonWarrior/Neenja --all
```

This installs the `neenja-bootstrap` and `neenja-sync` skills for the agent.

### `neenja-bootstrap`
`/neenja-bootstrap` is the one-time generation skill. It tells the agent to
inspect the repository, classify each concept by visibility and type, and write
or refresh `.neenja/documentation.md`.

The `neenja-bootstrap` skill accepts one optional single-line preferences
argument. When present, the agent writes that value into the knowledge file
frontmatter as
`preferences:` directly under `summary:`.

### `neenja-sync`
`neenja-sync` is the ongoing maintenance skill. It tells working agents to read
`.neenja/documentation.md` at the start of each task and update it before
finishing when documentable behavior changed.

The `neenja-sync` skill reads the saved `preferences:` frontmatter value when it exists
and uses that guidance while changing documentation. It does not rely on a
separate user-editable prompt block, and it should be applied by the model
automatically on later tasks.

### Maintenance rules
- keep all canonical project documentation in `.neenja/documentation.md`
- preserve stable concept IDs
- update the frontmatter `updated` field whenever the file changes
- prefer editing existing concepts over creating near-duplicates
- keep public concepts usable as external-facing reference material
- keep private concepts implementation-grounded and useful to maintainers and
  agents

## Concept: CLI Reference
ID: cli-reference
Privacy: public
Type: functions
Category: Product
Tags: cli, commands, workflow
Summary: The Neenja CLI serves or builds the documentation reader from one canonical knowledge file inside `.neenja`, with a legacy fallback to root `neenja.knowledge.md`.
Related: platform-overview, knowledge-file-format

The CLI is the main external interface for working with Neenja as a tool.

#### Function: `neenja serve`
Kind: cli command
Signature: `neenja serve [--file <path>] [--private | --public]`
Description: Start the local reader UI against the canonical knowledge file.
Parameters:
- `--file <path>`: `string` - Explicit path to the knowledge file.
- `--private`: `boolean` - Include private concepts in the rendered docs.
- `--public`: `boolean` - Restrict the rendered docs to public concepts only.
Behavior:
- Resolves `.neenja/documentation.md` by default.
- Falls back to `./neenja.knowledge.md` when the new canonical path is missing.
- Launches Astro in dev mode.
- Defaults to showing the full documentation set, including private concepts.

#### Function: `neenja build`
Kind: cli command
Signature: `neenja build [--file <path>] [--private | --public]`
Description: Build the reader as a static site in `.neenja/build`.
Parameters:
- `--file <path>`: `string` - Explicit path to the knowledge file.
- `--private`: `boolean` - Build the full documentation set, including private concepts.
- `--public`: `boolean` - Build only the public documentation subset.
Behavior:
- Uses the same parser and renderer as `serve`.
- Resolves `.neenja/documentation.md` by default.
- Falls back to `./neenja.knowledge.md` when the new canonical path is missing.
- Defaults to the public subset so generated static docs can be published safely.

#### Function: `neenja build-github`
Kind: cli command
Signature: `neenja build-github --domain <url> --page <path> [--private | --public]`
Description: Build the reader for GitHub Pages with explicit site and base-path values.
Parameters:
- `--domain <url>`: `string` - Site origin for the generated build.
- `--page <path>`: `string` - Base path under that origin.
- `--private`: `boolean` - Include private concepts in the build.
- `--public`: `boolean` - Restrict the build to the public subset.

## Concept: Knowledge Model Types
ID: knowledge-model-types
Privacy: public
Type: types
Category: Authoring
Tags: types, schema, model, renderer
Summary: Neenja parses the knowledge file into a typed in-memory model that powers filtering, navigation, search, and cross-links.
Related: knowledge-file-format, internal-runtime-functions

These are the main structured values used by the parser and reader.

#### Type: `DocumentMeta`
Kind: object
Definition: `{ title: string; project: string; version: string; updated: string; summary: string }`
Description: Frontmatter metadata exposed by the reader UI.
Fields:
- title: `string` - Rendered document title.
- project: `string` - Project name from frontmatter.
- version: `string` - Schema version marker stored in the file.
- updated: `string` - Last canonical documentation update date.
- summary: `string` - Short description shown in the reader shell.

#### Type: `DocumentationVisibility`
Kind: union
Definition: `"public" | "private"`
Description: Active visibility mode used for the current run.

#### Type: `ConceptPrivacy`
Kind: union
Definition: `"public" | "private"`
Description: Visibility assigned to one concept in the canonical file.

#### Type: `ConceptKind`
Kind: union
Definition: `"concept" | "functions" | "types"`
Description: Renderer mode for a concept body.

#### Type: `ConceptContentBlock`
Kind: object
Definition: `{ type: "markdown"; content: string }`
Description: Markdown block rendered before structured function or type entries.
Fields:
- type: `"markdown"` - Block discriminator.
- content: `string` - Markdown content ready for the reader body.

#### Type: `FunctionField`
Kind: object
Definition: `{ label: string; value: string; items: string[] }`
Description: Structured field captured from a function or type reference block.
Fields:
- label: `string` - Original field name such as `Parameters` or `Fields`.
- value: `string` - Inline text stored on the same line as the field label.
- items: `string[]` - List items collected under that field.

#### Type: `ConceptFunction`
Kind: object
Description: Structured function entry parsed from a `Type: functions` concept.
Fields:
- id: `string` - Stable anchor ID generated for the function card.
- name: `string` - Display name taken from the `#### Function:` heading.
- kind: `string` - Callable classification such as function, endpoint, or cli command.
- signature: `string` - Signature or route shape shown in the card header.
- description: `string` - Short explanation of behavior.
- parameters: `string[]` - Flattened parameter lines for search and quick access.
- fields: `FunctionField[]` - All structured fields captured from the block.

#### Type: `ConceptType`
Kind: object
Description: Structured type entry parsed from a `Type: types` concept.
Fields:
- id: `string` - Stable anchor ID generated for the type card.
- name: `string` - Display name taken from the `#### Type:` heading.
- kind: `string` - Type classification such as object, union, or schema.
- definition: `string` - Compact type shape or alias description.
- description: `string` - Short explanation of what the type represents.
- fields: `FunctionField[]` - All structured fields captured from the block.

#### Type: `Concept`
Kind: object
Description: Parsed concept with metadata, Markdown content, and optional structured entries.
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
- content: `string` - Raw concept body.
- contentBlocks: `ConceptContentBlock[]` - Markdown content rendered before structured entries.
- functions: `ConceptFunction[]` - Function entries owned by the concept.
- types: `ConceptType[]` - Type entries owned by the concept.

#### Type: `CategoryGroup`
Kind: object
Definition: `{ name: string; slug: string; concepts: Concept[] }`
Description: Sidebar navigation group with concepts already ordered for display.
Fields:
- name: `string` - Visible category label.
- slug: `string` - Normalized category key.
- concepts: `Concept[]` - Visible concepts in sidebar order.

#### Type: `TypeReferenceTarget`
Kind: object
Definition: `{ conceptId: string; conceptTitle: string; id: string; name: string }`
Description: Link target for turning type names into documentation anchors.
Fields:
- conceptId: `string` - Owning concept ID.
- conceptTitle: `string` - Owning concept title.
- id: `string` - Type entry anchor ID.
- name: `string` - Documented type name.

#### Type: `KnowledgeDocument`
Kind: object
Description: Parsed documentation payload consumed by the reader shell.
Fields:
- meta: `DocumentMeta` - Frontmatter metadata.
- visibility: `DocumentationVisibility` - Active visibility mode for this run.
- concepts: `Concept[]` - Visible concepts after privacy filtering.
- categories: `CategoryGroup[]` - Visible concepts grouped for navigation.
- conceptsById: `Record<string, Concept>` - Visible concepts keyed by ID.
- typeIndex: `Record<string, TypeReferenceTarget>` - Lookup table for inline type links.

## Concept: Parser Pipeline
ID: parser-pipeline
Privacy: private
Type: concept
Category: Internal
Tags: parser, filtering, architecture
Summary: The parser reads one Markdown file, extracts typed concepts, filters them by visibility, and prepares the reader data model.
Related: knowledge-file-format, knowledge-model-types, internal-runtime-functions

### Main flow
The parser lives in `lib/knowledge-file.ts`. It:

1. resolves the canonical file path from `NEENJA_KNOWLEDGE_PATH` or the project
   `.neenja/documentation.md` location under the project root
2. reads the raw Markdown file from disk
3. parses frontmatter and splits the body into `## Concept:` blocks
4. converts each concept into a typed in-memory record
5. filters private concepts out when the active visibility mode is `public`
6. groups visible concepts by category and builds a type lookup index

### Visibility defaults
- `NEENJA_DOCS_VISIBILITY=private` means the reader keeps both public and
  private concepts.
- `NEENJA_DOCS_VISIBILITY=public` means only public concepts survive the final
  document model.
- When no explicit visibility flag is provided, dev mode defaults to the full
  set and production mode defaults to the public subset.

## Concept: Reader Navigation Internals
ID: reader-navigation-internals
Privacy: private
Type: concept
Category: Internal
Tags: ui, navigation, search, reader
Summary: The docs shell manages category expansion, search, hash-based entry navigation, and inline type links across concept pages.
Related: parser-pipeline, internal-runtime-functions, knowledge-model-types

### Key files
- `components/docs-shell.tsx`
- `components/function-reference.tsx`
- `components/markdown-content.tsx`
- `src/pages/index.astro`
- `src/pages/[conceptId].astro`

### Behavior
- The sidebar lists normal concepts first, then function concepts, then type
  concepts within each category.
- The sidebar shows a private-only indicator and leaves public concepts
  unlabeled.
- Function and type entries stay collapsed in the sidebar until the owning
  concept is the active page.
- Search returns concepts, function entries, and type entries separately.
- Inline type references inside function and type cards use `typeIndex` to link
  back to the owning `TypeReferenceTarget`.

## Concept: Internal Runtime Functions
ID: internal-runtime-functions
Privacy: private
Type: functions
Category: Internal
Tags: parser, runtime, reader, internals
Summary: Internal runtime helpers parse concept blocks, resolve visibility, and build the document model used by the reader.
Related: parser-pipeline, reader-navigation-internals, knowledge-model-types

These functions are implementation details of the bundled reader, not part of a
stable public API.

#### Function: `readKnowledgeDocument`
Kind: function
Signature: `readKnowledgeDocument(): Promise<KnowledgeDocument>`
Description: Load, parse, filter, and index the canonical knowledge file for the active visibility mode.
Behavior:
- Reads raw Markdown from disk.
- Parses concepts and their structured entries.
- Filters concepts when visibility is `public`.
- Builds `conceptsById`, grouped categories, and `typeIndex`.

#### Function: `parseConcept`
Kind: function
Signature: `parseConcept(block: string): Concept`
Description: Parse one `## Concept:` block into the in-memory concept model.
Behavior:
- Reads concept metadata such as `ID`, `Privacy`, `Type`, and `Category`.
- Routes the body through the Markdown parser or structured entry parser based
  on `ConceptKind`.

#### Function: `buildTypeIndex`
Kind: function
Signature: `buildTypeIndex(concepts: Concept[]): Record<string, TypeReferenceTarget>`
Description: Collect the first visible occurrence of each documented type name so inline type mentions can navigate to the matching type entry.

#### Function: `resolveDocumentationVisibility`
Kind: function
Signature: `resolveDocumentationVisibility(): DocumentationVisibility`
Description: Decide whether the current run should expose the full docs set or only the public subset.
