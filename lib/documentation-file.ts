import { promises as fs } from "node:fs";
import path from "node:path";

export const defaultDocumentsDirectoryName = ".neenja";
export const documentationDocumentFileName = "documentation.md";
export const projectPlanDocumentFileName = "project-plan.md";
export const defaultDocumentationDocumentFileName = `${defaultDocumentsDirectoryName}/${documentationDocumentFileName}`;
export const legacyRootDocumentationDocumentFileName = "neenja.knowledge.md";
const documentationPathEnvName = "NEENJA_DOCUMENTATION_PATH";

export type DocumentationVisibility = "public" | "private";
export type DocumentKind = "documentation" | "project-plan";
export type ConceptPrivacy = "public" | "private";
export type ConceptKind = "concept" | "functions" | "types";

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
  fields: FunctionField[];
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
  meta: DocumentMeta;
  sections: PlanSection[];
  areas: PlanAreaGroup[];
  sectionsById: Record<string, PlanSection>;
};

export type ReaderDocument = DocumentationDocument | ProjectPlanDocument;

export type DocumentCollection = {
  visibility: DocumentationVisibility;
  documents: ReaderDocument[];
  documentsBySlug: Record<string, ReaderDocument>;
  defaultDocument: ReaderDocument;
};

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

function parseReferenceFields(lines: string[]) {
  const fields: FunctionField[] = [];
  let currentField: FunctionField | null = null;

  for (const line of lines) {
    const fieldMatch = /^([A-Za-z][A-Za-z ]+):\s*(.*)$/.exec(line);

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
  const fieldLines: string[] = [];
  let bodyStartIndex = 1;

  for (let index = 1; index < lines.length; index += 1) {
    const line = lines[index];

    if (line.trim() === "") {
      bodyStartIndex = index + 1;
      break;
    }

    fieldLines.push(line);
    bodyStartIndex = index + 1;
  }

  const fields = parseReferenceFields(fieldLines);
  const area = getFunctionFieldText(fields, "Area") || "Plan";
  const content = lines.slice(bodyStartIndex).join("\n").trim();
  const hiddenFieldLabels = new Set(["id", "area", "summary"]);

  return {
    id: getFunctionFieldText(fields, "ID") || slugify(title),
    title,
    area,
    areaSlug: slugify(area),
    summary: getFunctionFieldText(fields, "Summary"),
    fields: fields.filter((field) => !hiddenFieldLabels.has(normalizeFieldLabel(field.label))),
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
    meta: getDocumentMeta(meta, {
      title: "Project Plan",
      summary: "Structured project plan.",
    }),
    sections,
    areas: groupPlanSectionsByArea(sections),
    sectionsById,
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
    documentsBySlug.documentation ?? documentsBySlug["project-plan"] ?? documents[0];

  return {
    visibility: resolveDocumentationVisibility(),
    documents,
    documentsBySlug,
    defaultDocument,
  };
}
