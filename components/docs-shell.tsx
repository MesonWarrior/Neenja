import type { MouseEvent } from "react";
import { useEffect, useRef, useState } from "react";
import { ChevronDown, LockKeyhole, Menu, Search, X } from "./icons";
import {
  FunctionReferenceSection,
  TypeReferenceSection,
} from "./function-reference";
import { InlineMarkdown, MarkdownContent } from "./markdown-content";
import type {
  Concept,
  ConceptFunction,
  ConceptType,
  DocumentCollection,
  FunctionField,
  KnowledgeDocument,
  PlanSection,
  ProjectPlanDocument,
  ReaderDocument,
} from "../lib/knowledge-file";

const pendingEntryScrollStorageKey = "neenja-pending-entry-scroll";
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

function getDocumentHref(basePath: string, documentSlug: string) {
  return joinPath(basePath, `/${documentSlug}/`);
}

function getDocumentEntryHref(basePath: string, documentSlug: string, entryId: string) {
  return joinPath(basePath, `/${documentSlug}/${entryId}/`);
}

function getStructuredEntryHref(
  basePath: string,
  documentSlug: string,
  conceptId: string,
  entryId: string,
) {
  return `${getDocumentEntryHref(basePath, documentSlug, conceptId)}#${entryId}`;
}

function normalize(value: string) {
  return value.trim().toLowerCase();
}

function isKnowledgeDocument(document: ReaderDocument): document is KnowledgeDocument {
  return document.kind === "documentation";
}

function isProjectPlanDocument(document: ReaderDocument): document is ProjectPlanDocument {
  return document.kind === "project-plan";
}

function getDocumentGroupKey(documentSlug: string, groupSlug: string) {
  return `${documentSlug}:${groupSlug}`;
}

function conceptMatchesSearch(concept: Concept, query: string) {
  if (!query) {
    return true;
  }

  const haystack = [
    concept.title,
    concept.category,
    concept.summary,
    concept.kind,
    concept.tags.join(" "),
    concept.related.join(" "),
    concept.contentBlocks.map((block) => block.content).join("\n"),
  ]
    .join("\n")
    .toLowerCase();

  return haystack.includes(query);
}

function functionMatchesSearch(
  concept: Concept,
  functionReference: ConceptFunction,
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
    functionReference.description,
    functionReference.parameters.join(" "),
    functionReference.fields
      .map((field) => [field.label, field.value, field.items.join(" ")].filter(Boolean).join(" "))
      .join("\n"),
  ]
    .join("\n")
    .toLowerCase();

  return haystack.includes(query);
}

function typeMatchesSearch(
  concept: Concept,
  typeReference: ConceptType,
  query: string,
) {
  if (!query) {
    return false;
  }

  const haystack = [
    concept.title,
    concept.category,
    typeReference.name,
    typeReference.kind,
    typeReference.definition,
    typeReference.description,
    typeReference.fields
      .map((field) => [field.label, field.value, field.items.join(" ")].filter(Boolean).join(" "))
      .join("\n"),
  ]
    .join("\n")
    .toLowerCase();

  return haystack.includes(query);
}

function planSectionMatchesSearch(section: PlanSection, query: string) {
  if (!query) {
    return true;
  }

  const haystack = [
    section.title,
    section.area,
    section.summary,
    section.fields
      .map((field) => [field.label, field.value, field.items.join(" ")].filter(Boolean).join(" "))
      .join("\n"),
    section.contentBlocks.map((block) => block.content).join("\n"),
  ]
    .join("\n")
    .toLowerCase();

  return haystack.includes(query);
}

type FunctionSearchResult = {
  concept: Concept;
  functionReference: ConceptFunction;
};

type TypeSearchResult = {
  concept: Concept;
  typeReference: ConceptType;
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

function PlanFieldValue({ field }: { field: FunctionField }) {
  const hasMultilineValue = field.value.includes("\n");

  return (
    <>
      {field.value ? (
        hasMultilineValue ? (
          <div className="plan-field-rich-text">
            <MarkdownContent content={field.value} />
          </div>
        ) : (
          <p className="plan-field-inline">
            <InlineMarkdown content={field.value} />
          </p>
        )
      ) : null}

      {field.items.length > 0 ? (
        <ul className="plan-field-list">
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

function PlanFields({ fields }: { fields: FunctionField[] }) {
  if (fields.length === 0) {
    return null;
  }

  return (
    <dl className="plan-fields">
      {fields.map((field) => (
        <div key={field.label} className="plan-field">
          <dt>{field.label}</dt>
          <dd>
            <PlanFieldValue field={field} />
          </dd>
        </div>
      ))}
    </dl>
  );
}

export function DocsShell({
  collection,
  selectedDocumentSlug,
  selectedEntryId,
  homeHref = "/",
  basePath = "/",
  brandIconSrc = "/brand/neenja.svg",
}: {
  collection: DocumentCollection;
  selectedDocumentSlug?: string;
  selectedEntryId?: string;
  homeHref?: string;
  basePath?: string;
  brandIconSrc?: string;
}) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [activeEntryId, setActiveEntryId] = useState("");
  const [isEntryItemLinkActiveDismissed, setIsEntryItemLinkActiveDismissed] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const dismissEntryItemLinkOnUserScrollRef = useRef(false);
  const pointerScrollCandidateRef = useRef(false);
  const activeDocument =
    collection.documentsBySlug[selectedDocumentSlug ?? ""] ?? collection.defaultDocument;
  const selectedConcept =
    isKnowledgeDocument(activeDocument)
      ? activeDocument.conceptsById[selectedEntryId ?? ""] ?? activeDocument.concepts[0]
      : undefined;
  const selectedPlanSection =
    isProjectPlanDocument(activeDocument)
      ? activeDocument.sectionsById[selectedEntryId ?? ""] ?? activeDocument.sections[0]
      : undefined;
  const visibleRelatedConcepts =
    isKnowledgeDocument(activeDocument) && selectedConcept
      ? selectedConcept.related
          .map((relatedId) => activeDocument.conceptsById[relatedId])
          .filter((relatedConcept): relatedConcept is Concept => Boolean(relatedConcept))
      : [];
  const selectedGroupSlug =
    selectedConcept?.categorySlug ?? selectedPlanSection?.areaSlug;
  const query = normalize(search);
  const documentationDocument = isKnowledgeDocument(activeDocument) ? activeDocument : undefined;
  const projectPlanDocument = isProjectPlanDocument(activeDocument) ? activeDocument : undefined;
  const conceptSearchResults = documentationDocument
    ? documentationDocument.concepts.filter((concept) => conceptMatchesSearch(concept, query))
    : [];
  const functionSearchResults: FunctionSearchResult[] =
    documentationDocument && query
      ? documentationDocument.concepts.flatMap((concept) =>
          concept.functions
            .filter((functionReference) => functionMatchesSearch(concept, functionReference, query))
            .map((functionReference) => ({
              concept,
              functionReference,
            })),
        )
      : [];
  const typeSearchResults: TypeSearchResult[] =
    documentationDocument && query
      ? documentationDocument.concepts.flatMap((concept) =>
          concept.types
            .filter((typeReference) => typeMatchesSearch(concept, typeReference, query))
            .map((typeReference) => ({
              concept,
              typeReference,
            })),
        )
      : [];
  const planSearchResults = projectPlanDocument
    ? projectPlanDocument.sections.filter((section) => planSectionMatchesSearch(section, query))
    : [];
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
    const groups = isKnowledgeDocument(activeDocument)
      ? activeDocument.categories
      : activeDocument.areas;

    return Object.fromEntries(
      groups.map((group) => [
        getDocumentGroupKey(activeDocument.slug, group.slug),
        group.slug === selectedGroupSlug,
      ]),
    );
  });

  useEffect(() => {
    if (!selectedGroupSlug) {
      return;
    }

    setOpenGroups((current) => ({
      ...current,
      [getDocumentGroupKey(activeDocument.slug, selectedGroupSlug)]: true,
    }));
  }, [activeDocument.slug, selectedGroupSlug]);

  useEffect(() => {
    setIsSidebarOpen(false);
    setIsSearchOpen(false);
    setSearch("");
  }, [selectedDocumentSlug, selectedEntryId]);

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
      const nextEntryId = window.location.hash.replace(/^#/, "");
      setActiveEntryId(nextEntryId);

      if (nextEntryId) {
        dismissEntryItemLinkOnUserScrollRef.current = true;
        pointerScrollCandidateRef.current = false;
        setIsEntryItemLinkActiveDismissed(false);
      } else {
        dismissEntryItemLinkOnUserScrollRef.current = false;
        pointerScrollCandidateRef.current = false;
        setIsEntryItemLinkActiveDismissed(false);
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

    const dismissEntryItemLinkActive = () => {
      if (!dismissEntryItemLinkOnUserScrollRef.current) {
        return;
      }

      dismissEntryItemLinkOnUserScrollRef.current = false;
      pointerScrollCandidateRef.current = false;
      setIsEntryItemLinkActiveDismissed(true);
    };

    const handleWheel = () => {
      dismissEntryItemLinkActive();
    };

    const handleTouchMove = () => {
      dismissEntryItemLinkActive();
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (!scrollNavigationKeys.has(event.key)) {
        return;
      }

      dismissEntryItemLinkActive();
    };

    const handlePointerDown = (event: PointerEvent) => {
      if (!dismissEntryItemLinkOnUserScrollRef.current || event.pointerType !== "mouse") {
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

      dismissEntryItemLinkActive();
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

    const pendingRaw = window.sessionStorage.getItem(pendingEntryScrollStorageKey);

    if (!pendingRaw) {
      return;
    }

    let pending: { pathname?: string; entryId?: string } | null = null;

    try {
      pending = JSON.parse(pendingRaw) as { pathname?: string; entryId?: string };
    } catch {
      window.sessionStorage.removeItem(pendingEntryScrollStorageKey);
      return;
    }

    if (!pending?.pathname || !pending.entryId || pending.pathname !== window.location.pathname) {
      return;
    }

    window.sessionStorage.removeItem(pendingEntryScrollStorageKey);

    const frameId = window.requestAnimationFrame(() => {
      const target = window.document.getElementById(pending?.entryId ?? "");

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
        `${window.location.pathname}${window.location.search}#${pending?.entryId}`,
      );
      setActiveEntryId(pending?.entryId ?? "");
      setIsEntryItemLinkActiveDismissed(false);
      dismissEntryItemLinkOnUserScrollRef.current = true;
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

  const handleStructuredEntryNavigation = (
    event: MouseEvent<HTMLAnchorElement>,
    conceptId: string,
    entryId: string,
  ) => {
    if (typeof window === "undefined") {
      return;
    }

    event.preventDefault();

    const conceptHref = getDocumentEntryHref(basePath, activeDocument.slug, conceptId);
    const entryHref = getStructuredEntryHref(basePath, activeDocument.slug, conceptId, entryId);

    setIsSidebarOpen(false);
    setIsSearchOpen(false);

    if (window.location.pathname === conceptHref) {
      const target = window.document.getElementById(entryId);

      if (!target) {
        window.location.assign(entryHref);
        return;
      }

      target.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });

      window.history.pushState(window.history.state, "", entryHref);
      setActiveEntryId(entryId);
      setIsEntryItemLinkActiveDismissed(false);
      dismissEntryItemLinkOnUserScrollRef.current = true;
      return;
    }

    window.sessionStorage.setItem(
      pendingEntryScrollStorageKey,
      JSON.stringify({
        pathname: conceptHref,
        entryId,
      }),
    );

    window.location.assign(conceptHref);
  };

  const hasSearchResults =
    functionSearchResults.length > 0 ||
    typeSearchResults.length > 0 ||
    conceptSearchResults.length > 0 ||
    planSearchResults.length > 0;

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
                <span className="gray">Powered by</span>{" "}
                <a href="https://github.com/MesonWarrior/Neenja">Neenja</a>
              </p>
              <a href={homeHref} className="brand-link">
                {activeDocument.meta.title}
              </a>
            </div>
          </div>

          <div className="docs-header-right">
            {collection.documents.length > 1 ? (
              <nav className="document-nav" aria-label="Documents">
                {collection.documents.map((document) => (
                  <a
                    key={document.slug}
                    href={getDocumentHref(basePath, document.slug)}
                    className={
                      document.slug === activeDocument.slug
                        ? "document-nav-link active"
                        : "document-nav-link"
                    }
                  >
                    {document.label}
                  </a>
                ))}
              </nav>
            ) : null}

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
              aria-label="Search current document"
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
            <ExpandableText text={activeDocument.meta.summary} className="hero-copy" />
            <p className="updated">Updated: {activeDocument.meta.updated}</p>
          </section>

          <section className="concept-list-panel" aria-label="Navigation">
            {isKnowledgeDocument(activeDocument)
              ? activeDocument.categories.map((category) => {
                  const groupKey = getDocumentGroupKey(activeDocument.slug, category.slug);
                  const isOpen = Boolean(openGroups[groupKey]);

                  return (
                    <div key={category.name} className="category-group">
                      <button
                        type="button"
                        className="category-toggle"
                        aria-expanded={isOpen}
                        onClick={() =>
                          setOpenGroups((current) => ({
                            ...current,
                            [groupKey]: !current[groupKey],
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
                              const isEntryConcept = concept.kind !== "concept";
                              const entryList =
                                concept.kind === "functions"
                                  ? concept.functions.map((functionReference) => ({
                                      id: functionReference.id,
                                      name: functionReference.name,
                                    }))
                                  : concept.kind === "types"
                                    ? concept.types.map((typeReference) => ({
                                        id: typeReference.id,
                                        name: typeReference.name,
                                      }))
                                    : [];

                              return (
                                <div key={concept.id} className="concept-tree-item">
                                  <a
                                    href={getDocumentEntryHref(basePath, activeDocument.slug, concept.id)}
                                    className={
                                      isConceptActive
                                        ? `concept-item-link active${isEntryConcept ? " special-concept-item-link" : ""}`
                                        : `concept-item-link${isEntryConcept ? " special-concept-item-link" : ""}`
                                    }
                                    onClick={() => setIsSidebarOpen(false)}
                                  >
                                    <span className="concept-link-title-row">
                                      <span className="concept-link-title">{concept.title}</span>
                                      <span className="concept-link-meta">
                                        {isEntryConcept ? (
                                          <span className="concept-link-kind">{concept.kind}</span>
                                        ) : null}
                                        {concept.privacy === "private" ? (
                                          <span
                                            className="concept-link-private-indicator"
                                            title="Private concept"
                                            aria-label="Private concept"
                                          >
                                            <LockKeyhole size={12} aria-hidden="true" />
                                          </span>
                                        ) : null}
                                      </span>
                                    </span>
                                  </a>

                                  {isConceptActive && entryList.length > 0 ? (
                                    <div
                                      className="concept-entry-sublist"
                                      aria-label={`${concept.title} ${concept.kind}`}
                                    >
                                      {entryList.map((entry) => (
                                        <a
                                          key={entry.id}
                                          href={getStructuredEntryHref(
                                            basePath,
                                            activeDocument.slug,
                                            concept.id,
                                            entry.id,
                                          )}
                                          className={
                                            activeEntryId === entry.id && !isEntryItemLinkActiveDismissed
                                              ? "entry-item-link active"
                                              : "entry-item-link"
                                          }
                                          onClick={(event) =>
                                            handleStructuredEntryNavigation(event, concept.id, entry.id)
                                          }
                                        >
                                          <span className="entry-link-title">
                                            <div className="entry-link-title-point" />
                                            <code>{entry.name}</code>
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
                })
              : null}

            {isProjectPlanDocument(activeDocument)
              ? activeDocument.areas.map((area) => {
                  const groupKey = getDocumentGroupKey(activeDocument.slug, area.slug);
                  const isOpen = Boolean(openGroups[groupKey]);

                  return (
                    <div key={area.name} className="category-group">
                      <button
                        type="button"
                        className="category-toggle"
                        aria-expanded={isOpen}
                        onClick={() =>
                          setOpenGroups((current) => ({
                            ...current,
                            [groupKey]: !current[groupKey],
                          }))
                        }
                      >
                        <span className="category-toggle-content">
                          <span className="category-heading-title">{area.name}</span>
                        </span>
                        <ChevronDown
                          size={16}
                          className={isOpen ? "category-toggle-icon open" : "category-toggle-icon"}
                          aria-hidden="true"
                        />
                      </button>

                      {isOpen ? (
                        area.sections.length > 0 ? (
                          <div className="concept-sublist" aria-label={`${area.name} plan sections`}>
                            {area.sections.map((section) => (
                              <div key={section.id} className="concept-tree-item">
                                <a
                                  href={getDocumentEntryHref(basePath, activeDocument.slug, section.id)}
                                  className={
                                    selectedPlanSection?.id === section.id
                                      ? "concept-item-link active"
                                      : "concept-item-link"
                                  }
                                  onClick={() => setIsSidebarOpen(false)}
                                  >
                                    <span className="concept-link-title-row">
                                      <span className="concept-link-title">{section.title}</span>
                                    </span>
                                  </a>
                                </div>
                            ))}
                          </div>
                        ) : (
                          <p className="concept-preview-empty">No plan sections in this area yet.</p>
                        )
                      ) : null}
                    </div>
                  );
                })
              : null}
          </section>
        </aside>

        <section className="reader">
          {selectedConcept && documentationDocument ? (
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
                      {visibleRelatedConcepts.length > 0 ? (
                        <span className="related-links">
                          {visibleRelatedConcepts.map((relatedConcept) => (
                            <a
                              key={relatedConcept.id}
                              href={getDocumentEntryHref(basePath, activeDocument.slug, relatedConcept.id)}
                            >
                              {relatedConcept.title}
                            </a>
                          ))}
                        </span>
                      ) : (
                        "None"
                      )}
                    </dd>
                  </div>
                </dl>
              </header>

              <div className="reader-body">
                {selectedConcept.contentBlocks.map((block, index) => (
                  <MarkdownContent
                    key={`${selectedConcept.id}-markdown-${index}`}
                    content={block.content}
                  />
                ))}

                {selectedConcept.kind === "functions" ? (
                  selectedConcept.functions.length > 0 ? (
                    <FunctionReferenceSection
                      functions={selectedConcept.functions}
                      basePath={getDocumentHref(basePath, activeDocument.slug)}
                      onEntryNavigate={handleStructuredEntryNavigation}
                      typeIndex={documentationDocument.typeIndex}
                    />
                  ) : (
                    <p className="empty-state">No functions have been documented in this concept yet.</p>
                  )
                ) : null}

                {selectedConcept.kind === "types" ? (
                  selectedConcept.types.length > 0 ? (
                    <TypeReferenceSection
                      types={selectedConcept.types}
                      basePath={getDocumentHref(basePath, activeDocument.slug)}
                      onEntryNavigate={handleStructuredEntryNavigation}
                      typeIndex={documentationDocument.typeIndex}
                    />
                  ) : (
                    <p className="empty-state">No types have been documented in this concept yet.</p>
                  )
                ) : null}
              </div>
            </article>
          ) : null}

          {selectedPlanSection && projectPlanDocument ? (
            <article className="reader-card">
              <header className="reader-header">
                <p className="eyebrow">{selectedPlanSection.area}</p>
                <h2>{selectedPlanSection.title}</h2>
                <p className="reader-summary">{selectedPlanSection.summary}</p>

                <PlanFields fields={selectedPlanSection.fields} />
              </header>

              <div className="reader-body">
                {selectedPlanSection.contentBlocks.map((block, index) => (
                  <MarkdownContent
                    key={`${selectedPlanSection.id}-markdown-${index}`}
                    content={block.content}
                  />
                ))}
              </div>
            </article>
          ) : null}

          {!selectedConcept && !selectedPlanSection ? (
            <section className="reader-card">
              <div className="reader-header">
                <h2>No entries available</h2>
                <p className="reader-summary">
                  Add at least one supported section to the active Neenja document.
                </p>
              </div>
            </section>
          ) : null}
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
            aria-label="Search current document"
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
                  placeholder={`Search ${activeDocument.label.toLowerCase()}`}
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

            <div className="search-dialog-results" aria-label="Matching entries">
              {hasSearchResults ? (
                <>
                  {functionSearchResults.length > 0 ? (
                    <section className="search-results-group" aria-label="Matching functions">
                      <p className="search-results-heading">Functions</p>

                      {functionSearchResults.map(({ concept, functionReference }) => (
                        <a
                          key={`${concept.id}-${functionReference.id}`}
                          href={getStructuredEntryHref(
                            basePath,
                            activeDocument.slug,
                            concept.id,
                            functionReference.id,
                          )}
                          className={
                            selectedConcept?.id === concept.id && activeEntryId === functionReference.id
                              ? "search-result-card active"
                              : "search-result-card"
                          }
                          onClick={(event) =>
                            handleStructuredEntryNavigation(event, concept.id, functionReference.id)
                          }
                        >
                          <span className="search-result-eyebrow">{concept.category}</span>
                          <strong className="search-result-title">
                            <code className="search-result-code">{functionReference.name}</code>
                          </strong>
                          <span className="search-result-parent">{concept.title}</span>
                          <span className="search-result-summary">
                            {functionReference.description ||
                              functionReference.signature ||
                              "Open this function reference."}
                          </span>
                        </a>
                      ))}
                    </section>
                  ) : null}

                  {typeSearchResults.length > 0 ? (
                    <section className="search-results-group" aria-label="Matching types">
                      <p className="search-results-heading">Types</p>

                      {typeSearchResults.map(({ concept, typeReference }) => (
                        <a
                          key={`${concept.id}-${typeReference.id}`}
                          href={getStructuredEntryHref(
                            basePath,
                            activeDocument.slug,
                            concept.id,
                            typeReference.id,
                          )}
                          className={
                            selectedConcept?.id === concept.id && activeEntryId === typeReference.id
                              ? "search-result-card active"
                              : "search-result-card"
                          }
                          onClick={(event) =>
                            handleStructuredEntryNavigation(event, concept.id, typeReference.id)
                          }
                        >
                          <span className="search-result-eyebrow">{concept.category}</span>
                          <strong className="search-result-title">
                            <code className="search-result-code">{typeReference.name}</code>
                          </strong>
                          <span className="search-result-parent">{concept.title}</span>
                          <span className="search-result-summary">
                            {typeReference.description ||
                              typeReference.definition ||
                              "Open this type reference."}
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
                          href={getDocumentEntryHref(basePath, activeDocument.slug, concept.id)}
                          className={
                            selectedConcept?.id === concept.id
                              ? "search-result-card active"
                              : "search-result-card"
                          }
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

                  {planSearchResults.length > 0 ? (
                    <section className="search-results-group" aria-label="Matching plan sections">
                      {query ? <p className="search-results-heading">Project plan</p> : null}

                      {planSearchResults.map((section) => (
                        <a
                          key={section.id}
                          href={getDocumentEntryHref(basePath, activeDocument.slug, section.id)}
                          className={
                            selectedPlanSection?.id === section.id
                              ? "search-result-card active"
                              : "search-result-card"
                          }
                          onClick={closeSearch}
                        >
                          <span className="search-result-eyebrow">{section.area}</span>
                          <strong className="search-result-title">{section.title}</strong>
                          <span className="search-result-summary">
                            {section.summary || "Open this plan section."}
                          </span>
                        </a>
                      ))}
                    </section>
                  ) : null}
                </>
              ) : (
                <p className="empty-state">No entries match this search yet.</p>
              )}
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}
