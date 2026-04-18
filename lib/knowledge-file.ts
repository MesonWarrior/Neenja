import { promises as fs } from "node:fs";
import path from "node:path";

export const defaultKnowledgeDocumentFileName = ".neenja/neenja.knowledge.md";

export type DocumentationVisibility = "public" | "private";
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

type CategoryGroup = {
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

export type KnowledgeDocument = {
  meta: {
    title: string;
    project: string;
    version: string;
    updated: string;
    summary: string;
  };
  visibility: DocumentationVisibility;
  concepts: Concept[];
  categories: CategoryGroup[];
  conceptsById: Record<string, Concept>;
  typeIndex: Record<string, TypeReferenceTarget>;
};

export async function resolveKnowledgeDocumentPath(): Promise<string> {
  const configuredPath = process.env.NEENJA_KNOWLEDGE_PATH;

  if (configuredPath) {
    return path.resolve(configuredPath);
  }

  const projectRoot = process.env.NEENJA_PROJECT_ROOT
    ? path.resolve(process.env.NEENJA_PROJECT_ROOT)
    : process.cwd();
  return path.join(projectRoot, defaultKnowledgeDocumentFileName);
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

function splitConceptBlocks(body: string) {
  const normalizedBody = body.replace(/\r\n/g, "\n");
  const lines = normalizedBody.split("\n");
  const blocks: string[] = [];
  let currentBlock: string[] = [];
  let isInCodeBlock = false;

  for (const line of lines) {
    const isConceptStart = !isInCodeBlock && /^## Concept:\s+.+$/.test(line);

    if (isConceptStart) {
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

export async function readKnowledgeDocumentRaw() {
  const knowledgeDocumentPath = await resolveKnowledgeDocumentPath();

  try {
    return await fs.readFile(knowledgeDocumentPath, "utf8");
  } catch (error) {
    if (
      error instanceof Error &&
      "code" in error &&
      error.code === "ENOENT"
    ) {
      throw new Error(`Knowledge file was not found at ${knowledgeDocumentPath}.`);
    }

    throw error;
  }
}

export async function readKnowledgeDocument(): Promise<KnowledgeDocument> {
  const raw = await readKnowledgeDocumentRaw();
  const { meta, body } = parseFrontmatter(raw);
  const parsedConcepts = splitConceptBlocks(body).map(parseConcept);
  const visibility = resolveDocumentationVisibility();
  const concepts =
    visibility === "private"
      ? parsedConcepts
      : parsedConcepts.filter((concept) => concept.privacy === "public");
  const conceptsById = Object.fromEntries(concepts.map((concept) => [concept.id, concept]));

  return {
    meta: {
      title: meta.title || "Knowledge Base",
      project: meta.project || "Unknown Project",
      version: meta.version || "1",
      updated: meta.updated || "Unknown",
      summary: meta.summary || "Single-file project knowledge base.",
    },
    visibility,
    concepts,
    categories: groupByCategory(concepts),
    conceptsById,
    typeIndex: buildTypeIndex(concepts),
  };
}
