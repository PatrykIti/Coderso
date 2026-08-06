import { useCallback, useMemo, useRef } from "react";

/**
 * Which arriving snapshot of the entry may write the editor's state.
 *
 * The editor is told what the entry looks like from several places at once: the baseline
 * read, cache-bus refreshes, "Refresh", and the body every mutation answers with. All of them
 * are snapshots of one row, all of them can be in flight together — no Save action disables
 * another channel's — and a body is built when its request is HANDLED, so a response that
 * arrives later can still describe an older entry than one already applied.
 *
 * Reads carried a sequence number for exactly this. Mutation responses carried none and
 * hydrated unconditionally, which is how a delayed "Save draft" body put `status: draft` back
 * over a metadata save that had just published the entry — into a UI with nothing left marked
 * as the user's, so the next metadata PATCH sent that draft to the server and unpublished it.
 *
 * One clock, one rule, for every request that ends by writing editor state:
 *
 *   - take a ticket BEFORE the request starts;
 *   - write only while that ticket is still authoritative;
 *   - `claim` the ticket when you write, so nothing older may follow;
 *   - and when a MUTATION body is applied, `supersedeAll`: nothing that was in flight may write
 *     after it, INCLUDING requests issued later than the one that answered.
 *
 * That last rule is blunt on purpose, and this is what it costs.
 *
 * A ticket records when a request LEFT, not when the server handled it, so "issued later" does
 * not mean "describes a newer row": a GET sent after a PATCH can be handled before that PATCH
 * commits, and a second mutation's body can be built before the first one's. There is nothing
 * in the browser that can tell those apart, so refusing every writer that was in flight is the
 * only rule that does not need an order nobody told us. The price is paid in the case where the
 * later request really was newer: a value only the SERVER can produce — a uniquified slug,
 * `updatedAt`, another user's concurrent change — stays as the admitted body described it until
 * the next read. It is never paid in local edits, which live in the editor's own state and are
 * kept by `hydrateFromSnapshot` whichever body wins.
 *
 * The opposite mistake is not the same size, which is why that price is accepted rather than
 * avoided. Admitting a snapshot that turns out to be older reverts `status` into a UI where the
 * save that published it has already stopped marking `status` as the user's — and the metadata
 * panel PATCHes status/visibility/schedule/SEO/taxonomy TOGETHER, so the next save persists the
 * revert and unpublishes the entry. A stale slug repaints; that one unpublishes.
 * `entry-editor-hydration-race.test.tsx` pins both directions, so narrowing this to "supersede
 * only the tickets issued earlier" goes red there rather than passing quietly.
 */
export type EntrySnapshotAuthority = Readonly<{
  /** Take a ticket. Monotonic, so a later request always outranks an earlier one. */
  begin: () => number;
  /** May this continuation still write? False once a newer ticket has written. */
  isAuthoritative: (ticket: number) => boolean;
  /** This ticket wrote: nothing older may write after it. Safe to call more than once. */
  claim: (ticket: number) => void;
  /** Nothing in flight may write, later-issued tickets included: the visit ended, or a body landed. */
  supersedeAll: () => void;
}>;

export function useEntrySnapshotAuthority(): EntrySnapshotAuthority {
  const issuedRef = useRef(0);
  // The newest ticket that has written. A ticket EQUAL to it is still authoritative, which is
  // what lets one request write twice — a read hydrates and then, after awaiting the taxonomy
  // overview, writes that too.
  const settledRef = useRef(0);

  const begin = useCallback(() => (issuedRef.current += 1), []);

  const isAuthoritative = useCallback((ticket: number) => ticket >= settledRef.current, []);

  const claim = useCallback((ticket: number) => {
    settledRef.current = Math.max(settledRef.current, ticket);
  }, []);

  // Settles a ticket nobody holds, so every ticket already issued is strictly older than it.
  const supersedeAll = useCallback(() => {
    issuedRef.current += 1;
    settledRef.current = issuedRef.current;
  }, []);

  return useMemo(
    () => ({ begin, claim, isAuthoritative, supersedeAll }),
    [begin, claim, isAuthoritative, supersedeAll]
  );
}
