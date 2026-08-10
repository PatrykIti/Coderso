# TASK-414-07: Designer Staging Workspace and State Machine
# FileName: TASK-414-07-Designer-Staging-Workspace-And-State-Machine.md

**Parent Task:** TASK-414
**Priority:** Critical
**Category:** Designer / Staging / State Machine
**Estimated Effort:** Large
**Dependencies:** TASK-414-03 terminal; TASK-551-03-L01 and
TASK-551-06-L01 terminal; TASK-548-03-L01 terminal before Admin integration
**Status:** ⏳ To Do
**Changelog:** 1266 (pinned; TASK-414-11-L01 closure only)

---

## Overview

Create Designer as a durable, owner-scoped staging product rather than a mode
of Agent or a flag on canonical CMS resources. A workspace owns its brief,
private inputs, immutable revisions, staged resource graph, validation and
preview bindings, promotion records, and lifecycle metadata. Before promotion,
those rows are visible only through Designer services and Designer Admin APIs.

This family must not add workflow state, staging flags, workspace IDs, or
approval metadata to `FullSitePackageV1`, `DesignerSiteBundleV1` sidecars,
Pages, Posts, Menus, Forms, settings,
content entries, templates, or any other canonical resource. It consumes the
Designer tables delivered by TASK-414-03-L02. If that terminal schema cannot
represent this contract, correct the owning task before implementation rather
than creating a second table family here.

## Locked Product Invariants

- The persisted enum is exactly `draft | generating | ready |
  promotion_pending | promoted | failed | rejected | expired | restoring |
  reconciliation_required | deleting | deleted`; TASK-414-07-L01 owns the
  closed legal transition matrix and named transition methods.
- Every mutation is compare-and-swap on workspace ID, current state, and
  version. A successful mutation increments the version exactly once.
- Revisions are immutable. Restoring an older revision creates a new revision;
  it never changes historical bytes.
- Core package, ordered sidecars, whole bundle, stage graph, validation receipt,
  and preview always carry explicit digest bindings to the same workspace
  version and revision.
- Saved drafts are visible only inside Designer. Normal CMS lists, search,
  server cache, Agent resources, Guide, and public runtime must return no trace
  of staged resources before promotion.
- `promotion_pending` is entered only through an approval path that owns the
  durable promotion lease. Expiry cannot claim a leased workspace.
- `promoted` and `deleted` are terminal. `rejected`/`expired` cannot reopen but
  may enter `deleting -> deleted`; recovery may move a nonterminal promotion
  back to review or `reconciliation_required` only under TASK-414-09.

## Architecture Boundary

```text
Designer Admin UI
  -> internal Designer API
  -> workspace service + CAS state machine
  -> TASK-414-03-L02 Designer tables/private storage

normal CMS reads/search/cache/public runtime -X-> Designer tables
```

The internal route module is dependency-injected and remains unmounted in this
family. TASK-414-09-L03 is the sole Designer-family writer for shared route,
navigation, permission, and aggregate cache-invalidation integration files.

### TASK-414-03 terminal handoff

TASK-414-03-L02 owns the one schema/migration and low-level Designer persistence
repository/CAS primitives; this family owns the Designer product state policy,
workflow API, and workspace UI. Before dispatch, re-read terminal TASK-414-03
and require a collision-free handoff: no TASK-414-03 route/UI/rate contract may
duplicate the workflow paths, components, permissions, or dedicated buckets
owned here. Any temporary `assistant_designer` bucket or alternate Designer
state/route matrix is contract drift to return to its owner, not a compatibility
alias to preserve. The TASK-414 umbrella's `designer-generation`,
`designer-preview`, and `designer-promotion` policies are canonical.

## Sub-Tasks

1. `TASK-414-07-L01` owns the workspace domain contract, CAS state machine,
   immutable revision operations, bounded Designer read policy, and retention
   eligibility over TASK-414-03-L02's terminal persistence repository.
2. `TASK-414-07-L02` owns strict internal API schemas, one route factory, RBAC
   mapping, error mapping, and the injected facade contract for all Designer
   decisions. It does not mount routes.
3. `TASK-414-07-L03` owns the Designer-only list, shell, draft lifecycle UX,
   browser cache family, and dirty-state protections. It does not edit shared
   Admin route or navigation registries.

Implementation is strictly sequential. Every production or test file has one
writer in this family.

## Security Contract

| Concern | Contract |
|---|---|
| Visibility | All workspace and decision endpoints are internal under `/admin/api/designer/*`; no workspace list/detail is public. |
| Authentication | A valid Admin session is mandatory. Workspace ownership and current actor access are re-evaluated server-side on every request. Coderso is one installation per deployment; requests accept no caller-supplied site/tenant identity. |
| RBAC | Read operations require `designer:read`; draft, input, generation, revision, and reject operations require `designer:write`; approval, promotion, and reconciliation require `designer:promote` plus the native permissions resolved for the staged plan. |
| CSRF | Every state-changing Admin request, including private-input binding, requires the shared CSRF guard. Raw upload stays with TASK-414-04. GET remains side-effect free. |
| Rate limits | `admin_read` for list/detail/revisions, `admin_write` for ordinary draft decisions/uploads, `designer-generation` for provider/compiler runs, `designer-preview` for preview-session creation, and `designer-promotion` for approval/promotion/reconciliation. No endpoint may silently fall back to a weaker bucket. |
| Validation | Every params/query/body schema is strict and reject-unknown. IDs, cursors, versions, digests, idempotency keys, attachment bindings, and page limits are bounded before service dispatch; TASK-414-04 owns raw-file checks. |
| Anti-abuse | Internal writes use session + CSRF + RBAC + ownership/CAS. Public nonce/HMAC and reCAPTCHA are not applicable because this family exposes no public write. TASK-414-08-L03 owns the same-origin, session-bound staged-preview read hardening; no cross-host preview exists in v1. |

Responses and logs must not expose prompts, raw provider bodies, private asset
bytes, preview bind secrets, leases, signatures, or storage keys.

## Acceptance Criteria

- [ ] A user can create, save, list, reopen, and archive/reject a Designer
      draft without creating a canonical CMS row.
- [ ] Legal and illegal state transitions are centralized and CAS-protected.
- [ ] Concurrent edits produce a machine-readable conflict rather than
      last-writer-wins data loss.
- [ ] Revision history is immutable, stable, bounded, and owner-scoped.
- [ ] Designer list queries use stable keyset pagination and select no package,
      graph, prompt, receipt, or large JSON body.
- [ ] No normal CMS query, search indexer, public resolver, or general cache key
      imports Designer tables.
- [ ] UI hydration cannot overwrite dirty local edits; no draft or credential is
      persisted in `localStorage`.
- [ ] The route factory is tested but remains unmounted until TASK-414-09-L03.

## Testing Requirements

Run each leaf's focused tests and gates before landing the next leaf. The final
family pass includes:

```bash
bun --cwd core lint:types
bun --cwd core lint
bunx vitest run --config vitest.config.ts tests/vitest/designer
set -a && source .env && set +a && bun test tests/integration/designer tests/integration/routes/designer.test.ts
git diff --check
```

## Documentation Updates Required

Do not write changelog 1266 or close TASK-414 from this family. Provide the
verified state graph, route matrix, ownership model, retention defaults, and
Admin UX notes to the final TASK-414 documentation/closure leaf.
