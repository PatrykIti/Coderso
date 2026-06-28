# TASK-485-03-L01: pluginLifecycleService + deletePlugin
# FileName: TASK-485-03-L01-Plugin-Lifecycle-Service.md

**Parent Subtask:** TASK-485-03
**Priority:** High
**Category:** Store / Plugins / Domain Service
**Estimated Effort:** Medium
**Dependencies:** None hard (wraps `installService` + `registry`).
**Status:** ⏳ To Do
**Started:** `<YYYY-MM-DD>`
**Completed:** `<YYYY-MM-DD>`

---

## Overview

- **Goal:** A single domain service that owns every lifecycle operation the admin
  needs — install, update, uninstall, enable/disable toggle, get/set update policy
  — plus the lifecycle error taxonomy. It composes the existing install pipeline
  (so the signature/checksum/compatibility checks are never bypassed) and adds the
  two missing pieces: `uninstall` and per-plugin policy persistence.
- **Owning module(s) to create-or-extend:**
  - **Create** `core/services/plugins/pluginLifecycleService.ts` (orchestration +
    `PluginLifecycleError` + the `updatePolicy` enum re-use + write schemas owned
    here for routes to re-export).
  - **Extend** `core/plugins/registry.ts` — add `deletePlugin(name)` (DB delete;
    `plugin_settings` rows cascade via the existing FK `onDelete:"cascade"`).
  - **Reuse** `installService.ts`, `loader.ts` (`DEFAULT_PLUGINS_DIR`),
    `updater.ts` (`resolveUpdatePolicy`), `auditService.ts`.
- **Source-of-truth docs:** `_docs/STORE_SPEC.md`, `_docs/CODERSO_PLUGIN_CONTRACT.md`,
  `_docs/SDK_SPEC.md`, `_docs/CMS_API.md`.
- **Out of scope:** the routes (L02), tests (L03), the catalog (subtask 02).
  **No new table** — policy lives in `plugin_settings`; uninstall deletes rows.
- **DB note:** this leaf changes **code only** (`deletePlugin` is a new query over
  the existing `plugins` table; policy uses existing `plugin_settings`). **No
  migration artifacts are required.** If a future change instead adds a dedicated
  `update_policy` column, it MUST ship full artifacts (SQL + `meta/<idx>_snapshot
  .json` + `meta/_journal.json`) — explicitly avoided here (YAGNI).

---

## Security Contract

- **Endpoint visibility:** none here (service); consumed by gated routes (L02).
- **Auth/RBAC:** the L02 routes enforce `plugins:manage`; the service must be
  called only from there. `actorId` is threaded through for audit attribution.
- **Validation:** **schema owner** for the write payloads
  (`installPluginSchema`, `updatePolicySchema`) — `.strict()` / reject-unknown,
  `version` semver-ish, `policy ∈ {manual, auto-security, auto-all}` via
  `resolveUpdatePolicy`. Routes re-export these; they do not redeclare them.
- **Pipeline must not be bypassed:** install/update delegate to
  `installPluginFromStore` / `updatePluginFromStore`, which already run
  `assertMetadataSignature` + `assertChecksum` + `assertMetadataCompatibility`.
  The lifecycle service adds **no** alternate install path and never accepts a
  client-supplied package/URL — only `(name, version)` resolved against the store.
- **Uninstall safety:** the runtime-dir removal must be path-confined to
  `DEFAULT_PLUGINS_DIR` (resolve + assert the target is inside it before `rm`),
  reusing the same defensive posture as the downloader's zip-slip guard. Never
  delete outside the plugins dir.
- **Audit:** every op calls `logAudit` (`plugins.install` / `plugins.update` /
  `plugins.uninstall` / `plugins.enable` / `plugins.disable` / `plugins.policy`)
  with `actorId` + non-secret metadata (`name`, `version`, `policy`).
- **Secret/PII handling:** never return `integrity`/`signature`/store URLs to the
  caller; never log them. `STORE_PUBLIC_KEY` stays server-side (read inside the
  install pipeline only).

---

## Implementation Pseudocode

```ts
// core/plugins/registry.ts  (addition)
export async function deletePlugin(name: string) {
  const [row] = await db.delete(plugins).where(eq(plugins.name, name)).returning();
  return row ?? null; // plugin_settings rows cascade (FK onDelete: "cascade")
}
```

```ts
// core/services/plugins/pluginLifecycleService.ts
import path from "node:path";
import { rm } from "node:fs/promises";
import { installPluginFromStore, updatePluginFromStore } from "../../plugins/installService";
import { getPluginByName, setPluginEnabled, getPluginSetting, setPluginSetting, deletePlugin } from "../../plugins/registry";
import { DEFAULT_PLUGINS_DIR } from "../../plugins/loader";
import { resolveUpdatePolicy, type UpdatePolicy } from "../../store/updater";
import { logAudit } from "../audit/auditService";

export const PLUGIN_NOT_FOUND = "plugin_not_found";
export const PLUGIN_INSTALL_FAILED = "plugin_install_failed";
export const PLUGIN_SIGNATURE_INVALID = "store_signature_invalid";
export const PLUGIN_CHECKSUM_MISMATCH = "store_checksum_mismatch";
export const PLUGIN_INCOMPATIBLE = "plugin_incompatible";
export const PLUGIN_UPDATE_SKIPPED = "plugin_update_skipped";

export class PluginLifecycleError extends Error {
  constructor(public readonly code: string, public readonly status = 400, public readonly detail?: unknown) {
    super(code); this.name = "PluginLifecycleError";
  }
}

// Translate the pipeline's thrown messages (store_signature_invalid,
// store_checksum_mismatch, plugin_manifest_mismatch, compat errors, ...) into
// stable lifecycle codes. Unknown -> plugin_install_failed.
function mapPipelineError(err: unknown): never {
  const m = err instanceof Error ? err.message : "";
  if (m === "store_signature_invalid") throw new PluginLifecycleError(PLUGIN_SIGNATURE_INVALID, 400);
  if (m === "store_checksum_mismatch") throw new PluginLifecycleError(PLUGIN_CHECKSUM_MISMATCH, 400);
  if (/compat|coreVersion|apiVersion/i.test(m)) throw new PluginLifecycleError(PLUGIN_INCOMPATIBLE, 409, { reason: m });
  throw new PluginLifecycleError(PLUGIN_INSTALL_FAILED, 502, { reason: m });
}

export async function installPlugin(name: string, version: string, actorId?: string | null) {
  try {
    const { plugin } = await installPluginFromStore(name, version, { actorId, source: "manual" });
    return plugin; // installService already logs plugins.install/update
  } catch (err) { mapPipelineError(err); }
}

export async function updatePlugin(name: string, version: string, opts?: { actorId?: string | null; force?: boolean }) {
  try {
    const res = await updatePluginFromStore(name, version, { actorId: opts?.actorId ?? null, force: opts?.force });
    if (res.skipped) throw new PluginLifecycleError(PLUGIN_UPDATE_SKIPPED, 409, { reason: res.reason });
    return await getPluginByName(name);
  } catch (err) { if (err instanceof PluginLifecycleError) throw err; mapPipelineError(err); }
}

function assertInsidePluginsDir(target: string) {
  const root = path.resolve(DEFAULT_PLUGINS_DIR);
  const resolved = path.resolve(target);
  if (resolved !== root && !resolved.startsWith(root + path.sep)) {
    throw new PluginLifecycleError(PLUGIN_INSTALL_FAILED, 500, { reason: "path_escape" });
  }
}

export async function uninstallPlugin(name: string, actorId?: string | null) {
  const existing = await getPluginByName(name);
  if (!existing) throw new PluginLifecycleError(PLUGIN_NOT_FOUND, 404);
  const dir = path.join(DEFAULT_PLUGINS_DIR, name);
  assertInsidePluginsDir(dir);
  await rm(dir, { recursive: true, force: true });   // remove runtime files
  await deletePlugin(name);                           // DB row + settings cascade
  await logAudit({ actorId: actorId ?? null, action: "plugins.uninstall",
    targetType: "plugin", targetId: name, metadata: { version: existing.version } });
  // NOTE: an already-loaded module's in-memory contributions are not hot-unloaded
  // in v1 (pluginManager has no unload); they clear on next process start. Document
  // this in CODERSO_PLUGIN_CONTRACT.md; do not build a hot-unloader here (YAGNI).
  return { name, removed: true };
}

export async function setEnabled(name: string, enabled: boolean, actorId?: string | null) {
  const row = await setPluginEnabled(name, enabled);
  if (!row) throw new PluginLifecycleError(PLUGIN_NOT_FOUND, 404);
  await logAudit({ actorId: actorId ?? null, action: enabled ? "plugins.enable" : "plugins.disable",
    targetType: "plugin", targetId: name, metadata: { version: row.version } });
  return row;
}

export async function getPolicy(name: string): Promise<UpdatePolicy> {
  return resolveUpdatePolicy((await getPluginSetting(name, "updatePolicy")) as string | undefined);
}

export async function setPolicy(name: string, policy: UpdatePolicy, actorId?: string | null) {
  const existing = await getPluginByName(name);
  if (!existing) throw new PluginLifecycleError(PLUGIN_NOT_FOUND, 404);
  const normalized = resolveUpdatePolicy(policy);
  await setPluginSetting(name, "updatePolicy", normalized);
  await logAudit({ actorId: actorId ?? null, action: "plugins.policy",
    targetType: "plugin", targetId: name, metadata: { policy: normalized } });
  return normalized;
}
```

**Data flow:** route → lifecycle fn → install pipeline / registry / fs / audit →
secret-free record. **Error handling:** pipeline messages map to stable lifecycle
codes via `mapPipelineError`; `PLUGIN_NOT_FOUND`/`PLUGIN_UPDATE_SKIPPED` are
explicit; the route boundary (L02) maps `PluginLifecycleError` to `ApiError`.

**Regression-test shape (Bun, L03):** install delegates to the pipeline (bad
signature/checksum → mapped code, never a silent success); `uninstallPlugin`
removes the dir + deletes the row + audits, and refuses a path that escapes
`DEFAULT_PLUGINS_DIR`; `setPolicy`/`getPolicy` round-trip via `plugin_settings`
and reject an out-of-enum policy.

---

## Testing Requirements

- `bun --cwd core lint`, `bun --cwd core lint:types`.
- **Bun lane (mandatory — runtime kernel + DB + fs):** covered by L03
  (`tests/integration/plugins/pluginLifecycle.test.ts`). Load env first:
  `set -a && source .env && set +a`.
- Optional Vitest unit for pure mappers (`mapPipelineError`, policy normalize) if
  isolatable without DB; otherwise the Bun lane is authoritative.
