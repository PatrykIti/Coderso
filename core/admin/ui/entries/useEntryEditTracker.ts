import { useCallback, useRef, useState } from "react";

/**
 * Which of the entry editor's values the user has touched since their last save, and
 * when.
 *
 * The editor has to answer one question in a dozen places: "is this value still the
 * user's, or may an arriving snapshot overwrite it?" Inferring the answer from the
 * VALUE is what lost edits — a title cleared back to "" looked untouched, a slug that
 * slugified to "" looked untouched, taxonomy picks were never registered at all, and a
 * save that completed while the user kept typing cleared its whole channel. So
 * editedness is tracked explicitly, per value, for every editable value in both
 * channels, and hydration consults nothing else.
 *
 * Every edit gets a monotonic tick. A request captures the tick it submitted at and,
 * on completion, drops exactly the keys whose last edit is not newer than that tick:
 * the values that request actually persisted. Anything edited DURING the request has a
 * newer tick, so it stays dirty and stays preserved.
 */
export type EntryEditedKey =
  | "title"
  | "slug"
  | "status"
  | "visibility"
  | "accessPassword"
  | "scheduledAt"
  | "seoDescription"
  | "seoTitle"
  | "seoCanonicalUrl"
  | "seoRobots"
  | "category"
  | "tags"
  | `field:${string}`;

/** The editor's two independent Save actions: "Save draft" and the metadata panel. */
export type EntryEditChannel = "content" | "metadata";

const FIELD_KEY_PREFIX = "field:";

/** Schema field values live in one keyspace with the title/slug they may duplicate. */
export const entryFieldEditedKey = (fieldName: string): EntryEditedKey =>
  `${FIELD_KEY_PREFIX}${fieldName}`;

export const entryEditChannelOf = (key: EntryEditedKey): EntryEditChannel =>
  key === "title" || key === "slug" || key.startsWith(FIELD_KEY_PREFIX) ? "content" : "metadata";

export type EntryEditTracker = Readonly<{
  /** Render-visible dirty flags — one per Save action. */
  hasContentEdits: boolean;
  hasMetadataEdits: boolean;
  markEdited: (key: EntryEditedKey) => void;
  /** Synchronous ref read, so async continuations never see a stale render value. */
  hasEdits: () => boolean;
  /** The keys a hydration must NOT overwrite. */
  editedKeys: () => ReadonlySet<EntryEditedKey>;
  /** Capture before a request; hand the number back to `settleSubmit`. */
  beginSubmit: () => number;
  /**
   * Marks as saved the keys in `scope` that were not edited after `submittedTick`.
   * A whole channel for that channel's Save; an explicit key list for a mutation that
   * persists only some values (publish writes `status` and nothing else).
   */
  settleSubmit: (
    scope: EntryEditChannel | readonly EntryEditedKey[],
    submittedTick: number
  ) => void;
  /** The remote snapshot wins: forget every local edit. */
  resetEdits: () => void;
}>;

export function useEntryEditTracker(): EntryEditTracker {
  const editsRef = useRef<Map<EntryEditedKey, number>>(new Map());
  const tickRef = useRef(0);
  const [hasContentEdits, setHasContentEdits] = useState(false);
  const [hasMetadataEdits, setHasMetadataEdits] = useState(false);

  const syncFlags = useCallback(() => {
    let content = false;
    let metadata = false;
    for (const key of editsRef.current.keys()) {
      if (entryEditChannelOf(key) === "content") content = true;
      else metadata = true;
    }
    setHasContentEdits(content);
    setHasMetadataEdits(metadata);
  }, []);

  const markEdited = useCallback(
    (key: EntryEditedKey) => {
      tickRef.current += 1;
      editsRef.current.set(key, tickRef.current);
      syncFlags();
    },
    [syncFlags]
  );

  const hasEdits = useCallback(() => editsRef.current.size > 0, []);

  const editedKeys = useCallback(
    (): ReadonlySet<EntryEditedKey> => new Set(editsRef.current.keys()),
    []
  );

  const beginSubmit = useCallback(() => tickRef.current, []);

  const settleSubmit = useCallback(
    (scope: EntryEditChannel | readonly EntryEditedKey[], submittedTick: number) => {
      const isInScope = (key: EntryEditedKey) =>
        typeof scope === "string" ? entryEditChannelOf(key) === scope : scope.includes(key);
      for (const [key, tick] of Array.from(editsRef.current)) {
        if (isInScope(key) && tick <= submittedTick) editsRef.current.delete(key);
      }
      syncFlags();
    },
    [syncFlags]
  );

  const resetEdits = useCallback(() => {
    editsRef.current.clear();
    syncFlags();
  }, [syncFlags]);

  return {
    hasContentEdits,
    hasMetadataEdits,
    markEdited,
    hasEdits,
    editedKeys,
    beginSubmit,
    settleSubmit,
    resetEdits,
  };
}
