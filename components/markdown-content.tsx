import { Check, Copy } from "lucide-react";
import React, { useEffect, useState } from "react";

type ListItem = {
  text: string;
};

async function copyTextToClipboard(value: string) {
  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }

  if (typeof document === "undefined") {
    throw new Error("Clipboard is unavailable.");
  }

  const textArea = document.createElement("textarea");
  textArea.value = value;
  textArea.setAttribute("readonly", "");
  textArea.style.position = "fixed";
  textArea.style.opacity = "0";
  textArea.style.pointerEvents = "none";
  document.body.append(textArea);
  textArea.select();

  const execCommand = (document as Document & {
    "execCommand"?: (command: string) => boolean;
  })["execCommand"];
  const didCopy = execCommand?.call(document, "copy") ?? false;
  document.body.removeChild(textArea);

  if (!didCopy) {
    throw new Error("Copy failed.");
  }
}

function CodeBlock({
  code,
  language,
}: {
  code: string;
  language: string;
}) {
  const [copied, setCopied] = useState(false);
  const languageLabel = language.trim();

  useEffect(() => {
    if (!copied) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setCopied(false);
    }, 1800);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [copied]);

  const handleCopy = async () => {
    try {
      await copyTextToClipboard(code);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="code-block">
      <div className="code-block-header">
        <span className="code-block-language" aria-hidden={languageLabel ? undefined : true}>
          {languageLabel || "\u00a0"}
        </span>
        <button
          type="button"
          className="code-copy-button"
          aria-label={copied ? "Code copied" : "Copy code"}
          title={copied ? "Code copied" : "Copy code"}
          onClick={handleCopy}
        >
          {copied ? <Check size={15} strokeWidth={2.2} /> : <Copy size={15} strokeWidth={2.1} />}
        </button>
      </div>
      <pre data-language={language || undefined}>
        <code>{code}</code>
      </pre>
    </div>
  );
}

function renderInline(value: string) {
  const segments = value.split(/(`[^`]+`)/g);

  return segments.map((segment, index) => {
    if (segment.startsWith("`") && segment.endsWith("`")) {
      return <code key={`${segment}-${index}`}>{segment.slice(1, -1)}</code>;
    }

    const strongSegments = segment.split(/(\*\*[^*]+\*\*)/g);

    return strongSegments.map((strongSegment, strongIndex) => {
      if (strongSegment.startsWith("**") && strongSegment.endsWith("**")) {
        return <strong key={`${strongSegment}-${strongIndex}`}>{strongSegment.slice(2, -2)}</strong>;
      }

      return <React.Fragment key={`${strongSegment}-${strongIndex}`}>{strongSegment}</React.Fragment>;
    });
  });
}

export function MarkdownContent({ content }: { content: string }) {
  const lines = content.replace(/\r\n/g, "\n").split("\n");
  const nodes: React.ReactNode[] = [];
  let paragraphLines: string[] = [];
  let listItems: ListItem[] = [];
  let listType: "ul" | "ol" | null = null;
  let orderedListStart: number | null = null;
  let isInCodeBlock = false;
  let codeLanguage = "";
  let codeLines: string[] = [];

  const flushParagraph = () => {
    if (paragraphLines.length === 0) {
      return;
    }

    nodes.push(
      <p key={`paragraph-${nodes.length}`}>{renderInline(paragraphLines.join(" "))}</p>,
    );
    paragraphLines = [];
  };

  const flushList = () => {
    if (listItems.length === 0 || !listType) {
      return;
    }

    const listNode =
      listType === "ul" ? (
        <ul key={`list-${nodes.length}`}>
          {listItems.map((item, index) => (
            <li key={`${item.text}-${index}`}>{renderInline(item.text)}</li>
          ))}
        </ul>
      ) : (
        <ol key={`list-${nodes.length}`} start={orderedListStart ?? undefined}>
          {listItems.map((item, index) => (
            <li key={`${item.text}-${index}`}>{renderInline(item.text)}</li>
          ))}
        </ol>
      );

    nodes.push(listNode);
    listItems = [];
    listType = null;
    orderedListStart = null;
  };

  const flushCode = () => {
    const code = codeLines.join("\n");

    nodes.push(
      <CodeBlock
        key={`code-${nodes.length}`}
        code={code}
        language={codeLanguage}
      />,
    );
    codeLines = [];
    codeLanguage = "";
  };

  const appendListContinuation = (line: string) => {
    if (!listType || listItems.length === 0) {
      return false;
    }

    if (!/^\s+/.test(line)) {
      return false;
    }

    listItems[listItems.length - 1] = {
      text: `${listItems[listItems.length - 1].text} ${line.trim()}`,
    };
    return true;
  };

  for (const line of lines) {
    if (line.startsWith("```")) {
      flushParagraph();
      flushList();

      if (isInCodeBlock) {
        flushCode();
        isInCodeBlock = false;
      } else {
        isInCodeBlock = true;
        codeLanguage = line.slice(3).trim();
      }

      continue;
    }

    if (isInCodeBlock) {
      codeLines.push(line);
      continue;
    }

    if (line.trim() === "") {
      flushParagraph();
      flushList();
      continue;
    }

    if (line.startsWith("#### ")) {
      flushParagraph();
      flushList();
      nodes.push(<h4 key={`h4-${nodes.length}`}>{renderInline(line.slice(5).trim())}</h4>);
      continue;
    }

    if (line.startsWith("### ")) {
      flushParagraph();
      flushList();
      nodes.push(<h3 key={`h3-${nodes.length}`}>{renderInline(line.slice(4).trim())}</h3>);
      continue;
    }

    if (line.startsWith("> ")) {
      flushParagraph();
      flushList();
      nodes.push(
        <blockquote key={`blockquote-${nodes.length}`}>{renderInline(line.slice(2).trim())}</blockquote>,
      );
      continue;
    }

    const unorderedMatch = /^[-*]\s+(.*)$/.exec(line);
    if (unorderedMatch) {
      flushParagraph();
      if (listType && listType !== "ul") {
        flushList();
      }
      listType = "ul";
      listItems.push({ text: unorderedMatch[1] });
      continue;
    }

    const orderedMatch = /^(\d+)\.\s+(.*)$/.exec(line);
    if (orderedMatch) {
      flushParagraph();
      if (listType && listType !== "ol") {
        flushList();
      }
      const itemNumber = Number.parseInt(orderedMatch[1], 10);
      listType = "ol";
      if (listItems.length === 0) {
        orderedListStart = itemNumber;
      }
      listItems.push({ text: orderedMatch[2] });
      continue;
    }

    if (appendListContinuation(line)) {
      continue;
    }

    paragraphLines.push(line.trim());
  }

  flushParagraph();
  flushList();

  if (codeLines.length > 0) {
    flushCode();
  }

  return <>{nodes}</>;
}
