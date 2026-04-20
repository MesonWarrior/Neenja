import type {
  MouseEvent,
  PointerEvent as ReactPointerEvent,
  WheelEvent as ReactWheelEvent,
} from "react";
import { useEffect, useMemo, useRef, useState } from "react";
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
  DocumentationDocument,
  DocumentCollection,
  FunctionField,
  PlanSection,
  ProjectPlanDocument,
  ReaderDocument,
  TaskNode,
  TaskTreeDocument,
} from "../lib/documentation-file";

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

function isDocumentationDocument(document: ReaderDocument): document is DocumentationDocument {
  return document.kind === "documentation";
}

function isProjectPlanDocument(document: ReaderDocument): document is ProjectPlanDocument {
  return document.kind === "project-plan";
}

function isTaskTreeDocument(document: ReaderDocument): document is TaskTreeDocument {
  return document.kind === "task-tree";
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

function taskMatchesSearch(task: TaskNode, query: string) {
  if (!query) {
    return true;
  }

  const haystack = [
    task.title,
    task.area,
    task.statusLabel,
    task.parentId ?? "",
    task.dependsOn.join(" "),
    task.fields
      .map((field) => [field.label, field.value, field.items.join(" ")].filter(Boolean).join(" "))
      .join("\n"),
    task.contentBlocks.map((block) => block.content).join("\n"),
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

function TaskStatusPill({
  task,
  compact = false,
}: {
  task: TaskNode;
  compact?: boolean;
}) {
  return (
    <span className={`task-status-pill status-${task.statusSlug}${compact ? " compact" : ""}`}>
      {task.statusLabel}
    </span>
  );
}

function TaskTreeProgress({ document }: { document: TaskTreeDocument }) {
  return (
    <div className="task-progress-panel">
      <div className="task-progress-topline">
        <span className="task-progress-label">Progress</span>
        <strong>{document.progress.percent}%</strong>
      </div>
      <div
        className="task-progress-track"
        role="progressbar"
        aria-label="Task completion progress"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={document.progress.percent}
      >
        <span style={{ width: `${document.progress.percent}%` }} />
      </div>
      <div className="task-status-summary" aria-label="Task status counts">
        {document.statusSummary.map((statusSummary) => (
          <span
            key={statusSummary.status}
            className={`task-status-count status-${statusSummary.status}`}
          >
            <span>{statusSummary.label}</span>
            <strong>{statusSummary.count}</strong>
          </span>
        ))}
      </div>
    </div>
  );
}

function TaskLinkList({
  basePath,
  document,
  label,
  taskIds,
}: {
  basePath: string;
  document: TaskTreeDocument;
  label: string;
  taskIds: string[];
}) {
  const tasks = taskIds
    .map((taskId) => document.tasksById[taskId])
    .filter((task): task is TaskNode => Boolean(task));

  if (tasks.length === 0) {
    return null;
  }

  return (
    <div className="task-relation-group">
      <dt>{label}</dt>
      <dd>
        <span className="task-relation-links">
          {tasks.map((task) => (
            <a key={task.id} href={getDocumentEntryHref(basePath, document.slug, task.id)}>
              {task.title}
            </a>
          ))}
        </span>
      </dd>
    </div>
  );
}

function TaskRelations({
  basePath,
  document,
  task,
}: {
  basePath: string;
  document: TaskTreeDocument;
  task: TaskNode;
}) {
  const relationGroups = [
    task.parentId ? [task.parentId] : [],
    task.childrenIds,
    task.dependsOn,
    task.blockingTaskIds,
  ];
  const hasRelations = relationGroups.some((group) => group.length > 0);

  if (!hasRelations) {
    return null;
  }

  return (
    <dl className="task-relations">
      <TaskLinkList
        basePath={basePath}
        document={document}
        label="Parent"
        taskIds={task.parentId ? [task.parentId] : []}
      />
      <TaskLinkList
        basePath={basePath}
        document={document}
        label="Subtasks"
        taskIds={task.childrenIds}
      />
      <TaskLinkList
        basePath={basePath}
        document={document}
        label="Depends on"
        taskIds={task.dependsOn}
      />
      <TaskLinkList
        basePath={basePath}
        document={document}
        label="Blocks"
        taskIds={task.blockingTaskIds}
      />
    </dl>
  );
}

const graphNodeWidth = 260;
const graphNodeHeight = 92;
const graphLevelGap = 360;
const graphSiblingGap = 34;
const graphRootGap = 74;

type TaskGraphPosition = {
  x: number;
  y: number;
};

function buildTaskGraphLayout(document: TaskTreeDocument) {
  const positions: Record<string, TaskGraphPosition> = {};
  let cursorY = 0;

  const placeTask = (taskId: string, depth: number, seenIds = new Set<string>()) => {
    if (seenIds.has(taskId)) {
      return cursorY;
    }

    const task = document.tasksById[taskId];

    if (!task) {
      return cursorY;
    }

    const nextSeenIds = new Set(seenIds);
    nextSeenIds.add(taskId);
    const childIds = task.childrenIds.filter((childId) => document.tasksById[childId]);
    const startY = cursorY;

    if (childIds.length === 0) {
      positions[taskId] = {
        x: depth * graphLevelGap,
        y: cursorY,
      };
      cursorY += graphNodeHeight + graphSiblingGap;
      return positions[taskId].y;
    }

    childIds.forEach((childId) => {
      placeTask(childId, depth + 1, nextSeenIds);
    });

    const endY = cursorY - graphSiblingGap - graphNodeHeight;
    positions[taskId] = {
      x: depth * graphLevelGap,
      y: startY + Math.max(0, endY - startY) / 2,
    };

    return positions[taskId].y;
  };

  document.rootTaskIds.forEach((rootTaskId, index) => {
    if (index > 0) {
      cursorY += graphRootGap;
    }

    placeTask(rootTaskId, 0);
  });

  const nodes = document.tasks
    .filter((task) => positions[task.id])
    .map((task) => ({
      task,
      ...positions[task.id],
    }));
  const maxX = nodes.reduce((current, node) => Math.max(current, node.x), 0);
  const maxY = nodes.reduce((current, node) => Math.max(current, node.y), 0);

  return {
    nodes,
    positions,
    width: maxX + graphNodeWidth,
    height: maxY + graphNodeHeight,
  };
}

function getGraphCurvePath(
  from: TaskGraphPosition,
  to: TaskGraphPosition,
  {
    fromRight = true,
    toLeft = true,
  }: {
    fromRight?: boolean;
    toLeft?: boolean;
  } = {},
) {
  const startX = from.x + (fromRight ? graphNodeWidth : graphNodeWidth / 2);
  const startY = from.y + graphNodeHeight / 2;
  const endX = to.x + (toLeft ? 0 : graphNodeWidth / 2);
  const endY = to.y + graphNodeHeight / 2;
  const controlOffset = Math.max(80, Math.abs(endX - startX) / 2);

  return [
    `M ${startX} ${startY}`,
    `C ${startX + controlOffset} ${startY}`,
    `${endX - controlOffset} ${endY}`,
    `${endX} ${endY}`,
  ].join(" ");
}

function TaskGraphWorkspace({
  basePath,
  document,
  selectedTask,
  onSelectTask,
  onCloseTask,
}: {
  basePath: string;
  document: TaskTreeDocument;
  selectedTask?: TaskNode;
  onSelectTask: (taskId: string) => void;
  onCloseTask: () => void;
}) {
  const graph = useMemo(() => buildTaskGraphLayout(document), [document]);
  const viewportRef = useRef<HTMLDivElement>(null);
  const isPanningRef = useRef(false);
  const lastPointerRef = useRef({ x: 0, y: 0 });
  const [viewportSize, setViewportSize] = useState({ width: 1, height: 1 });
  const [transform, setTransform] = useState({ x: 80, y: 80, scale: 1 });
  const decompositionEdges = document.edges.filter((edge) => edge.kind === "decomposition");
  const dependencyEdges = document.edges.filter((edge) => edge.kind === "dependency");

  const fitGraph = () => {
    const padding = 96;
    const scale = Math.min(
      1.15,
      Math.max(
        0.35,
        Math.min(
          (viewportSize.width - padding) / Math.max(graph.width, 1),
          (viewportSize.height - padding) / Math.max(graph.height, 1),
        ),
      ),
    );

    setTransform({
      x: Math.max(32, (viewportSize.width - graph.width * scale) / 2),
      y: Math.max(32, (viewportSize.height - graph.height * scale) / 2),
      scale,
    });
  };

  useEffect(() => {
    const node = viewportRef.current;

    if (!node) {
      return;
    }

    const syncSize = () => {
      const rect = node.getBoundingClientRect();
      setViewportSize({
        width: rect.width || 1,
        height: rect.height || 1,
      });
    };
    const observer = new ResizeObserver(syncSize);
    observer.observe(node);
    syncSize();

    return () => {
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    fitGraph();
  }, [graph.height, graph.width, viewportSize.height, viewportSize.width]);

  const zoomAt = (nextScale: number, originX = viewportSize.width / 2, originY = viewportSize.height / 2) => {
    setTransform((current) => {
      const scale = Math.min(2.2, Math.max(0.28, nextScale));
      const graphX = (originX - current.x) / current.scale;
      const graphY = (originY - current.y) / current.scale;

      return {
        x: originX - graphX * scale,
        y: originY - graphY * scale,
        scale,
      };
    });
  };

  const handleWheel = (event: ReactWheelEvent<HTMLDivElement>) => {
    event.preventDefault();
    const rect = event.currentTarget.getBoundingClientRect();
    const direction = event.deltaY > 0 ? 0.88 : 1.12;
    zoomAt(
      transform.scale * direction,
      event.clientX - rect.left,
      event.clientY - rect.top,
    );
  };

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) {
      return;
    }

    isPanningRef.current = true;
    lastPointerRef.current = {
      x: event.clientX,
      y: event.clientY,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!isPanningRef.current) {
      return;
    }

    const dx = event.clientX - lastPointerRef.current.x;
    const dy = event.clientY - lastPointerRef.current.y;
    lastPointerRef.current = {
      x: event.clientX,
      y: event.clientY,
    };

    setTransform((current) => ({
      ...current,
      x: current.x + dx,
      y: current.y + dy,
    }));
  };

  const stopPanning = (event: ReactPointerEvent<HTMLDivElement>) => {
    isPanningRef.current = false;

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const selectTask = (taskId: string) => {
    onSelectTask(taskId);

    if (typeof window === "undefined") {
      return;
    }

    window.history.pushState(
      window.history.state,
      "",
      getDocumentEntryHref(basePath, document.slug, taskId),
    );
  };

  return (
    <main className="task-workspace">
      <div className="task-workspace-toolbar">
        <TaskTreeProgress document={document} />
        <div className="task-workspace-controls" aria-label="Graph controls">
          <button
            type="button"
            className="task-control-button"
            title="Zoom out"
            aria-label="Zoom out"
            onClick={() => zoomAt(transform.scale * 0.82)}
          >
            -
          </button>
          <button
            type="button"
            className="task-control-button"
            title="Reset view"
            aria-label="Reset view"
            onClick={fitGraph}
          >
            1:1
          </button>
          <button
            type="button"
            className="task-control-button"
            title="Zoom in"
            aria-label="Zoom in"
            onClick={() => zoomAt(transform.scale * 1.18)}
          >
            +
          </button>
        </div>
      </div>

      <div
        ref={viewportRef}
        className="task-graph-viewport"
        onWheel={handleWheel}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={stopPanning}
        onPointerCancel={stopPanning}
      >
        <svg
          className="task-graph-canvas"
          width="100%"
          height="100%"
          role="img"
          aria-label="Task graph"
        >
          <defs>
            <marker
              id="task-edge-arrow"
              viewBox="0 0 10 10"
              refX="9"
              refY="5"
              markerWidth="7"
              markerHeight="7"
              orient="auto-start-reverse"
            >
              <path d="M 0 0 L 10 5 L 0 10 z" />
            </marker>
            <marker
              id="task-dependency-arrow"
              viewBox="0 0 10 10"
              refX="9"
              refY="5"
              markerWidth="7"
              markerHeight="7"
              orient="auto-start-reverse"
            >
              <path d="M 0 0 L 10 5 L 0 10 z" />
            </marker>
          </defs>
          <g transform={`translate(${transform.x} ${transform.y}) scale(${transform.scale})`}>
            <g className="task-graph-edges">
              {decompositionEdges.map((edge) => {
                const from = graph.positions[edge.from];
                const to = graph.positions[edge.to];

                if (!from || !to) {
                  return null;
                }

                return (
                  <path
                    key={`${edge.kind}-${edge.from}-${edge.to}`}
                    className="task-edge decomposition"
                    d={getGraphCurvePath(from, to)}
                  />
                );
              })}

              {dependencyEdges.map((edge) => {
                const from = graph.positions[edge.from];
                const to = graph.positions[edge.to];

                if (!from || !to) {
                  return null;
                }

                return (
                  <path
                    key={`${edge.kind}-${edge.from}-${edge.to}`}
                    className="task-edge dependency"
                    d={getGraphCurvePath(from, to)}
                  />
                );
              })}
            </g>

            <g className="task-graph-nodes">
              {graph.nodes.map((node) => (
                <foreignObject
                  key={node.task.id}
                  x={node.x}
                  y={node.y}
                  width={graphNodeWidth}
                  height={graphNodeHeight}
                >
                  <button
                    type="button"
                    className={
                      selectedTask?.id === node.task.id
                        ? `task-graph-card active status-${node.task.statusSlug}`
                        : `task-graph-card status-${node.task.statusSlug}`
                    }
                    onPointerDown={(event) => event.stopPropagation()}
                    onClick={() => selectTask(node.task.id)}
                  >
                    <span className="task-node-title">{node.task.title}</span>
                    <span className="task-node-footer">
                      <TaskStatusPill task={node.task} compact />
                      <span>{node.task.area}</span>
                    </span>
                  </button>
                </foreignObject>
              ))}
            </g>
          </g>
        </svg>
      </div>

      {selectedTask ? (
        <TaskDetailDrawer
          basePath={basePath}
          document={document}
          task={selectedTask}
          onClose={onCloseTask}
        />
      ) : null}
    </main>
  );
}

function TaskDetailDrawer({
  basePath,
  document,
  task,
  onClose,
}: {
  basePath: string;
  document: TaskTreeDocument;
  task: TaskNode;
  onClose: () => void;
}) {
  return (
    <aside className="task-detail-drawer" aria-label="Task details">
      <article className="reader-card task-detail-card">
        <header className="reader-header task-detail-header">
          <button
            type="button"
            className="icon-button task-detail-close"
            aria-label="Close task details"
            onClick={onClose}
          >
            <X size={18} />
          </button>

          <p className="eyebrow">{task.area}</p>
          <h2>{task.title}</h2>

          <div className="task-header-meta">
            <TaskStatusPill task={task} />
            <span>{task.childrenIds.length} subtasks</span>
            <span>{task.dependsOn.length} dependencies</span>
          </div>

          <PlanFields fields={task.fields} />
        </header>

        <div className="reader-body task-detail-body">
          <TaskRelations
            basePath={basePath}
            document={document}
            task={task}
          />

          {task.contentBlocks.map((block, index) => (
            <MarkdownContent
              key={`${task.id}-markdown-${index}`}
              content={block.content}
            />
          ))}
        </div>
      </article>
    </aside>
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
  const [selectedTaskId, setSelectedTaskId] = useState(selectedEntryId ?? "");
  const [isEntryItemLinkActiveDismissed, setIsEntryItemLinkActiveDismissed] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const dismissEntryItemLinkOnUserScrollRef = useRef(false);
  const pointerScrollCandidateRef = useRef(false);
  const activeDocument =
    collection.documentsBySlug[selectedDocumentSlug ?? ""] ?? collection.defaultDocument;
  const selectedConcept =
    isDocumentationDocument(activeDocument)
      ? activeDocument.conceptsById[selectedEntryId ?? ""] ?? activeDocument.concepts[0]
      : undefined;
  const selectedPlanSection =
    isProjectPlanDocument(activeDocument)
      ? activeDocument.sectionsById[selectedEntryId ?? ""] ?? activeDocument.sections[0]
      : undefined;
  const selectedTask =
    isTaskTreeDocument(activeDocument)
      ? selectedTaskId
        ? activeDocument.tasksById[selectedTaskId]
        : undefined
      : undefined;
  const visibleRelatedConcepts =
    isDocumentationDocument(activeDocument) && selectedConcept
      ? selectedConcept.related
          .map((relatedId) => activeDocument.conceptsById[relatedId])
          .filter((relatedConcept): relatedConcept is Concept => Boolean(relatedConcept))
      : [];
  const selectedGroupSlug =
    selectedConcept?.categorySlug ?? selectedPlanSection?.areaSlug ?? selectedTask?.areaSlug;
  const query = normalize(search);
  const documentationDocument = isDocumentationDocument(activeDocument) ? activeDocument : undefined;
  const projectPlanDocument = isProjectPlanDocument(activeDocument) ? activeDocument : undefined;
  const taskTreeDocument = isTaskTreeDocument(activeDocument) ? activeDocument : undefined;
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
  const taskSearchResults = taskTreeDocument
    ? taskTreeDocument.tasks.filter((task) => taskMatchesSearch(task, query))
    : [];
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
    const groups = isDocumentationDocument(activeDocument)
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
    setSelectedTaskId(isTaskTreeDocument(activeDocument) ? selectedEntryId ?? "" : "");
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
    planSearchResults.length > 0 ||
    taskSearchResults.length > 0;
  const renderDocumentNavigation = (className: string) =>
    collection.documents.length > 1 ? (
      <nav className={className} aria-label="Documents">
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
    ) : null;
  const closeTaskDetails = () => {
    setSelectedTaskId("");

    if (typeof window === "undefined" || !taskTreeDocument) {
      return;
    }

    window.history.pushState(
      window.history.state,
      "",
      getDocumentHref(basePath, taskTreeDocument.slug),
    );
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
                <span className="gray">Powered by</span>{" "}
                <a href="https://github.com/MesonWarrior/Neenja">Neenja</a>
              </p>
              <a href={homeHref} className="brand-link">
                {activeDocument.meta.title}
              </a>
            </div>
          </div>

          <div className="docs-header-right">
            {renderDocumentNavigation("document-nav header-document-nav")}

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

      {taskTreeDocument ? (
        <TaskGraphWorkspace
          basePath={basePath}
          document={taskTreeDocument}
          selectedTask={selectedTask}
          onSelectTask={setSelectedTaskId}
          onCloseTask={closeTaskDetails}
        />
      ) : (
      <div className="docs-layout">
        <div
          className={isSidebarOpen ? "sidebar-backdrop visible" : "sidebar-backdrop"}
          aria-hidden="true"
          onClick={() => setIsSidebarOpen(false)}
        />

        <aside className={isSidebarOpen ? "sidebar open" : "sidebar"}>
          {renderDocumentNavigation("document-nav sidebar-document-nav")}

          <section className="sidebar-panel hero-panel">
            <p className="eyebrow">Description</p>
            <ExpandableText text={activeDocument.meta.summary} className="hero-copy" />
            <p className="updated">Updated: {activeDocument.meta.updated}</p>
          </section>

          <section className="concept-list-panel" aria-label="Navigation">
            {isDocumentationDocument(activeDocument)
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
      )}

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

                  {taskSearchResults.length > 0 ? (
                    <section className="search-results-group" aria-label="Matching tasks">
                      {query ? <p className="search-results-heading">Task tree</p> : null}

                      {taskSearchResults.map((task) => (
                        <a
                          key={task.id}
                          href={getDocumentEntryHref(basePath, activeDocument.slug, task.id)}
                          className={
                            selectedTask?.id === task.id
                              ? "search-result-card active"
                              : "search-result-card"
                          }
                          onClick={(event) => {
                            if (!taskTreeDocument) {
                              closeSearch();
                              return;
                            }

                            event.preventDefault();
                            setSelectedTaskId(task.id);
                            closeSearch();
                            window.history.pushState(
                              window.history.state,
                              "",
                              getDocumentEntryHref(basePath, taskTreeDocument.slug, task.id),
                            );
                          }}
                        >
                          <span className="search-result-eyebrow">{task.area}</span>
                          <strong className="search-result-title">{task.title}</strong>
                          <span className="search-result-parent">{task.statusLabel}</span>
                          <span className="search-result-summary">
                            {task.content || "Open this task."}
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
