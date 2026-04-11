import { ChevronDown, Menu, Search, X } from "lucide-react";
import type { MouseEvent } from "react";
import { useEffect, useRef, useState } from "react";
import { FunctionReferenceSection } from "./function-reference";
import { MarkdownContent } from "./markdown-content";
import type { KnowledgeDocument } from "../lib/knowledge-file";

const pendingFunctionScrollStorageKey = "neenja-pending-function-scroll";
const scrollNavigationKeys = new Set([
  "ArrowDown",
  "ArrowUp",
  "PageDown",
  "PageUp",
  "Home",
  "End",
  " ",
  "Spacebar",
]);

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

function getFunctionHref(basePath: string, conceptId: string, functionId: string) {
  return `${getConceptHref(basePath, conceptId)}#${functionId}`;
}

function normalize(value: string) {
  return value.trim().toLowerCase();
}

function conceptMatchesSearch(concept: KnowledgeDocument["concepts"][number], query: string) {
  if (!query) {
    return true;
  }

  const haystack = [
    concept.title,
    concept.category,
    concept.summary,
    concept.tags.join(" "),
    concept.related.join(" "),
    concept.contentBlocks
      .filter((block) => block.type === "markdown")
      .map((block) => block.content)
      .join("\n"),
  ]
    .join("\n")
    .toLowerCase();

  return haystack.includes(query);
}

function functionMatchesSearch(
  concept: KnowledgeDocument["concepts"][number],
  functionReference: KnowledgeDocument["concepts"][number]["functions"][number],
  query: string,
) {
  if (!query) {
    return false;
  }

  const haystack = [
    concept.title,
    concept.category,
    functionReference.name,
    functionReference.kind,
    functionReference.signature,
    functionReference.purpose,
    functionReference.parameters.join(" "),
    functionReference.returns,
    functionReference.sideEffects,
    functionReference.errors,
    functionReference.relatedFiles.join(" "),
    functionReference.fields
      .map((field) => [field.label, field.value, field.items.join(" ")].filter(Boolean).join(" "))
      .join("\n"),
  ]
    .join("\n")
    .toLowerCase();

  return haystack.includes(query);
}

type FunctionSearchResult = {
  concept: KnowledgeDocument["concepts"][number];
  functionReference: KnowledgeDocument["concepts"][number]["functions"][number];
};

function ExpandableText({
  text,
  className,
}: {
  text: string;
  className: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const [showToggle, setShowToggle] = useState(false);
  const textRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    if (expanded) {
      return;
    }

    const node = textRef.current;

    if (!node) {
      return;
    }

    const checkOverflow = () => {
      setShowToggle(node.scrollHeight > node.clientHeight + 1);
    };

    checkOverflow();

    const observer = new ResizeObserver(checkOverflow);
    observer.observe(node);
    window.addEventListener("resize", checkOverflow);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", checkOverflow);
    };
  }, [expanded, text]);

  return (
    <div className="expandable-copy">
      <p ref={textRef} className={`${className} ${expanded ? "" : "is-clamped"}`.trim()}>
        {text}
      </p>
      {showToggle ? (
        <button
          type="button"
          className="inline-toggle"
          onClick={() => setExpanded((current) => !current)}
        >
          {expanded ? "Show less" : "Read more"}
        </button>
      ) : null}
    </div>
  );
}

export function DocsShell({
  document: knowledgeDocument,
  selectedConceptId,
  homeHref = "/",
  basePath = "/",
  brandIconSrc = "/brand/neenja.svg",
}: {
  document: KnowledgeDocument;
  selectedConceptId?: string;
  homeHref?: string;
  basePath?: string;
  brandIconSrc?: string;
}) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [activeFunctionId, setActiveFunctionId] = useState("");
  const [isFunctionItemLinkActiveDismissed, setIsFunctionItemLinkActiveDismissed] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const dismissFunctionItemLinkOnUserScrollRef = useRef(false);
  const pointerScrollCandidateRef = useRef(false);
  const selectedConcept = knowledgeDocument.conceptsById[selectedConceptId ?? ""] ?? knowledgeDocument.concepts[0];
  const selectedCategorySlug = selectedConcept?.categorySlug;
  const query = normalize(search);
  const conceptSearchResults = knowledgeDocument.concepts.filter((concept) => conceptMatchesSearch(concept, query));
  const functionSearchResults: FunctionSearchResult[] = query
    ? knowledgeDocument.concepts.flatMap((concept) =>
        concept.functions
          .filter((functionReference) => functionMatchesSearch(concept, functionReference, query))
          .map((functionReference) => ({
            concept,
            functionReference,
          })),
      )
    : [];
  const [openCategories, setOpenCategories] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(
      knowledgeDocument.categories.map((category) => [category.slug, category.slug === selectedCategorySlug]),
    ),
  );

  useEffect(() => {
    if (!selectedCategorySlug) {
      return;
    }

    setOpenCategories((current) => ({
      ...current,
      [selectedCategorySlug]: true,
    }));
  }, [selectedCategorySlug]);

  useEffect(() => {
    setIsSidebarOpen(false);
    setIsSearchOpen(false);
  }, [selectedConceptId]);

  useEffect(() => {
    if (!isSearchOpen) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      searchInputRef.current?.focus();
    }, 80);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [isSearchOpen]);

  useEffect(() => {
    if (!isSearchOpen && !isSidebarOpen) {
      return;
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") {
        return;
      }

      setIsSearchOpen(false);
      setIsSidebarOpen(false);
    };

    const previousOverflow = window.document.body.style.overflow;
    window.document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleEscape);

    return () => {
      window.document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleEscape);
    };
  }, [isSearchOpen, isSidebarOpen]);

  useEffect(() => {
    const syncHash = () => {
      const nextFunctionId = window.location.hash.replace(/^#/, "");
      setActiveFunctionId(nextFunctionId);

      if (nextFunctionId) {
        dismissFunctionItemLinkOnUserScrollRef.current = true;
        pointerScrollCandidateRef.current = false;
        setIsFunctionItemLinkActiveDismissed(false);
      } else {
        dismissFunctionItemLinkOnUserScrollRef.current = false;
        pointerScrollCandidateRef.current = false;
        setIsFunctionItemLinkActiveDismissed(false);
      }
    };

    syncHash();
    window.addEventListener("hashchange", syncHash);

    return () => {
      window.removeEventListener("hashchange", syncHash);
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const dismissFunctionItemLinkActive = () => {
      if (!dismissFunctionItemLinkOnUserScrollRef.current) {
        return;
      }

      dismissFunctionItemLinkOnUserScrollRef.current = false;
      pointerScrollCandidateRef.current = false;
      setIsFunctionItemLinkActiveDismissed(true);
    };

    const handleWheel = () => {
      dismissFunctionItemLinkActive();
    };

    const handleTouchMove = () => {
      dismissFunctionItemLinkActive();
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (!scrollNavigationKeys.has(event.key)) {
        return;
      }

      dismissFunctionItemLinkActive();
    };

    const handlePointerDown = (event: PointerEvent) => {
      if (!dismissFunctionItemLinkOnUserScrollRef.current || event.pointerType !== "mouse") {
        return;
      }

      pointerScrollCandidateRef.current = true;
    };

    const clearPointerScrollCandidate = () => {
      pointerScrollCandidateRef.current = false;
    };

    const handleScroll = () => {
      if (!pointerScrollCandidateRef.current) {
        return;
      }

      dismissFunctionItemLinkActive();
    };

    window.addEventListener("wheel", handleWheel, { passive: true });
    window.addEventListener("touchmove", handleTouchMove, { passive: true });
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("pointerdown", handlePointerDown, { passive: true });
    window.addEventListener("pointerup", clearPointerScrollCandidate, { passive: true });
    window.addEventListener("pointercancel", clearPointerScrollCandidate, { passive: true });
    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      window.removeEventListener("wheel", handleWheel);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("pointerup", clearPointerScrollCandidate);
      window.removeEventListener("pointercancel", clearPointerScrollCandidate);
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const pendingRaw = window.sessionStorage.getItem(pendingFunctionScrollStorageKey);

    if (!pendingRaw) {
      return;
    }

    let pending: { pathname?: string; functionId?: string } | null = null;

    try {
      pending = JSON.parse(pendingRaw) as { pathname?: string; functionId?: string };
    } catch {
      window.sessionStorage.removeItem(pendingFunctionScrollStorageKey);
      return;
    }

    if (!pending?.pathname || !pending.functionId || pending.pathname !== window.location.pathname) {
      return;
    }

    window.sessionStorage.removeItem(pendingFunctionScrollStorageKey);

    const frameId = window.requestAnimationFrame(() => {
      const target = window.document.getElementById(pending.functionId ?? "");

      if (!target) {
        return;
      }

      target.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });

      window.history.replaceState(
        window.history.state,
        "",
        `${window.location.pathname}${window.location.search}#${pending.functionId}`,
      );
      setActiveFunctionId(pending.functionId ?? "");
      setIsFunctionItemLinkActiveDismissed(false);
      dismissFunctionItemLinkOnUserScrollRef.current = true;
    });

    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, [selectedConcept?.id]);

  const openSearch = () => {
    setIsSidebarOpen(false);
    setIsSearchOpen(true);
  };

  const closeSearch = () => {
    setIsSearchOpen(false);
  };

  const handleFunctionNavigation = (
    event: MouseEvent<HTMLAnchorElement>,
    conceptId: string,
    functionId: string,
  ) => {
    if (typeof window === "undefined") {
      return;
    }

    event.preventDefault();

    const conceptHref = getConceptHref(basePath, conceptId);
    const functionHref = getFunctionHref(basePath, conceptId, functionId);

    setIsSidebarOpen(false);
    setIsSearchOpen(false);

    if (window.location.pathname === conceptHref) {
      const target = window.document.getElementById(functionId);

      if (!target) {
        window.location.assign(functionHref);
        return;
      }

      target.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });

      window.history.pushState(window.history.state, "", functionHref);
      setActiveFunctionId(functionId);
      setIsFunctionItemLinkActiveDismissed(false);
      dismissFunctionItemLinkOnUserScrollRef.current = true;
      return;
    }

    window.sessionStorage.setItem(
      pendingFunctionScrollStorageKey,
      JSON.stringify({
        pathname: conceptHref,
        functionId,
      }),
    );

    window.location.assign(conceptHref);
  };

  return (
    <>
      <header className="site-header docs-header">
        <div className="docs-header-inner">
          <div className="docs-header-left">
            <button
              type="button"
              className="icon-button nav-toggle"
              aria-label="Open navigation"
              aria-expanded={isSidebarOpen}
              onClick={() => setIsSidebarOpen((current) => !current)}
            >
              <Menu size={18} />
            </button>

            <span className="brand-mark" aria-hidden="true">
              <img className="brand-mark-icon-image" src={brandIconSrc} alt="" />
            </span>

            <div className="brand-copy">
              <p className="eyebrow">
                <span className="gray">Powered by</span> <a href="https://github.com/MesonWarrior/Neenja">Neenja</a>
              </p>
              <a href={homeHref} className="brand-link">
                {knowledgeDocument.meta.title}
              </a>
            </div>
          </div>

          <div className="docs-header-right">
            <button
              type="button"
              className="search-trigger desktop-search-trigger"
              onClick={openSearch}
              aria-haspopup="dialog"
              aria-expanded={isSearchOpen}
            >
              <Search size={16} />
              <span>Search</span>
            </button>

            <button
              type="button"
              className="icon-button mobile-search-trigger"
              onClick={openSearch}
              aria-label="Search concepts and functions"
              aria-haspopup="dialog"
              aria-expanded={isSearchOpen}
            >
              <Search size={18} />
            </button>
          </div>
        </div>
      </header>

      <div className="docs-layout">
        <div
          className={isSidebarOpen ? "sidebar-backdrop visible" : "sidebar-backdrop"}
          aria-hidden="true"
          onClick={() => setIsSidebarOpen(false)}
        />

        <aside className={isSidebarOpen ? "sidebar open" : "sidebar"}>
          <section className="sidebar-panel hero-panel">
            <p className="eyebrow">Description</p>
            <ExpandableText text={knowledgeDocument.meta.summary} className="hero-copy" />
            <p className="updated">Updated: {knowledgeDocument.meta.updated}</p>
          </section>

          <section className="concept-list-panel" aria-label="Navigation">
            {knowledgeDocument.categories.map((category) => {
              const isOpen = Boolean(openCategories[category.slug]);

              return (
                <div key={category.name} className="category-group">
                  <button
                    type="button"
                    className="category-toggle"
                    aria-expanded={isOpen}
                    onClick={() =>
                      setOpenCategories((current) => ({
                        ...current,
                        [category.slug]: !current[category.slug],
                      }))
                    }
                  >
                    <span className="category-toggle-content">
                      <span className="category-heading-title">{category.name}</span>
                    </span>
                    <ChevronDown
                      size={16}
                      className={isOpen ? "category-toggle-icon open" : "category-toggle-icon"}
                      aria-hidden="true"
                    />
                  </button>

                  {isOpen ? (
                    category.concepts.length > 0 ? (
                      <div className="concept-sublist" aria-label={`${category.name} concepts`}>
                        {category.concepts.map((concept) => {
                          const isConceptActive = selectedConcept?.id === concept.id;

                          return (
                            <div key={concept.id} className="concept-tree-item">
                              <a
                                href={getConceptHref(basePath, concept.id)}
                                className={isConceptActive ? "concept-item-link active" : "concept-item-link"}
                                onClick={() => setIsSidebarOpen(false)}
                              >
                                <span className="concept-link-title">{concept.title}</span>
                              </a>

                              {concept.functions.length > 0 ? (
                                <div className="concept-function-sublist" aria-label={`${concept.title} functions`}>
                                  {concept.functions.map((functionReference) => (
                                    <a
                                      key={functionReference.id}
                                      href={getFunctionHref(basePath, concept.id, functionReference.id)}
                                      className={
                                        isConceptActive &&
                                        activeFunctionId === functionReference.id &&
                                        !isFunctionItemLinkActiveDismissed
                                          ? "function-item-link active"
                                          : "function-item-link"
                                      }
                                      onClick={(event) =>
                                        handleFunctionNavigation(event, concept.id, functionReference.id)
                                      }
                                    >
                                      <span className="function-link-title">
                                        <code>{functionReference.name}</code>
                                      </span>
                                    </a>
                                  ))}
                                </div>
                              ) : null}
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="concept-preview-empty">No concepts in this category yet.</p>
                    )
                  ) : null}
                </div>
              );
            })}
          </section>
        </aside>

        <section className="reader">
          {selectedConcept ? (
            <article className="reader-card">
              <header className="reader-header">
                <p className="eyebrow">{selectedConcept.category}</p>
                <h2>{selectedConcept.title}</h2>
                <p className="reader-summary">{selectedConcept.summary}</p>

                <div className="tag-row" aria-label="Tags">
                  {selectedConcept.tags.map((tag) => (
                    <span key={tag} className="tag-pill">
                      {tag}
                    </span>
                  ))}
                </div>

                <dl className="reader-meta">
                  <div>
                    <dt>Related</dt>
                    <dd>
                      {selectedConcept.related.length > 0 ? (
                        <span className="related-links">
                          {selectedConcept.related.map((relatedId) => {
                            const relatedConcept = knowledgeDocument.conceptsById[relatedId];

                            return relatedConcept ? (
                              <a key={relatedId} href={getConceptHref(basePath, relatedConcept.id)}>
                                {relatedConcept.title}
                              </a>
                            ) : (
                              <span key={relatedId}>{relatedId}</span>
                            );
                          })}
                        </span>
                      ) : (
                        "None"
                      )}
                    </dd>
                  </div>
                </dl>
              </header>

              <div className="reader-body">
                {selectedConcept.contentBlocks.map((block, index) =>
                  block.type === "markdown" ? (
                    <MarkdownContent
                      key={`${selectedConcept.id}-markdown-${index}`}
                      content={block.content}
                    />
                  ) : (
                    <FunctionReferenceSection
                      key={`${selectedConcept.id}-functions-${index}`}
                      block={block}
                    />
                  ),
                )}
              </div>
            </article>
          ) : (
            <section className="reader-card">
              <div className="reader-header">
                <h2>No concepts available</h2>
                <p className="reader-summary">
                  Add at least one `## Concept:` block to the knowledge file.
                </p>
              </div>
            </section>
          )}
        </section>
      </div>

      {isSearchOpen ? (
        <div className="search-dialog-layer" role="presentation">
          <button
            type="button"
            className="search-dialog-backdrop"
            aria-label="Close search"
            onClick={closeSearch}
          />

          <section
            className="search-dialog"
            role="dialog"
            aria-modal="true"
            aria-label="Search concepts and functions"
          >
            <div className="search-dialog-header">
              <div className="search-dialog-input-shell">
                <Search size={17} />
                <input
                  ref={searchInputRef}
                  className="search-dialog-input"
                  type="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search concepts and functions"
                />
              </div>

              <button
                type="button"
                className="icon-button"
                aria-label="Close search"
                onClick={closeSearch}
              >
                <X size={18} />
              </button>
            </div>

            <div className="search-dialog-results" aria-label="Matching concepts and functions">
              {functionSearchResults.length > 0 || conceptSearchResults.length > 0 ? (
                <>
                  {functionSearchResults.length > 0 ? (
                    <section className="search-results-group" aria-label="Matching functions">
                      <p className="search-results-heading">Functions</p>

                      {functionSearchResults.map(({ concept, functionReference }) => (
                        <a
                          key={`${concept.id}-${functionReference.id}`}
                          href={getFunctionHref(basePath, concept.id, functionReference.id)}
                          className={
                            selectedConcept?.id === concept.id && activeFunctionId === functionReference.id
                              ? "search-result-card active"
                              : "search-result-card"
                          }
                          onClick={(event) =>
                            handleFunctionNavigation(event, concept.id, functionReference.id)
                          }
                        >
                          <span className="search-result-eyebrow">{concept.category}</span>
                          <strong className="search-result-title">
                            <code className="search-result-code">{functionReference.name}</code>
                          </strong>
                          <span className="search-result-parent">{concept.title}</span>
                          <span className="search-result-summary">
                            {functionReference.purpose || functionReference.signature || "Open this function reference."}
                          </span>
                        </a>
                      ))}
                    </section>
                  ) : null}

                  {conceptSearchResults.length > 0 ? (
                    <section className="search-results-group" aria-label="Matching concepts">
                      {query ? <p className="search-results-heading">Concepts</p> : null}

                      {conceptSearchResults.map((concept) => (
                        <a
                          key={concept.id}
                          href={getConceptHref(basePath, concept.id)}
                          className={selectedConcept?.id === concept.id ? "search-result-card active" : "search-result-card"}
                          onClick={closeSearch}
                        >
                          <span className="search-result-eyebrow">{concept.category}</span>
                          <strong className="search-result-title">{concept.title}</strong>
                          <span className="search-result-summary">
                            {concept.summary || "Open this concept to inspect the details."}
                          </span>
                        </a>
                      ))}
                    </section>
                  ) : null}
                </>
              ) : (
                <p className="empty-state">No concepts or functions match this search yet.</p>
              )}
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}
