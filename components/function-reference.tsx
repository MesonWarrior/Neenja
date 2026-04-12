import type { MouseEvent, ReactNode } from "react";
import type { ConceptFunction, ConceptType, FunctionField, TypeReferenceTarget } from "../lib/knowledge-file";
import { InlineMarkdown, MarkdownContent } from "./markdown-content";

type EntryNavigationHandler = (
  event: MouseEvent<HTMLAnchorElement>,
  conceptId: string,
  entryId: string,
) => void;

function normalizeFieldLabel(value: string) {
  return value.trim().toLowerCase();
}

function trimTrailingSlash(value: string) {
  if (value === "/") {
    return "";
  }

  return value.replace(/\/+$/, "");
}

function joinPath(basePath: string, pathname: string) {
  const normalizedBasePath = trimTrailingSlash(basePath || "/");

  if (pathname === "/") {
    return normalizedBasePath ? `${normalizedBasePath}/` : "/";
  }

  return `${normalizedBasePath}${pathname}`.replace(/\/{2,}/g, "/");
}

function getConceptHref(basePath: string, conceptId: string) {
  return joinPath(basePath, `/${conceptId}/`);
}

function getEntryHref(basePath: string, conceptId: string, entryId: string) {
  return `${getConceptHref(basePath, conceptId)}#${entryId}`;
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function stripWrappingBackticks(value: string) {
  const trimmedValue = value.trim();

  if (/^`[^`]+`$/.test(trimmedValue)) {
    return trimmedValue.slice(1, -1).trim();
  }

  return trimmedValue;
}

function isPrimaryFunctionField(field: FunctionField) {
  const normalizedLabel = normalizeFieldLabel(field.label);

  return normalizedLabel === "kind" || normalizedLabel === "signature" || normalizedLabel === "description";
}

function isPrimaryTypeField(field: FunctionField) {
  const normalizedLabel = normalizeFieldLabel(field.label);

  return normalizedLabel === "kind" ||
    normalizedLabel === "definition" ||
    normalizedLabel === "shape" ||
    normalizedLabel === "signature" ||
    normalizedLabel === "description";
}

function renderTypeLinkedText(
  value: string,
  {
    basePath,
    onEntryNavigate,
    typeIndex,
  }: {
    basePath: string;
    onEntryNavigate?: EntryNavigationHandler;
    typeIndex: Record<string, TypeReferenceTarget>;
  },
) {
  const typeNames = Object.keys(typeIndex);

  if (typeNames.length === 0 || !value) {
    return [value];
  }

  const pattern = new RegExp(
    `(^|[^A-Za-z0-9_])(${typeNames
      .sort((left, right) => right.length - left.length)
      .map(escapeRegExp)
      .join("|")})(?=$|[^A-Za-z0-9_])`,
    "g",
  );
  const nodes: ReactNode[] = [];
  let cursor = 0;
  let matchIndex = 0;

  for (const match of value.matchAll(pattern)) {
    const fullMatchIndex = match.index ?? 0;
    const leadingText = match[1] ?? "";
    const typeName = match[2] ?? "";
    const typeNameStart = fullMatchIndex + leadingText.length;
    const target = typeIndex[typeName];

    if (typeNameStart > cursor) {
      nodes.push(value.slice(cursor, typeNameStart));
    }

    if (!target) {
      nodes.push(typeName);
    } else {
      nodes.push(
        <a
          key={`type-link-${typeName}-${matchIndex}`}
          href={getEntryHref(basePath, target.conceptId, target.id)}
          className="type-inline-link"
          onClick={(event) => onEntryNavigate?.(event, target.conceptId, target.id)}
        >
          {typeName}
        </a>,
      );
    }

    cursor = typeNameStart + typeName.length;
    matchIndex += 1;
  }

  if (cursor < value.length) {
    nodes.push(value.slice(cursor));
  }

  return nodes;
}

function TypeLinkedCode({
  content,
  basePath,
  onEntryNavigate,
  typeIndex,
}: {
  content: string;
  basePath: string;
  onEntryNavigate?: EntryNavigationHandler;
  typeIndex: Record<string, TypeReferenceTarget>;
}) {
  return (
    <code>
      {renderTypeLinkedText(stripWrappingBackticks(content), {
        basePath,
        onEntryNavigate,
        typeIndex,
      })}
    </code>
  );
}

function shouldLinkTypesInFieldList(label: string) {
  const normalizedLabel = normalizeFieldLabel(label);

  return normalizedLabel === "parameters" || normalizedLabel === "fields";
}

function parseTypedListItem(item: string) {
  const trimmedItem = item.trim();
  const separatorIndex = trimmedItem.indexOf(":");

  if (separatorIndex === -1) {
    return null;
  }

  const name = trimmedItem.slice(0, separatorIndex).trim();
  const remainder = trimmedItem.slice(separatorIndex + 1).trim();
  const descriptionSeparatorIndex = remainder.indexOf(" - ");
  const typeText =
    descriptionSeparatorIndex === -1
      ? remainder
      : remainder.slice(0, descriptionSeparatorIndex).trim();
  const description =
    descriptionSeparatorIndex === -1
      ? ""
      : remainder.slice(descriptionSeparatorIndex + 3).trim();

  if (!name || !typeText) {
    return null;
  }

  return {
    name,
    typeText,
    description,
  };
}

function TypedFieldListItem({
  item,
  basePath,
  onEntryNavigate,
  typeIndex,
}: {
  item: string;
  basePath: string;
  onEntryNavigate?: EntryNavigationHandler;
  typeIndex: Record<string, TypeReferenceTarget>;
}) {
  const parsedItem = parseTypedListItem(item);

  if (!parsedItem) {
    return <InlineMarkdown content={item} />;
  }

  return (
    <>
      <InlineMarkdown content={parsedItem.name} />
      {": "}
      <TypeLinkedCode
        content={parsedItem.typeText}
        basePath={basePath}
        onEntryNavigate={onEntryNavigate}
        typeIndex={typeIndex}
      />
      {parsedItem.description ? (
        <>
          {" - "}
          <InlineMarkdown content={parsedItem.description} />
        </>
      ) : null}
    </>
  );
}

function FunctionFieldValue({
  field,
  basePath,
  onEntryNavigate,
  typeIndex,
}: {
  field: FunctionField;
  basePath: string;
  onEntryNavigate?: EntryNavigationHandler;
  typeIndex: Record<string, TypeReferenceTarget>;
}) {
  const hasMultilineValue = field.value.includes("\n");

  return (
    <>
      {field.value ? (
        hasMultilineValue ? (
          <div className="function-field-rich-text">
            <MarkdownContent content={field.value} />
          </div>
        ) : (
          <p className="function-field-inline">
            <InlineMarkdown content={field.value} />
          </p>
        )
      ) : null}

      {field.items.length > 0 ? (
        <ul className="function-field-list">
          {field.items.map((item, index) => (
            <li key={`${field.label}-${item}-${index}`}>
              {shouldLinkTypesInFieldList(field.label) ? (
                <TypedFieldListItem
                  item={item}
                  basePath={basePath}
                  onEntryNavigate={onEntryNavigate}
                  typeIndex={typeIndex}
                />
              ) : (
                <InlineMarkdown content={item} />
              )}
            </li>
          ))}
        </ul>
      ) : null}
    </>
  );
}

export function FunctionReferenceCard({
  functionReference,
  basePath,
  onEntryNavigate,
  typeIndex,
}: {
  functionReference: ConceptFunction;
  basePath: string;
  onEntryNavigate?: EntryNavigationHandler;
  typeIndex: Record<string, TypeReferenceTarget>;
}) {
  const detailFields = functionReference.fields.filter((field) => !isPrimaryFunctionField(field));

  return (
    <article id={functionReference.id} className="function-reference-card">
      <header className="function-reference-header">
        <p className="function-reference-eyebrow">{functionReference.kind}</p>

        <div className="function-reference-title-row">
          <h4 className="function-reference-title">
            <code>{functionReference.name}</code>
          </h4>
        </div>

        {functionReference.signature ? (
          <p className="function-reference-signature">
            <TypeLinkedCode
              content={functionReference.signature}
              basePath={basePath}
              onEntryNavigate={onEntryNavigate}
              typeIndex={typeIndex}
            />
          </p>
        ) : null}

        {functionReference.description ? (
          <p className="function-reference-description">
            <InlineMarkdown content={functionReference.description} />
          </p>
        ) : null}
      </header>

      {detailFields.length > 0 ? (
        <dl className="function-reference-fields">
          {detailFields.map((field) => (
            <div key={`${functionReference.id}-${field.label}`} className="function-reference-field">
              <dt>{field.label}</dt>
              <dd>
                <FunctionFieldValue
                  field={field}
                  basePath={basePath}
                  onEntryNavigate={onEntryNavigate}
                  typeIndex={typeIndex}
                />
              </dd>
            </div>
          ))}
        </dl>
      ) : null}
    </article>
  );
}

export function TypeReferenceCard({
  typeReference,
  basePath,
  onEntryNavigate,
  typeIndex,
}: {
  typeReference: ConceptType;
  basePath: string;
  onEntryNavigate?: EntryNavigationHandler;
  typeIndex: Record<string, TypeReferenceTarget>;
}) {
  const detailFields = typeReference.fields.filter((field) => !isPrimaryTypeField(field));

  return (
    <article id={typeReference.id} className="function-reference-card type-reference-card">
      <header className="function-reference-header">
        <p className="function-reference-eyebrow">{typeReference.kind || "type"}</p>

        <div className="function-reference-title-row">
          <h4 className="function-reference-title">
            <code>{typeReference.name}</code>
          </h4>
        </div>

        {typeReference.definition ? (
          <p className="function-reference-signature">
            <TypeLinkedCode
              content={typeReference.definition}
              basePath={basePath}
              onEntryNavigate={onEntryNavigate}
              typeIndex={typeIndex}
            />
          </p>
        ) : null}

        {typeReference.description ? (
          <p className="function-reference-description">
            <InlineMarkdown content={typeReference.description} />
          </p>
        ) : null}
      </header>

      {detailFields.length > 0 ? (
        <dl className="function-reference-fields">
          {detailFields.map((field) => (
            <div key={`${typeReference.id}-${field.label}`} className="function-reference-field">
              <dt>{field.label}</dt>
              <dd>
                <FunctionFieldValue
                  field={field}
                  basePath={basePath}
                  onEntryNavigate={onEntryNavigate}
                  typeIndex={typeIndex}
                />
              </dd>
            </div>
          ))}
        </dl>
      ) : null}
    </article>
  );
}

export function FunctionReferenceSection({
  functions,
  basePath,
  onEntryNavigate,
  typeIndex,
}: {
  functions: ConceptFunction[];
  basePath: string;
  onEntryNavigate?: EntryNavigationHandler;
  typeIndex: Record<string, TypeReferenceTarget>;
}) {
  if (functions.length === 0) {
    return null;
  }

  return (
    <section className="function-reference-section">
      <div className="function-reference-list">
        {functions.map((functionReference) => (
          <FunctionReferenceCard
            key={functionReference.id}
            functionReference={functionReference}
            basePath={basePath}
            onEntryNavigate={onEntryNavigate}
            typeIndex={typeIndex}
          />
        ))}
      </div>
    </section>
  );
}

export function TypeReferenceSection({
  types,
  basePath,
  onEntryNavigate,
  typeIndex,
}: {
  types: ConceptType[];
  basePath: string;
  onEntryNavigate?: EntryNavigationHandler;
  typeIndex: Record<string, TypeReferenceTarget>;
}) {
  if (types.length === 0) {
    return null;
  }

  return (
    <section className="function-reference-section">
      <div className="function-reference-list">
        {types.map((typeReference) => (
          <TypeReferenceCard
            key={typeReference.id}
            typeReference={typeReference}
            basePath={basePath}
            onEntryNavigate={onEntryNavigate}
            typeIndex={typeIndex}
          />
        ))}
      </div>
    </section>
  );
}
