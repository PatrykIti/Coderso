// TASK-513-04: pure resolve/normalize helper for the per-content-type permissions matrix.
// Admin-UI-side ONLY — imports NO server module (typeService.ts pulls in `db`). The config
// TYPES are ALIASED from 513-01's CLIENT mirror (contentTypesClient) so the panel prop equals
// the persisted `config.permissions` value and cannot silently drift.
import type {
  ContentTypeConfig,
  ContentTypePermissionCapabilities,
} from "@/services/contentTypesClient";

// Fixed 5-entry allowlist — the single source of truth shared with the render (Security
// Contract). No helper ever writes a cap key outside it, so the emitted matrix always passes the
// server normalizer (513-01), which reject-unknowns any cap outside this set.
export const CAPABILITIES = ["read", "create", "update", "delete", "publish"] as const;
export type Capability = (typeof CAPABILITIES)[number];

// Alias 513-01's owned shape (NOT a fresh Partial<Record<…>>): keeps the panel prop == the
// persisted config.permissions value.
export type RoleCapabilities = ContentTypePermissionCapabilities;
export type PermissionsMatrix = NonNullable<ContentTypeConfig["permissions"]>;

/**
 * UI-side minimizer: keep only caps whose value is `true`, drop empty role rows. Mirrors the
 * server normalizer's KEEP/DROP behavior (513-01's inlined permission loop) so the UI never
 * sends droppable data — but does NOT reject-unknown (the server is authoritative). Pure,
 * Bun/db-free.
 */
export function normalizePermissionsMatrix(input: PermissionsMatrix): PermissionsMatrix {
  const out: PermissionsMatrix = {};
  for (const role of Object.keys(input ?? {})) {
    const caps = input[role];
    if (!caps || typeof caps !== "object") continue; // skip malformed role rows
    const kept: RoleCapabilities = {};
    for (const cap of CAPABILITIES) {
      // fixed allowlist, no unknown caps
      if (caps[cap] === true) kept[cap] = true; // keep only true caps (drop false/undefined)
    }
    if (Object.keys(kept).length > 0) out[role] = kept; // drop empty role rows
  }
  return out;
}

/**
 * Resolve effective caps for a role given the matrix. Missing/undefined role ⇒ `{}` (inherit /
 * none). Returns a NEW object so callers never mutate stored config.
 */
export function resolveRoleCapabilities(
  matrix: PermissionsMatrix | undefined,
  role: string
): RoleCapabilities {
  return { ...(matrix?.[role] ?? {}) };
}

/**
 * Pure toggle: returns a NEXT matrix (shallow-cloned) with role[cap] set/cleared. Setting
 * next=false deletes the cap; if the role row becomes empty its key is removed too, so the
 * emitted matrix is already normalize-clean (identical to normalizePermissionsMatrix output).
 * Never mutates the input matrix.
 */
export function toggleCapability(
  matrix: PermissionsMatrix | undefined,
  role: string,
  cap: Capability,
  next: boolean
): PermissionsMatrix {
  const out: PermissionsMatrix = { ...(matrix ?? {}) };
  const caps: RoleCapabilities = { ...(out[role] ?? {}) };
  if (next) caps[cap] = true;
  else delete caps[cap]; // set true / clear the cap
  if (Object.keys(caps).length > 0)
    out[role] = caps; // keep role with ≥1 true cap
  else delete out[role]; // clearing last cap removes the row
  return out;
}
