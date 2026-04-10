import { promises as fs } from "node:fs";
import path from "node:path";

export const knowledgeDocumentPath = path.join(
  process.cwd(),
  "docs",
  "neenja.knowledge.md",
);

type Concept = {
  id: string;
  title: string;
  category: string;
  categorySlug: string;
  tags: string[];
  summary: string;
  related: string[];
  content: string;
};

type CategoryGroup = {
  name: string;
  slug: string;
  concepts: Concept[];
};

export type KnowledgeDocument = {
  meta: {
    title: string;
    project: string;
    version: string;
    updated: string;
    summary: string;
  };
  concepts: Concept[];
  categories: CategoryGroup[];
  conceptsById: Record<string, Concept>;
};

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

  const content = lines.slice(bodyStartIndex).join("\n").trim();

  return {
    id: metadata.id || slugify(title),
    title,
    category: metadata.category || "General",
    categorySlug: slugify(metadata.category || "General"),
    tags: parseListValue(metadata.tags || ""),
    summary: metadata.summary || "",
    related: parseListValue(metadata.related || ""),
    content,
  };
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
    concepts: categoryConcepts,
  }));
}

export async function readKnowledgeDocumentRaw() {
  return fs.readFile(knowledgeDocumentPath, "utf8");
}

export async function readKnowledgeDocument(): Promise<KnowledgeDocument> {
  const raw = await readKnowledgeDocumentRaw();
  const { meta, body } = parseFrontmatter(raw);
  const concepts = splitConceptBlocks(body).map(parseConcept);
  const conceptsById = Object.fromEntries(concepts.map((concept) => [concept.id, concept]));

  return {
    meta: {
      title: meta.title || "Knowledge Base",
      project: meta.project || "Unknown Project",
      version: meta.version || "1",
      updated: meta.updated || "Unknown",
      summary: meta.summary || "Single-file project knowledge base.",
    },
    concepts,
    categories: groupByCategory(concepts),
    conceptsById,
  };
}
