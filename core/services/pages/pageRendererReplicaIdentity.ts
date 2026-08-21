/**
 * TASK-539-05-L01 — marquee replica identity contract (direct owner).
 *
 * Pure, Bun-free, import-side-effect free. The stable `pageRendererV2.tsx`
 * facade deliberately does NOT re-export anything from this module: the
 * task-added replica helpers stay direct-owner-only (the L01 facade suite
 * asserts their absence). Renderer modules and the focused direct-owner suite
 * import this file directly.
 *
 * Contract summary (TASK-539-05-L01 section 6):
 * - `PAGE_MARQUEE_REPLICA_SAFE_BY_BLOCK_TYPE` is an exhaustive
 *   `Record<PageBlockType, boolean>`: exactly five types are unsafe
 *   (`video`, `form`, `collection`, `filters`, `embed`), every other current
 *   type is explicitly safe. A future block type cannot silently become
 *   cloneable (the `satisfies` guard fails the build until it is triaged).
 * - `isPageMarqueeReplicaSafeSubtree` is the recursive, hidden-filter-aware
 *   fail-closed safety decision. It rejects a descendant-authored marquee and
 *   every unsafe direct/deep block. The authored marquee OWNER group is never
 *   passed to it: the owner's own `style.marquee` is expected.
 * - Namespaces are deterministic and reversible: each Unicode code point maps
 *   to a fixed-width four-character lowercase base-36 value, so the namespace
 *   stays inside `[a-z0-9-]` with no lossy slug and no truncated hash.
 * - `collectPageReplicaIdentitySets` separates DOM/SVG `id` definitions
 *   (`domIds`: currently switcher tab/panel IDs and sanitized Safe SVG IDs)
 *   from identifier values emitted only as data hooks
 *   (`hookIdentifiers`: block IDs / slot-owner IDs). Membership in one set
 *   never implies membership in the other.
 * - `transformPageReplicaIdentityAttribute` is the ONE pure routing function
 *   for every identity-bearing renderer/Safe-SVG attribute. IDREF/hash/SVG
 *   references rewrite only targets backed by a locally emitted DOM/SVG `id`
 *   (`domIds`); data-hook attributes use only `hookIdentifiers`. Unresolved
 *   references, external/non-hash URLs, and values outside the attribute's
 *   owning set stay byte-for-byte.
 * - The two style-scope aliases are CSS scope hooks ONLY: their value is the
 *   canonical normalized original block ID, they are not DOM IDs/IDREF
 *   targets and not Admin/runtime hooks, and the identity transformer never
 *   rewrites them. The renderer stamps them on the approved replica's block
 *   frame (block-frame alias) and hoisted tilt/layer wrapper (tilt-layer
 *   alias) corresponding to the primary's `data-block-id` /
 *   `data-tilt-parent-for`.
 */

import type { PageBlockV2, PageBlockType } from "./pageDocumentV2Types";
import { getPageBlockActiveSlotKeys } from "./pageDocumentV2Contract";
// These are VALUE constants (used below through `typeof` in the attribute-name
// union AND as real attribute strings in the transform router), so a normal
// (not type-only) import is required.
import { PAGE_BLOCK_ID_ATTRIBUTE, PAGE_TILT_PARENT_LAYER_ATTRIBUTE } from "./pageResponsiveCss";
import { buildSafeSvgTree, type SafeSvgNode } from "./svgSafeTree";

/** Exactly the two styling-only replica scope hooks (values are canonical
 *  original block IDs, never namespaced). */
export const PAGE_MARQUEE_REPLICA_BLOCK_STYLE_SCOPE_ATTRIBUTE =
  "data-page-marquee-replica-block-style-scope" as const;
export const PAGE_MARQUEE_REPLICA_TILT_LAYER_STYLE_SCOPE_ATTRIBUTE =
  "data-page-marquee-replica-tilt-layer-style-scope" as const;

/**
 * Exhaustive per-type cloneability map. `satisfies Record<PageBlockType,
 * boolean>` fails type-checking when a new block type is added without an
 * explicit triage here (fail-closed: unsafe by omission).
 */
export const PAGE_MARQUEE_REPLICA_SAFE_BY_BLOCK_TYPE = {
  heading: true,
  text: true,
  badge: true,
  button: true,
  image: true,
  gallery: true,
  list: true,
  card: true,
  divider: true,
  spacer: true,
  statistic: true,
  icon: true,
  quote: true,
  container: true,
  columns: true,
  group: true,
  customSvg: true,
  switcher: true,
  scrollHint: true,
  // Exactly these five are unsafe: scripts/nonces/global binders/live
  // embeds/video must never be duplicated by a replica.
  video: false,
  form: false,
  collection: false,
  filters: false,
  embed: false,
  // Read-only migration placeholder (TASK-580-03-L01): never replica-duplicated.
  "legacy-widget": false,
} as const satisfies Record<PageBlockType, boolean>;

/** DOM/SVG `id` definitions vs identifier-bearing data-hook values. */
export type PageReplicaIdentitySets = {
  domIds: ReadonlySet<string>;
  hookIdentifiers: ReadonlySet<string>;
};

/** One replica's immutable identity context, carried through its render. */
export type PageReplicaIdentityContext = {
  namespace: string;
  domIds: ReadonlySet<string>;
  hookIdentifiers: ReadonlySet<string>;
  inert: true;
};

/** The finite set of identity-bearing attributes the transformer routes. */
export type PageReplicaIdentityAttributeName =
  | "id"
  | "htmlFor"
  | "aria-labelledby"
  | "aria-describedby"
  | "aria-controls"
  | "href"
  | "xlinkHref"
  | "fill"
  | "stroke"
  | "clipPath"
  | "mask"
  | "filter"
  | "data-page-block-slot-owner"
  | typeof PAGE_BLOCK_ID_ATTRIBUTE
  | typeof PAGE_TILT_PARENT_LAYER_ATTRIBUTE;

/**
 * Fixed-width four-character lowercase base-36 value per Unicode code point,
 * concatenated in order. Reversible and delimiter-safe (stays inside
 * `[a-z0-9]`), so an empty string yields "" and each code point contributes
 * exactly four characters.
 */
export function encodePageReplicaNamespacePart(value: string): string {
  let result = "";
  for (const codePoint of value) {
    result += (codePoint.codePointAt(0) ?? 0).toString(36).padStart(4, "0");
  }
  return result;
}

/** Deterministic owner-ID + serialized-path marquee replica namespace. */
export function createPageMarqueeReplicaNamespace(
  normalizedOwnerBlockId: string,
  serializedBlockPath: string
): string {
  return `cx-mrq-${encodePageReplicaNamespacePart(normalizedOwnerBlockId)}-${encodePageReplicaNamespacePart(serializedBlockPath)}`;
}

/** Walk one safe SVG subtree, collecting every emitted `id` definition. */
const collectSafeSvgDomIds = (node: SafeSvgNode, into: Set<string>): void => {
  if (node.kind === "text") return;
  const id = node.props.id;
  if (typeof id === "string" && id.length > 0) into.add(id);
  for (const child of node.children) collectSafeSvgDomIds(child, into);
};

/**
 * Collect the exact identity sets the normalized, rendered subtree emits:
 * `domIds` for HTML/SVG `id` definitions, `hookIdentifiers` for block/slot
 * identifiers that can only appear as data-hook values. Hidden blocks are
 * excluded unless `includeHiddenBlocks` is true (mirrors the renderer's real
 * visible-subtree policy). The safety predicate and the collector share the
 * same active-slot traversal so they always agree.
 */
export function collectPageReplicaIdentitySets(
  blocks: readonly PageBlockV2[],
  options: { includeHiddenBlocks: boolean }
): PageReplicaIdentitySets {
  const domIds = new Set<string>();
  const hookIdentifiers = new Set<string>();
  const renderedBlocks = options.includeHiddenBlocks
    ? blocks
    : blocks.filter((candidate) => candidate.visibility.visible);

  const visit = (candidate: PageBlockV2): void => {
    hookIdentifiers.add(candidate.id);
    if (candidate.type === "switcher") {
      const tabs = Array.isArray(candidate.props.tabs) ? candidate.props.tabs : [];
      for (let index = 0; index < tabs.length; index += 1) {
        domIds.add(`${candidate.id}-tab-${index}`);
        domIds.add(`${candidate.id}-panel-${index}`);
      }
    }
    if (candidate.type === "customSvg") {
      const raw = candidate.props.svg;
      const tree = typeof raw === "string" ? buildSafeSvgTree(raw) : null;
      if (tree) collectSafeSvgDomIds(tree, domIds);
    }
    for (const slotKey of getPageBlockActiveSlotKeys(candidate)) {
      const slotBlocks = candidate.slots?.[slotKey] ?? [];
      const active = options.includeHiddenBlocks
        ? slotBlocks
        : slotBlocks.filter((child) => child.visibility.visible);
      for (const child of active) visit(child);
    }
  };

  for (const block of renderedBlocks) visit(block);
  return {
    domIds: new Set(domIds),
    hookIdentifiers: new Set(hookIdentifiers),
  };
}

/**
 * Recursive fail-closed replica-safety decision over the exact normalized
 * active-slot child subtree (hidden-filter-aware). A descendant-authored
 * marquee rejects cloning for THIS owner (it would otherwise be recursively
 * cloned by this owner's replica). The authored owner group is never passed
 * here — its own `style.marquee` is expected, not a rejection reason.
 */
export function isPageMarqueeReplicaSafeSubtree(
  blocks: readonly PageBlockV2[],
  options: { includeHiddenBlocks: boolean }
): boolean {
  const renderedBlocks = options.includeHiddenBlocks
    ? blocks
    : blocks.filter((candidate) => candidate.visibility.visible);
  return renderedBlocks.every((candidate) => {
    if (!PAGE_MARQUEE_REPLICA_SAFE_BY_BLOCK_TYPE[candidate.type]) return false;
    // The outer owner is not passed here. Any descendant-authored marquee
    // would otherwise be cloned recursively and is therefore unsafe.
    if (candidate.style?.marquee !== undefined) return false;
    return getPageBlockActiveSlotKeys(candidate).every((slotKey) =>
      isPageMarqueeReplicaSafeSubtree(candidate.slots?.[slotKey] ?? [], options)
    );
  });
}

/**
 * Namespace a value the subtree will emit as a DOM/SVG `id` definition.
 * Deterministic, reversible prefix join: `namespace-value`.
 */
export function namespacePageReplicaDomId(
  context: PageReplicaIdentityContext,
  value: string
): string {
  return `${context.namespace}-${value}`;
}

/**
 * Namespace a single identifier-bearing data-hook value. A hook identifier
 * does not become a DOM ID merely because its bytes match one; this function
 * is called only for values that are known hook identifiers.
 */
export function namespacePageReplicaHookIdentifier(
  context: PageReplicaIdentityContext,
  value: string
): string {
  return `${context.namespace}-${value}`;
}

/**
 * Namespace one bare IDREF target (e.g. a `#`-hash target or an
 * `aria-controls` token) ONLY when the exact target is backed by a locally
 * emitted DOM/SVG `id` (`domIds`). Unresolved targets stay byte-for-byte.
 */
export function namespacePageReplicaIdRef(
  context: PageReplicaIdentityContext,
  value: string
): string {
  return context.domIds.has(value) ? namespacePageReplicaDomId(context, value) : value;
}

const whitespaceSeparatedTargets = (context: PageReplicaIdentityContext, value: string): string =>
  value
    .split(/\s+/)
    .map((target) => namespacePageReplicaIdRef(context, target))
    .join(" ");

const hashTarget = (context: PageReplicaIdentityContext, value: string): string => {
  if (!value.startsWith("#")) return value;
  const target = value.slice(1);
  return context.domIds.has(target) ? `#${namespacePageReplicaDomId(context, target)}` : value;
};

const svgUrlTarget = (context: PageReplicaIdentityContext, value: string): string => {
  const match = /^url\(#([^)]+)\)$/.exec(value);
  if (!match) return value;
  const target = match[1]!;
  return context.domIds.has(target) ? `url(#${namespacePageReplicaDomId(context, target)})` : value;
};

/**
 * The one pure routing function for identity-bearing renderer/Safe-SVG
 * attributes. DOM/SVG reference attributes rewrite only targets backed by an
 * emitted `id` (`domIds`); data-hook attributes use only `hookIdentifiers`.
 * Values outside the attribute's owning set stay byte-for-byte.
 */
export function transformPageReplicaIdentityAttribute(
  context: PageReplicaIdentityContext,
  attribute: PageReplicaIdentityAttributeName,
  value: string
): string {
  switch (attribute) {
    case "id":
      return namespacePageReplicaDomId(context, value);
    case "htmlFor":
    case "aria-labelledby":
    case "aria-describedby":
    case "aria-controls":
      return whitespaceSeparatedTargets(context, value);
    case "href":
    case "xlinkHref":
      return hashTarget(context, value);
    case "fill":
    case "stroke":
    case "clipPath":
    case "mask":
    case "filter":
      return svgUrlTarget(context, value);
    // All three attributes carry hook identifiers that need namespace
    // rewriting; the stacked case labels share the branch below. Note the
    // real runtime id value is PAGE_BLOCK_ID_ATTRIBUTE = "data-block-id" (the
    // `data-page-block-*` spelling is the TYPE/type attribute, not the id).
    case "data-page-block-slot-owner":
    case PAGE_BLOCK_ID_ATTRIBUTE:
    case PAGE_TILT_PARENT_LAYER_ATTRIBUTE:
      return context.hookIdentifiers.has(value)
        ? namespacePageReplicaHookIdentifier(context, value)
        : value;
    default:
      return value;
  }
}
