import type { ConceptContentBlock, ConceptFunction, FunctionField } from "../lib/knowledge-file";
import { InlineMarkdown, MarkdownContent } from "./markdown-content";

function normalizeFieldLabel(value: string) {
  return value.trim().toLowerCase();
}

function isPrimaryFunctionField(field: FunctionField) {
  const normalizedLabel = normalizeFieldLabel(field.label);

  return normalizedLabel === "kind" || normalizedLabel === "signature" || normalizedLabel === "purpose";
}

function FunctionFieldValue({ field }: { field: FunctionField }) {
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
              <InlineMarkdown content={item} />
            </li>
          ))}
        </ul>
      ) : null}
    </>
  );
}

export function FunctionReferenceCard({
  functionReference,
}: {
  functionReference: ConceptFunction;
}) {
  const detailFields = functionReference.fields.filter((field) => !isPrimaryFunctionField(field));

  return (
    <article id={functionReference.id} className="function-reference-card">
      <header className="function-reference-header">
        <p className="function-reference-eyebrow">Function Reference</p>

        <div className="function-reference-title-row">
          <h4 className="function-reference-title">
            <code>{functionReference.name}</code>
          </h4>

          {functionReference.kind ? (
            <span className="function-kind-pill">{functionReference.kind}</span>
          ) : null}
        </div>

        {functionReference.signature ? (
          <p className="function-reference-signature">
            <code>{functionReference.signature}</code>
          </p>
        ) : null}

        {functionReference.purpose ? (
          <p className="function-reference-purpose">
            <InlineMarkdown content={functionReference.purpose} />
          </p>
        ) : null}
      </header>

      {detailFields.length > 0 ? (
        <dl className="function-reference-fields">
          {detailFields.map((field) => (
            <div key={`${functionReference.id}-${field.label}`} className="function-reference-field">
              <dt>{field.label}</dt>
              <dd>
                <FunctionFieldValue field={field} />
              </dd>
            </div>
          ))}
        </dl>
      ) : null}
    </article>
  );
}

export function FunctionReferenceSection({
  block,
}: {
  block: Extract<ConceptContentBlock, { type: "functions" }>;
}) {
  if (block.functions.length === 0) {
    return null;
  }

  return (
    <section className="function-reference-section">
      <h3>{block.title}</h3>

      {block.intro ? <MarkdownContent content={block.intro} /> : null}

      <div className="function-reference-list">
        {block.functions.map((functionReference) => (
          <FunctionReferenceCard
            key={functionReference.id}
            functionReference={functionReference}
          />
        ))}
      </div>
    </section>
  );
}
