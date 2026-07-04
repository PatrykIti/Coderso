import {
  Fragment,
  useState,
  type CSSProperties,
  type DragEvent as ReactDragEvent,
  type ReactNode,
} from "react";
import { AlertTriangle, Image as ImageIcon, MoveDown, MoveUp, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { InlineEditWrapper, selectionBorder } from "@/ui/authoring";
import { FieldRenderer } from "@/ui/entries/FieldRenderer";
import {
  normalizeScreenImageSrc,
  screenSectionColumnTemplate, // TASK-505-02 (value): preset → grid-template-columns fr map (505-01 owns it)
  type ScreenBlockStyleV1,
  type ScreenBlockV1,
  type ScreenDocumentV1,
  type ScreenFieldBinding,
} from "../../../services/customScreens/customScreenSchemas";
import {
  screenBlockLabels,
  type ScreenBlockKind,
  type ScreenInsertTarget,
} from "../../../services/customScreens/screenDocumentOps";
import type { RelatedEntrySummary } from "../../../services/customScreens/relatedEntryResolver";
import type {
  ScreenEntryPresentationOverrideDraft,
  ScreenEntryPresentationOverridePropPath,
} from "../../../services/customScreens/screenEntryPresentationOverrideContract";
import { readBindingPathValue } from "../../../services/utils/bindingPath";
import type { ContentField } from "../content-types/SchemaBuilder";

type ScreenRuntimeRendererProps = {
  document: ScreenDocumentV1;
  bindings: ScreenFieldBinding[];
  values: Record<string, unknown>;
  fields?: ContentField[];
  fieldErrors?: Record<string, string>;
  presentationOverrides?: ScreenEntryPresentationOverrideDraft[];
  relationTargets?: Array<{ slug: string; name: string }>;
  /**
   * Host-precomputed related entries keyed by `related-list` block id (TASK-498-03).
   * The renderer stays pure — the admin host resolves relation IDs → summaries via
   * `resolveRelatedEntries` + `listEntriesCached` and passes the map in. Undefined for a
   * block means "not resolved yet" → the block renders its loading skeleton.
   */
  relatedEntries?: Record<string, RelatedEntrySummary[]>;
  mode: "builder" | "preview" | "entry";
  selectedSectionId?: string | null;
  selectedBlockId?: string | null;
  onSelectSection?: (sectionId: string) => void;
  onSelectBlock?: (blockId: string) => void;
  // TASK-500-01: builder-only section chrome (rename / move / delete). All three
  // are OPTIONAL and consumed only in mode==="builder" when the section is
  // selected — the preview/entry render paths stay byte-identical.
  onRenameSection?: (sectionId: string, label: string) => void;
  onMoveSection?: (sectionId: string, direction: "up" | "down") => void;
  onDeleteSection?: (sectionId: string) => void;
  // TASK-500-02: builder-only insertion targeting + drag-to-position. All three
  // are OPTIONAL and consumed only in mode==="builder" — the preview/entry
  // render paths stay byte-identical. `insertPoint` highlights the armed
  // gap/slot; `onSetInsertPoint` arms/disarms it (one-shot, host-owned);
  // `onDragMove` fires when a native-DnD drop resolves a ScreenInsertTarget.
  // The canvas ALWAYS reports gap indices against the PRE-removal rendered
  // list — moveScreenBlockTo is the sole owner of the removal-first decrement.
  insertPoint?: ScreenInsertTarget | null;
  onSetInsertPoint?: (target: ScreenInsertTarget | null) => void;
  onDragMove?: (blockId: string, target: ScreenInsertTarget) => void;
  onFieldChange?: (field: string, value: unknown) => void;
  onTitleChange?: (value: string) => void;
  onSlugChange?: (value: string) => void;
  renderBuilderActions?: (block: ScreenBlockV1) => ReactNode;
  enableInlineFieldEditing?: boolean;
  emptyMessage?: string;
  /**
   * TASK-503-02 C(i): entry-mode-only chrome gate for the binding badges
   * ("Editable"/"Read"/"Unbound") and the uppercase field-type badge.
   * DEFAULT OFF — a published entry view is clean unless the user opts in
   * (503-03 threads the per-user localStorage preference). Preview ALWAYS
   * shows the badges; builder chrome is untouched by this prop.
   */
  showFieldMetadata?: boolean;
};

const systemFieldLabels = new Map([
  ["title", "Title"],
  ["slug", "Slug"],
  ["status", "Status"],
  ["createdAt", "Created"],
  ["updatedAt", "Updated"],
  ["publishedAt", "Published"],
]);

const systemFieldMap = new Map<string, ContentField>([
  [
    "title",
    {
      id: "system-title",
      name: "title",
      type: "text",
      label: "Title",
    },
  ],
  [
    "slug",
    {
      id: "system-slug",
      name: "slug",
      type: "text",
      label: "Slug",
    },
  ],
]);

const fieldTypeLabels = {
  text: "Text",
  number: "Number",
  boolean: "Boolean",
  select: "Select",
  media: "Media",
  relation: "Relation",
  richtext: "Rich text",
} as const;

const presentationTextSizeClassMap: Record<string, string> = {
  "2xs": "text-[0.625rem] leading-4",
  xs: "text-xs",
  sm: "text-sm",
  md: "text-base",
  lg: "text-lg",
  xl: "text-xl",
  "2xl": "text-2xl",
  "3xl": "text-3xl",
  "4xl": "text-4xl",
  "5xl": "text-5xl",
};

const presentationTextEmphasisClassMap: Record<string, string> = {
  normal: "font-normal",
  medium: "font-medium",
  semibold: "font-semibold",
  bold: "font-bold",
};

const presentationToneClassMap: Record<string, string> = {
  default: "text-foreground",
  muted: "text-muted-foreground",
  strong: "text-foreground",
  neutral: "text-muted-foreground",
  primary: "text-primary",
  secondary: "text-secondary-foreground",
  accent: "text-accent-foreground",
  success: "text-success",
  warning: "text-warning",
  danger: "text-destructive",
  info: "text-info",
};

// TASK-503-02 A: parent-normative width/align class maps for the block STYLE
// channel. Applied on the wrap() root div identically in builder/preview/entry.
const screenBlockWidthClass: Record<string, string> = {
  auto: "",
  full: "w-full",
  half: "w-1/2",
  third: "w-1/3",
  "two-thirds": "w-2/3",
};
const screenBlockAlignClass: Record<string, string> = {
  start: "mr-auto",
  center: "mx-auto",
  end: "ml-auto",
  stretch: "w-full",
};
// TASK-503-02 E: image ratio enum → aspect-* wrapper class ("auto"/legacy free
// text → no class, renders as today).
const screenImageRatioClass: Record<string, string> = {
  "1/1": "aspect-square",
  "4/3": "aspect-[4/3]",
  "16/9": "aspect-video",
  "3/2": "aspect-[3/2]",
};

// TASK-505-02: default gap for a gridded section = 16px == the space-y-4 vertical
// rhythm (1rem), so switching a section from stack→grid at gap-default reads as
// the same density. (Renderer-local; 505-01 owns the preset → grid-template map.)
const SCREEN_SECTION_COLUMN_GAP_DEFAULT = 16;

// TASK-503-02 A: inline box CSS from the VALIDATED style record. Values arrive
// already clamped as ints (503-01 validator); the renderer still type-guards
// (typeof number) so a hand-crafted document can only ever emit numbers into
// style={} — never strings/raw input. Returns undefined (no style attr) when
// nothing to emit, preserving absent-style DOM identity.
const screenBoxSides = ["top", "right", "bottom", "left"] as const;
const resolveScreenBlockBoxStyle = (
  style: ScreenBlockStyleV1 | undefined
): CSSProperties | undefined => {
  if (!style) return undefined;
  const out: CSSProperties = {};
  if (typeof style.minHeight === "number") out.minHeight = style.minHeight;
  for (const side of screenBoxSides) {
    const cap = side[0].toUpperCase() + side.slice(1); // Top/Right/Bottom/Left
    const m = style.margin?.[side];
    if (typeof m === "number") (out as Record<string, number>)[`margin${cap}`] = m;
    const p = style.padding?.[side];
    if (typeof p === "number") (out as Record<string, number>)[`padding${cap}`] = p;
  }
  return Object.keys(out).length > 0 ? out : undefined;
};

const stringifyValue = (value: unknown) => {
  if (value === undefined || value === null || value === "") return "Empty";
  if (Array.isArray(value)) return value.length > 0 ? value.join(", ") : "Empty";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
};

const editableTextValue = (value: unknown) => {
  if (value === undefined || value === null) return "";
  if (Array.isArray(value)) return value.join(", ");
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
};

const normalizeInlineFieldValue = (value: string, field: ContentField) => {
  if (field.type === "number") {
    if (!value.trim()) return "";
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : value;
  }
  return value;
};

const isInlineEditableField = (field: ContentField) =>
  field.type === "text" || field.type === "number" || field.type === "select";

const readText = (data: Record<string, unknown>, key: string, fallback = "") => {
  const value = data[key];
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
};

const findField = (fields: ContentField[] | undefined, fieldName: string) =>
  fields?.find((field) => field.name === fieldName) ?? systemFieldMap.get(fieldName) ?? null;

const resolveBlockBinding = (bindings: ScreenFieldBinding[], blockId: string, propPath: string) =>
  bindings.find((binding) => binding.blockId === blockId && binding.propPath === propPath) ?? null;

// TASK-498-02 B-runtime: the muted mono `{{ token }}` shown in builder mode for the
// data-oriented kinds (prototype `Token`, CustomScreenEditorPreview.tsx:58-70).
const RuntimeToken = ({ children }: { children: ReactNode }) => (
  <span className="rounded-md bg-muted px-1.5 py-0.5 font-mono text-muted-foreground">
    {children}
  </span>
);

const formatStatValue = (value: unknown, format: string) => {
  if (value === undefined || value === null || value === "") return "—";
  const numeric = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numeric)) return String(value);
  if (format === "percent") return `${numeric}%`;
  if (format === "money") return `$${numeric}`;
  return String(numeric);
};

const formatRelatedTime = (value: string): string => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString(undefined, { month: "short", day: "numeric" });
};

const relatedInitials = (title: string): string => {
  const parts = title.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
};

const resolveMediaSrc = (value: unknown): string | null => {
  if (typeof value === "string" && value.trim()) return value;
  if (Array.isArray(value)) {
    const first = value.find((item) => typeof item === "string" && item.trim());
    return typeof first === "string" ? first : null;
  }
  return null;
};

const bindingAllowsWrite = (binding: ScreenFieldBinding | null | undefined) =>
  binding?.mode === "write" || binding?.mode === "readwrite";

// TASK-500-02: the render context threaded through the block recursion so slot
// affordances know which section they sit in (ScreenInsertTarget carries the
// sectionId) and whether the subtree belongs to the block being dragged
// (`suppressed` hides its inner gaps/drop zones — visual reinforcement of the
// moveScreenBlockTo cycle guard; the op is the real guard).
type RenderBlockContext = {
  sectionId: string;
  suppressed: boolean;
  // TASK-500 post-audit: the before/after ScreenInsertTargets of THIS block's
  // position in its parent list (builder only). The card body uses them as a
  // midpoint-resolved drop target so dropping ON a card lands before/after that
  // card instead of silently falling through to the section's end.
  dropTargets?: { before: ScreenInsertTarget; after: ScreenInsertTarget };
};

// internal — armed-gap highlight equality for ScreenInsertTarget.
const insertTargetsEqual = (a: ScreenInsertTarget, b: ScreenInsertTarget): boolean => {
  if (a.kind !== b.kind) return false;
  if (a.kind === "section-end" || a.kind === "section-index") {
    if (a.sectionId !== b.sectionId) return false;
    return a.kind === "section-index" && b.kind === "section-index" ? a.index === b.index : true;
  }
  if (b.kind !== "slot-end" && b.kind !== "slot-index") return false;
  if (a.parentId !== b.parentId || a.slotId !== b.slotId) return false;
  return a.kind === "slot-index" && b.kind === "slot-index" ? a.index === b.index : true;
};

export function ScreenRuntimeRenderer({
  document,
  bindings,
  values,
  fields,
  fieldErrors = {},
  presentationOverrides = [],
  relationTargets = [],
  relatedEntries = {},
  mode,
  selectedSectionId,
  selectedBlockId,
  onSelectSection,
  onSelectBlock,
  onRenameSection,
  onMoveSection,
  onDeleteSection,
  insertPoint,
  onSetInsertPoint,
  onDragMove,
  onFieldChange,
  onTitleChange,
  onSlugChange,
  renderBuilderActions,
  enableInlineFieldEditing = false,
  emptyMessage,
  showFieldMetadata = false,
}: ScreenRuntimeRendererProps) {
  // TASK-500-02: id of the card being natively dragged (builder-only) —
  // suppresses that block's OWN inner drop zones while it is in flight. Set and
  // cleared exclusively from DnD event handlers (no setState-in-effect).
  const [draggingBlockId, setDraggingBlockId] = useState<string | null>(null);
  // TASK-500 post-audit (drag drop feedback): the ScreenInsertTarget the drag is
  // currently hovering. CSS `:hover` does NOT apply while a native HTML5 drag is
  // in flight, so this state drives the visible "where will it land" highlight —
  // dragover sets it (innermost zone wins via stopPropagation), dragleave clears
  // it only when it still points at the leaving zone, drop/dragend always clear.
  const [dragHoverTarget, setDragHoverTarget] = useState<ScreenInsertTarget | null>(null);
  const setDragHover = (target: ScreenInsertTarget) =>
    setDragHoverTarget((prev) => (prev && insertTargetsEqual(prev, target) ? prev : target));
  const clearDragHover = (target: ScreenInsertTarget) =>
    setDragHoverTarget((prev) => (prev && insertTargetsEqual(prev, target) ? null : prev));
  const isDragHover = (target: ScreenInsertTarget) =>
    dragHoverTarget ? insertTargetsEqual(dragHoverTarget, target) : false;
  const canInsert = mode === "builder" && Boolean(onSetInsertPoint);
  const canDrag = mode === "builder" && Boolean(onDragMove);

  // Shared native-DnD drop wiring: dataTransfer carries the dragged block id as
  // text/plain; a drop resolves the ScreenInsertTarget of the zone it landed on.
  const dropHandlers = (target: ScreenInsertTarget) =>
    canDrag
      ? {
          onDragOver: (event: ReactDragEvent) => {
            event.preventDefault();
            // The INNERMOST zone claims the hover highlight — outer zones
            // (container card midpoint / section body) must not override it.
            event.stopPropagation();
            if (event.dataTransfer) event.dataTransfer.dropEffect = "move";
            setDragHover(target);
          },
          onDragLeave: () => clearDragHover(target),
          onDrop: (event: ReactDragEvent) => {
            event.preventDefault();
            event.stopPropagation();
            const blockId = event.dataTransfer?.getData("text/plain");
            setDraggingBlockId(null);
            setDragHoverTarget(null);
            if (blockId) onDragMove?.(blockId, target);
          },
        }
      : {};

  // Thin hover "＋ insert here" gap between siblings (builder-only). Click arms
  // (or disarms) the one-shot insert point; a drop moves the dragged block to
  // the gap's PRE-removal index (the op owns the same-list decrement).
  const renderInsertGap = (
    target: Extract<ScreenInsertTarget, { kind: "section-index" | "slot-index" }>,
    options?: { fullRow?: boolean } // TASK-505-02: section-start/end gaps span the row in a gridded section
  ) => {
    if (!canInsert) return null;
    const armed = insertPoint ? insertTargetsEqual(insertPoint, target) : false;
    // TASK-500 post-audit: `:hover` never fires during a native drag, so while a
    // block is in flight EVERY gap force-reveals at reduced opacity and the one
    // the drag is over (directly, or resolved from a card-body midpoint) gets
    // the full ring — the author can SEE where the drop will land.
    const dragHover = isDragHover(target);
    const dragging = draggingBlockId !== null;
    return (
      <button
        type="button"
        aria-label="Insert here"
        data-screen-insert-gap="true"
        data-insert-kind={target.kind}
        data-insert-section={target.sectionId}
        data-insert-parent={target.kind === "slot-index" ? target.parentId : undefined}
        data-insert-slot={target.kind === "slot-index" ? target.slotId : undefined}
        data-insert-index={target.index}
        data-armed={armed ? "true" : "false"}
        data-drag-hover={dragHover ? "true" : undefined}
        className={cn(
          "group/gap relative z-10 -my-2 flex h-4 w-full items-center justify-center rounded-md transition",
          armed
            ? "bg-primary/10 ring-1 ring-primary"
            : dragHover
              ? "bg-primary/10 opacity-100 ring-2 ring-primary"
              : dragging
                ? "bg-primary/5 opacity-60"
                : "opacity-0 hover:bg-primary/5 hover:opacity-100 focus-visible:opacity-100"
        )}
        // TASK-505-02: in a gridded section the section-start/end gaps span the
        // whole row so they never consume a column cell (which would push the
        // following block onto its own row and break side-by-side columns).
        style={options?.fullRow ? { gridColumn: "1 / -1" } : undefined}
        onClick={(event) => {
          event.stopPropagation();
          onSetInsertPoint?.(armed ? null : target);
        }}
        {...dropHandlers(target)}
      >
        <span className="pointer-events-none text-[10px] font-medium text-primary">
          ＋ insert here
        </span>
      </button>
    );
  };

  // Container slot lists (field-group / columns). Preview/entry render the
  // exact pre-TASK-500-02 markup; the builder path layers per-slot drop zones,
  // sibling gaps, and an armable empty-slot target onto the SAME structure
  // (`data-screen-runtime-slot` markers kept). `renderChild` is passed in to
  // avoid mutual use-before-define with renderBlock.
  const renderSlots = (
    block: ScreenBlockV1,
    renderChild: (child: ScreenBlockV1, childCtx: RenderBlockContext) => ReactNode,
    ctx: RenderBlockContext,
    options?: { columns?: boolean }
  ) => {
    const slots = block.slots;
    if (!slots) return null;
    const entries = Object.entries(slots);
    if (entries.length === 0) return null;
    const showAffordances = mode === "builder" && !ctx.suppressed;
    return (
      <div className={options?.columns ? "grid gap-4 md:grid-cols-2" : "space-y-4"}>
        {entries.map(([slotId, blocks]) => {
          const slotEndTarget: ScreenInsertTarget = {
            kind: "slot-end",
            sectionId: ctx.sectionId,
            parentId: block.id,
            slotId,
          };
          const armed =
            canInsert && insertPoint ? insertTargetsEqual(insertPoint, slotEndTarget) : false;
          const slotDragHover = showAffordances && isDragHover(slotEndTarget);
          const childDropTargets = (
            index: number
          ): RenderBlockContext["dropTargets"] | undefined =>
            showAffordances
              ? {
                  before: {
                    kind: "slot-index",
                    sectionId: ctx.sectionId,
                    parentId: block.id,
                    slotId,
                    index,
                  },
                  after: {
                    kind: "slot-index",
                    sectionId: ctx.sectionId,
                    parentId: block.id,
                    slotId,
                    index: index + 1,
                  },
                }
              : undefined;
          return (
            <div
              key={slotId}
              className="min-w-0 space-y-3"
              data-screen-runtime-slot={slotId}
              {...(showAffordances ? dropHandlers(slotEndTarget) : {})}
            >
              {blocks.length > 0 ? (
                showAffordances ? (
                  <>
                    {blocks.map((child, index) => (
                      <Fragment key={child.id}>
                        {renderInsertGap({
                          kind: "slot-index",
                          sectionId: ctx.sectionId,
                          parentId: block.id,
                          slotId,
                          index,
                        })}
                        {renderChild(child, { ...ctx, dropTargets: childDropTargets(index) })}
                      </Fragment>
                    ))}
                    {renderInsertGap({
                      kind: "slot-index",
                      sectionId: ctx.sectionId,
                      parentId: block.id,
                      slotId,
                      index: blocks.length,
                    })}
                  </>
                ) : (
                  // Strip the CONTAINER's own dropTargets — a child card must
                  // never inherit its parent's before/after position.
                  blocks.map((child) => renderChild(child, { ...ctx, dropTargets: undefined }))
                )
              ) : showAffordances && canInsert ? (
                // Builder-only: the empty placeholder becomes an explicit,
                // armable labeled drop target (same look, same "Empty {slotId}"
                // copy) so the author can aim ANY nested slot at depth.
                <button
                  type="button"
                  data-screen-slot-dropzone={slotId}
                  data-insert-parent={block.id}
                  data-armed={armed ? "true" : "false"}
                  data-drag-hover={slotDragHover ? "true" : undefined}
                  className={cn(
                    "w-full rounded-lg border border-dashed bg-muted/20 px-3 py-4 text-left text-sm text-muted-foreground transition-colors hover:border-ring/50 hover:text-foreground",
                    armed && "border-primary ring-1 ring-primary",
                    !armed && slotDragHover && "border-primary bg-primary/10 text-foreground"
                  )}
                  onClick={(event) => {
                    event.stopPropagation();
                    onSetInsertPoint?.(armed ? null : slotEndTarget);
                  }}
                  {...dropHandlers(slotEndTarget)}
                >
                  Empty {slotId}
                </button>
              ) : (
                <div className="rounded-lg border border-dashed bg-muted/20 px-3 py-4 text-sm text-muted-foreground">
                  Empty {slotId}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  const presentationOverrideMap = new Map<string, string>();
  const blocksWithPresentationOverrides = new Set<string>();
  for (const override of presentationOverrides) {
    presentationOverrideMap.set(`${override.blockId}\u0000${override.propPath}`, override.value);
    blocksWithPresentationOverrides.add(override.blockId);
  }

  const readPresentationOverride = (
    blockId: string,
    propPath: ScreenEntryPresentationOverridePropPath
  ) => presentationOverrideMap.get(`${blockId}\u0000${propPath}`) ?? null;

  const resolveTextPresentationClassName = (blockId: string) => {
    const textSize = readPresentationOverride(blockId, "textSize");
    const textEmphasis = readPresentationOverride(blockId, "textEmphasis");
    const tone = readPresentationOverride(blockId, "tone");
    return cn(
      textSize ? presentationTextSizeClassMap[textSize] : undefined,
      textEmphasis ? presentationTextEmphasisClassMap[textEmphasis] : undefined,
      tone ? presentationToneClassMap[tone] : undefined
    );
  };

  const withTextPresentation = (blockId: string, className: string) =>
    cn(className, resolveTextPresentationClassName(blockId));

  const readMediaPresentationValue = (blockId: string) =>
    readPresentationOverride(blockId, "mediaAssetId") ?? readPresentationOverride(blockId, "image");

  const renderBlock = (block: ScreenBlockV1, ctx: RenderBlockContext): ReactNode => {
    const selected = selectedBlockId === block.id;
    const isInteractive = mode !== "preview" && Boolean(onSelectBlock);
    // TASK-500-02: a dragged container suppresses its OWN inner drop zones
    // (children inherit `suppressed`); the op-level cycle guard is the real guard.
    const childCtx: RenderBlockContext = {
      sectionId: ctx.sectionId,
      suppressed: ctx.suppressed || draggingBlockId === block.id,
    };
    // TASK-498-01 A2: in builder mode a block renders as a corner-tag card
    // (`rounded-2xl bg-card p-5` + the selection border), mirroring the prototype
    // Section (CustomScreenEditorPreview.tsx:28-56) — NOT the old uppercase type
    // strip. Entry mode keeps the flat inline surface; preview keeps its soft card.
    const wrapperClass = cn(
      "group relative transition",
      mode === "preview"
        ? "rounded-xl border bg-background shadow-sm"
        : mode === "builder"
          ? cn(
              selectionBorder({
                level: "item",
                selected,
                interactive: isInteractive,
              }),
              "rounded-2xl bg-card p-5"
            )
          : cn(
              // TASK-503-02 C(ii): entry surface flatten — one opaque card
              // surface (selection/interaction ring kept so entry blocks stay
              // clickable for the floating-panel select).
              "rounded-xl bg-card",
              selectionBorder({
                level: "item",
                selected,
                interactive: isInteractive,
              })
            )
    );

    // TASK-503-02 A: block STYLE emission — computed once here (inside
    // renderBlock, so every kind inherits it) and applied on the wrap() root div
    // in ONE code path shared by builder/preview/entry. An absent `style` key →
    // widthClass/alignClass "" + boxStyle undefined → byte-identical DOM to today.
    const blockStyle = block.style;
    const widthClass = blockStyle?.width ? (screenBlockWidthClass[blockStyle.width] ?? "") : "";
    // Determinism rule 1: explicit horizontal margins WIN over the align preset
    // (mx-auto etc. would lose to inline margin anyway) — suppress the class.
    const hasHorizontalMargin =
      blockStyle?.margin?.left !== undefined || blockStyle?.margin?.right !== undefined;
    // Determinism rule 2: a width preset WINS over align:"stretch" — "stretch"
    // only emits w-full when no width class is present (two width utilities would
    // resolve by stylesheet order, not intent).
    const alignClass =
      blockStyle?.align && !hasHorizontalMargin
        ? blockStyle.align === "stretch"
          ? widthClass
            ? ""
            : "w-full"
          : (screenBlockAlignClass[blockStyle.align] ?? "")
        : "";
    const boxStyle = resolveScreenBlockBoxStyle(blockStyle);

    // TASK-500 post-audit: dropping on a block CARD BODY (the most natural drag
    // target) resolves to before/after THAT card by vertical midpoint instead of
    // silently bubbling to the section-end dropzone. Inner gaps/slots still win
    // (their dragover/drop stopPropagation), and a suppressed subtree (the
    // dragged container's own children) exposes no card targets.
    const cardDropTargets = canDrag && !ctx.suppressed ? ctx.dropTargets : undefined;
    const resolveCardDropTarget = (
      event: ReactDragEvent,
      targets: NonNullable<RenderBlockContext["dropTargets"]>
    ) => {
      const rect = event.currentTarget.getBoundingClientRect();
      return event.clientY < rect.top + rect.height / 2 ? targets.before : targets.after;
    };

    const wrap = (content: ReactNode) => (
      <div
        key={block.id}
        className={cn(wrapperClass, widthClass, alignClass)}
        style={boxStyle}
        data-screen-block-id={block.id}
        data-screen-block-type={block.type}
        data-screen-presentation-override={
          blocksWithPresentationOverrides.has(block.id) ? "true" : undefined
        }
        data-selected={selected ? "true" : "false"}
        role={isInteractive ? "button" : undefined}
        tabIndex={isInteractive ? 0 : undefined}
        // TASK-503-02 D: the drag source moved OFF the card onto the corner type
        // Badge (below) so nested draggable children no longer shadow their
        // container. The card stays a drop-only target (onDragOver/onDrop kept).
        onDragOver={
          cardDropTargets
            ? (event) => {
                event.preventDefault();
                event.stopPropagation();
                if (event.dataTransfer) event.dataTransfer.dropEffect = "move";
                setDragHover(resolveCardDropTarget(event, cardDropTargets));
              }
            : undefined
        }
        onDrop={
          cardDropTargets
            ? (event) => {
                event.preventDefault();
                event.stopPropagation();
                const blockId = event.dataTransfer?.getData("text/plain");
                const target = resolveCardDropTarget(event, cardDropTargets);
                setDraggingBlockId(null);
                setDragHoverTarget(null);
                if (blockId) onDragMove?.(blockId, target);
              }
            : undefined
        }
        onClick={
          isInteractive
            ? (event) => {
                event.stopPropagation();
                onSelectBlock?.(block.id);
              }
            : undefined
        }
        onKeyDown={
          isInteractive
            ? (event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  event.stopPropagation();
                  onSelectBlock?.(block.id);
                }
              }
            : undefined
        }
      >
        {mode === "builder" ? (
          <>
            <Badge
              variant="outline"
              // TASK-503-02 D: the corner type Badge is now the native-DnD drag
              // source (Badge is a span that spreads ...props). ALL drop wiring
              // stays on the card div; only the element that STARTS a drag moves,
              // so a container card can no longer be shadowed by nested draggable
              // children (the card surface is drop-only).
              data-screen-drag-handle={canDrag ? block.id : undefined}
              draggable={canDrag ? true : undefined}
              onDragStart={
                canDrag
                  ? (event) => {
                      // Belt-and-braces: no ancestor drag source remains, but a
                      // nested badge's dragstart must never leak upward.
                      event.stopPropagation();
                      event.dataTransfer?.setData("text/plain", block.id);
                      if (event.dataTransfer) event.dataTransfer.effectAllowed = "move";
                      setDraggingBlockId(block.id);
                    }
                  : undefined
              }
              onDragEnd={
                canDrag
                  ? () => {
                      setDraggingBlockId(null);
                      setDragHoverTarget(null);
                    }
                  : undefined
              }
              className={cn(
                "absolute -top-2 left-3 z-10 px-1.5 py-0 text-[10px] font-medium",
                canDrag && "cursor-grab active:cursor-grabbing"
              )}
            >
              {screenBlockLabels[block.type as ScreenBlockKind] ?? block.type}
            </Badge>
            {renderBuilderActions ? (
              <div className="absolute -top-2 right-3 z-10">{renderBuilderActions(block)}</div>
            ) : null}
          </>
        ) : null}
        {content}
      </div>
    );

    const commitBindingValue = (
      binding: ScreenFieldBinding,
      field: ContentField,
      nextValue: string
    ) => {
      if (field.name === "title") {
        onTitleChange?.(nextValue);
        return;
      }
      if (field.name === "slug") {
        onSlugChange?.(nextValue);
        return;
      }
      onFieldChange?.(binding.field, normalizeInlineFieldValue(nextValue, field));
    };

    const canWriteBinding = (binding: ScreenFieldBinding | null, field: ContentField | null) =>
      mode === "entry" &&
      enableInlineFieldEditing &&
      Boolean(binding) &&
      bindingAllowsWrite(binding) &&
      Boolean(field) &&
      Boolean(
        field &&
        (field.name === "title" ||
          field.name === "slug" ||
          fields?.some((item) => item.name === field.name))
      );

    const canEditBindingInline = (binding: ScreenFieldBinding | null, field: ContentField | null) =>
      canWriteBinding(binding, field) &&
      Boolean(
        field && (field.name === "title" || field.name === "slug" || isInlineEditableField(field))
      );

    if (block.type === "record-header") {
      const readBoundValue = (propPath: string) => {
        const binding = resolveBlockBinding(bindings, block.id, propPath);
        return {
          binding,
          value: binding ? readBindingPathValue(values, binding.field) : block.data[propPath],
          field: binding ? findField(fields, binding.field) : null,
        };
      };
      const title = readBoundValue("title");
      const eyebrow = readBoundValue("eyebrow");
      const subtitle = readBoundValue("subtitle");
      const renderHeaderText = (
        propPath: "title" | "eyebrow" | "subtitle",
        item: ReturnType<typeof readBoundValue>,
        className: string,
        as: "p" | "h2",
        fallback = ""
      ) => {
        // TASK-498-01 A3: builder mode renders a bound header line as a muted mono
        // `{{ label }}` Token (graphical schema) — never the resolved value or an
        // inline-edit surface. Entry/preview resolve the real value below.
        if (mode === "builder" && item.binding) {
          const tokenLabel =
            item.field?.label ?? systemFieldLabels.get(item.binding.field) ?? item.binding.field;
          const Tag = as;
          return (
            <Tag className={withTextPresentation(block.id, className)}>
              <RuntimeToken>{`{{ ${tokenLabel} }}`}</RuntimeToken>
            </Tag>
          );
        }
        const text = item.binding
          ? editableTextValue(item.value)
          : readText(block.data, propPath, fallback);
        const displayText = text || fallback;
        const editable =
          item.binding !== null &&
          item.field !== null &&
          canEditBindingInline(item.binding, item.field);
        if (!displayText && !editable) return null;
        return (
          <InlineEditWrapper
            as={as}
            value={text}
            placeholder={fallback}
            editable={editable}
            ariaLabel={item.field?.label ?? propPath}
            className={withTextPresentation(block.id, className)}
            onCommit={(next) => {
              if (!item.binding || !item.field) return;
              commitBindingValue(item.binding, item.field, next);
            }}
          />
        );
      };
      return wrap(
        <div className={cn("px-5 py-4", mode === "preview" && "rounded-xl bg-muted/20")}>
          {renderHeaderText(
            "eyebrow",
            eyebrow,
            "text-xs font-semibold uppercase tracking-wider text-muted-foreground",
            "p"
          )}
          {renderHeaderText(
            "title",
            title,
            "mt-1 block text-2xl font-semibold text-foreground",
            "h2",
            "Record"
          )}
          {renderHeaderText("subtitle", subtitle, "mt-1 text-sm text-muted-foreground", "p")}
        </div>
      );
    }

    if (block.type === "field") {
      const binding = resolveBlockBinding(bindings, block.id, "value");
      const fieldName =
        binding?.field ?? (typeof block.data.field === "string" ? block.data.field : "");
      const field = fieldName ? findField(fields, fieldName) : null;
      // TASK-503-02 B: explicit-string label semantics. A stored string (incl. a
      // trimmed "") is honored verbatim → an explicitly cleared label renders NO
      // label <p>; an absent/non-string key falls through to today's default
      // chain so stored screens render identically.
      const defaultLabel =
        field?.label ?? (fieldName ? (systemFieldLabels.get(fieldName) ?? fieldName) : "Field");
      const rawLabel = block.data.label;
      const label = typeof rawLabel === "string" ? rawLabel.trim() : defaultLabel;
      // Builder {{ token }} / a11y stand-in — keeps the binding visible and the
      // accessible name non-empty even with a cleared label (reuses defaultLabel
      // so cleared and never-set show the same token text).
      const tokenLabel = label || defaultLabel;
      const value = binding ? readBindingPathValue(values, binding.field) : undefined;
      const presentationMediaValue =
        field?.type === "media" ? readMediaPresentationValue(block.id) : null;
      const displayValue = presentationMediaValue ?? value;
      const writable = bindingAllowsWrite(binding);
      const canEdit = canWriteBinding(binding, field);
      // TASK-503-02 C(i): binding badges show in preview always; in entry ONLY
      // when the user opted in (showFieldMetadata); builder rendered null here
      // already, so this preserves today's builder output exactly.
      const showBindingBadges = mode === "preview" || (mode === "entry" && showFieldMetadata);
      return wrap(
        <div className={cn("px-4 py-3", mode === "preview" && "rounded-xl border bg-card")}>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              {label ? (
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {label}
                </p>
              ) : null}
              {mode === "builder" ? (
                // TASK-498-01 A3: builder mode shows the muted `{{ label }}` Token in
                // place of the resolved value / inline-edit surface (graphical schema).
                // TASK-503-02 B: uses tokenLabel so a cleared label still shows the
                // field-name stand-in.
                <p className={withTextPresentation(block.id, "mt-2 break-words text-base")}>
                  <RuntimeToken>{`{{ ${tokenLabel} }}`}</RuntimeToken>
                </p>
              ) : canEdit ? (
                field && binding && isInlineEditableField(field) ? (
                  <InlineEditWrapper
                    as="p"
                    value={editableTextValue(value)}
                    editable
                    ariaLabel={tokenLabel}
                    placeholder="Empty"
                    className={withTextPresentation(
                      block.id,
                      "mt-2 break-words text-base text-foreground"
                    )}
                    onCommit={(next) => commitBindingValue(binding, field, next)}
                  />
                ) : (
                  <div className={withTextPresentation(block.id, "mt-3")}>
                    <FieldRenderer
                      field={field!}
                      value={displayValue}
                      onChange={(next) => onFieldChange?.(field!.name, next)}
                      relationTargets={relationTargets}
                      display="compact"
                    />
                  </div>
                )
              ) : (
                <p
                  className={withTextPresentation(
                    block.id,
                    "mt-2 break-words text-base text-foreground"
                  )}
                >
                  {stringifyValue(displayValue)}
                </p>
              )}
            </div>
            {showBindingBadges ? (
              binding ? (
                <Badge variant={writable ? "default" : "outline"} className="shrink-0 text-[10px]">
                  {writable ? "Editable" : "Read"}
                </Badge>
              ) : (
                <Badge variant="outline" className="shrink-0 text-[10px]">
                  Unbound
                </Badge>
              )
            ) : null}
          </div>
          {readText(block.data, "helper") ? (
            <p className="mt-2 text-xs text-muted-foreground">{readText(block.data, "helper")}</p>
          ) : null}
          {/* TASK-503-02 C(i): the field-type badge had NO mode gate today
              (rendered in builder+preview+entry). Keep builder+preview; gate ONLY
              entry behind showFieldMetadata (dropping it from builder would be a
              498 byte-parity regression). */}
          {field && (mode === "builder" || showBindingBadges) ? (
            <Badge variant="outline" className="mt-3 text-[10px] uppercase">
              {fieldTypeLabels[field.type as keyof typeof fieldTypeLabels] ?? field.type}
            </Badge>
          ) : null}
          {binding && !field ? (
            <p className="mt-2 text-xs text-destructive">
              The bound field `{binding.field}` is missing from this content type.
            </p>
          ) : null}
          {binding && fieldErrors[binding.field] ? (
            <p className="mt-2 text-xs text-destructive">{fieldErrors[binding.field]}</p>
          ) : null}
        </div>
      );
    }

    if (block.type === "field-group") {
      return wrap(
        <section className={cn("p-4", mode === "preview" && "rounded-xl border bg-card")}>
          <div className="mb-4">
            <h3 className="text-base font-semibold">{readText(block.data, "title", "Group")}</h3>
            {readText(block.data, "description") ? (
              <p className="text-sm text-muted-foreground">{readText(block.data, "description")}</p>
            ) : null}
          </div>
          {renderSlots(block, renderBlock, childCtx)}
        </section>
      );
    }

    if (block.type === "columns") {
      return wrap(
        <div className={cn("p-4", mode === "preview" && "rounded-xl border bg-card")}>
          {renderSlots(block, renderBlock, childCtx, { columns: true })}
        </div>
      );
    }

    if (block.type === "rich-text") {
      return wrap(
        <div
          className={cn(
            "px-4 py-3 text-sm text-muted-foreground",
            resolveTextPresentationClassName(block.id),
            mode === "preview" && "rounded-xl border bg-card"
          )}
        >
          {readText(block.data, "content", "Add supporting text")}
        </div>
      );
    }

    if (block.type === "heading") {
      const binding = resolveBlockBinding(bindings, block.id, "text");
      const label = readText(block.data, "label", "Heading");
      const level = typeof block.data.level === "number" ? block.data.level : 2;
      const align = readText(block.data, "align", "left");
      const staticText = readText(block.data, "text", label);
      const bound = binding ? readBindingPathValue(values, binding.field) : undefined;
      const content =
        mode === "builder" ? (
          binding ? (
            <RuntimeToken>{`{{ ${label} }}`}</RuntimeToken>
          ) : (
            staticText
          )
        ) : binding ? (
          stringifyValue(bound)
        ) : (
          staticText
        );
      const alignClass =
        align === "center" ? "text-center" : align === "right" ? "text-right" : "text-left";
      const sizeClass = level === 1 ? "text-3xl" : level === 3 ? "text-lg" : "text-2xl";
      const Tag = level === 1 ? "h1" : level === 3 ? "h3" : "h2";
      return wrap(
        <div className={cn("px-4 py-3", mode === "preview" && "rounded-xl border bg-card")}>
          <Tag
            className={withTextPresentation(
              block.id,
              cn("font-semibold text-foreground", sizeClass, alignClass)
            )}
          >
            {content}
          </Tag>
        </div>
      );
    }

    if (block.type === "text") {
      const tone = readText(block.data, "tone", "default");
      const content = readText(block.data, "content", "Add supporting text");
      return wrap(
        <div className={cn("px-4 py-3", mode === "preview" && "rounded-xl border bg-card")}>
          <p
            className={withTextPresentation(
              block.id,
              cn("text-sm", tone === "muted" ? "text-muted-foreground" : "text-foreground")
            )}
          >
            {content}
          </p>
        </div>
      );
    }

    if (block.type === "stat") {
      const binding = resolveBlockBinding(bindings, block.id, "value");
      // TASK-503-02 B: explicit-string label semantics (same model as field;
      // "Stat" is the never-set default). A cleared "" renders no label <p>.
      const rawLabel = block.data.label;
      const label = typeof rawLabel === "string" ? rawLabel.trim() : "Stat";
      const tokenLabel = label || "Stat";
      const format = readText(block.data, "format", "number");
      const trend = readText(block.data, "trend", "auto");
      const raw = binding ? readBindingPathValue(values, binding.field) : undefined;
      const value =
        mode === "builder" ? (
          binding ? (
            <RuntimeToken>{`{{ ${tokenLabel} }}`}</RuntimeToken>
          ) : (
            "—"
          )
        ) : (
          formatStatValue(raw, format)
        );
      return wrap(
        <div className={cn("px-4 py-3", mode === "preview" && "rounded-xl border bg-card")}>
          {label ? (
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {label}
            </p>
          ) : null}
          <div
            className={withTextPresentation(
              block.id,
              "mt-1 text-2xl font-semibold text-foreground"
            )}
          >
            {value}
          </div>
          {trend && trend !== "auto" ? (
            <Badge variant="outline" className="mt-2 text-[10px] uppercase">
              {trend}
            </Badge>
          ) : null}
        </div>
      );
    }

    if (block.type === "divider") {
      const variant = readText(block.data, "variant", "line");
      if (variant === "space") {
        return wrap(<div className="h-6" />);
      }
      if (variant === "label") {
        const label = readText(block.data, "label", "");
        return wrap(
          <div className="flex items-center gap-3 px-4 py-2">
            <span className="h-px flex-1 bg-border" />
            {label ? (
              <span className="text-xs font-medium text-muted-foreground">{label}</span>
            ) : null}
            <span className="h-px flex-1 bg-border" />
          </div>
        );
      }
      return wrap(
        <div className="px-4 py-2">
          <hr className="border-border" />
        </div>
      );
    }

    if (block.type === "image") {
      const binding = resolveBlockBinding(bindings, block.id, "src");
      const label = readText(block.data, "label", "Image");
      const fit = readText(block.data, "fit", "cover");
      // TASK-503-02 E: authored ratio enum → aspect-* wrapper class. "auto",
      // absent, or a legacy free-text value (e.g. "16:9") misses the map → no
      // class → today's exact markup.
      const ratioValue = typeof block.data.ratio === "string" ? block.data.ratio : "auto";
      const ratioClass = screenImageRatioClass[ratioValue];
      const bound = binding ? readBindingPathValue(values, binding.field) : undefined;
      // TASK-500-04 / 503-02 E: authored static src, now filtered at READ time
      // (defense-in-depth — idempotent for saved docs since the save path already
      // normalized, but it gates the builder's live preview of a raw inspector
      // draft pre-503-03 so an unsafe scheme can never reach <img src>).
      const staticSrc = normalizeScreenImageSrc(readText(block.data, "src"));
      const src =
        readMediaPresentationValue(block.id) ?? resolveMediaSrc(bound) ?? (staticSrc || null);
      // Builder mirrors heading: a bound image keeps the {{ label }} token; an unbound
      // image with an authored static src previews the real image.
      const showImage = Boolean(src) && (mode !== "builder" || (!binding && Boolean(staticSrc)));
      if (showImage && src) {
        return wrap(
          <div className={cn("px-4 py-3", mode === "preview" && "rounded-xl border bg-card")}>
            {ratioClass ? (
              <div className={cn("relative w-full overflow-hidden rounded-lg", ratioClass)}>
                <img
                  src={src}
                  alt={label}
                  className={cn(
                    "h-full w-full",
                    fit === "contain" ? "object-contain" : "object-cover"
                  )}
                />
              </div>
            ) : (
              <img
                src={src}
                alt={label}
                className={cn(
                  "w-full rounded-lg",
                  fit === "contain" ? "object-contain" : "object-cover"
                )}
              />
            )}
          </div>
        );
      }
      return wrap(
        <div className={cn("px-4 py-3", mode === "preview" && "rounded-xl border bg-card")}>
          <div
            className={cn(
              "flex w-full items-center justify-center rounded-lg bg-muted text-xs text-muted-foreground",
              ratioClass ?? "aspect-video"
            )}
          >
            {binding ? (
              <RuntimeToken>{`{{ ${label} }}`}</RuntimeToken>
            ) : (
              <span className="inline-flex items-center gap-1.5">
                <ImageIcon className="h-4 w-4" />
                {label}
              </span>
            )}
          </div>
        </div>
      );
    }

    if (block.type === "button") {
      const binding = resolveBlockBinding(bindings, block.id, "href");
      const label = readText(block.data, "label", "Button");
      const variant = readText(block.data, "variant", "primary");
      const action = readText(block.data, "action", "link");
      const boundHref = binding ? readBindingPathValue(values, binding.field) : block.data.href;
      const href = typeof boundHref === "string" ? boundHref : undefined;
      const variantClass =
        variant === "secondary"
          ? "bg-secondary text-secondary-foreground"
          : variant === "ghost"
            ? "border border-border text-foreground"
            : "bg-primary text-primary-foreground";
      const ctaClass = cn(
        "inline-flex items-center rounded-lg px-4 py-2 text-sm font-medium",
        variantClass
      );
      return wrap(
        <div className={cn("px-4 py-3", mode === "preview" && "rounded-xl border bg-card")}>
          {mode !== "builder" && action === "link" && href ? (
            <a href={href} className={ctaClass}>
              {label}
            </a>
          ) : (
            <span className={ctaClass}>{label}</span>
          )}
        </div>
      );
    }

    if (block.type === "tabs") {
      const tabs = Array.isArray(block.data.tabs)
        ? (block.data.tabs as Array<Record<string, unknown>>)
        : [];
      return wrap(
        <div className={cn("px-4 py-3", mode === "preview" && "rounded-xl border bg-card")}>
          <div className="flex flex-wrap gap-2 border-b border-border pb-2">
            {tabs.map((tab, index) => {
              const tabId = typeof tab.id === "string" ? tab.id : `tab-${index + 1}`;
              const tabLabel = typeof tab.label === "string" && tab.label ? tab.label : tabId;
              return (
                <span
                  key={tabId}
                  className={cn(
                    "rounded-md px-2.5 py-1 text-xs font-medium",
                    index === 0 ? "bg-muted text-foreground" : "text-muted-foreground"
                  )}
                >
                  {tabLabel}
                </span>
              );
            })}
          </div>
          <div className="mt-3 space-y-4">
            {tabs.map((tab, index) => {
              const tabId = typeof tab.id === "string" ? tab.id : `tab-${index + 1}`;
              const slotBlocks = block.slots?.[tabId] ?? [];
              // TASK-500-02 (builder only): each tab slot mirrors the renderSlots
              // affordances — per-slot drop zone + sibling gaps + armable empty
              // placeholder; preview/entry markup stays byte-identical.
              const showAffordances = mode === "builder" && !childCtx.suppressed;
              const tabEndTarget: ScreenInsertTarget = {
                kind: "slot-end",
                sectionId: childCtx.sectionId,
                parentId: block.id,
                slotId: tabId,
              };
              const tabArmed =
                canInsert && insertPoint ? insertTargetsEqual(insertPoint, tabEndTarget) : false;
              const tabDragHover = showAffordances && isDragHover(tabEndTarget);
              const tabChildDropTargets = (
                childIndex: number
              ): RenderBlockContext["dropTargets"] | undefined =>
                showAffordances
                  ? {
                      before: {
                        kind: "slot-index",
                        sectionId: childCtx.sectionId,
                        parentId: block.id,
                        slotId: tabId,
                        index: childIndex,
                      },
                      after: {
                        kind: "slot-index",
                        sectionId: childCtx.sectionId,
                        parentId: block.id,
                        slotId: tabId,
                        index: childIndex + 1,
                      },
                    }
                  : undefined;
              return (
                <div
                  key={tabId}
                  className="space-y-3"
                  data-screen-runtime-tab={tabId}
                  {...(showAffordances ? dropHandlers(tabEndTarget) : {})}
                >
                  {slotBlocks.length > 0 ? (
                    showAffordances ? (
                      <>
                        {slotBlocks.map((child, childIndex) => (
                          <Fragment key={child.id}>
                            {renderInsertGap({
                              kind: "slot-index",
                              sectionId: childCtx.sectionId,
                              parentId: block.id,
                              slotId: tabId,
                              index: childIndex,
                            })}
                            {renderBlock(child, {
                              ...childCtx,
                              dropTargets: tabChildDropTargets(childIndex),
                            })}
                          </Fragment>
                        ))}
                        {renderInsertGap({
                          kind: "slot-index",
                          sectionId: childCtx.sectionId,
                          parentId: block.id,
                          slotId: tabId,
                          index: slotBlocks.length,
                        })}
                      </>
                    ) : (
                      slotBlocks.map((child) =>
                        renderBlock(child, { ...childCtx, dropTargets: undefined })
                      )
                    )
                  ) : showAffordances && canInsert ? (
                    <button
                      type="button"
                      data-screen-slot-dropzone={tabId}
                      data-insert-parent={block.id}
                      data-armed={tabArmed ? "true" : "false"}
                      data-drag-hover={tabDragHover ? "true" : undefined}
                      className={cn(
                        "w-full rounded-lg border border-dashed bg-muted/20 px-3 py-4 text-left text-sm text-muted-foreground transition-colors hover:border-ring/50 hover:text-foreground",
                        tabArmed && "border-primary ring-1 ring-primary",
                        !tabArmed && tabDragHover && "border-primary bg-primary/10 text-foreground"
                      )}
                      onClick={(event) => {
                        event.stopPropagation();
                        onSetInsertPoint?.(tabArmed ? null : tabEndTarget);
                      }}
                      {...dropHandlers(tabEndTarget)}
                    >
                      Empty {typeof tab.label === "string" && tab.label ? tab.label : tabId}
                    </button>
                  ) : (
                    <div className="rounded-lg border border-dashed bg-muted/20 px-3 py-4 text-sm text-muted-foreground">
                      Empty {typeof tab.label === "string" && tab.label ? tab.label : tabId}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      );
    }

    if (block.type === "related-list") {
      // TASK-498-03 B3.3 — render host-precomputed related entries for the
      // checklist / activity / cards variants; builder mode + unresolved (undefined
      // in `relatedEntries`) render the loading skeleton
      // (prototype CustomScreenEditorPreview.tsx:164-183). Display-only: no write-back.
      const label = readText(block.data, "label", "Related list");
      const variant = readText(block.data, "variant", "checklist");
      const target = readText(block.data, "target", "records");
      // `null` = builder or not-yet-resolved → skeleton; array (incl. empty) = resolved.
      const rows = mode === "builder" ? null : (relatedEntries[block.id] ?? null);

      const skeleton = (
        <div className="flex flex-col gap-2.5">
          {[0, 1, 2].map((row) => (
            <div key={row} className="flex items-center gap-3">
              <div className="size-8 shrink-0 rounded-lg bg-muted" />
              <div className="min-w-0 flex-1">
                <div className="h-2.5 w-2/3 rounded bg-muted-foreground/20" />
                <div className="mt-1.5 h-2 w-1/3 rounded bg-muted-foreground/10" />
              </div>
              <span className="inline-flex shrink-0 rounded-full bg-primary-soft px-2 py-0.5 text-xs text-primary-soft-foreground">
                Chip
              </span>
            </div>
          ))}
        </div>
      );

      const emptyState = <p className="text-sm text-muted-foreground">No related {target}.</p>;

      // Loading / builder skeleton (label above the shimmer rows, no border).
      if (rows == null) {
        return wrap(
          <div className={cn("px-4 py-3", mode === "preview" && "rounded-xl border bg-card")}>
            <div className="mb-3 text-sm font-medium">{label}</div>
            {skeleton}
          </div>
        );
      }

      // Cards variant — a grid of title + status chip + displayValue.
      if (variant === "cards") {
        return wrap(
          <div className={cn("px-4 py-3", mode === "preview" && "rounded-xl border bg-card")}>
            <div className="mb-3 text-sm font-medium">{label}</div>
            {rows.length === 0 ? (
              emptyState
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {rows.map((row) => (
                  <div
                    key={row.id}
                    className="rounded-lg border border-border bg-card p-3"
                    data-screen-related-entry={row.id}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
                        {row.title}
                      </p>
                      {row.status ? (
                        <Badge variant="outline" className="shrink-0 text-[10px] uppercase">
                          {row.status}
                        </Badge>
                      ) : null}
                    </div>
                    {row.displayValue ? (
                      <p className="mt-1 text-xs text-muted-foreground">{row.displayValue}</p>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      }

      // checklist / activity — bordered card with a header label + divided rows
      // (prototype CustomScreenEntryEditorPreview.tsx:195-235).
      return wrap(
        <div className={cn("px-4 py-3", mode === "preview" && "rounded-xl border bg-card")}>
          <div className="overflow-hidden rounded-xl border border-border">
            <div className="border-b border-border px-4 py-2.5 text-sm font-semibold">{label}</div>
            {rows.length === 0 ? (
              <div className="px-4 py-3">{emptyState}</div>
            ) : (
              <div className="divide-y divide-border">
                {rows.map((row) =>
                  variant === "activity" ? (
                    <div
                      key={row.id}
                      className="flex items-center gap-3 px-4 py-2.5"
                      data-screen-related-entry={row.id}
                    >
                      <span
                        aria-hidden
                        className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-muted text-xs font-medium text-muted-foreground"
                      >
                        {relatedInitials(row.title)}
                      </span>
                      <p className="min-w-0 flex-1 truncate text-sm">
                        <span className="font-medium">{row.title}</span>
                        {row.displayValue ? (
                          <span className="text-muted-foreground"> {row.displayValue}</span>
                        ) : null}
                      </p>
                      {row.updatedAt ? (
                        <span className="shrink-0 text-xs text-muted-foreground">
                          {formatRelatedTime(row.updatedAt)}
                        </span>
                      ) : null}
                    </div>
                  ) : (
                    <div
                      key={row.id}
                      className="flex items-center gap-3 px-4 py-2.5"
                      data-screen-related-entry={row.id}
                    >
                      <Checkbox aria-label={row.title} />
                      <span className="min-w-0 flex-1 truncate text-sm">{row.title}</span>
                      {row.status ? (
                        <Badge variant="outline" className="shrink-0 text-[10px] uppercase">
                          {row.status}
                        </Badge>
                      ) : null}
                    </div>
                  )
                )}
              </div>
            )}
          </div>
        </div>
      );
    }

    return wrap(
      <div
        className={cn(
          "flex items-start gap-3 px-4 py-4 text-sm text-muted-foreground",
          mode === "preview" && "rounded-xl border border-dashed bg-muted/20"
        )}
      >
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
        <div>
          <p className="font-medium text-foreground">Legacy block placeholder</p>
          <p>{block.legacyWidgetType ?? block.type}</p>
        </div>
      </div>
    );
  };

  // TASK-500 post-audit (sections first-class in the empty document): a brand-new
  // screen normalizes to ZERO sections, and "Add section" must produce a VISIBLE,
  // selectable frame (rename/move/delete chrome + section-end drop zone) even
  // before the first block exists. Builder mode therefore only shows the generic
  // empty message when there are no sections at all; preview/entry keep the
  // original all-blocks-empty gate so their markup stays byte-identical
  // (TASK-498 look parity).
  const showEmptyMessage =
    mode === "builder"
      ? document.sections.length === 0
      : !document.sections.some((section) => section.blocks.length > 0);
  if (showEmptyMessage) {
    return (
      <div className="rounded-xl border border-dashed bg-background/40 px-8 py-16 text-center text-sm text-muted-foreground">
        {emptyMessage ?? "Add screen blocks to compose this view."}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {document.sections.map((section) => {
        const selected = selectedSectionId === section.id;
        const isInteractive = mode === "builder" && Boolean(onSelectSection);
        const sectionEndTarget: ScreenInsertTarget = {
          kind: "section-end",
          sectionId: section.id,
        };
        const sectionDragHover = mode === "builder" && isDragHover(sectionEndTarget);
        // TASK-505-02: grid emission is decided ONCE here and threaded to the
        // container + the section-index insert-gaps. Absent columns → gridded=false
        // → nothing changes (byte-identical to today's space-y-4 vertical stack).
        const sectionColumns = section.style?.columns;
        const gridTemplate = sectionColumns
          ? screenSectionColumnTemplate[sectionColumns]
          : undefined;
        const gridded = gridTemplate !== undefined;
        const title =
          typeof section.data.title === "string" && section.data.title.trim()
            ? section.data.title.trim()
            : section.label || "Section";
        return (
          <section
            key={section.id}
            className={cn(
              "relative p-4 transition",
              mode === "preview"
                ? "rounded-2xl border bg-background/80"
                : mode === "builder"
                  ? cn(
                      "bg-background/60",
                      selectionBorder({
                        level: "container",
                        selected,
                        interactive: isInteractive,
                      })
                    )
                  : // TASK-503-02 C(ii): entry surface flatten — transparent
                    // section (the block wrapper carries the single opaque card).
                    // Forked into 3 so builder keeps bg-background/60 (498 parity).
                    cn(
                      "bg-transparent",
                      selectionBorder({
                        level: "container",
                        selected,
                        interactive: isInteractive,
                      })
                    )
            )}
            data-screen-section-id={section.id}
            data-screen-section-type={section.type}
            data-selected={selected ? "true" : "false"}
            role={isInteractive ? "button" : undefined}
            tabIndex={isInteractive ? 0 : undefined}
            onClick={
              isInteractive
                ? (event) => {
                    event.stopPropagation();
                    onSelectSection?.(section.id);
                  }
                : undefined
            }
            onKeyDown={
              isInteractive
                ? (event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      event.stopPropagation();
                      onSelectSection?.(section.id);
                    }
                  }
                : undefined
            }
          >
            {mode === "builder" ? (
              // Chrome shows only when the SECTION ITSELF is the active target
              // (a selected block keeps the plain title — its own chrome wins).
              selected &&
              !selectedBlockId &&
              (onRenameSection || onMoveSection || onDeleteSection) ? (
                // TASK-500-01: selected-section chrome — inline rename input +
                // move/delete cluster. Rendered ONLY in builder mode when the
                // section is selected, so unselected builder + preview/entry
                // stay byte-identical (TASK-498 look parity).
                <div className="mb-3 flex items-center gap-1.5">
                  {onRenameSection ? (
                    <input
                      key={`${section.id}-${title}`}
                      type="text"
                      defaultValue={title}
                      aria-label="Rename section"
                      data-screen-section-rename="true"
                      className="h-7 min-w-0 flex-1 rounded-md border border-border bg-background px-2 text-xs font-semibold text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      // REQUIRED (real-input bug guard): the parent <section>
                      // onKeyDown preventDefault()s Space (swallowing it) and
                      // re-selects on Enter. Stop propagation HERE so Space/Enter
                      // reach the field and Enter commits the rename WITHOUT
                      // re-triggering the section select.
                      onClick={(event) => event.stopPropagation()}
                      onKeyDown={(event) => {
                        event.stopPropagation();
                        if (event.key === "Enter") {
                          event.preventDefault();
                          onRenameSection(section.id, event.currentTarget.value);
                        }
                      }}
                      onBlur={(event) => onRenameSection(section.id, event.currentTarget.value)}
                    />
                  ) : (
                    <div className="min-w-0 flex-1 truncate text-xs font-semibold uppercase text-muted-foreground">
                      {title}
                    </div>
                  )}
                  <div className="flex shrink-0 items-center gap-0.5">
                    {onMoveSection ? (
                      <>
                        <button
                          type="button"
                          aria-label="Move section up"
                          data-screen-section-move-up="true"
                          className="flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                          onClick={(event) => {
                            event.stopPropagation();
                            onMoveSection(section.id, "up");
                          }}
                        >
                          <MoveUp className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          aria-label="Move section down"
                          data-screen-section-move-down="true"
                          className="flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                          onClick={(event) => {
                            event.stopPropagation();
                            onMoveSection(section.id, "down");
                          }}
                        >
                          <MoveDown className="h-3.5 w-3.5" />
                        </button>
                      </>
                    ) : null}
                    {onDeleteSection ? (
                      <button
                        type="button"
                        aria-label="Delete section"
                        data-screen-section-delete="true"
                        className="flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-destructive"
                        onClick={(event) => {
                          event.stopPropagation();
                          onDeleteSection(section.id);
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    ) : null}
                  </div>
                </div>
              ) : (
                // TASK-498-01 A3: builder section header is the human title only —
                // no `font-mono section.id` debug string.
                <div className="mb-3 text-xs font-semibold uppercase text-muted-foreground">
                  {title}
                </div>
              )
            ) : null}
            <div
              className={cn(
                // TASK-505-02: gridded → CSS grid (auto-flow cells, DOM order);
                // unset columns → the exact "space-y-4" stack as before (byte-identical).
                gridded ? "grid" : "space-y-4",
                // Drag feedback: the section body lights up when the in-flight
                // drop would append to THIS section's end.
                sectionDragHover && "rounded-lg bg-primary/5 ring-1 ring-primary/50"
              )}
              // TASK-505-02: inline grid track/gap ONLY when gridded — absent-style
              // emits no `style` attr, so stored-V4 docs round-trip byte-identically.
              style={
                gridded
                  ? {
                      gridTemplateColumns: gridTemplate,
                      gap: section.style?.columnGap ?? SCREEN_SECTION_COLUMN_GAP_DEFAULT,
                    }
                  : undefined
              }
              // TASK-500-02 (builder only): the section body is a drop target —
              // dropping anywhere that no inner gap/slot/card claimed appends to
              // the section's end (inner zones stopPropagation their own drops).
              {...(mode === "builder"
                ? {
                    "data-screen-section-dropzone": section.id,
                    "data-drag-hover": sectionDragHover ? "true" : undefined,
                    ...dropHandlers(sectionEndTarget),
                  }
                : {})}
            >
              {section.blocks.length > 0 ? (
                mode === "builder" && canInsert ? (
                  <>
                    {section.blocks.map((block, index) => (
                      <Fragment key={block.id}>
                        {/* TASK-505-02: in a gridded section the INTER-block gaps
                            would each steal a full row and force every block onto
                            its own row (breaking side-by-side columns), so only the
                            section-start gap (index 0) is rendered here, full-row;
                            between-cell reorder/insert rides the per-card
                            before/after dropTargets below (cardDropTargets).
                            Non-gridded sections keep a gap at every index (as today). */}
                        {(!gridded || index === 0) &&
                          renderInsertGap(
                            {
                              kind: "section-index",
                              sectionId: section.id,
                              index,
                            },
                            { fullRow: gridded }
                          )}
                        {renderBlock(block, {
                          sectionId: section.id,
                          suppressed: false,
                          dropTargets: {
                            before: { kind: "section-index", sectionId: section.id, index },
                            after: {
                              kind: "section-index",
                              sectionId: section.id,
                              index: index + 1,
                            },
                          },
                        })}
                      </Fragment>
                    ))}
                    {renderInsertGap(
                      {
                        kind: "section-index",
                        sectionId: section.id,
                        index: section.blocks.length,
                      },
                      { fullRow: gridded }
                    )}
                  </>
                ) : (
                  section.blocks.map((block) =>
                    renderBlock(block, { sectionId: section.id, suppressed: false })
                  )
                )
              ) : (
                <div
                  className="rounded-xl border border-dashed bg-muted/20 px-4 py-8 text-center text-sm text-muted-foreground"
                  // TASK-505-02: a gridded but empty section centers the message
                  // across the row instead of stuffing it into cell 1.
                  style={gridded ? { gridColumn: "1 / -1" } : undefined}
                >
                  Empty section
                </div>
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}
