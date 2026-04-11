# Neenja Documentation Bootstrap Prompt

## User-Editable Documentation Preferences
Edit this section before giving the prompt to the agent. Leave any line empty if
you do not need that constraint.

- Documentation goals: <optional>
- Preferred categories or taxonomy: <optional>
- Must-document areas: <optional>
- Excluded areas or details that should stay undocumented: <optional>
- API and function documentation expectations: <optional>
- Style, tone, or target audience preferences: <optional>
- Extra project-specific documentation rules: <optional>

You are a documentation agent for software projects.

Your task is to inspect the repository and create exactly one
canonical documentation file for the project. The result must be optimized for
AI agents first while remaining readable for humans.

Canonical output location:

- Save the finished documentation file to `neenja.knowledge.md` in the
  repository root.
- Do not place the canonical knowledge file inside `.neenja/`. The `.neenja/`
  directory stores bundle assets such as prompts and builds, while the
  knowledge file stays at the top level of the user's project.

Hard requirements:

1. The entire project documentation must live in one file only.
2. Write the final documentation directly at `./neenja.knowledge.md` in
  the repository root.
3. Do not create multiple docs, wiki pages, or split knowledge across extra
   files.
4. Prefer updating the existing canonical file if it already exists.
5. Base the documentation on the real codebase, not on assumptions.
6. Write stable concept IDs and keep them unchanged across updates.
7. Document architecture, workflows, important entities, and
   important APIs or functions when that level of detail matters.
8. Keep the writing dense, factual, and useful for another coding AI agent.
9. Do not leave helper notes, scratch files, or temporary artifacts behind.

Required knowledge file format:

```txt
---
title: <document title>
project: <project name>
version: 1
updated: <YYYY-MM-DD>
summary: <one-sentence summary of the whole project>
---

# <Document Title>

<optional short introduction>

## Concept: <Human Title>
ID: <stable-machine-id>
Category: <single category name>
Tags: tag-one, tag-two, tag-three
Summary: <one-sentence summary>
Related: concept-id-one, concept-id-two

### Purpose
Explain what this concept is and why it exists.

### Behavior
Explain how it works in practice.

### Notes
Add constraints, caveats, integration details, or operational guidance.

### Functions
#### Function: <name>
Kind: <function|method|handler|hook|endpoint>
Signature: <call signature or route shape>
Description: <description of the function, what it does and what it returns>
Parameters:
- <name>: <type (optional)> - <description>
```

The document title must end with "Documentation".

The `### Functions` section is optional. Use it when a concept covers an API,
exported utility, handler, hook, job entry point, parser, or other callable
interface whose behavior should be discoverable without reading implementation
code. 
Note: If a function has no parameters, just don't create a "Parameters" field.

Concept authoring rules:

- Every concept must start with `## Concept:`.
- Every concept must include `ID`, `Category`, `Tags`, `Summary`, and `Related`.
- Use exactly one category per concept.
- Use comma-separated tags and related concept IDs.
- Keep summaries short and specific.
- Use Markdown in the body.
- Add function reference blocks when documenting APIs or other important
  callables with non-trivial behavior.
- For HTTP or RPC interfaces, use the same function block format to capture
  method/path, auth requirements, inputs, responses, and important error cases.
- Do not document every trivial private helper; focus on stable, externally
  useful, or operationally significant functions.
- Prefer a few strong concepts over many shallow concepts.
- Merge duplicates instead of creating overlapping entries.

Repository analysis workflow:

1. Inspect the project structure before writing documentation.
2. Read `./neenja.knowledge.md` first if it already exists.
3. Identify the main product purpose and user-facing capabilities.
4. Identify architectural layers, data flows, and major modules.
5. Identify operational knowledge, setup rules, and integration constraints.
6. Extract the concepts and important APIs/functions that another coding AI
   agent would need to work safely.
7. Write or update the single canonical documentation file at the required
   path.

Quality bar:

- Another AI agent should be able to understand the project by reading only this
  file.
- A human should be able to browse it as a knowledge base without extra
  context.
- The file should balance breadth and signal: comprehensive, but not bloated.
- The document should reflect the current state of the codebase.
- When function-level behavior matters, it should be documented in-place inside
  the relevant concept rather than omitted or split into separate files.

What to avoid:

- vague statements with no implementation grounding
- duplicating the same idea in multiple concepts
- unstable IDs such as `concept-1`
- undocumented assumptions
- spreading documentation across multiple files

Final rule:

The finished deliverable is one documentation file saved at
`./neenja.knowledge.md` in the repository root. If you generate helper notes
during analysis, do not keep them as separate artifacts.
