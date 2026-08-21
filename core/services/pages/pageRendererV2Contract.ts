import type { CSSProperties, ReactNode } from "react";

import type { PageBlockPath } from "./pageBlockPaths";
import type { PageBlockGridPlacementTarget } from "./pageBlockGridPlacement";
import type { PageReplicaIdentityContext } from "./pageRendererReplicaIdentity";
import type { PageRuntimeDataByBlockId } from "./pageRuntimeBindingContract";
import { PAGE_BLOCK_ID_ATTRIBUTE, PAGE_SECTION_ID_ATTRIBUTE } from "./pageResponsiveCss";
import type { PageBlockSlotKey, PageBlockV2, PageSectionV2 } from "./pageDocumentV2Types";

export type PageRenderMode = "runtime" | "admin-preview";
export type PageSectionLayoutMode = "runtime" | "canvas-device";

export type PageSectionStyleProperties = CSSProperties & {
  "--coderso-section-accent"?: string;
};

export type PageBlockStyle = NonNullable<PageBlockV2["style"]>;

export type PageBlockStyleProperties = CSSProperties & {
  "--coderso-block-text"?: string;
  "--coderso-block-surface"?: string;
};

export type PageSectionDataAttributes = {
  "data-page-section": PageSectionV2["type"];
  /** Scope hook consumed by the responsive CSS contract (`pageResponsiveCss`). */
  [PAGE_SECTION_ID_ATTRIBUTE]: string;
  "data-page-variant": PageSectionV2["variant"];
  "data-page-section-template": string;
};

export type PageBlockDataAttributes = {
  "data-page-block": PageBlockV2["type"];
  /**
   * Canonical selection/runtime id. TASK-539-05-L01 — an APPROVED marquee
   * replica frame deliberately omits it and emits the style-scope alias
   * (`PAGE_MARQUEE_REPLICA_BLOCK_STYLE_SCOPE_ATTRIBUTE`) instead, so the
   * replicated node never claims the canonical `data-block-id` (its value
   * stays a single DOM node). Optional to model that one replica case; every
   * primary/canonical frame still emits it.
   */
  [PAGE_BLOCK_ID_ATTRIBUTE]?: string;
};

export type PageSectionRenderProps = {
  sectionClassName: string;
  contentClassName: string;
  style: PageSectionStyleProperties;
  dataAttributes: PageSectionDataAttributes;
};

export type PageBlockRenderProps = {
  className: string;
  style: PageBlockStyleProperties;
  dataAttributes: PageBlockDataAttributes;
};

export type PageBlockFrameRenderer = (input: {
  block: PageBlockV2;
  content: ReactNode;
  renderProps: PageBlockRenderProps;
  blockPath: PageBlockPath;
  depth: number;
  slotKey?: PageBlockSlotKey;
  parentBlock?: PageBlockV2;
}) => ReactNode;

/**
 * Admin-canvas hook (TASK-422-02): receives the exact text source a
 * text-bearing block paints (including renderer fallbacks) so the Page Editor
 * can layer inline editing on top of the same content the front renders. Rich
 * text can also pass sanitized React children for the idle canvas view while
 * keeping plain-text commit semantics; block-rich children pass `display:
 * "block"` so the canvas does not nest block elements inside inline wrappers.
 * Runtime render paths never provide it, so public output is unchanged. `propPath` follows the
 * `pageInlineEditContract` convention (`"text"`, `"label"`, `"items.0"`).
 */
export type PageInlineTextRenderer = (input: {
  block: PageBlockV2;
  propPath: string;
  text: string;
  children?: ReactNode;
  display?: "inline" | "block";
}) => ReactNode;

/**
 * Admin-canvas hook (owner finding #8): invoked once per active columns-block
 * slot AFTER the slot's children so the Page Editor can paint ghost
 * "Add block" tiles inside empty column slots (and a trailing add affordance
 * in non-empty ones). Runtime render paths never provide it, so public output
 * is unchanged — the same parity contract as {@link PageInlineTextRenderer}.
 */
export type PageColumnsSlotTrailingRenderer = (input: {
  block: PageBlockV2;
  slotKey: PageBlockSlotKey;
  ownerPath: PageBlockPath;
  childCount: number;
}) => ReactNode;

/**
 * Admin-canvas hook (owner finding #5, round 3): invoked once per SECTION
 * column wrapper AFTER the column's blocks when per-column composition is
 * active (composition columns >= 2 and at least one root block carries a
 * `style.column` assignment), so the Page Editor can paint a persistent ghost
 * "Add block" tile at the bottom of every column stack. Runtime render paths
 * never provide it, so public output is unchanged — the same parity contract
 * as {@link PageColumnsSlotTrailingRenderer}.
 */
export type PageSectionColumnTrailingRenderer = (input: {
  section: PageSectionV2;
  /** 1-based column index. */
  column: number;
  childCount: number;
}) => ReactNode;

export type PageBlockWithFrameRenderer = (
  block: PageBlockV2,
  context: PageBlockRenderContext
) => ReactNode;

export type PageBlockRenderContext = {
  blockPath: PageBlockPath;
  depth: number;
  includeHiddenBlocks: boolean;
  /**
   * TASK-539-05-L01 — the owning section of the block being rendered. Root
   * blocks receive the real section (for grid-placement classification and
   * reveal-host stamping); nested slot children carry it through unchanged.
   * Undefined only for direct, section-less `renderPageBlockContent` calls.
   */
  section?: PageSectionV2;
  /**
   * TASK-539-05-L01 — the L05-computed grid-item placement target for THIS
   * block, computed exactly once at the section boundary
   * (`resolvePageBlockGridPlacement`). `"block-frame"` keeps the base span
   * style + `PAGE_BLOCK_GRID_ITEM_ATTRIBUTE` on the frame;
   * `"section-template-wrapper"` moves both to the template wrapper;
   * `"none"` (nested children, per-column composition, non-default
   * media-split) emits neither. Undefined only for section-less direct calls
   * (keeps the legacy default span behavior).
   */
  spanTarget?: PageBlockGridPlacementTarget;
  /**
   * TASK-539-05-L01 — the approved marquee replica identity context. When
   * present, every emitted DOM/SVG `id` definition, matching local reference,
   * and identifier-bearing data hook is namespaced through the identity
   * transformer, and block frames emit the style-scope aliases instead of the
   * canonical selection/runtime hooks. Primary (non-replica) renders leave it
   * undefined and stay byte-identical.
   */
  replicaIdentity?: PageReplicaIdentityContext;
  /**
   * TASK-539-05-L01 — a block under a revealing section receives the ONE
   * transform host attribute so its per-child reveal composes through the
   * reveal variable in the shared formula. Set by the section boundary for
   * root blocks and propagated unchanged to every nested slot child.
   */
  transformHost?: boolean;
  renderBlockFrame?: PageBlockFrameRenderer;
  renderInlineText?: PageInlineTextRenderer;
  renderColumnsSlotTrailing?: PageColumnsSlotTrailingRenderer;
  runtimeDataByBlockId?: PageRuntimeDataByBlockId;
  /**
   * Section layout mode threaded into block rendering (TASK-456) so
   * data-bound blocks can emit a canvas-safe representation (interactivity
   * disabled) in the editor. Runtime render paths keep the "runtime" default,
   * so public output is unchanged.
   */
  layoutMode?: PageSectionLayoutMode;
  slotKey?: PageBlockSlotKey;
  parentBlock?: PageBlockV2;
  /**
   * TASK-533-01 (audit remediation): SUPPRESS the block grid span
   * (`colSpan`/`rowSpan` → `gridColumn`/`gridRow`) when the block is rendered
   * inside a per-column composition wrapper. In that path the block's grid
   * parent is a SINGLE-column `<div data-page-section-column>` (not the section
   * content grid), so `grid-column: span N` is a no-op (one column) and
   * `grid-row: span N` spans the WRAPPER's own auto-rows (opening whitespace)
   * instead of doubling the block's height relative to grid siblings — a silent
   * cosmetic failure. Span and per-column `column` assignment are therefore
   * mutually exclusive: when composition is active the span is dropped so the
   * emitted CSS reflects the actual layout (no misleading inert rule). In the
   * pure auto-flow path (no assignments) this stays unset and span works.
   */
  suppressBlockSpan?: boolean;
};

export const joinPageRenderClasses = (...classes: Array<string | false | undefined>) =>
  classes.filter(Boolean).join(" ");

export const readText = (value: unknown, fallback = "") => {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : fallback;
};

export const readNumber = (value: unknown, fallback: number) =>
  typeof value === "number" && Number.isFinite(value) ? value : fallback;

export const readBoolean = (value: unknown, fallback: boolean) =>
  typeof value === "boolean" ? value : fallback;
