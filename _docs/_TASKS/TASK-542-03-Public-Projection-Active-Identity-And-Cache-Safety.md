# TASK-542-03: Public Projection, Active Identity, and Cache Safety

# FileName: TASK-542-03-Public-Projection-Active-Identity-And-Cache-Safety.md

**Parent Task:** TASK-542
**Priority:** High
**Category:** Menus / Public Runtime / Admin Cache / Data Safety
**Estimated Effort:** Medium
**Dependencies:** TASK-542-01, TASK-542-02, TASK-539
**Status:** ✅ Done
**Completed:** 2026-08-21
**Changelog:** 1319 (pinned; closure only)

---

## Scope

Create one Bun-free anonymous navigation projection, consume it at the public
front with one structural active identity and effective-device scroll/icon
behavior, and make Menu Design use the same projection while revalidating caches
without clobbering dirty drafts. This subtask also fixes narrow canvas clearance
and Structure navigation loss.

## Leaves and strict order

| ID | Title | Exclusive source ownership | Status |
|---|---|---|---|
| TASK-542-03-L01 | Create shared public navigation projection | new pure navigation module + direct owner suite | ✅ Done |
| TASK-542-03-L02 | Use projection, active identity, and responsive gates at front | `core/site/siteShell.tsx` | ✅ Done |
| TASK-542-03-L03 | Revalidate Menu Design without clobbering drafts | `MenuDesignEditor.tsx` | ✅ Done |

## Shared invariants

- Projection hides a `logged_in` node and its whole subtree, recursively drops
  dead leaves/groups, preserves source order/metadata, and does not mutate input.
- Active resolution operates on exactly that projected tree and returns one item
  path, never a shared href string.
- Front and canvas import the owner helper; neither retains a local filter clone.
- The projection helper lands with its direct pure suite; closure reruns that suite
  unchanged and adds only consumer-level coverage.
- Cache-first render is immediate, authoritative revalidation is forced in the
  background, and a dirty document is never hydrated over.
- TASK-539 lands first; no parallel `siteShell.tsx` writers.

## Security Contract

Projection is public read-only and must not reveal logged-in-only nodes or dead
descendants. Existing Menu admin authentication/RBAC/CSRF/rate limits remain.
No public write, new endpoint, secret, or browser-storage payload is added.
