import { ChevronDown, Menu, Search, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { MarkdownContent } from "./markdown-content";
import type { KnowledgeDocument } from "../lib/knowledge-file";

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
    concept.content,
  ]
    .join("\n")
    .toLowerCase();

  return haystack.includes(query);
}

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
  const searchInputRef = useRef<HTMLInputElement>(null);
  const selectedConcept = knowledgeDocument.conceptsById[selectedConceptId ?? ""] ?? knowledgeDocument.concepts[0];
  const selectedCategorySlug = selectedConcept?.categorySlug;
  const query = normalize(search);
  const searchResults = knowledgeDocument.concepts.filter((concept) => conceptMatchesSearch(concept, query));
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

  const openSearch = () => {
    setIsSidebarOpen(false);
    setIsSearchOpen(true);
  };

  const closeSearch = () => {
    setIsSearchOpen(false);
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
                <span className="gray">Powered by</span> Neenja
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
              aria-label="Search concepts"
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
                        {category.concepts.map((concept) => (
                          <a
                            key={concept.id}
                            href={getConceptHref(basePath, concept.id)}
                            className={selectedConcept?.id === concept.id ? "concept-item-link active" : "concept-item-link"}
                            onClick={() => setIsSidebarOpen(false)}
                          >
                            <span className="concept-link-title">{concept.title}</span>
                          </a>
                        ))}
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
                <MarkdownContent content={selectedConcept.content} />
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
            aria-label="Search concepts"
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
                  placeholder="Search"
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

            <div className="search-dialog-results" aria-label="Matching concepts">
              {searchResults.length > 0 ? (
                searchResults.map((concept) => (
                  <a
                    key={concept.id}
                    href={getConceptHref(basePath, concept.id)}
                    className={selectedConcept?.id === concept.id ? "search-result-card active" : "search-result-card"}
                    onClick={closeSearch}
                  >
                    <span className="search-result-eyebrow">{concept.category}</span>
                    <strong className="search-result-title">{concept.title}</strong>
                    <span className="search-result-summary">{concept.summary || "Open this concept to inspect the details."}</span>
                  </a>
                ))
              ) : (
                <p className="empty-state">No concepts match this search yet.</p>
              )}
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}
