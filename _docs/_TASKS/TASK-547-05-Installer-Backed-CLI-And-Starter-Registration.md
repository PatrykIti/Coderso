# TASK-547-05: Installer-Backed CLI
# FileName: TASK-547-05-Installer-Backed-CLI-And-Starter-Registration.md

**Parent Task:** TASK-547
**Priority:** High
**Category:** Developer Experience / Solution Kits / Setup
**Estimated Effort:** Medium
**Dependencies:** TASK-547-04
**Status:** ⏳ To Do

---

## Overview

Replace the hard-coded single-page publisher with a thin CLI over the full-site
installer. Support validation, dry-run, apply and source-run rollback with safe,
machine-readable summaries. Catalog/onboarding registration is explicitly out of
scope because the existing closed `SolutionKitId` API does not accept this package.

**Single-writer ownership:** `scripts/load-projekty-domow.tsx` and its CLI
parser/test module only.

## CLI Contract

```text
bun scripts/load-projekty-domow.tsx --file <path> --dry-run --actor <user-id>
bun scripts/load-projekty-domow.tsx --file <path> --apply --actor <user-id>
bun scripts/load-projekty-domow.tsx --rollback <source-run-id> --actor <user-id>
```

Default `--file` is `_docs/_DEMO/projekty-domow.site.json`. Modes are mutually
exclusive. Dry-run/apply/rollback require an explicit valid actor because the
installer persists safe run-ledger/audit evidence; no arbitrary “first user”
fallback. File/schema validation occurs before DB access. Dry-run performs zero
domain-resource/settings writes but may persist run/item evidence.

## Security Contract

- **Endpoint:** none; trusted local CLI calls the same service boundary.
- **Auth/RBAC/CSRF/rate limit:** n/a for direct CLI, but actor attribution is
  mandatory and audit evidence is identical to service/API installs.
- **Validation:** exact TASK-547-01 parser; unknown keys and unsafe file content
  fail before DB access where possible.
- **Secrets:** never print package content, settings values, credentials or form
  submissions. Summaries contain resource keys, operations and safe error codes.
- Registration remains server-chosen; do not let `/setup/starter-content/apply`
  accept a raw client package.

## Implementation Pseudocode

```ts
export async function runFormaDomPackageCli(argv: string[], deps: CliDeps): Promise<number> {
  const args = parseStrictArgs(argv);
  if (args.mode === "rollback") {
    return printResult(await deps.rollback(args.sourceRunId, requireActor(args)));
  }
  const pkg = normalizeFullSitePackageForWrite(await deps.readJson(args.file));
  const result = await deps.install({
    package: pkg,
    dryRun: args.mode === "dry-run",
    actorId: requireActor(args),
  });
  return printResult(result);
}
```

**Data flow:** strict args → bounded file read/JSON parse → package normalize →
plan/apply/rollback service → safe summary → stable exit code.

**Error handling:** invalid args/schema/file/actor/conflict return non-zero with a
machine-readable code. Do not partially publish a Page or bypass the run ledger.

**Regression-test shape:** flag exclusivity, missing/oversized/invalid JSON,
schema/file validation before DB, dry-run ledger evidence with zero domain writes,
actor requirement in every mode, apply/rollback delegation, safe stdout and
stable non-zero exits.

## Sub-Tasks

- [ ] **TASK-547-05-L01** — strict installer CLI, safe output and tests.

## Testing Requirements

- targeted Bun CLI tests
- existing Solution Kit/starter-content route and service suites
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- touched-file line counts

## Documentation Updates Required

Provide operator-guide content to TASK-547-06, the sole shared-doc writer.
