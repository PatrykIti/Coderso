import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Plus, Trash2 } from "lucide-react";

import {
  PAGE_GALLERY_ALT_MAX,
  PAGE_GALLERY_CAPTION_MAX,
  PAGE_GALLERY_CATEGORY_MAX,
  PAGE_GALLERY_CATEGORY_TOKEN_MAX,
  PAGE_GALLERY_CATEGORY_TOKENS_MAX,
  PAGE_GALLERY_ITEMS_MAX,
  PAGE_GALLERY_SRC_MAX,
  type PageGalleryItemV2,
} from "../../../../services/pages/pageGalleryV2";
import { GALLERY_CATEGORY_PATTERN } from "../../../../services/pages/pageDocumentV2Types";
import { MediaUrlControl } from "./MediaUrlControl";
import {
  editorButtonClassFor,
  editorControlFocusClassFor,
  editorControlLabelClassFor,
  editorGhostButtonClassFor,
  editorPanelInputClass,
  editorPanelRowClass,
  editorPanelSubInputClass,
  useEditorControlTone,
  type EditorControlTone,
} from "./controlChrome";

export type GalleryItemsControlProps = {
  label: string;
  /** Stored canonical gallery rows (owner `PageGalleryItemV2` shapes). */
  value: readonly PageGalleryItemV2[];
  /** Category token list used for edit suggestions (never a validation source). */
  categoryTokens: readonly string[];
  /**
   * Required stable parent scope: L03's collision-safe serialized tuple
   * `JSON.stringify([targetKind, targetId, control.id])`. Changing it remounts
   * every row media control and invalidates all pending row requests.
   */
  parentScopeKey: string;
  /** Emits the full next rows array in the owner stored shapes. */
  onChange: (value: PageGalleryItemV2[]) => void;
  disabled?: boolean;
  /** Light/dark surface tone; defaults to the surrounding panel context. */
  tone?: EditorControlTone;
};

/**
 * Monotonic, non-persisted row identity allocator. Identities are immutable
 * for a mounted row, never the array index or authored content, and are never
 * written into `PageGalleryItemV2`.
 */
let galleryRowIdentityCounter = 0;
const allocateMonotonicRowIdentity = (): number => {
  galleryRowIdentityCounter += 1;
  return galleryRowIdentityCounter;
};

/**
 * Row identity entry: the immutable numeric id plus the row's one stable
 * source handler. The handler is created once per mounted row so its identity
 * never changes on structural re-renders (a pending row request stays bound
 * to its identity and resolves to whichever index the identity occupies).
 */
type RowIdentity = {
  id: number;
  sourceHandler: (next: string | null) => void;
};

/**
 * Canonical read of a stored gallery row: only the known keys are read back
 * (unknown object keys are never copied) and values are never truncated, so
 * an incoming over-limit `src`/`alt`/`caption` renders byte-identical.
 */
const readGalleryItem = (item: PageGalleryItemV2): PageGalleryItemV2 => {
  const src = typeof item.src === "string" ? item.src : "";
  const alt = typeof item.alt === "string" ? item.alt : "";
  const caption = typeof item.caption === "string" ? item.caption : "";
  const category = typeof item.category === "string" ? item.category.trim() : "";
  return category ? { src, alt, caption, category } : { src, alt, caption };
};

/**
 * Explicit row-category commit uses the owner category contract: trim, reject
 * an invalid token (pattern/length), keep ordered first-occurrence uniqueness,
 * respect the token-count and combined-length bounds. Returns `null` when the
 * raw input must be rejected non-mutating; empty input returns `[]` so the
 * category key is omitted.
 */
const parseCategoryTokens = (raw: string): string[] | null => {
  const tokens: string[] = [];
  for (const part of raw.split(" ")) {
    const token = part.trim();
    if (!token) continue;
    if (token.length > PAGE_GALLERY_CATEGORY_TOKEN_MAX) return null;
    if (!GALLERY_CATEGORY_PATTERN.test(token)) return null;
    if (!tokens.includes(token)) tokens.push(token);
  }
  if (tokens.length > PAGE_GALLERY_CATEGORY_TOKENS_MAX) return null;
  if (tokens.join(" ").length > PAGE_GALLERY_CATEGORY_MAX) return null;
  return tokens;
};

/**
 * Gallery rows editor (TASK-539) on the page-editor control surface. Rows
 * edit only `src`/`alt`/`caption` and the optional space-joined `category`.
 * Add appends exactly the canonical `{src:"",alt:"",caption:""}` draft row
 * and that draft stays until the user removes it. Rows are bounded at
 * `PAGE_GALLERY_ITEMS_MAX`; each row source uses the picker's own maxLength
 * guard plus an independent commit guard (null maps to canonical empty src,
 * strings above `PAGE_GALLERY_SRC_MAX` are non-mutating). The alt/caption
 * HTML `maxLength`s are browser UX only: their commit handlers independently
 * reject over-limit values without calling `onChange` or changing the prior
 * row.
 *
 * Every mounted row owns a monotonic row identity that survives removal of
 * earlier rows. The media scope is `JSON.stringify([parentScopeKey,
 * rowIdentity])` and doubles as the row `MediaUrlControl` React key, so a
 * parent-scope replacement remounts every row control (invalidating pending
 * requests) even when the new target holds the same URLs, and removing row 1
 * can never transfer row 2's pending request to the new array index 0.
 */
export const GalleryItemsControl = ({
  label,
  value,
  categoryTokens,
  parentScopeKey,
  onChange,
  disabled = false,
  tone,
}: GalleryItemsControlProps) => {
  const resolvedTone = useEditorControlTone(tone);
  const focusClass = editorControlFocusClassFor(resolvedTone);
  const inputClass = `w-full rounded-md px-2 py-1.5 text-sm ${
    resolvedTone === "light"
      ? editorPanelInputClass
      : "border border-white/15 bg-white/10 text-slate-100 placeholder:text-slate-500"
  } ${focusClass}`;
  const subInputClass = `w-full rounded-md px-2 py-1 text-xs ${
    resolvedTone === "light"
      ? editorPanelSubInputClass
      : "border border-white/15 bg-white/5 text-slate-200 placeholder:text-slate-500"
  } ${focusClass}`;

  const rows = value.map(readGalleryItem);

  // Latest-value refs are written only in effects and read only inside event
  // handlers (never during render), so the stable identity-bound source
  // handlers always see the current rows/onChange/identity layout.
  const rowsRef = useRef<PageGalleryItemV2[]>([]);
  useEffect(() => {
    rowsRef.current = rows;
  });
  const onChangeRef = useRef<(value: PageGalleryItemV2[]) => void>(() => undefined);
  useEffect(() => {
    onChangeRef.current = onChange;
  });

  const commit = useCallback((nextRows: readonly PageGalleryItemV2[]) => {
    onChangeRef.current(nextRows.map(readGalleryItem));
  }, []);

  const patchRow = useCallback(
    (index: number, patch: Partial<PageGalleryItemV2>) => {
      const current = rowsRef.current;
      commit(current.map((row, rowIndex) => (rowIndex === index ? { ...row, ...patch } : row)));
    },
    [commit]
  );

  const identitiesRef = useRef<RowIdentity[]>([]);

  // Independent row-source commit guard: null maps explicitly to canonical
  // `src:""`; a string of at most PAGE_GALLERY_SRC_MAX replaces src; a
  // longer value is non-mutating. The row contract stays intact even if a
  // caller invokes the callback without the picker. The entry is resolved to
  // its current index at call time, so a pending request from a row that
  // shifted index after an earlier removal still targets the same identity.
  const patchSourceByIdentity = useCallback(
    (entry: RowIdentity, next: string | null) => {
      const index = identitiesRef.current.findIndex((candidate) => candidate === entry);
      if (index === -1) return;
      if (next === null) {
        patchRow(index, { src: "" });
        return;
      }
      if (next.length > PAGE_GALLERY_SRC_MAX) return;
      patchRow(index, { src: next });
    },
    [patchRow]
  );

  // One stable source handler per mounted row; created once per identity so a
  // structural re-render never replaces a row's callback target.
  const makeRowIdentity = useCallback((): RowIdentity => {
    const entry: RowIdentity = {
      id: allocateMonotonicRowIdentity(),
      sourceHandler: () => undefined,
    };
    entry.sourceHandler = (next: string | null) => patchSourceByIdentity(entry, next);
    return entry;
  }, [patchSourceByIdentity]);

  // Row identities stay index-aligned with the controlled value. Append and
  // remove replace the identity list alongside the emitted value; a length
  // drift from an external source (undo/redo/load) is reconciled on the next
  // microtask without re-keying surviving rows.
  const [rowIdentities, setRowIdentities] = useState<RowIdentity[]>(() =>
    rows.map(() => makeRowIdentity())
  );
  useEffect(() => {
    identitiesRef.current = rowIdentities;
  });

  useEffect(() => {
    const reconcile = Promise.resolve().then(() => {
      setRowIdentities((current) => {
        if (current.length === rows.length) return current;
        const next = current.slice(0, rows.length);
        while (next.length < rows.length) {
          next.push(makeRowIdentity());
        }
        return next;
      });
    });
    return () => {
      void reconcile;
    };
  }, [rows.length, makeRowIdentity]);

  const rowAltInputsRef = useRef(new Map<number, HTMLInputElement>());
  const addButtonRef = useRef<HTMLButtonElement | null>(null);
  const pendingFocusRef = useRef<number | "add" | null>(null);

  // Focus a row's alt input (by immutable identity) or the Add button after a
  // structural change, so keyboard focus stays usable after add/remove.
  useLayoutEffect(() => {
    const pending = pendingFocusRef.current;
    if (pending === null) return;
    pendingFocusRef.current = null;
    const target =
      pending === "add" ? addButtonRef.current : rowAltInputsRef.current.get(pending) ?? null;
    target?.focus();
  });

  const patchAlt = useCallback(
    (index: number, next: string) => {
      if (next.length > PAGE_GALLERY_ALT_MAX) return;
      patchRow(index, { alt: next });
    },
    [patchRow]
  );

  const patchCaption = useCallback(
    (index: number, next: string) => {
      if (next.length > PAGE_GALLERY_CAPTION_MAX) return;
      patchRow(index, { caption: next });
    },
    [patchRow]
  );

  const patchCategory = useCallback(
    (index: number, raw: string) => {
      const tokens = parseCategoryTokens(raw);
      if (tokens === null) return;
      if (tokens.length === 0) {
        // Empty categories omit the item key.
        patchRow(index, { category: undefined });
        return;
      }
      patchRow(index, { category: tokens.join(" ") });
    },
    [patchRow]
  );

  const appendItem = () => {
    if (rows.length >= PAGE_GALLERY_ITEMS_MAX) return;
    const entry = makeRowIdentity();
    setRowIdentities((current) => [...current, entry]);
    pendingFocusRef.current = entry.id;
    commit([...rows, { src: "", alt: "", caption: "" }]);
  };

  const removeItem = (index: number) => {
    // Focus the row that takes the removed position (the next sibling), or the
    // Add button when the last row was removed.
    const focusTarget = rowIdentities[index + 1]?.id ?? "add";
    setRowIdentities((current) => current.filter((_, rowIndex) => rowIndex !== index));
    pendingFocusRef.current = focusTarget;
    commit(rows.filter((_, rowIndex) => rowIndex !== index));
  };

  const addDisabled = disabled || rows.length >= PAGE_GALLERY_ITEMS_MAX;

  return (
    <div className="grid gap-1.5" data-page-editor-control="gallery-items">
      <span className={editorControlLabelClassFor(resolvedTone)}>{label}</span>
      <div className="grid gap-2">
        {rows.map((row, index) => {
          const identity = rowIdentities[index] ?? null;
          // A length drift from an external source is reconciled on the next
          // microtask; a deterministic negative placeholder keeps the
          // transient render keyed and stable in the meantime.
          const identityId = identity?.id ?? -index - 1;
          const rowMediaScopeKey = JSON.stringify([parentScopeKey, identityId]);
          return (
            <div
              key={identityId}
              className={`grid gap-1.5 rounded-md p-2 ${
                resolvedTone === "light"
                  ? editorPanelRowClass
                  : "border border-white/10 bg-white/5"
              }`}
              data-page-editor-gallery-item={index + 1}
            >
              <MediaUrlControl
                key={rowMediaScopeKey}
                label={`Gallery item ${index + 1} source`}
                value={row.src}
                scopeKey={rowMediaScopeKey}
                accept={["image/*", "video/*", "audio/*"]}
                maxLength={PAGE_GALLERY_SRC_MAX}
                onChange={identity?.sourceHandler ?? (() => undefined)}
              />
              <div className="grid gap-1.5">
                <input
                  className={inputClass}
                  value={row.alt}
                  placeholder={`Gallery item ${index + 1} alt text`}
                  aria-label={`Gallery item ${index + 1} alt`}
                  maxLength={PAGE_GALLERY_ALT_MAX}
                  disabled={disabled}
                  ref={(element) => {
                    if (element) rowAltInputsRef.current.set(identityId, element);
                    else rowAltInputsRef.current.delete(identityId);
                  }}
                  onChange={(event) => patchAlt(index, event.target.value)}
                />
                <input
                  className={inputClass}
                  value={row.caption}
                  placeholder={`Gallery item ${index + 1} caption`}
                  aria-label={`Gallery item ${index + 1} caption`}
                  maxLength={PAGE_GALLERY_CAPTION_MAX}
                  disabled={disabled}
                  onChange={(event) => patchCaption(index, event.target.value)}
                />
                <input
                  className={subInputClass}
                  value={row.category ?? ""}
                  placeholder="Categories (space separated)"
                  aria-label={`Gallery item ${index + 1} categories`}
                  list={`gallery-category-tokens-${identityId}`}
                  disabled={disabled}
                  onChange={(event) => patchCategory(index, event.target.value)}
                />
                <datalist id={`gallery-category-tokens-${identityId}`}>
                  {categoryTokens.map((token, tokenIndex) => (
                    <option key={tokenIndex} value={token} />
                  ))}
                </datalist>
              </div>
              <button
                type="button"
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md ${editorGhostButtonClassFor(
                  resolvedTone
                )} ${focusClass}`}
                aria-label={`Remove gallery item ${index + 1}`}
                disabled={disabled}
                onClick={() => removeItem(index)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          );
        })}
      </div>
      <button
        type="button"
        ref={addButtonRef}
        className={`flex h-7 items-center justify-center gap-1 rounded-md text-xs font-semibold ${editorButtonClassFor(
          resolvedTone
        )} ${focusClass}`}
        aria-label="Add gallery item"
        disabled={addDisabled}
        onClick={appendItem}
      >
        <Plus className="h-3.5 w-3.5" />
        Add item
      </button>
    </div>
  );
};
