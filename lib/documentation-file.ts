import { promises as fs } from "node:fs";
import path from "node:path";
import { parse as parseYaml } from "yaml";

export const defaultDocumentsDirectoryName = ".neenja";
export const documentationDocumentFileName = "documentation.md";
export const projectPlanDocumentFileName = "project-plan.md";
export const taskTreeDocumentFileName = "task-tree.yaml";
export const taskTreeYmlDocumentFileName = "task-tree.yml";
export const defaultDocumentationDocumentFileName = `${defaultDocumentsDirectoryName}/${documentationDocumentFileName}`;
export const legacyRootDocumentationDocumentFileName = "neenja.knowledge.md";
const documentationPathEnvName = "NEENJA_DOCUMENTATION_PATH";

export type DocumentationVisibility = "public" | "private";
export type DocumentKind = "documentation" | "project-plan" | "task-tree";
export type ConceptPrivacy = "public" | "private";
export type ConceptKind = "concept" | "functions" | "types";
export type TaskGraphEdgeKind = "decomposition" | "dependency";

export type FunctionField = {
  label: string;
  value: string;
  items: string[];
};

export type ConceptFunction = {
  id: string;
  name: string;
  kind: string;
  signature: string;
  description: string;
  parameters: string[];
  fields: FunctionField[];
};

export type ConceptType = {
  id: string;
  name: string;
  kind: string;
  definition: string;
  description: string;
  fields: FunctionField[];
};

export type ConceptContentBlock = {
  type: "markdown";
  content: string;
};

export type DocumentMeta = {
  title: string;
  project: string;
  version: string;
  updated: string;
  summary: string;
  preferences?: string;
};

export type ProjectPlanMeta = Omit<DocumentMeta, "summary">;

export type Concept = {
  id: string;
  title: string;
  category: string;
  categorySlug: string;
  privacy: ConceptPrivacy;
  kind: ConceptKind;
  tags: string[];
  summary: string;
  related: string[];
  content: string;
  contentBlocks: ConceptContentBlock[];
  functions: ConceptFunction[];
  types: ConceptType[];
};

export type CategoryGroup = {
  name: string;
  slug: string;
  concepts: Concept[];
};

export type TypeReferenceTarget = {
  conceptId: string;
  conceptTitle: string;
  id: string;
  name: string;
};

export type DocumentationDocument = {
  kind: "documentation";
  slug: "documentation";
  label: string;
  path: string;
  meta: DocumentMeta;
  visibility: DocumentationVisibility;
  concepts: Concept[];
  categories: CategoryGroup[];
  conceptsById: Record<string, Concept>;
  typeIndex: Record<string, TypeReferenceTarget>;
};

export type PlanSection = {
  id: string;
  title: string;
  area: string;
  areaSlug: string;
  summary: string;
  content: string;
  contentBlocks: ConceptContentBlock[];
  detailBlocks: PlanDetailBlock[];
};

export type PlanDetailBlock = {
  id: string;
  title: string;
  content: string;
  contentBlocks: ConceptContentBlock[];
};

export type PlanAreaGroup = {
  name: string;
  slug: string;
  sections: PlanSection[];
};

export type ProjectPlanDocument = {
  kind: "project-plan";
  slug: "project-plan";
  label: string;
  path: string;
  meta: ProjectPlanMeta;
  sections: PlanSection[];
  areas: PlanAreaGroup[];
  sectionsById: Record<string, PlanSection>;
};

export type TaskNode = {
  id: string;
  title: string;
  status: string;
  statusLabel: string;
  statusSlug: string;
  area: string;
  areaSlug: string;
  parentId?: string;
  dependsOn: string[];
  childrenIds: string[];
  blockingTaskIds: string[];
  depth: number;
  content: string;
  contentBlocks: ConceptContentBlock[];
};

export type TaskAreaGroup = {
  name: string;
  slug: string;
  tasks: TaskNode[];
};

export type TaskGraphEdge = {
  from: string;
  to: string;
  kind: TaskGraphEdgeKind;
};

export type TaskStatusSummary = {
  status: string;
  label: string;
  count: number;
  percent: number;
};

export type TaskProgressSummary = {
  total: number;
  done: number;
  percent: number;
};

export type TaskTreeDocument = {
  kind: "task-tree";
  slug: "task-tree";
  label: string;
  path: string;
  meta: DocumentMeta;
  tasks: TaskNode[];
  areas: TaskAreaGroup[];
  tasksById: Record<string, TaskNode>;
  rootTaskIds: string[];
  edges: TaskGraphEdge[];
  statusSummary: TaskStatusSummary[];
  progress: TaskProgressSummary;
};

export type ReaderDocument = DocumentationDocument | ProjectPlanDocument | TaskTreeDocument;

export type DocumentCollection = {
  visibility: DocumentationVisibility;
  documents: ReaderDocument[];
  documentsBySlug: Record<string, ReaderDocument>;
  defaultDocument: ReaderDocument;
};

export function getReaderDocumentDescription(document: ReaderDocument) {
  if (document.kind === "project-plan") {
    return `${document.meta.title} for ${document.meta.project}.`;
  }

  return document.meta.summary;
}

type RecognizedDocumentFile = {
  kind: DocumentKind;
  path: string;
};

function getConfiguredDocumentationPath() {
  return process.env[documentationPathEnvName];
}

export async function resolveDocumentationDocumentPath(): Promise<string> {
  const configuredPath = getConfiguredDocumentationPath();

  if (configuredPath) {
    return path.resolve(configuredPath);
  }

  const projectRoot = process.env.NEENJA_PROJECT_ROOT
    ? path.resolve(process.env.NEENJA_PROJECT_ROOT)
    : process.cwd();
  const canonicalPath = path.join(projectRoot, defaultDocumentationDocumentFileName);

  try {
    await fs.access(canonicalPath);
    return canonicalPath;
  } catch {
    return path.join(projectRoot, legacyRootDocumentationDocumentFileName);
  }
}

export async function resolveDocumentDirectoryPath(): Promise<string> {
  const configuredDirectory =
    process.env.NEENJA_DOCUMENTS_DIR ?? process.env.NEENJA_DOCUMENTS_PATH;

  if (configuredDirectory) {
    return path.resolve(configuredDirectory);
  }

  const configuredDocumentationPath = getConfiguredDocumentationPath();

  if (configuredDocumentationPath) {
    return path.dirname(path.resolve(configuredDocumentationPath));
  }

  const projectRoot = process.env.NEENJA_PROJECT_ROOT
    ? path.resolve(process.env.NEENJA_PROJECT_ROOT)
    : process.cwd();

  return path.join(projectRoot, defaultDocumentsDirectoryName);
}

function parseFrontmatter(raw: string) {
  if (!raw.startsWith("---\n")) {
    return {
      meta: {},
      body: raw,
    };
  }

  const endIndex = raw.indexOf("\n---\n", 4);

  if (endIndex === -1) {
    return {
      meta: {},
      body: raw,
    };
  }

  const frontmatter = raw.slice(4, endIndex).trim();
  const body = raw.slice(endIndex + 5);
  const meta: Record<string, string> = {};

  for (const line of frontmatter.split("\n")) {
    const separatorIndex = line.indexOf(":");

    if (separatorIndex === -1) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    const value = line.slice(separatorIndex + 1).trim();
    meta[key] = value;
  }

  return { meta, body };
}

function splitHeadingBlocks(body: string, pattern: RegExp) {
  const normalizedBody = body.replace(/\r\n/g, "\n");
  const lines = normalizedBody.split("\n");
  const blocks: string[] = [];
  let currentBlock: string[] = [];
  let isInCodeBlock = false;

  for (const line of lines) {
    const isBlockStart = !isInCodeBlock && pattern.test(line);

    if (isBlockStart) {
      if (currentBlock.length > 0) {
        blocks.push(currentBlock.join("\n").trim());
      }

      currentBlock = [line];
    } else if (currentBlock.length > 0) {
      currentBlock.push(line);
    }

    if (line.startsWith("```")) {
      isInCodeBlock = !isInCodeBlock;
    }
  }

  if (currentBlock.length > 0) {
    blocks.push(currentBlock.join("\n").trim());
  }

  return blocks;
}

function splitConceptBlocks(body: string) {
  return splitHeadingBlocks(body, /^## Concept:\s+.+$/);
}

function splitPlanBlocks(body: string) {
  return splitHeadingBlocks(body, /^## Plan:\s+.+$/);
}

function splitPlanDetailBlocks(body: string) {
  return splitHeadingBlocks(body, /^###\s+.+$/);
}

function parseListValue(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function stripWrappingBackticks(value: string) {
  const trimmedValue = value.trim();

  if (/^`[^`]+`$/.test(trimmedValue)) {
    return trimmedValue.slice(1, -1).trim();
  }

  return trimmedValue;
}

function ensureUniqueId(baseId: string, usedIds: Set<string>) {
  const normalizedBaseId = baseId || "entry";

  if (!usedIds.has(normalizedBaseId)) {
    usedIds.add(normalizedBaseId);
    return normalizedBaseId;
  }

  let suffix = 2;

  while (usedIds.has(`${normalizedBaseId}-${suffix}`)) {
    suffix += 1;
  }

  const nextId = `${normalizedBaseId}-${suffix}`;
  usedIds.add(nextId);
  return nextId;
}

function normalizeFieldLabel(value: string) {
  return value.trim().toLowerCase();
}

function finalizeFunctionField(field: FunctionField): FunctionField {
  return {
    label: field.label.trim(),
    value: field.value.trim(),
    items: field.items.map((item) => item.trim()).filter(Boolean),
  };
}

function getFunctionField(fields: FunctionField[], label: string) {
  const normalizedLabel = normalizeFieldLabel(label);

  return fields.find((field) => normalizeFieldLabel(field.label) === normalizedLabel);
}

function getFunctionFieldText(fields: FunctionField[], label: string) {
  const field = getFunctionField(fields, label);

  if (!field) {
    return "";
  }

  return [field.value, ...field.items].filter(Boolean).join("\n").trim();
}

function getFunctionFieldItems(fields: FunctionField[], label: string) {
  const field = getFunctionField(fields, label);

  if (!field) {
    return [];
  }

  return field.items.length > 0
    ? field.items
    : field.value
      ? [field.value]
      : [];
}

const referenceFieldPattern = /^([A-Za-z][A-Za-z0-9 /&()_-]*):\s*(.*)$/;

function parseReferenceFields(lines: string[]) {
  const fields: FunctionField[] = [];
  let currentField: FunctionField | null = null;

  for (const line of lines) {
    const fieldMatch = referenceFieldPattern.exec(line);

    if (fieldMatch) {
      if (currentField) {
        fields.push(finalizeFunctionField(currentField));
      }

      currentField = {
        label: fieldMatch[1],
        value: fieldMatch[2].trim(),
        items: [],
      };
      continue;
    }

    if (!currentField) {
      continue;
    }

    const listItemMatch = /^\s*-\s+(.*)$/.exec(line);

    if (listItemMatch) {
      currentField.items.push(listItemMatch[1].trim());
      continue;
    }

    if (line.trim() === "") {
      continue;
    }

    currentField.value = currentField.value
      ? `${currentField.value}\n${line.trim()}`
      : line.trim();
  }

  if (currentField) {
    fields.push(finalizeFunctionField(currentField));
  }

  return fields;
}

function parsePlanMetadataFields(lines: string[]) {
  const metadata: Record<string, string> = {};
  const planMetadataLabels = new Set(["id", "area", "summary"]);
  let bodyStartIndex = 0;

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];

    if (line.trim() === "") {
      bodyStartIndex = index + 1;
      break;
    }

    const fieldMatch = referenceFieldPattern.exec(line);

    if (!fieldMatch) {
      bodyStartIndex = index;
      break;
    }

    const normalizedLabel = normalizeFieldLabel(fieldMatch[1]);

    if (!planMetadataLabels.has(normalizedLabel)) {
      bodyStartIndex = index;
      break;
    }

    metadata[normalizedLabel] = fieldMatch[2].trim();
    bodyStartIndex = index + 1;
  }

  return {
    metadata,
    bodyStartIndex,
  };
}

function parseFunctionBlock(block: string, usedIds: Set<string>): ConceptFunction {
  const lines = block.split("\n");
  const rawName = lines[0].replace(/^#### Function:\s+/, "").trim();
  const name = stripWrappingBackticks(rawName) || "Function";
  const fields = parseReferenceFields(lines.slice(1));
  const functionSlug = slugify(name);

  return {
    id: ensureUniqueId(functionSlug ? `function-${functionSlug}` : "function", usedIds),
    name,
    kind: getFunctionFieldText(fields, "Kind"),
    signature: getFunctionFieldText(fields, "Signature"),
    description: getFunctionFieldText(fields, "Description"),
    parameters: getFunctionFieldItems(fields, "Parameters"),
    fields,
  };
}

function parseTypeBlock(block: string, usedIds: Set<string>): ConceptType {
  const lines = block.split("\n");
  const rawName = lines[0].replace(/^#### Type:\s+/, "").trim();
  const name = stripWrappingBackticks(rawName) || "Type";
  const fields = parseReferenceFields(lines.slice(1));
  const typeSlug = slugify(name);

  return {
    id: ensureUniqueId(typeSlug ? `type-${typeSlug}` : "type", usedIds),
    name,
    kind: getFunctionFieldText(fields, "Kind"),
    definition:
      getFunctionFieldText(fields, "Definition") ||
      getFunctionFieldText(fields, "Shape") ||
      getFunctionFieldText(fields, "Signature"),
    description: getFunctionFieldText(fields, "Description"),
    fields,
  };
}

function parseMarkdownBlocks(content: string) {
  const trimmedContent = content.trim();

  if (!trimmedContent) {
    return [];
  }

  return [
    {
      type: "markdown" as const,
      content: trimmedContent,
    },
  ];
}

function parseTypedConceptContent(content: string, kind: Exclude<ConceptKind, "concept">) {
  const normalizedContent = content.replace(/\r\n/g, "\n");
  const lines = normalizedContent.split("\n");
  const introLines: string[] = [];
  const referenceBlocks: string[] = [];
  let currentReferenceLines: string[] = [];
  let isInCodeBlock = false;
  let hasSeenFirstReference = false;
  const referenceStartPattern =
    kind === "functions"
      ? /^#### Function:\s+.+$/
      : /^#### Type:\s+.+$/;

  for (const line of lines) {
    const isReferenceStart = !isInCodeBlock && referenceStartPattern.test(line);

    if (isReferenceStart) {
      hasSeenFirstReference = true;

      if (currentReferenceLines.length > 0) {
        referenceBlocks.push(currentReferenceLines.join("\n").trim());
      }

      currentReferenceLines = [line];
    } else if (!hasSeenFirstReference) {
      introLines.push(line);
    } else if (currentReferenceLines.length > 0) {
      currentReferenceLines.push(line);
    }

    if (line.startsWith("```")) {
      isInCodeBlock = !isInCodeBlock;
    }
  }

  if (currentReferenceLines.length > 0) {
    referenceBlocks.push(currentReferenceLines.join("\n").trim());
  }

  const usedIds = new Set<string>();
  const functions =
    kind === "functions"
      ? referenceBlocks.filter(Boolean).map((block) => parseFunctionBlock(block, usedIds))
      : [];
  const types =
    kind === "types"
      ? referenceBlocks.filter(Boolean).map((block) => parseTypeBlock(block, usedIds))
      : [];

  return {
    contentBlocks: parseMarkdownBlocks(introLines.join("\n")),
    functions,
    types,
  };
}

function normalizeConceptKind(value: string | undefined): ConceptKind {
  const normalizedValue = value?.trim().toLowerCase();

  if (normalizedValue === "functions") {
    return "functions";
  }

  if (normalizedValue === "types") {
    return "types";
  }

  return "concept";
}

function normalizeConceptPrivacy(value: string | undefined): ConceptPrivacy {
  return value?.trim().toLowerCase() === "private" ? "private" : "public";
}

function parseConcept(block: string): Concept {
  const lines = block.split("\n");
  const title = lines[0].replace(/^## Concept:\s+/, "").trim();
  const metadata: Record<string, string> = {};
  let bodyStartIndex = 1;

  for (let index = 1; index < lines.length; index += 1) {
    const line = lines[index];

    if (line.trim() === "") {
      bodyStartIndex = index + 1;
      break;
    }

    const separatorIndex = line.indexOf(":");

    if (separatorIndex === -1) {
      bodyStartIndex = index;
      break;
    }

    const key = line.slice(0, separatorIndex).trim().toLowerCase();
    const value = line.slice(separatorIndex + 1).trim();
    metadata[key] = value;
    bodyStartIndex = index + 1;
  }

  const kind = normalizeConceptKind(metadata.type);
  const content = lines.slice(bodyStartIndex).join("\n").trim();
  const parsedContent =
    kind === "concept"
      ? {
          contentBlocks: parseMarkdownBlocks(content),
          functions: [] as ConceptFunction[],
          types: [] as ConceptType[],
        }
      : parseTypedConceptContent(content, kind);

  return {
    id: metadata.id || slugify(title),
    title,
    category: metadata.category || "General",
    categorySlug: slugify(metadata.category || "General"),
    privacy: normalizeConceptPrivacy(metadata.privacy),
    kind,
    tags: parseListValue(metadata.tags || ""),
    summary: metadata.summary || "",
    related: parseListValue(metadata.related || ""),
    content,
    contentBlocks: parsedContent.contentBlocks,
    functions: parsedContent.functions,
    types: parsedContent.types,
  };
}

function getDocumentMeta(
  meta: Record<string, string>,
  defaults: Pick<DocumentMeta, "title" | "summary">,
): DocumentMeta {
  return {
    title: meta.title || defaults.title,
    project: meta.project || "Unknown Project",
    version: meta.version || "1",
    updated: meta.updated || "Unknown",
    summary: meta.summary || defaults.summary,
    ...(meta.preferences ? { preferences: meta.preferences } : {}),
  };
}

function getProjectPlanMeta(meta: Record<string, string>): ProjectPlanMeta {
  return {
    title: meta.title || "Project Plan",
    project: meta.project || "Unknown Project",
    version: meta.version || "1",
    updated: meta.updated || "Unknown",
    ...(meta.preferences ? { preferences: meta.preferences } : {}),
  };
}

function orderCategoryConcepts(concepts: Concept[]) {
  return [
    ...concepts.filter((concept) => concept.kind === "concept"),
    ...concepts.filter((concept) => concept.kind === "functions"),
    ...concepts.filter((concept) => concept.kind === "types"),
  ];
}

function groupByCategory(concepts: Concept[]) {
  const groups = new Map<string, Concept[]>();

  for (const concept of concepts) {
    const existing = groups.get(concept.category) ?? [];
    existing.push(concept);
    groups.set(concept.category, existing);
  }

  return [...groups.entries()].map(([name, categoryConcepts]) => ({
    name,
    slug: slugify(name),
    concepts: orderCategoryConcepts(categoryConcepts),
  }));
}

function buildTypeIndex(concepts: Concept[]) {
  const typeIndex: Record<string, TypeReferenceTarget> = {};

  for (const concept of concepts) {
    for (const typeReference of concept.types) {
      if (typeIndex[typeReference.name]) {
        continue;
      }

      typeIndex[typeReference.name] = {
        conceptId: concept.id,
        conceptTitle: concept.title,
        id: typeReference.id,
        name: typeReference.name,
      };
    }
  }

  return typeIndex;
}

function resolveDocumentationVisibility(): DocumentationVisibility {
  const configuredVisibility = process.env.NEENJA_DOCS_VISIBILITY?.trim().toLowerCase();

  if (configuredVisibility === "public" || configuredVisibility === "private") {
    return configuredVisibility;
  }

  return process.env.NODE_ENV === "production" ? "public" : "private";
}

function parseDocumentationDocument(raw: string, documentPath: string): DocumentationDocument {
  const { meta, body } = parseFrontmatter(raw);
  const parsedConcepts = splitConceptBlocks(body).map(parseConcept);
  const visibility = resolveDocumentationVisibility();
  const concepts =
    visibility === "private"
      ? parsedConcepts
      : parsedConcepts.filter((concept) => concept.privacy === "public");
  const conceptsById = Object.fromEntries(concepts.map((concept) => [concept.id, concept]));

  return {
    kind: "documentation",
    slug: "documentation",
    label: "Documentation",
    path: documentPath,
    meta: getDocumentMeta(meta, {
      title: "Documentation",
      summary: "Project documentation.",
    }),
    visibility,
    concepts,
    categories: groupByCategory(concepts),
    conceptsById,
    typeIndex: buildTypeIndex(concepts),
  };
}

function parsePlanSection(block: string): PlanSection {
  const lines = block.split("\n");
  const title = lines[0].replace(/^## Plan:\s+/, "").trim();
  const { metadata, bodyStartIndex } = parsePlanMetadataFields(lines.slice(1));
  const area = metadata.area || "Plan";
  const summary = metadata.summary || "";
  const content = lines.slice(bodyStartIndex + 1).join("\n").trim();
  const planDetailBlocks = splitPlanDetailBlocks(content);
  const detailBlockIds = new Set<string>();
  const detailBlocks = planDetailBlocks.map((detailBlock) =>
    parsePlanDetailBlock(detailBlock, detailBlockIds),
  );
  const firstDetailBlockIndex =
    planDetailBlocks.length > 0 ? content.indexOf(planDetailBlocks[0]) : -1;
  const introContent =
    firstDetailBlockIndex >= 0
      ? content.slice(0, firstDetailBlockIndex).trim()
      : content;

  return {
    id: metadata.id || slugify(title),
    title,
    area,
    areaSlug: slugify(area),
    summary,
    content,
    contentBlocks: parseMarkdownBlocks(introContent),
    detailBlocks,
  };
}

function parsePlanDetailBlock(block: string, usedIds: Set<string>): PlanDetailBlock {
  const lines = block.split("\n");
  const title = lines[0].replace(/^###\s+/, "").trim();
  const content = lines.slice(1).join("\n").trim();
  const baseId = slugify(title) || "detail";

  return {
    id: ensureUniqueId(baseId, usedIds),
    title,
    content,
    contentBlocks: parseMarkdownBlocks(content),
  };
}

function groupPlanSectionsByArea(sections: PlanSection[]) {
  const groups = new Map<string, PlanSection[]>();

  for (const section of sections) {
    const existing = groups.get(section.area) ?? [];
    existing.push(section);
    groups.set(section.area, existing);
  }

  return [...groups.entries()].map(([name, areaSections]) => ({
    name,
    slug: slugify(name),
    sections: areaSections,
  }));
}

function parseProjectPlanDocument(raw: string, documentPath: string): ProjectPlanDocument {
  const { meta, body } = parseFrontmatter(raw);
  const sections = splitPlanBlocks(body).map(parsePlanSection);
  const sectionsById = Object.fromEntries(sections.map((section) => [section.id, section]));

  return {
    kind: "project-plan",
    slug: "project-plan",
    label: "Project plan",
    path: documentPath,
    meta: getProjectPlanMeta(meta),
    sections,
    areas: groupPlanSectionsByArea(sections),
    sectionsById,
  };
}

function normalizeTaskStatus(value: string) {
  const normalizedValue = value
    .trim()
    .toLowerCase()
    .replace(/[_\s]+/g, "-");

  if (!normalizedValue) {
    return "todo";
  }

  const aliases: Record<string, string> = {
    "to-do": "todo",
    open: "todo",
    planned: "todo",
    doing: "in-progress",
    active: "in-progress",
    progress: "in-progress",
    "inprogress": "in-progress",
    complete: "done",
    completed: "done",
    fixed: "done",
    cancelled: "canceled",
    dropped: "canceled",
  };

  return aliases[normalizedValue] ?? slugify(normalizedValue) ?? "todo";
}

function formatTaskStatusLabel(statusSlug: string) {
  const labels: Record<string, string> = {
    blocked: "Blocked",
    canceled: "Canceled",
    done: "Done",
    "in-progress": "In progress",
    review: "Review",
    todo: "Todo",
  };

  if (labels[statusSlug]) {
    return labels[statusSlug];
  }

  return statusSlug
    .split("-")
    .filter(Boolean)
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(" ");
}

function normalizeTaskReferenceId(value: string) {
  const normalizedValue = stripWrappingBackticks(value).trim();

  if (!normalizedValue || /^(none|n\/a|na|-+)$/i.test(normalizedValue)) {
    return "";
  }

  return normalizedValue;
}

type RawTaskTreeDocument = {
  title?: unknown;
  project?: unknown;
  version?: unknown;
  updated?: unknown;
  preferences?: unknown;
  tasks?: unknown;
};

type RawTaskNode = Record<string, unknown> & {
  id?: unknown;
  title?: unknown;
  status?: unknown;
  area?: unknown;
  dependsOn?: unknown;
  depends_on?: unknown;
  details?: unknown;
  children?: unknown;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stringifyTaskYamlScalar(value: unknown) {
  if (value === null || value === undefined) {
    return "";
  }

  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  return JSON.stringify(value);
}

function taskYamlListValue(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .flatMap((item) => taskYamlListValue(item))
      .map(normalizeTaskReferenceId)
      .filter(Boolean);
  }

  return parseListValue(stringifyTaskYamlScalar(value))
    .map(normalizeTaskReferenceId)
    .filter(Boolean);
}

function parseYamlTaskNode(
  rawTask: RawTaskNode,
  parentId: string | undefined,
  usedIds: Set<string>,
) {
  const title = stringifyTaskYamlScalar(rawTask.title).trim() || "Task";
  const rawId = stringifyTaskYamlScalar(rawTask.id).trim();
  const id = ensureUniqueId(rawId || slugify(title), usedIds);
  const statusSlug = normalizeTaskStatus(stringifyTaskYamlScalar(rawTask.status) || "todo");
  const area = stringifyTaskYamlScalar(rawTask.area).trim() || "Tasks";
  const content = stringifyTaskYamlScalar(rawTask.details).trim();
  const children = Array.isArray(rawTask.children)
    ? rawTask.children.filter(isRecord) as RawTaskNode[]
    : [];

  return {
    task: {
      id,
      title,
      status: statusSlug,
      statusLabel: formatTaskStatusLabel(statusSlug),
      statusSlug,
      area,
      areaSlug: slugify(area),
      parentId,
      dependsOn: taskYamlListValue(rawTask.dependsOn ?? rawTask.depends_on),
      childrenIds: [],
      blockingTaskIds: [],
      depth: 0,
      content,
      contentBlocks: parseMarkdownBlocks(content),
    } satisfies TaskNode,
    children,
  };
}

function flattenYamlTaskTree(
  rawTasks: RawTaskNode[],
  parentId: string | undefined,
  usedIds: Set<string>,
) {
  const tasks: TaskNode[] = [];

  for (const rawTask of rawTasks) {
    const parsedTask = parseYamlTaskNode(rawTask, parentId, usedIds);
    tasks.push(parsedTask.task);
    tasks.push(...flattenYamlTaskTree(parsedTask.children, parsedTask.task.id, usedIds));
  }

  return tasks;
}

function buildTaskRelationships(parsedTasks: TaskNode[]) {
  const taskIds = new Set(parsedTasks.map((task) => task.id));
  const tasksById = new Map(
    parsedTasks.map((task) => [
      task.id,
      {
        ...task,
        parentId: task.parentId && taskIds.has(task.parentId) && task.parentId !== task.id
          ? task.parentId
          : undefined,
        dependsOn: task.dependsOn.filter((dependencyId) =>
          taskIds.has(dependencyId) && dependencyId !== task.id,
        ),
        childrenIds: [] as string[],
        blockingTaskIds: [] as string[],
        depth: 0,
      },
    ]),
  );

  for (const task of tasksById.values()) {
    if (task.parentId) {
      tasksById.get(task.parentId)?.childrenIds.push(task.id);
    }

    for (const dependencyId of task.dependsOn) {
      tasksById.get(dependencyId)?.blockingTaskIds.push(task.id);
    }
  }

  const depthCache = new Map<string, number>();
  const resolveDepth = (taskId: string, seenIds = new Set<string>()): number => {
    const cachedDepth = depthCache.get(taskId);

    if (cachedDepth !== undefined) {
      return cachedDepth;
    }

    const task = tasksById.get(taskId);

    if (!task?.parentId || seenIds.has(taskId)) {
      depthCache.set(taskId, 0);
      return 0;
    }

    seenIds.add(taskId);
    const depth = resolveDepth(task.parentId, seenIds) + 1;
    depthCache.set(taskId, depth);
    return depth;
  };

  for (const task of tasksById.values()) {
    task.depth = resolveDepth(task.id);
  }

  return parsedTasks.map((task) => tasksById.get(task.id) ?? task);
}

function groupTasksByArea(tasks: TaskNode[]) {
  const groups = new Map<string, TaskNode[]>();

  for (const task of tasks) {
    const existing = groups.get(task.area) ?? [];
    existing.push(task);
    groups.set(task.area, existing);
  }

  return [...groups.entries()].map(([name, areaTasks]) => ({
    name,
    slug: slugify(name),
    tasks: areaTasks,
  }));
}

function buildTaskGraphEdges(tasks: TaskNode[]) {
  const edges: TaskGraphEdge[] = [];

  for (const task of tasks) {
    if (task.parentId) {
      edges.push({
        from: task.parentId,
        to: task.id,
        kind: "decomposition",
      });
    }

    for (const dependencyId of task.dependsOn) {
      edges.push({
        from: dependencyId,
        to: task.id,
        kind: "dependency",
      });
    }
  }

  return edges;
}

function buildTaskStatusSummary(tasks: TaskNode[]) {
  const groups = new Map<string, TaskStatusSummary>();

  for (const task of tasks) {
    const existing = groups.get(task.statusSlug) ?? {
      status: task.statusSlug,
      label: task.statusLabel,
      count: 0,
      percent: 0,
    };

    existing.count += 1;
    groups.set(task.statusSlug, existing);
  }

  return [...groups.values()].map((statusSummary) => ({
    ...statusSummary,
    percent: tasks.length === 0
      ? 0
      : Math.round((statusSummary.count / tasks.length) * 100),
  }));
}

function buildTaskProgress(tasks: TaskNode[]) {
  const done = tasks.filter((task) => task.statusSlug === "done").length;

  return {
    total: tasks.length,
    done,
    percent: tasks.length === 0 ? 0 : Math.round((done / tasks.length) * 100),
  };
}

function parseTaskTreeDocument(raw: string, documentPath: string): TaskTreeDocument {
  const parsedYaml = parseYaml(raw) as RawTaskTreeDocument | null;
  const rawDocument = isRecord(parsedYaml) ? parsedYaml : {};
  const rawTasks = Array.isArray(rawDocument.tasks)
    ? (rawDocument.tasks.filter(isRecord) as RawTaskNode[])
    : [];
  const tasks = buildTaskRelationships(flattenYamlTaskTree(rawTasks, undefined, new Set()));
  const tasksById = Object.fromEntries(tasks.map((task) => [task.id, task]));
  const rootTaskIds = tasks.filter((task) => !task.parentId).map((task) => task.id);

  return {
    kind: "task-tree",
    slug: "task-tree",
    label: "Task tree",
    path: documentPath,
    meta: getDocumentMeta({
      title: stringifyTaskYamlScalar(rawDocument.title),
      project: stringifyTaskYamlScalar(rawDocument.project),
      version: stringifyTaskYamlScalar(rawDocument.version),
      updated: stringifyTaskYamlScalar(rawDocument.updated),
      preferences: stringifyTaskYamlScalar(rawDocument.preferences),
    }, {
      title: "Task Tree",
      summary: "Decomposed implementation task graph.",
    }),
    tasks,
    areas: groupTasksByArea(tasks),
    tasksById,
    rootTaskIds: rootTaskIds.length > 0 ? rootTaskIds : tasks.map((task) => task.id),
    edges: buildTaskGraphEdges(tasks),
    statusSummary: buildTaskStatusSummary(tasks),
    progress: buildTaskProgress(tasks),
  };
}

async function pathExists(targetPath: string) {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

function getDocumentKindByFileName(fileName: string): DocumentKind | undefined {
  if (fileName === documentationDocumentFileName) {
    return "documentation";
  }

  if (fileName === projectPlanDocumentFileName) {
    return "project-plan";
  }

  if (fileName === taskTreeDocumentFileName) {
    return "task-tree";
  }

  if (fileName === taskTreeYmlDocumentFileName) {
    return "task-tree";
  }

  return undefined;
}

async function resolveRecognizedDocumentFiles(): Promise<RecognizedDocumentFile[]> {
  const configuredDocumentationPath = getConfiguredDocumentationPath();
  const resolvedConfiguredDocumentationPath = configuredDocumentationPath
    ? path.resolve(configuredDocumentationPath)
    : undefined;

  if (resolvedConfiguredDocumentationPath) {
    return [
      {
        kind: "documentation",
        path: resolvedConfiguredDocumentationPath,
      },
    ];
  }

  const documentsDirectoryPath = await resolveDocumentDirectoryPath();
  const projectRoot = process.env.NEENJA_PROJECT_ROOT
    ? path.resolve(process.env.NEENJA_PROJECT_ROOT)
    : process.cwd();
  const defaultDocumentsDirectoryPath = path.join(projectRoot, defaultDocumentsDirectoryName);
  const legacyPath = path.join(projectRoot, legacyRootDocumentationDocumentFileName);
  const files: RecognizedDocumentFile[] = [];

  try {
    const entries = await fs.readdir(documentsDirectoryPath, {
      withFileTypes: true,
    });

    for (const entry of entries) {
      if (!entry.isFile()) {
        continue;
      }

      const kind = getDocumentKindByFileName(entry.name);

      if (!kind) {
        continue;
      }

      files.push({
        kind,
        path: path.join(documentsDirectoryPath, entry.name),
      });
    }
  } catch (error) {
    if (
      !(error instanceof Error) ||
      !("code" in error) ||
      error.code !== "ENOENT"
    ) {
      throw error;
    }
  }

  const shouldTryLegacyFallback =
    path.resolve(documentsDirectoryPath) === path.resolve(defaultDocumentsDirectoryPath);

  if (
    shouldTryLegacyFallback &&
    !files.some((file) => file.kind === "documentation") &&
    await pathExists(legacyPath)
  ) {
    files.push({
      kind: "documentation",
      path: legacyPath,
    });
  }

  files.sort((left, right) => {
    const order: Record<DocumentKind, number> = {
      documentation: 0,
      "project-plan": 1,
      "task-tree": 2,
    };

    return order[left.kind] - order[right.kind];
  });

  if (files.length === 0) {
    throw new Error(
      [
        "No Neenja documents were found.",
        "",
        "Checked paths:",
        `- ${path.join(documentsDirectoryPath, documentationDocumentFileName)}`,
        `- ${path.join(documentsDirectoryPath, projectPlanDocumentFileName)}`,
        `- ${path.join(documentsDirectoryPath, taskTreeDocumentFileName)}`,
        `- ${path.join(documentsDirectoryPath, taskTreeYmlDocumentFileName)}`,
        `- ${legacyPath}`,
      ].join("\n"),
    );
  }

  return files;
}

async function readRecognizedDocument(file: RecognizedDocumentFile): Promise<ReaderDocument> {
  const raw = await fs.readFile(file.path, "utf8");

  if (file.kind === "project-plan") {
    return parseProjectPlanDocument(raw, file.path);
  }

  if (file.kind === "task-tree") {
    return parseTaskTreeDocument(raw, file.path);
  }

  return parseDocumentationDocument(raw, file.path);
}

export async function readDocumentationDocumentRaw() {
  const documentationDocumentPath = await resolveDocumentationDocumentPath();

  try {
    return await fs.readFile(documentationDocumentPath, "utf8");
  } catch (error) {
    if (
      error instanceof Error &&
      "code" in error &&
      error.code === "ENOENT"
    ) {
      throw new Error(`Documentation file was not found at ${documentationDocumentPath}.`);
    }

    throw error;
  }
}

export async function readDocumentationDocument(): Promise<DocumentationDocument> {
  const raw = await readDocumentationDocumentRaw();
  const documentPath = await resolveDocumentationDocumentPath();

  return parseDocumentationDocument(raw, documentPath);
}

export async function readDocumentCollection(): Promise<DocumentCollection> {
  const documents = await Promise.all(
    (await resolveRecognizedDocumentFiles()).map(readRecognizedDocument),
  );
  const documentsBySlug = Object.fromEntries(
    documents.map((document) => [document.slug, document]),
  ) as Record<string, ReaderDocument>;
  const defaultDocument =
    documentsBySlug.documentation ??
    documentsBySlug["project-plan"] ??
    documentsBySlug["task-tree"] ??
    documents[0];

  return {
    visibility: resolveDocumentationVisibility(),
    documents,
    documentsBySlug,
    defaultDocument,
  };
}
