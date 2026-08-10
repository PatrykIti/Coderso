# TASK-548-04-L03: Portal Accessibility, Security and Browser Gates
# FileName: TASK-548-04-L03-Portal-Accessibility-Security-And-Browser-Gates.md

**Parent Task:** TASK-548
**Parent Subtask:** TASK-548-04
**Priority:** High
**Category:** Accessibility / Security / Runtime QA
**Estimated Effort:** Large
**Dependencies:** TASK-548-04-L02; TASK-545 must be `✅ Done` and TASK-547 must be fully terminal before dispatch
**Status:** ⏳ To Do
**Changelog:** 1261 (pinned; closure only)

---

## Overview

Prove the built portal artifact is complete, public-safe, accessible, and usable
in real browsers before TASK-548-05 may publish it. Add a deterministic
artifact validator, focused security/accessibility tests, and seven distinct
real-browser flows through the shared runtime-smoke entry point. Every flow
asserts visible effects rather than control presence.

This leaf is a gate owner, not a second portal implementation owner. A portal
source defect is returned to the exclusive L01/L02 owner, fixed there, and all
affected gates rerun before L03 passes.

## Exclusive Ownership

This leaf is the only writer for:

- new `packages/docs-portal/scripts/validate-built-portal.ts`;
- new `tests/vitest/docs-portal/portal-security.test.ts`;
- new `tests/vitest/docs-portal/portal-accessibility.test.tsx`;
- focused portal scenario contribution modules behind the ALREADY-LANDED fixed
  `task-548-portal` suite row (registered by TASK-548-02-L02, the sole
  shared-seam writer): thin
  `scripts/runtime-smoke/adapters/task-548-portal.ts` plus focused
  `scripts/runtime-smoke/adapters/task-548-portal/browser-actions.ts` and
  `scripts/runtime-smoke/adapters/task-548-portal/artifact-fixture.ts` and
  `scripts/runtime-smoke/adapters/task-548-portal/candidate-evidence.ts`;
- focused test `tests/unit/runtime-smoke/task-548-portal-adapter.test.ts`.

It must not edit portal shell/search/build/route/SEO production files,
`packages/docs-renderer`, root workflow/release files, final
`scripts/runtime-smoke/adapters/task-548.ts` and
`scripts/runtime-smoke/adapters/task-548/**` implementation files, or
task/changelog metadata. It must NOT rewrite any shared runtime-smoke seam:
`scripts/runtime-smoke/contracts.ts`, `scripts/runtime-smoke/cli.ts`,
`scripts/runtime-smoke/registry.ts`,
`tests/unit/runtime-smoke/cli-registry.test.ts`, or
`docs/develop/runtime-smoke-cookbook.md` — those are TASK-548-02-L02
sole-writer files, and this leaf's fixed `task-548-portal` row/recipe is
already landed there. TASK-548-02-L02 already registered and implemented the
five-flow `task-548` pilot adapter; this leaf preserves its central row,
adapter, tests, and recipe read-only while implementing the focused
`task-548-portal` contribution modules.
TASK-548-07-L01 later contributes only the focused final eight-flow scenario
module to the same already-landed `task-548` adapter. Findings go back to the owning leaf; missing results are a failed
gate, not a clean pass. Targeted-run screenshots/results stay below
`_docs/_workflows/_smoke/candidates/task-548-portal/<session>/`; this leaf never
writes the canonical TASK-545 evidence directory, `manifest.json`, or
`resume-checkpoint.json`.

The registry, CLI, contracts, central test, and cookbook are shared serialized
seams owned sole-writer by TASK-548-02-L02. This leaf starts only after
TASK-545 and every earlier active writer are
terminal, rereads their current bytes, preserves every landed suite/profile,
and implements only its focused portal contribution modules and focused test
consumed by the already-landed fixed `task-548-portal` row. TASK-548-07-L01 and
later TASK-414-11 consume those central bytes read-only.

## Artifact Validator Contract

`packages/docs-portal/scripts/validate-built-portal.ts` takes one explicit
validated output root (default only when exactly
`packages/docs-portal/dist`) and verifies:

- `docs-portal-manifest.json` strict shape, unique routes/files, input identity,
  normalized origin/base path and safe relative paths;
- the root manifest is the sole file excluded from its own sorted `files[]`;
  every other emitted file has exact byte size/SHA-256, and a self-record,
  second exclusion, untracked file or orphan record fails;
- every canonical/alias/search/asset/sitemap/robots/header/redirect reference
  resolves inside the artifact or to the one configured HTTPS origin;
- every manifest `visualAssets[]` record has a bundle-global unique `visualId`,
  exact `(docId, locale, sectionId)` ownership, and a byte/hash-identical
  `files[]` record; localized pages may reference only their own records;
- `deployment/site-index.json` is the exact recursively reject-unknown
  single-release candidate, not a cumulative history, and every prebuilt source
  candidate mapped by
  TASK-548-05 into capsule `latest/**`, `routing/{redirects,headers}.json` and
  `global/{sitemap.xml,robots.txt,site-index.json}` agree byte-for-byte with the
  portal manifest records;
- root `404.html` is one typed, base-safe, `noindex,follow` page with exact
  route-graph alternatives, no reflected request path, four valid islands and
  the same L02-owned client tags as canonical/latest pages; local preview maps
  an unmatched base-path request to these exact bytes with HTTP 404;
- `deployment/client-assets.json` passes the exact L02 owner normalizer and
  canonical-byte check; entry/styles/files close the complete Vite graph and
  every path/href/byte/hash joins the detached manifest and HTML tags;
- canonical routes, locale/version selectors, TOC/section anchors, related
  links, latest redirects, sitemap, robots, hreflang, OG, and JSON-LD agree;
- `deployment/headers.json` yields CSP without `unsafe-inline`/`unsafe-eval`,
  frame denial, nosniff, strict referrer/permissions policies, and immutable
  hashed-asset caching;
- root `_headers` is canonical LF output, joins its manifest file record,
  stays within Cloudflare Pages limits and is semantically identical to
  `deployment/headers.json` for exact/latest/404/client-asset paths; each
  canonical route alone gets its exact JSON-LD hashes after detaching inherited
  CSP, while alias/404 contain no JSON-LD and inherit `script-src 'self'`;
- no source map, absolute filesystem path, `_docs`, task/changelog/audit/smoke
  text, localhost, private IP, credential-bearing URL, secret-like key/value,
  PII fixture, raw source Markdown, or unapproved external origin;
- no inline event handler, unsafe scheme, iframe/object/embed, executable
  example, unverified SVG/HTML, or unhashed external media;
- every image has meaningful alt/caption metadata and known sanitized hash;
- each canonical HTML page has one main landmark, skip link, unique H1, valid
  heading order, labeled navigation/search, and visible-focus CSS contract.

The validator streams/bounds input sizes, rejects symlinks/path escapes, and
does not execute HTML/JSON/script content.

L03 owns validation and receipt production, but not a second DTO. Its validator
imports the exact pure server/build contract:

```ts
import { normalizeDocsPortalClientAssetsManifestV1,
  normalizeDocsPortalManifestV1,
  normalizeDocsPortalSiteIndexCandidateV1,
  normalizeDocsPortalValidationReceiptV1,
  serializeDocsPortalClientAssetsManifestV1,
  serializeDocsPortalManifestV1,
  serializeDocsPortalSiteIndexCandidateV1,
  serializeDocsPortalValidationReceiptV1,
  type DocsPortalManifestV1,
  type DocsPortalValidationReceiptV1,
} from "@coderso/docs-portal/publication-contracts";
```

No validator/client deep import or duplicate shape is valid. The owner
normalizer rejects unknown keys recursively and the CLI emits only paired
serializer bytes after proving serialize→parse→normalize byte identity.

`manifestSha256` is lowercase hex SHA-256 of the exact raw detached-manifest
bytes, without a domain prefix, and is never written into
`DocsPortalManifestV1`. L03 solely owns:

```ts
export const DOCS_PORTAL_FILES_ROOT_DOMAIN_V1 =
  "coderso.docs-portal.files-root.v1" as const;
export const DOCS_PORTAL_ARTIFACT_ROOT_DOMAIN_V1 =
  "coderso.docs-portal.artifact-root.v1" as const;

export function hashDocsPortalFilesRootV1(
  records: readonly { path: string; bytes: number; sha256: string }[]
): string;

export function hashDocsPortalArtifactRootV1(input: {
  manifestSha256: string;
  filesRootSha256: string;
}): string;
```

`filesRootSha256` is lowercase hex SHA-256 over exactly
`UTF8(DOCS_PORTAL_FILES_ROOT_DOMAIN_V1) || 0x00 || u64be(recordCount)`,
followed for each record by
`u32be(pathUtf8.length) || pathUtf8 || u64be(bytes) ||
raw32(hexDecode(sha256))`. Paths are non-empty NFC, confined, base-relative
POSIX paths, unique and sorted by unsigned raw UTF-8 byte order before hashing.
Counts and lengths use the fixed-width unsigned big-endian widths shown;
`bytes` is a bounded non-negative safe integer. Input digests are exact
lowercase 64-hex decoded to 32 raw bytes, never their 64 ASCII characters.
There are no implicit separators, JSON encoding, platform path rules, or final
newline. The empty record set is defined by the domain, NUL, and zero `u64be`
count.

`artifactRootSha256` is lowercase hex SHA-256 over exactly
`UTF8(DOCS_PORTAL_ARTIFACT_ROOT_DOMAIN_V1) || 0x00 ||
raw32(hexDecode(manifestSha256)) || raw32(hexDecode(filesRootSha256))`, with no
lengths, separators, or final newline. The independent producer and reopened
artifact verifier implement these byte streams separately and must match these
golden vectors:

- empty files root:
  `22e2b152769ac29645b74b2a38ac06d01abcd83f379caf11daea08a21be884d6`;
- one file `a.txt`, `bytes = 3`, and SHA-256 of raw `abc`
  (`ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad`):
  `493343b5ef343313ec1d14f3a09475c7d34f8f51a44cb80f16cdc07a26efb547`;
- exact manifest bytes `{}\n`:
  `ca3d163bab055381827226140568f3bef7eaac187cebd76878e0b63e9e442356`;
- that manifest with the empty and one-file roots respectively:
  `dce715eba7ab2a2cf04ca51a1da949f9652eee47cd7959dd7369220feeeef547`
  and
  `648fe5d4f45f7e4bd3f9729fccf0da00c55ff11bd7abce3774fecf89a621076d`.

The receipt is returned to TASK-548-05-L01 or written outside `dist`; it can
never become an untracked portal output or a second manifest exclusion. A
failure returns a typed error and never emits a receipt with `status: "pass"`.

## Browser Gate Scenarios

Register and execute the following exact ordered scenario IDs through the thin
shared `task-548-portal` adapter:

1. `portal-wide-search-read-hydration`;
2. `portal-keyboard-navigation`;
3. `portal-responsive-layout`;
4. `portal-dark-reduced-motion`;
5. `portal-version-latest-deep-link`;
6. `portal-locale-visual-truth`;
7. `portal-offline-static-no-runtime`.

Both profiles run all seven IDs:

```bash
bun scripts/runtime-smoke.ts run \
  --suite task-548-portal --profile fast --session task-548-portal-fast
TASK548_PORTAL_ARTIFACT_ROOT="$task548_portal_artifact_root" \
TASK548_PORTAL_PRODUCT_VERSION="$task548_portal_product_version" \
TASK548_PORTAL_GIT_SHA="$task548_portal_git_sha" \
TASK548_PORTAL_MANIFEST_SHA256="$task548_portal_manifest_sha256" \
TASK548_PORTAL_ARTIFACT_ROOT_SHA256="$task548_portal_artifact_root_sha256" \
  bun scripts/runtime-smoke.ts run \
    --suite task-548-portal --profile certification \
    --session task-548-portal-certification
```

Fast accepts only the exact default built-artifact root and derives its test
identity by running the same validator in-process. Certification rejects unless
all five release-owned environment values above are present, bounded and equal
to the independently validated artifact. Neither profile trusts ambient origin,
version or filesystem values. In ROLLBACK mode (TASK-548-05-L02), the same
certification profile runs against the materialized retained-capsule tree and
binds all five inputs from the target capsule's ORIGINAL verified bytes
(`VerifiedDocsRollbackCandidateV1`: artifactRoot = the confined materialized
root, productVersion = the selected version, originalGitSha /
portalManifestSha256 / artifactRootSha256 = the capsule's original release
identity/hashes) — never ambient environment, the current checkout or guessed
values; the gate executes BEFORE any retained mutation and a failure leaves
branch/Cloudflare untouched. Before any profile starts a real browser, the
fresh runner executes TASK-548-02-L02's Pinned Local Browser Install Contract:
verify the local pinned `@playwright/cli` package version from the pinned
manifest/lock, run `./node_modules/.bin/playwright install --with-deps
chromium` (the exact local binary), and verify the underlying Playwright
version and installed Chromium executable/revision; missing or version-drifted
browser/package blocks with `docs_visual_tool_version_mismatch` before any
scenario (global/`npx`-latest install paths are forbidden).

Do not start a task-local static-server, Playwright, polling, worker, cleanup,
checkpoint, or report lifecycle. The adapter composes the existing
`RuntimeSmokeContext`, process supervisor, condition polling, browser segment
compiler/`BrowserTransport`, repository guard, redaction, timing, screenshot,
cleanup, and report helpers exactly as registered in
`docs/develop/runtime-smoke-cookbook.md`. It allocates every preview process,
port, browser session, temporary workspace, and settings override only after
`context.lifecycle.assertAccepting()` and immediately registers an idempotent
`LifecycleResource`; the shared runner remains the only outer lifecycle and
report loop.

The action/assertion meanings are:

1. **Wide light search/read:** search a known screen, open a result, assert URL,
   H1, highlighted result text, TOC target geometry, screenshot/alt/caption, and
   no horizontal overflow. Before navigation install console/page-error
   collectors, then require exactly the four declared sibling hydration roots,
   functional interaction in each root, zero DOM replacement of the static
   article/navigation/TOC, and zero
   `docs_portal_hydration_recoverable_error` diagnostics.
2. **Keyboard-only navigation:** skip to content, operate search/results/TOC/
   version controls, open/close mobile or desktop navigation as applicable,
   assert focus order/restore and visible focus ring.
3. **Narrow responsive:** mobile navigation opens without covering/trapping the
   article incorrectly, long code/table/visual content remains scroll-safe,
   touch targets and bounding boxes are usable.
4. **Dark + reduced motion:** emulate dark and reduced motion; assert computed
   foreground/background/token changes, animation duration/behavior, visual
   readability, and screenshot.
5. **Version/latest/deep link:** serve a strict cumulative same-origin
   `/site-index.json` with two retained versions, open a versioned section deep
   link and matching latest alias, and assert canonical/noindex metadata,
   same-`(docId, locale)` version selection, anchor offset, and alias mapping.
6. **Locale truth:** verify English complete route and one available alternate
   fixture; verify missing Polish translation is not advertised, fallback is
   explicit, and a visual resolves only through its localized
   `(docId, locale, sectionId)` owner despite a bundle-global `visualId`.
7. **Static/offline/no-runtime dependency:** after initial local artifact load,
   make the cumulative site index unavailable, block all non-preview origins,
   repeat article/search navigation, assert the selector remains current-only,
   and assert zero provider/CMS/analytics/external image calls.

The route flows also request one deterministic missing path under the configured
base and require status 404, body hash equal to root `404.html`, visible real
alternatives, noindex, functioning four-island UI, base-safe client requests,
and no redirect or SPA-200 fallback.

All scenarios require zero console/page errors and zero unexpected network
requests. The adapter result itself carries each exact title, public-surface
variant, computed/geometry/DOM/ARIA assertion with expected and actual values,
console array, and screenshot path/hash. The report's global screenshot list is
the exact unique union of those seven scenario-owned screenshots. No workflow
postprocessor may fabricate or enrich the result. The targeted run writes one
screenshot per scenario into its exact task-owned candidate directory for
immediate human review.

## Prepublication Gate And Canonical TASK-545 Handoff

This leaf's local fast/certification candidates remain exclusively below
`_docs/_workflows/_smoke/candidates/task-548-portal/<session>/`. They are
targeted feedback, not final TASK-545 evidence and not publication authority.
After review, the exact candidate-evidence cleanup verifies the seven-file
screenshot allowlist plus report hash, removes only that resolved task-owned
session root, proves it absent/no-symlink, and requires the repository status to
return to its pre-run state. Runtime resources are still cleaned only by the
shared `RuntimeLifecycle`; this evidence cleanup is not a server/browser/
worker lifecycle and does not create a second report.

TASK-548-05-L02 must run the same `task-548-portal` certification profile in
the tag-pinned release checkout after rebuilding and validating the exact
`packages/docs-portal/dist`, but before any GitHub Release asset upload,
retained-tree write, mutable-alias write, Cloudflare deployment, or rollback.
The adapter receives only a validated repository-relative artifact root and
the expected product version, Git SHA, portal manifest hash and artifact-root
hash through an exact allowlisted environment projection. Every value is
asserted as visible/report evidence; ambient values, alternate roots, stale
candidate bytes, or a report from another run fail closed. For a docs-rollback
run, TASK-548-05-L02 executes the SAME certification profile with the five
inputs derived and bound from the materialized retained-capsule bytes
(`VerifiedDocsRollbackCandidateV1`: artifactRoot/productVersion/originalGitSha/
portalManifestSha256/artifactRootSha256) before any rollback mutation, after
the Pinned Local Browser Install Contract verified the local browser.

That release job captures canonical runner JSON stdout byte-for-byte as
`report.json`, requires the exact seven IDs/titles/variants/assertions,
`pass: true`, `serverUp: true`, zero console/page/network errors, seven unique
screenshots and successful shared cleanup, then uploads exactly the report, the
seven candidate PNGs, and the canonical prepublication receipt
(`docs-portal-prepublication-receipt-v1.json`) as the nine-member noncanonical
workflow artifact
`docs-portal-prepublication-gate-<productVersion>-<gitSha>-<workflowRunId>`.
The artifact retention is 90 days and its upload does not authorize product
publication. The workflow then removes/proves absent the exact candidate root
and rechecks clean tag bytes before the first publication mutation. Any gate,
upload, cleanup or clean-tree failure blocks publication.

The fresh TASK-548-07-L01 release-resume downloads that exact successful-run
artifact, verifies its bounded inventory, runner-report bytes, screenshot
hashes and version/SHA/manifest/artifact-root assertions, and consumes it only
as prepublication evidence. The final `task-548` adapter imports this leaf's
seven action/assertion implementations read-only and independently executes
them as seven variants of final scenario
`portal-local-exact-latest-rollback` against its disposable retained-Pages
session. One reviewed final scenario screenshot is sufficient because all
seven variants retain machine-visible proofs in the shared report.

TASK-548-07-L01 alone writes final
`06-portal-local-exact-latest-rollback.png`, the exact eight-screenshot
TASK-545 inventory and its report/manifest. TASK-545 `createResumeCheckpoint`
alone writes `resume-checkpoint.json`. This leaf writes neither canonical
evidence nor checkpoint and never closes metadata.

## Security Contract

- **Endpoint visibility:** tests public read-only static content; no API/write.
- **Auth/RBAC/CSRF/rate limit:** not applicable to portal files. Preview server
  binds loopback only and is task-scoped.
- **Validation:** validator input/output and fixtures are strict, bounded,
  reject-unknown, path-safe, and hash-authoritative.
- **Anti-abuse:** no public write; nonce/HMAC/reCAPTCHA are not applicable.
- **CSP/content:** hostile fixture coverage includes HTML/script/event/style/
  URL/path/redirect/JSON-LD escapes; no suppression or permissive fallback.
- **Secrets/privacy:** scans fail on secret-like output, internal source paths,
  PII, remote trackers, source maps, or credentialed URLs. Logs/screenshots must
  contain only synthetic public-safe fixtures.

## Implementation Pseudocode

```ts
export async function validateBuiltPortal(
  root: string,
  options: PortalArtifactValidationOptions = {}
): Promise<{
  manifest: DocsPortalManifestV1;
  receipt: DocsPortalValidationReceiptV1;
  receiptBytes: Uint8Array;
}> {
  const exactRoot = await assertAllowedPortalRoot(root);
  const manifestBytes = await readBoundedBytes(exactRoot, "docs-portal-manifest.json");
  const manifest = normalizeDocsPortalManifestV1(parseJson(manifestBytes));
  assertBytesEqual(manifestBytes, serializeDocsPortalManifestV1(manifest));
  const files = await walkFilesWithoutSymlinks(exactRoot, options.maxFiles);

  assertDetachedManifestIsSoleExcludedControlFile(manifest, files);
  await verifyEveryOtherFileHash(exactRoot, manifest.files);
  assertLocalizedVisualAssetOwnership(manifest.visualAssets, manifest.files);
  assertCurrentReleaseSiteIndexCandidate(exactRoot, manifest);
  validateRouteSeoLinkAndDeploymentGraph(exactRoot, manifest);
  scanPublicBytesForForbiddenMaterial(exactRoot, manifest);
  const receipt = normalizeDocsPortalValidationReceiptV1({
    schema: "coderso.docs-portal-validation@v1",
    status: "pass",
    ...portalIdentityFromManifest(manifest),
    manifestPath: "docs-portal-manifest.json",
    manifestSha256: sha256(manifestBytes),
    soleExcludedPath: "docs-portal-manifest.json",
    ...computePortalRootClosureFacts(manifest, files),
    allManifestFilesVerified: true,
    untrackedFileCount: 0,
    orphanRecordCount: 0,
  });
  const receiptBytes = serializeDocsPortalValidationReceiptV1(receipt);
  assertCanonicalReceiptRoundTripV1(receiptBytes, receipt);
  return { manifest, receipt, receiptBytes };
}

export const TASK_548_PORTAL_SCENARIO_IDS = Object.freeze([
  "portal-wide-search-read-hydration",
  "portal-keyboard-navigation",
  "portal-responsive-layout",
  "portal-dark-reduced-motion",
  "portal-version-latest-deep-link",
  "portal-locale-visual-truth",
  "portal-offline-static-no-runtime",
] as const);

export async function runTask548PortalAdapter(
  context: RuntimeSmokeContext
): Promise<SmokeAdapterResult> {
  requireExactSuiteAndProfile(context.input, {
    suite: "task-548-portal",
    profiles: ["fast", "certification"],
  });
  const input = await normalizePortalGateEnvironmentAndOpenExactArtifact({
    root: context.root,
    profile: context.input.profile,
    environment: process.env,
    fastDefaultRoot: "packages/docs-portal/dist",
    certificationRequiresAllExpectedIdentity: true,
  });
  context.lifecycle.assertAccepting();
  const preview = await createPortalPreviewResource(context, input);
  context.lifecycle.register(preview);
  context.lifecycle.assertAccepting();
  const browser = await createSharedBrowserTransportResource(context);
  context.lifecycle.register(browser);
  const rawScenarios = await runExactPortalBrowserActions({
    context,
    browser,
    preview,
    ids: TASK_548_PORTAL_SCENARIO_IDS,
    artifactIdentity: input.identity,
  });
  const globalScreenshots = exactUniqueScenarioScreenshotUnion(rawScenarios);
  const scenarios = requireManifestableScenarioResults(
    rawScenarios,
    globalScreenshots,
  );
  return Object.freeze({
    serverUp: true,
    scenarios,
    screenshots: globalScreenshots,
    consoleErrors: Object.freeze([]),
    cleanup: { restorationPendingSharedLifecycle: true },
  });
}

const TASK_548_PORTAL_CANDIDATE_RELATIVE_PATHS = Object.freeze([
  "report.json",
  ...TASK_548_PORTAL_SCENARIO_IDS.map((id) => `${id}.png`),
] as const);

export async function removeTask548PortalCandidateEvidenceSubset(input: {
  repoRoot: string;
  session: "task-548-portal-fast" | "task-548-portal-certification";
}): Promise<void> {
  const root = resolveExactPortalCandidateRoot(input.repoRoot, input.session);
  if (!(await pathExistsWithoutFollowingLinks(root))) return;
  await requireRegularDirectoryWithoutSymlinkComponents(root);
  const present = await enumerateRegularFilesNoSymlinks(root);
  requirePresentSetIsAnySubsetOfExactAllowlist(
    present,
    TASK_548_PORTAL_CANDIDATE_RELATIVE_PATHS,
  );
  await removeOnlyExactAllowlistedRegularFiles(root, present);
  await removeSessionDirectoryOnlyWhenEmpty(root);
  await requirePathAbsentWithoutFollowingLinks(root);
}
```

Cleanup is deliberately valid for any subset, including an empty or partial
candidate produced when invocation, report serialization, validation, or upload
fails. It never needs a successful `RuntimeSmokeReport` in order to clean.
Unknown/foreign/nested/link/device entries fail cleanup rather than being
deleted. The caller owns one `try/finally` around invocation through upload and
always invokes this function by the pinned session.

**Data flow:** immutable L02 dist → bounded path-safe file walk → schema/hash/
reference/content/a11y checks → strict shared `task-548-portal` adapter → seven
report-owned visible scenarios/screenshots → release-job certification against
the same exact tag-built artifact → noncanonical workflow artifact and clean
candidate removal → first publication mutation → fresh TASK-548-07 release
resume validation → independent seven-variant final scenario → L01-owned
canonical report/manifest/eight PNGs → TASK-545 phase-1 checkpoint.

**Error handling:** first integrity/path/schema failure returns a
machine-readable error plus safe relative evidence and nonzero exit; never
repairs output. Unknown/ambient environment, wrong artifact root or identity,
preview startup/health failure, missing browser result, console/page error,
unexpected request, absent screenshot, skipped scenario, report mutation,
workflow-artifact mismatch, candidate-cleanup failure, or dirty tag checkout is
a failed gate. The shared lifecycle always closes registered resources and
preserves cleanup failure separately from the primary error.

**Regression-test shape:**

- valid fixture passes with exact file/route counts and exactly one detached
  control-file exclusion, exact external `manifestSha256`, and reproducible
  files/artifact root hashes; independent producer and reopened-verifier tests
  pin the literal domains, empty/one-file/manifest/artifact golden vectors,
  NFC and raw-UTF-8 ordering, big-endian widths, raw digest bytes, and absence
  of implicit separators or final newlines;
- exact package-subpath imports compile; receipt fixtures pin discriminator/key
  order/final LF, reject nested unknowns, and round-trip through the sole
  normalizer/serializer to byte-identical CLI output consumed by 05-L01;
- file mutation, orphan, hash mismatch, symlink/traversal, duplicate route,
  broken anchor/link/hreflang/redirect, bad CSP, unsafe HTML/URL, secret/internal
  marker, source map, remote media, missing alt, and a11y landmark/heading
  defects, manifest self-record and second exclusion each fail with a stable code;
- 404 reflected-path/fake-alternative/canonical/status/body/tag/payload drift,
  client-assets entry/style/file/href/closure drift, and `_headers` syntax/base/
  limit/JSON-parity/effective-policy drift each fail with a stable code;
- site-index unknown keys/order/version/route drift and localized visual
  owner/locale/section/global-id/file-hash drift each fail with a stable code;
- validator never executes hostile fixture content;
- receipt unknown fields, wrong discriminator/identity/count/root hash,
  self-hash field attempts, and a pass receipt after any failed check reject;
- every Playwright scenario reports computed/geometry/DOM visible effects and
  evidence path, not just selector presence;
- built-page hydration installs collectors before navigation, exercises all
  four roots, and fails on any default-observer
  `docs_portal_hydration_recoverable_error`, React mismatch/recovery console
  output, page error, root-count drift, or static article/navigation/TOC DOM
  replacement;
- read-only registration tests verify both profiles for the already-landed
  fixed `task-548-portal` row and adapter path (the L02-owned
  `cli-registry.test.ts` covers the rows; this leaf only verifies them
  read-only) and byte-preservation of L02's runnable five-flow `task-548`
  pilot descriptor/path; existing suites/profiles remain represented and no
  third TASK-548 suite appears;
- adapter/lifecycle tests prove exact environment projection, immutable artifact
  identity, seven ordered report-bearing scenarios, one screenshot each,
  pre-navigation collectors, immediate resource registration, reverse cleanup,
  no copied server/browser/worker/report loop, and no fixed sleeps;
- targeted output is confined to the exact candidate session root; static
  ownership tests reject writes to canonical evidence, manifest/checkpoint or
  legacy smoke prefixes, while exact cleanup rejects symlink/path/foreign-file
  targets and restores pre-run status;
- release workflow fixtures pin certification after build+validator and before
  every release/retained/Cloudflare mutation, exact report capture/artifact
  inventory/name/90-day retention, clean candidate removal and clean tag
  recheck; every failure prevents publication;
- final handoff fixtures pin all seven portal scenario IDs as variants of final
  scenario 06 and prove 07-L01 writes only
  `06-portal-local-exact-latest-rollback.png` for the portal inside its exact
  eight-image canonical inventory plus `manifest.json`;
  TASK-545 `createResumeCheckpoint` alone writes the checkpoint, while
  `owner_action_required`, checkpoint hash/run/workflow validation, owner-only
  staging, tracked resume, and stale/tampered rerun remain 07-owned orchestration.

## Sub-Tasks

- [ ] Implement strict artifact/hash/reference/content validator.
- [ ] Add hostile security and accessibility fixture suites.
- [ ] Implement the focused `task-548-portal` contribution modules behind the
      already-landed fixed row, preserve the landed `task-548` pilot, and
      prove seven real portal scenarios through the shared runner without a
      local lifecycle or third suite; never edit the shared
      registry/CLI/contracts/cookbook/central test.
- [ ] Route defects to L01/L02, rebuild, and rerun until clean.
- [ ] Hand exact action modules and release-gate/report/screenshot requirements
      to TASK-548-05 and closure.

## Testing Requirements

```bash
DOCS_PRODUCT_VERSION=0.0.0-test \
DOCS_PUBLIC_ORIGIN=https://docs.example.invalid \
DOCS_PUBLIC_BASE_PATH=/docs \
SOURCE_DATE_EPOCH=0 \
  bun --cwd packages/docs-portal build
bun packages/docs-portal/scripts/validate-built-portal.ts \
  packages/docs-portal/dist
bun scripts/runtime-smoke.ts run \
  --suite task-548-portal --profile fast --session task-548-portal-fast
bun test tests/unit/runtime-smoke/task-548-portal-adapter.test.ts \
  tests/unit/runtime-smoke/cli-registry.test.ts \
  tests/unit/runtime-smoke/lifecycle-timing.test.ts \
  tests/unit/runtime-smoke/browser-transport.test.ts \
  tests/unit/runtime-smoke/repository-report.test.ts
bunx vitest run --config vitest.config.ts \
  tests/vitest/docs-portal/portal-security.test.ts \
  tests/vitest/docs-portal/portal-accessibility.test.tsx \
  tests/vitest/docs-portal/portal-build.test.tsx \
  tests/vitest/docs-portal/portal-routes.test.ts \
  tests/vitest/docs-portal/portal-seo.test.ts
tsc -p packages/docs-portal/tsconfig.json --noEmit
bun run scan:semgrep:strict -- \
  packages/docs-portal \
  packages/docs-renderer
bun run scan:gitleaks:worktree:strict
bun run scan:trivy:secret:strict
trivy fs --scanners secret --exit-code 1 --timeout 5m \
  packages/docs-portal/dist
bun run precommit:check
git diff --check
```

The generic repository Trivy command intentionally skips `dist`; the explicit,
bounded command above is mandatory and targets the validated portal artifact
without a `dist` exclusion. A workflow-contract test pins that target and
fail-closed exit code.

Unit/contract tests validate the seven bounded action/assertion groups here.
They pin every exact ID/title, both profiles' non-empty variant sets,
machine-observed assertions, empty per-variant console arrays, one owned
screenshot per scenario, and the exact unique ordered global screenshot union.
Removing or altering any field, returning a false assertion, assigning one PNG
to two scenarios, or drifting the global union must fail directly in
`requireManifestableScenarioResults` before report serialization or upload.
TASK-548-05-L02 executes the release certification profile against exact
tag-built bytes before publication, and TASK-548-07-L01 later imports all seven
groups read-only into final scenario 06. Shared runtime primitives own preview
restart/health, named Playwright transport, candidate repository accounting,
resource cleanup, and report creation. Every noncanonical candidate is removed
and proven absent before publication. Only final TASK-548 certification writes
`06-portal-local-exact-latest-rollback.png` inside its exact eight-image
inventory before TASK-545 phase 1.

- the canonical NUL-safe line-count gate over the leaf write set (identical
  contract in every TASK-548 task file; a file above 1,000 makes the gate fail
  with `exit 1`, including a non-newline final line; the baseline spans the
  full task/family dirty scope and commits/staging do not narrow it):

  ```bash
  # Canonical NUL-safe line-count gate over the leaf write set (identical
  # contract in every TASK-548 task file; a file above 1,000 makes the gate fail
  # with exit 1, including a non-newline final line). The verified pre-family
  # baseline is the pinned commit 963733cae23456622bea1eef1b734723aaab2350;
  # commits/staging cannot narrow the measured scope.
  TASK_FAMILY_BASELINE_SHA="963733cae23456622bea1eef1b734723aaab2350"
  git cat-file -e "${TASK_FAMILY_BASELINE_SHA}^{commit}" || { echo "invalid/missing baseline commit ${TASK_FAMILY_BASELINE_SHA}" >&2; exit 1; }
  failed=0
  while IFS= read -r -d '' f; do
    lines=$(awk 'END { print NR }' "$f")
    if [ "$lines" -gt 1000 ]; then
      printf 'OVER-LIMIT %s %s\n' "$lines" "$f"
      failed=1
    fi
  done < <({ git diff --name-only -z --diff-filter=ACMRT "$TASK_FAMILY_BASELINE_SHA" -- core packages scripts tests _docs/_workflows; git ls-files --others --exclude-standard -z -- core packages scripts tests _docs/_workflows; } | grep -zE '\.(ts|tsx|mjs|cjs|js|jsx|mts|cts)$' | grep -zvE '\.generated\.(ts|tsx|js|jsx|cjs|mjs|mts|cts)$' | sort -zu)
  exit "$failed"
  ```

## Acceptance Criteria

- Validator proves the exact detached-manifest convention plus all other
  file/hash/reference closure and rejects every hostile/path/privacy/CSP/a11y
  fixture class.
- Static portal makes no provider, CMS, analytics, tracker, or external image
  request during search/read flows.
- At least seven distinct browser flows pass with visible-effect assertions,
  zero console errors, zero unexpected requests, and human-reviewable
  screenshots.
- The built page mounts exactly four sibling islands from identical server/
  client component-model-prefix inputs and produces zero recoverable hydration
  diagnostics, mismatch recovery, or static article/navigation/TOC replacement.
- The release workflow blocks before any publication mutation unless the exact
  tag-built portal passes the seven-scenario shared certification gate, uploads
  its bounded noncanonical artifact, removes candidates, and proves a clean
  checkout.
- TASK-548-07-L01 writes only the canonical final eight screenshots and
  `manifest.json`; TASK-545 `createResumeCheckpoint` alone writes the phase-1
  checkpoint. L03 candidates cannot collide with final acceptance filenames.
- Wide/narrow, light/dark, keyboard/focus, reduced-motion, deep-link/latest,
  typed 404, locale truth, and offline/static behavior are all demonstrated.
- Cumulative online version navigation and current-only offline fallback are
  visibly proven without cross-document substitution.
- No validation failure is suppressed, auto-baselined, or repaired in output;
  source fixes land through the exclusive L01/L02 owner and gates rerun.
- TASK-548-05 receives a clean immutable artifact and executable registered
  validator/browser gate suitable for mandatory prepublication execution.

## Documentation Updates Required

Write only the exact shared-runner registration recipes owned above. Hand
detached-manifest, capsule-input, explicit artifact-scan, browser,
accessibility, CSP, offline, and failure-triage requirements to TASK-548-05/07;
this leaf edits no other shared closeout documentation.
