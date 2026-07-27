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
 *   - and when a MUTATION body is applied, `supersedeAll`: its body is the newest description
 *     of the row anyone has, so nothing that was already in flight may write after it.
 *
 * Refusing a superseded body is always the safe direction. It cannot drop a local edit — the
 * edited values are in the editor's own state and hydration protects them anyway — it only
 * declines to repeat what a newer body has already said.
 */
export type EntrySnapshotAuthority = Readonly<{
  /** Take a ticket. Monotonic, so a later request always outranks an earlier one. */
  begin: () => number;
  /** May this continuation still write? False once a newer ticket has written. */
  isAuthoritative: (ticket: number) => boolean;
  /** This ticket wrote: nothing older may write after it. Safe to call more than once. */
  claim: (ticket: number) => void;
  /** Nothing outstanding may write any more — the visit ended, or a mutation body landed. */
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
