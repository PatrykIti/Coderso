import { useCallback, useMemo, useRef } from "react";

export type EntryEditorRoute = Readonly<{ type: string | null; id: string | null }>;

export const resolveEntryEditorRoute = (path: string): EntryEditorRoute => {
  const pathname = path.split(/[?#]/)[0] ?? path;
  const parts = pathname.split("/").filter(Boolean);
  const entriesIndex = parts.findIndex((segment) => segment === "entries");
  return entriesIndex === -1
    ? { type: null, id: null }
    : { type: parts[entriesIndex + 1] ?? null, id: parts[entriesIndex + 2] ?? null };
};

// AdminApp treats the router path as authoritative and falls back to the browser path only
// when a component mounts without one. EntryEditor must derive its visit identity the same way.
export const resolveEntryEditorPath = (routerPath?: string) =>
  routerPath ?? (typeof window === "undefined" ? "" : window.location.pathname);

export type EntryLoadOptions = Readonly<{
  /** This read owns the page-level loading indicator and clears it when it settles. */
  clearLoading?: boolean;
  /** The first read of this visit, which establishes the baseline beneath local edits. */
  isBaseline?: boolean;
  /** A user-requested refresh that intentionally discards local edits. */
  discardLocalEdits?: boolean;
}>;

export type EntryMutationChannel = "save" | "publish" | "metadata" | "delete";
export type EntryVisitToken = number;
export type EntryMutationToken = Readonly<{
  channel: EntryMutationChannel;
  mutation: number;
  visit: EntryVisitToken;
}>;

export type EntryVisitAuthority = Readonly<{
  beginVisit: () => EntryVisitToken;
  endVisit: (visit: EntryVisitToken) => void;
  currentVisit: () => EntryVisitToken | null;
  isCurrentVisit: (visit: EntryVisitToken) => boolean;
  beginMutation: (channel: EntryMutationChannel) => EntryMutationToken | null;
  isCurrentMutation: (token: EntryMutationToken) => boolean;
}>;

/**
 * Exact authority for one mounted editor visit and its latest mutation in each channel.
 *
 * A boolean mounted ref is insufficient under StrictMode: cleanup can set it false and the
 * next effect activation can set it true again while a continuation from the first activation
 * is still pending. Tokens never become current again, and ending a visit also invalidates all
 * save, publish, metadata, and delete continuations captured from it.
 */
export function useEntryVisitAuthority(): EntryVisitAuthority {
  const visitSequenceRef = useRef(0);
  const currentVisitRef = useRef<EntryVisitToken | null>(null);
  const mutationSequencesRef = useRef<Record<EntryMutationChannel, number>>({
    save: 0,
    publish: 0,
    metadata: 0,
    delete: 0,
  });
  const currentMutationsRef = useRef<Record<EntryMutationChannel, number>>({
    save: 0,
    publish: 0,
    metadata: 0,
    delete: 0,
  });

  const beginVisit = useCallback(() => {
    const visit = (visitSequenceRef.current += 1);
    currentVisitRef.current = visit;
    return visit;
  }, []);

  const endVisit = useCallback((visit: EntryVisitToken) => {
    if (currentVisitRef.current === visit) currentVisitRef.current = null;
  }, []);

  const currentVisit = useCallback(() => currentVisitRef.current, []);
  const isCurrentVisit = useCallback(
    (visit: EntryVisitToken) => currentVisitRef.current === visit,
    []
  );

  const beginMutation = useCallback((channel: EntryMutationChannel) => {
    const visit = currentVisitRef.current;
    if (visit === null) return null;
    const mutation = (mutationSequencesRef.current[channel] += 1);
    currentMutationsRef.current[channel] = mutation;
    return { channel, mutation, visit };
  }, []);

  const isCurrentMutation = useCallback(
    (token: EntryMutationToken) =>
      currentVisitRef.current === token.visit &&
      currentMutationsRef.current[token.channel] === token.mutation,
    []
  );

  return useMemo(
    () => ({
      beginVisit,
      endVisit,
      currentVisit,
      isCurrentVisit,
      beginMutation,
      isCurrentMutation,
    }),
    [beginMutation, beginVisit, currentVisit, endVisit, isCurrentMutation, isCurrentVisit]
  );
}
