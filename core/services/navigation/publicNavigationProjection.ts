/**
 * publicNavigationProjection — shared public-front navigation projection
 * (TASK-542-03-L01). Consolidates the site-shell's duplicated public filters
 * (`siteShell.tsx:112-179,224-245`) into one pure, anonymous owner used by the
 * front render paths. Consumes the mapper's ALREADY-canonical hrefs (a safe
 * relative/hash/http URL or the "#" sentinel for empty/unsafe) — it performs
 * NO URL parsing and MUST NOT import `normalizeWidgetSafeHref` (S6 removes the
 * widget surface). Bun-free (Vitest lane).
 *
 * Semantics (exact parity with the pre-542 site-shell walk):
 * - an item with `meta.visibility === "logged_in"` is hidden WITH its whole
 *   subtree (never flattened into visible children);
 * - an item earns markup iff it links somewhere OR shelters a projected
 *   descendant that does ("no empty dropdowns / no dangling toggles");
 * - a dead parent (linkless) with projected children stays a LINKLESS GROUP
 *   (the mapper's "#" sentinel), preserving the drop-down toggle;
 * - metadata (target, badge, description, icon, variant) and order pass
 *   through unchanged; only new projected arrays/objects are returned — cached
 *   menu data is never mutated.
 */
export type PublicNavigationBadge = {
  label: string;
  tone: "default" | "accent" | "success" | "warning" | "danger";
};

export type PublicNavigationMeta = {
  visibility: "all" | "logged_in" | "logged_out";
  badge: PublicNavigationBadge | null;
  description: string | null;
  icon: string | null;
  variant?: "link" | "button";
};

export type PublicNavigationItem = {
  label: string;
  href: string;
  target?: "self" | "blank";
  meta?: PublicNavigationMeta;
  children?: PublicNavigationItem[];
};

/** hrefs arrive normalized by the mapper: a safe URL or the "#" sentinel. */
export const hasPublicNavigationHref = (href: string): boolean =>
  href.trim().length > 0 && href.trim() !== "#";

export function projectPublicNavigationItems(
  items: readonly PublicNavigationItem[]
): PublicNavigationItem[] {
  const projected: PublicNavigationItem[] = [];
  for (const item of items) {
    if (item.meta?.visibility === "logged_in") continue; // hide whole subtree
    const children = projectPublicNavigationItems(item.children ?? []);
    if (!hasPublicNavigationHref(item.href) && children.length === 0) continue;
    const { children: _sourceChildren, ...itemWithoutChildren } = item;
    projected.push({
      ...itemWithoutChildren, // dead parent with children stays a linkless group
      ...(children.length > 0 ? { children } : {}),
    });
  }
  return projected;
}
