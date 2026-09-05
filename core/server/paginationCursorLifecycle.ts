/**
 * Sole server lifecycle adapter for the pagination-cursor keyring
 * (TASK-551-03-L01).
 *
 * Registration performs no environment read. The participant loads the
 * immutable keyring exactly once during awaited lifecycle start, before any
 * traffic is accepted, and clears it on close. Route handlers and read
 * services obtain the installed value only through the fail-closed
 * `requirePaginationCursorKeyring()`.
 */

import {
  loadPaginationCursorKeyring,
  type PaginationCursorKeyring,
} from "../services/database/keysetCursor";
import { registerRuntimeLifecycleParticipant } from "./runtimeLifecycle";

export const PAGINATION_CURSOR_KEYRING_PARTICIPANT_ID = "pagination-cursor-keyring";

let registered = false;
let activeKeyring: PaginationCursorKeyring | null = null;

/**
 * Idempotently registers the fixed-ID lifecycle participant. Safe to call from
 * route composition module evaluation; never reads the environment itself.
 */
export function registerPaginationCursorLifecycleParticipant(): void {
  if (registered) return;
  registered = true;
  registerRuntimeLifecycleParticipant({
    id: PAGINATION_CURSOR_KEYRING_PARTICIPANT_ID,
    phase: "database",
    start: async () => {
      // The sole production env read occurs here, during awaited start.
      activeKeyring = loadPaginationCursorKeyring(process.env);
    },
    close: async () => {
      activeKeyring = null;
    },
  });
}

/** Fail-closed accessor: unavailable before successful start or after close. */
export function requirePaginationCursorKeyring(): PaginationCursorKeyring {
  if (!activeKeyring) throw new Error("pagination_cursor_keyring_unavailable");
  return activeKeyring;
}

/** Test-only deterministic reset of this adapter's module-scoped state. */
export function resetPaginationCursorLifecycleForTests(): void {
  registered = false;
  activeKeyring = null;
}
