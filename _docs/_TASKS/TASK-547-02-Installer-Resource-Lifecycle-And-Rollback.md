# TASK-547-02: Installer Resource Lifecycle and Rollback
# FileName: TASK-547-02-Installer-Resource-Lifecycle-And-Rollback.md

**Parent Task:** TASK-547
**Priority:** Critical
**Category:** Solution Kits / Installer / Data Integrity
**Estimated Effort:** Very Large
**Dependencies:** TASK-547-01
**Status:** ⏳ To Do

---

## Overview

Extend the existing Solution Kit lifecycle to install the package’s missing
native resources without side-writing around the run ledger. Cover content
entries, form actions, Page Templates, listing templates/queries, detail pages,
content routes and safe settings in dependency order, with exact idempotency,
snapshots, reverse rollback and audit evidence.

**Aggregate ownership only:** leaf collision guards are authoritative:
L01 owns legacy installer/facade/types/planner extraction; L02 owns only new
adapter/ledger/execute modules; L03 owns only rollback/compensation and its DB
suite. No leaf may edit another leaf's named files. L01 must split the legacy
installer by cohesive responsibility before adding behavior so every touched
human-authored module closes below 1,000 lines.

## Required Order

`content type → form/fields/actions → Page Template → listing template → entries
→ listing query → detail page → Pages → menus → allowlisted site/design settings
(including `site.contentRoutes`)`.

Settings and shell references land last. Rollback uses exact reverse order.
Media is excluded unless a later task adds an explicit trusted source contract.

## Security Contract

- **Endpoint visibility/auth/RBAC/CSRF/rate limit:** n/a; service + trusted local
  CLI only. Existing Solution Kit routes remain unchanged.
- **Validation:** only TASK-547-01-normalized packages reach apply; no route
  accepts raw package input.
- **Anti-abuse:** no public write; nonce/CAPTCHA n/a.
- **Secrets:** settings allowlist excludes auth, provider, assistant and secret
  namespaces; audit/log snapshots must not contain secret values or submissions.

## Implementation Pseudocode

```ts
export async function planFullSitePackageInstall(
  pkg: FullSitePackageV1,
  deps: InstallerDeps
): Promise<FullSiteInstallPlan> {
  const ordered = planPackageOrder(pkg);
  const resolved = await resolveExistingManagedResources(pkg.key, ordered, deps);
  return buildOperations(ordered, resolved, { failOnUnmanagedConflict: true });
}

export async function applyFullSitePackage(input: ApplyInput): Promise<InstallResult> {
  const plan = await planFullSitePackageInstall(input.package, input.deps);
  if (input.dryRun) return persistSafePlanEvidence(plan); // ledger only; zero domain writes
  return executeWithRunLedger(plan, {
    actorId: input.actorId,
    continueOnError: false,
    resolveRefsImmediatelyBeforeNativeValidation: true,
    wireSettingsLast: true,
  });
}

export async function rollbackFullSitePackage(runId: string, actorId: string) {
  const source = await requireSuccessfulApplyRun(runId);
  return executeRollback([...source.items].reverse(), {
    restoreUpdates: true,
    deleteCreatedOnly: true,
    preserveReusedResources: true,
  });
}
```

**Data flow:** validated graph → current-state resolution → deterministic plan →
native normalizers/services → run/item snapshots → shell/settings last → cache
invalidation → audit.

**Error handling:** conflict before mutation; known domain errors retain
machine-readable codes; unexpected errors are redacted. Failure must not leave a
new shell pointing at incomplete/deleted resources. Either use an encompassing
transaction where safe or perform automatic source-run rollback before returning
failure, with both outcomes recorded.

**Regression-test shape:** first apply complete; second apply no duplicates;
intended managed update; unmanaged collision fail-closed; injected failure
restores prior state; rollback restores previous shell/settings and only owned
rows; invalid/dangling refs perform zero domain writes.

## Sub-Tasks

- [ ] **TASK-547-02-L01** — installer split and deterministic plan resolver.
- [ ] **TASK-547-02-L02** — native resource adapters, ref resolution and run
  ledger.
- [ ] **TASK-547-02-L03** — failure atomicity, reverse rollback and DB/security
  tests.

## Testing Requirements

- `set -a && source .env && set +a`
- `bun test tests/unit/kits/installService.test.ts tests/integration/routes/solutionKitsRoutes.test.ts`
- targeted content/listing/detail/form/page-template/settings runtime suites
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run scan:security:strict`
- touched-file line counts

## Documentation Updates Required

Provide verified contract deltas to TASK-547-06, the sole shared-doc writer.
