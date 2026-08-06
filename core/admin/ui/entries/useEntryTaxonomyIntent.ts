import { useCallback, useEffect, useMemo, useRef } from "react";

/**
 * Which taxonomy decision the metadata panel is still allowed to apply.
 *
 * "Add category" and "Add tag" both ask the host to create a term, wait for the server, and
 * only then commit a selection. Nothing freezes in between: the user can pick a different
 * category, clear it, drop a tag, and the host can hydrate a whole new selection over the top.
 * A completion handler that commits the decision it formed BEFORE the await therefore undoes
 * whatever happened during it — the same disease as a stale snapshot hydrating over a newer
 * one (see `useEntrySnapshotAuthority`), one component further down.
 *
 * Two rules, and what separates them is the arity of the field, not which flow is running:
 *
 *   - Nothing replays a captured selection. A pending decision is applied to the selection as
 *     it stands when the request resolves, so a delta ("add this tag") stays a delta instead
 *     of becoming a replacement that resurrects everything removed meanwhile.
 *   - A pending decision about a SINGLE-valued field is dropped once the user has decided that
 *     field themselves. Two answers to "which category" cannot both hold, and the one the user
 *     gave later is the one they can see on screen.
 *
 * Superseding is COUNTED, not compared. A user who picks another category and then picks the
 * original one back has still decided after the request left; a value comparison would call
 * that unchanged and overwrite them.
 *
 * Decisions are recorded the moment the panel makes them rather than read back as props,
 * because props are the host's answer and land a render after the click that caused them. The
 * effect below only reconciles with what the host actually applied — which is also how a
 * selection the panel never made (hydration, a mutation body) reaches a decision already in
 * flight.
 */
export type EntryTaxonomySelection = Readonly<{
  categoryId: string | null;
  tagIds: readonly string[];
}>;

export type PendingTaxonomyDecision = Readonly<{
  /** Has a category been decided since this decision was opened? Then it is not ours to make. */
  isCategorySuperseded: () => boolean;
  /** The selection as it stands NOW — never the one captured before the await. */
  currentSelection: () => EntryTaxonomySelection;
}>;

export type EntryTaxonomyIntent = Readonly<{
  /** A category was committed by this panel. Call BEFORE handing it to the host. */
  noteCategoryDecision: (categoryId: string | null) => void;
  /** A tag set was committed by this panel. Call BEFORE handing it to the host. */
  noteTagsDecision: (tagIds: readonly string[]) => void;
  /** Open a decision that will be applied after an await. */
  beginPendingDecision: () => PendingTaxonomyDecision;
}>;

export function useEntryTaxonomyIntent(selection: EntryTaxonomySelection): EntryTaxonomyIntent {
  const { categoryId, tagIds } = selection;
  const selectionRef = useRef<EntryTaxonomySelection>(selection);
  // Counts the category decisions taken, not the values the category has held.
  const categoryDecisionsRef = useRef(0);

  useEffect(() => {
    selectionRef.current = { categoryId, tagIds };
  }, [categoryId, tagIds]);

  const noteCategoryDecision = useCallback((nextCategoryId: string | null) => {
    categoryDecisionsRef.current += 1;
    selectionRef.current = { ...selectionRef.current, categoryId: nextCategoryId };
  }, []);

  const noteTagsDecision = useCallback((nextTagIds: readonly string[]) => {
    selectionRef.current = { ...selectionRef.current, tagIds: [...nextTagIds] };
  }, []);

  const beginPendingDecision = useCallback((): PendingTaxonomyDecision => {
    const categoryDecisionsAtStart = categoryDecisionsRef.current;
    return {
      isCategorySuperseded: () => categoryDecisionsRef.current !== categoryDecisionsAtStart,
      currentSelection: () => selectionRef.current,
    };
  }, []);

  return useMemo(
    () => ({ beginPendingDecision, noteCategoryDecision, noteTagsDecision }),
    [beginPendingDecision, noteCategoryDecision, noteTagsDecision]
  );
}
