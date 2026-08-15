import type { EntryVisibility } from "./entryTypes";

export type EntryGateDecision = { kind: "allow" } | { kind: "not-found" } | { kind: "prompt" };

export interface EntryVisibilityGateInput {
  /** Raw from loader; unknown values are treated as private (fail-closed). */
  visibility: EntryVisibility | string | null | undefined;
  /** Derived boolean from the loader (never the raw hash). */
  hasPassword: boolean;
  /**
   * Authenticated ADMIN/editor render context (bypasses the gate). The caller
   * (render path) is responsible for only setting this true for an admin/editor
   * session holding the content-read capability, never for a bare active-session
   * user (see 517-01-L03).
   */
  isAuthenticated: boolean;
  /** Caller pre-verified per-entry HMAC unlock cookie (517-02 util). */
  hasValidUnlock: boolean;
}

/**
 * Pure, dependency-free gate decision for a content entry's visibility.
 *
 * - public            → allow
 * - private           → not-found for anonymous (uniform 404, no existence leak)
 * - password          → prompt unless a valid per-entry unlock cookie exists
 * - unknown/unresolved → not-found (fail-closed, most restrictive)
 * - authenticated     → always allow (checked FIRST so an admin/preview never hits
 *                       a prompt or 404 for their own private/password entries)
 */
export function resolveEntryVisibilityGate(input: EntryVisibilityGateInput): EntryGateDecision {
  if (input.isAuthenticated) return { kind: "allow" };

  switch (input.visibility) {
    case "public":
      return { kind: "allow" };
    case "private":
      return { kind: "not-found" };
    case "password":
      return input.hasValidUnlock ? { kind: "allow" } : { kind: "prompt" };
    default:
      return { kind: "not-found" };
  }
}
