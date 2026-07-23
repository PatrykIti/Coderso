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
artifact validator, focused security/accessibility tests, and at least five
distinct `playwright-cli` flows that assert visible effects rather than control
presence.

This leaf is a gate owner, not a second portal implementation owner. A portal
source defect is returned to the exclusive L01/L02 owner, fixed there, and all
affected gates rerun before L03 passes.

## Exclusive Ownership

This leaf is the only writer for:

- new `packages/docs-portal/scripts/validate-built-portal.ts`;
- new `tests/vitest/docs-portal/portal-security.test.ts`;
- new `tests/vitest/docs-portal/portal-accessibility.test.tsx`;
- task-scoped browser fixtures/driver under
  `packages/docs-portal/scripts/browser-gate/**` if needed.

It must not edit portal shell/search/build/route/SEO production files,
`packages/docs-renderer`, root workflow/release files, or task/changelog
metadata. Findings go back to the owning leaf; missing results are a failed
gate, not a clean pass. Targeted-run screenshots/results stay below
`.tmp/docs-portal-smoke/task-548-04/<bounded-run-id>/`; this leaf never writes
the canonical TASK-545 evidence directory, `manifest.json`, or
`resume-checkpoint.json`.

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

On success it returns this exact recursively reject-unknown receipt:

```ts
type DocsPortalValidationReceiptV1 = {
  schema: "coderso.docs-portal-validation@v1";
  status: "pass";
  productVersion: string;
  corpusVersion: string;
  sourceHash: string;
  publicOrigin: string;
  publicBasePath: string;
  manifestPath: "docs-portal-manifest.json";
  manifestSha256: string;
  soleExcludedPath: "docs-portal-manifest.json";
  routeCount: number;
  fileCount: number;
  totalBytes: number;
  filesRootSha256: string;
  artifactRootSha256: string;
  allManifestFilesVerified: true;
  untrackedFileCount: 0;
  orphanRecordCount: 0;
};
```

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

Restart the task-scoped static preview server before smoke, verify its health,
and use named session `wf548portal`. Run at least these distinct real flows:

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
requests. The targeted L03 run captures one screenshot for every scenario into
its exact task-owned `.tmp` run directory for immediate human review.

## Canonical TASK-545 Evidence Handoff

This leaf's seven scenario screenshots and structured results remain
exclusively below
`.tmp/docs-portal-smoke/task-548-04/<run-id>/`; they are targeted-gate inputs,
not members of the final TASK-545 evidence directory.

TASK-548-07-L01 is the sole writer of
`_docs/_workflows/_smoke/evidence/task-548/manifest.json` and its exact eight
acceptance PNGs. It consumes this leaf's prior portal evidence read-only. If the
final tree requires recapture, L01 requests one same-owner operational L03
handback; L03 returns bounded results/screenshot bytes without status transfer,
and L01 alone writes `06-portal-local-exact-latest-rollback.png` as the portal
member of its exact canonical inventory. No `portal/*.png` subtree or other
extra canonical member is valid.

After L01 has written and validated only that manifest/eight-PNG inventory, it
calls the imported TASK-545 phase-1 `createResumeCheckpoint` helper. That helper
is the sole writer of
`_docs/_workflows/_smoke/evidence/task-548/resume-checkpoint.json`.
TASK-548-07-L01 owns the surrounding `owner_action_required` pause, owner staging
review, resume identity/parity checks and fresh rerun after source drift, but it
does not write checkpoint bytes itself. This leaf writes neither canonical
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
}> {
  const exactRoot = await assertAllowedPortalRoot(root);
  const manifest = assertPortalManifest(
    await readBoundedJson(exactRoot, "docs-portal-manifest.json")
  );
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
    manifestSha256: await sha256File(exactRoot, "docs-portal-manifest.json"),
    soleExcludedPath: "docs-portal-manifest.json",
    ...computePortalRootClosureFacts(manifest, files),
    allManifestFilesVerified: true,
    untrackedFileCount: 0,
    orphanRecordCount: 0,
  });
  return { manifest, receipt };
}
```

**Data flow:** immutable L02 dist → bounded path-safe file walk → schema/hash/
reference/content/a11y checks → mandatory local preview and temporary targeted
Playwright evidence → TASK-548-07 final-tree rerun → L01-owned canonical
manifest/eight PNGs → TASK-545 `createResumeCheckpoint` phase-1 checkpoint →
owner review/stage → tracked resume evidence for TASK-548-05/closure.

**Error handling:** first integrity/path/schema failure returns a machine-readable
error plus safe relative evidence and nonzero exit; never repairs or deletes
output. Preview startup/health failure, missing browser result, console error,
unexpected request, absent screenshot, or skipped scenario is a failed gate.

**Regression-test shape:**

- valid fixture passes with exact file/route counts and exactly one detached
  control-file exclusion, exact external `manifestSha256`, and reproducible
  files/artifact root hashes; independent producer and reopened-verifier tests
  pin the literal domains, empty/one-file/manifest/artifact golden vectors,
  NFC and raw-UTF-8 ordering, big-endian widths, raw digest bytes, and absence
  of implicit separators or final newlines;
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
- targeted output is confined to `.tmp`; static ownership tests reject writes
  to canonical evidence, manifest/checkpoint, or the legacy smoke prefix;
- final handoff fixtures pin all seven targeted IDs and `.tmp` paths, then prove
  07-L01 writes only `06-portal-local-exact-latest-rollback.png` for the portal
  inside its exact eight-image canonical inventory plus `manifest.json`;
  TASK-545 `createResumeCheckpoint` alone writes the checkpoint, while
  `owner_action_required`, checkpoint hash/run/workflow validation, owner-only
  staging, tracked resume, and stale/tampered rerun remain 07-owned orchestration.

## Sub-Tasks

- [ ] Implement strict artifact/hash/reference/content validator.
- [ ] Add hostile security and accessibility fixture suites.
- [ ] Run seven real browser flows in named Playwright session.
- [ ] Route defects to L01/L02, rebuild, and rerun until clean.
- [ ] Hand structured manifest/report/screenshots to TASK-548-05 and closure.

## Testing Requirements

```bash
DOCS_PRODUCT_VERSION=0.0.0-test \
DOCS_PUBLIC_ORIGIN=https://docs.example.invalid \
DOCS_PUBLIC_BASE_PATH=/docs \
SOURCE_DATE_EPOCH=0 \
  bun --cwd packages/docs-portal build
bun packages/docs-portal/scripts/validate-built-portal.ts \
  packages/docs-portal/dist
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
wc -l packages/docs-portal/scripts/validate-built-portal.ts \
  tests/vitest/docs-portal/portal-security.test.ts \
  tests/vitest/docs-portal/portal-accessibility.test.tsx
find packages/docs-portal/scripts/browser-gate \
  -type f -exec wc -l {} +
git diff --check
```

The generic repository Trivy command intentionally skips `dist`; the explicit,
bounded command above is mandatory and targets the validated portal artifact
without a `dist` exclusion. A workflow-contract test pins that target and
fail-closed exit code.

Then restart the preview server and run `playwright-cli -s=wf548portal` for all
seven scenarios. Store all seven targeted screenshots only below the bounded
`.tmp/docs-portal-smoke/task-548-04/<run-id>/` candidate directory. The final
TASK-548-07 gate consumes or requests a same-owner recapture of the portal flow
and alone writes only `06-portal-local-exact-latest-rollback.png` for the portal
inside its exact eight-image inventory before TASK-545 phase 1. Count every
human-authored browser-gate driver; every count must be at most 1,000, and every
targeted scenario/result remains mandatory.

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
- TASK-548-07-L01 writes only the canonical final eight screenshots and
  `manifest.json`; TASK-545 `createResumeCheckpoint` alone writes the phase-1
  checkpoint. TASK-548-04-L03 keeps mandatory targeted evidence temporary and
  cannot collide with final acceptance filenames.
- Wide/narrow, light/dark, keyboard/focus, reduced-motion, deep-link/latest,
  typed 404, locale truth, and offline/static behavior are all demonstrated.
- Cumulative online version navigation and current-only offline fallback are
  visibly proven without cross-document substitution.
- No validation failure is suppressed, auto-baselined, or repaired in output;
  source fixes land through the exclusive L01/L02 owner and gates rerun.
- TASK-548-05 receives a clean immutable artifact plus validator/browser
  evidence suitable for publication.

## Documentation Updates Required

Hand detached-manifest, capsule-input, explicit artifact-scan, browser,
accessibility, CSP, offline, and failure-triage evidence to TASK-548-05/07; this
leaf edits no shared closeout documentation.
