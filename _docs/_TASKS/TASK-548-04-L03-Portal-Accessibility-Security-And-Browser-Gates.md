# TASK-548-04-L03: Portal Accessibility, Security and Browser Gates
# FileName: TASK-548-04-L03-Portal-Accessibility-Security-And-Browser-Gates.md

**Parent Task:** TASK-548
**Parent Subtask:** TASK-548-04
**Priority:** High
**Category:** Accessibility / Security / Runtime QA
**Estimated Effort:** Large
**Dependencies:** TASK-548-04-L02, TASK-545
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
- `deployment/site-index.json` and every prebuilt source candidate mapped by
  TASK-548-05 into capsule `latest/**`, `routing/{redirects,headers}.json` and
  `global/{sitemap.xml,robots.txt,site-index.json}` agree byte-for-byte with the
  portal manifest records;
- canonical routes, locale/version selectors, TOC/section anchors, related
  links, latest redirects, sitemap, robots, hreflang, OG, and JSON-LD agree;
- `deployment/headers.json` yields CSP without `unsafe-inline`/`unsafe-eval`,
  frame denial, nosniff, strict referrer/permissions policies, and immutable
  hashed-asset caching;
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

`manifestSha256` is computed over the exact detached manifest bytes and is
never written into `DocsPortalManifestV1`. `filesRootSha256` is a
domain-separated hash over the canonical sorted `path`, `bytes`, and `sha256`
records. `artifactRootSha256` binds that files root to `manifestSha256`.
Counts and bytes are bounded non-negative safe integers. The receipt is returned
to TASK-548-05-L01 or written outside `dist`; it can never become an untracked
portal output or a second manifest exclusion. A failure returns a typed error
and never emits a receipt with `status: "pass"`.

## Browser Gate Scenarios

Restart the task-scoped static preview server before smoke, verify its health,
and use named session `wf548portal`. Run at least these distinct real flows:

1. **Wide light search/read:** search a known screen, open a result, assert URL,
   H1, highlighted result text, TOC target geometry, screenshot/alt/caption, and
   no horizontal overflow.
2. **Keyboard-only navigation:** skip to content, operate search/results/TOC/
   version controls, open/close mobile or desktop navigation as applicable,
   assert focus order/restore and visible focus ring.
3. **Narrow responsive:** mobile navigation opens without covering/trapping the
   article incorrectly, long code/table/visual content remains scroll-safe,
   touch targets and bounding boxes are usable.
4. **Dark + reduced motion:** emulate dark and reduced motion; assert computed
   foreground/background/token changes, animation duration/behavior, visual
   readability, and screenshot.
5. **Version/latest/deep link:** open a versioned section deep link and matching
   latest alias; assert canonical/noindex metadata, version selector, anchor
   offset, and alias mapping.
6. **Locale truth:** verify English complete route and one available alternate
   fixture; verify missing Polish translation is not advertised and fallback is
   explicit.
7. **Static/offline/no-runtime dependency:** after initial local artifact load,
   block all non-preview origins, repeat article/search navigation, and assert
   zero provider/CMS/analytics/external image calls.

All scenarios require zero console/page errors and zero unexpected network
requests. The targeted L03 run captures one screenshot for every scenario into
its exact task-owned `.tmp` run directory for immediate human review.

## Canonical TASK-545 Evidence Handoff

Final evidence uses only the completed TASK-545 root:

```text
_docs/_workflows/_smoke/evidence/task-548/
```

TASK-548-07 is the sole final evidence and manifest writer. It reruns the exact
L03 scenario driver against the final working tree and writes these disjoint
manifest-relative screenshots:

| Scenario ID | Final screenshot path |
| --- | --- |
| `portal-wide-light-search-read` | `portal/01-wide-light-search-read.png` |
| `portal-keyboard-navigation` | `portal/02-keyboard-navigation.png` |
| `portal-narrow-responsive` | `portal/03-narrow-responsive.png` |
| `portal-dark-reduced-motion` | `portal/04-dark-reduced-motion.png` |
| `portal-version-latest-deep-link` | `portal/05-version-latest-deep-link.png` |
| `portal-locale-truth` | `portal/06-locale-truth.png` |
| `portal-static-offline` | `portal/07-static-offline.png` |

The final `manifest.json` references every exact file above and records the
TASK-545 strict task/revision/generatedAt/server/scenario/surface/theme/
viewport/assertion/console/screenshot shapes. Assertions use only
`computed-style`, `geometry`, `dom-state`, or `aria`; every scenario has at
least one passing visible assertion, one screenshot with lowercase SHA-256,
and zero console errors. The portal set uses `surface: "public"` and explicit
light/dark themes.

After all final portal-affecting fixes, TASK-548-07 reruns and reconciles all
seven IDs before TASK-545 phase 1. It then audits exact manifest/file/hash/
revision parity, atomically creates the non-overwritable
`resume-checkpoint.json`, and returns structured
`{ pass: false, code: "owner_action_required",
action: "review_and_stage_evidence", ... }`. The agent pauses without staging or
closing metadata. Only the owner reviews and stages the exact
`evidence/task-548/` directory, then invokes the checkpoint-owned resume with
the unchanged task/run/checkpoint hash. Resume requires exact workflow identity,
tracked file parity and hashes; wrong/stale/tampered identity or any later
non-evidence source drift invalidates the result and requires a fresh final
rerun. No legacy `_smoke/task-548-04-*` path is valid.

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
Playwright evidence → TASK-548-07 final-tree rerun → canonical TASK-545
manifest/screenshots/checkpoint → owner review/stage → tracked resume evidence
for TASK-548-05/closure.

**Error handling:** first integrity/path/schema failure returns a machine-readable
error plus safe relative evidence and nonzero exit; never repairs or deletes
output. Preview startup/health failure, missing browser result, console error,
unexpected request, absent screenshot, or skipped scenario is a failed gate.

**Regression-test shape:**

- valid fixture passes with exact file/route counts and exactly one detached
  control-file exclusion, exact external `manifestSha256`, and reproducible
  files/artifact root hashes;
- file mutation, orphan, hash mismatch, symlink/traversal, duplicate route,
  broken anchor/link/hreflang/redirect, bad CSP, unsafe HTML/URL, secret/internal
  marker, source map, remote media, missing alt, and a11y landmark/heading
  defects, manifest self-record and second exclusion each fail with a stable code;
- validator never executes hostile fixture content;
- receipt unknown fields, wrong discriminator/identity/count/root hash,
  self-hash field attempts, and a pass receipt after any failed check reject;
- every Playwright scenario reports computed/geometry/DOM visible effects and
  evidence path, not just selector presence.
- targeted output is confined to `.tmp`; static ownership tests reject writes
  to canonical evidence, manifest/checkpoint, or the legacy smoke prefix;
- final handoff fixtures pin all seven IDs/paths, exact TASK-545 manifest fields,
  `owner_action_required` pause, unchanged checkpoint hash/run/workflow identity,
  owner-only staging, tracked resume, stale/tampered failure, and full rerun
  after any non-evidence final-tree drift.

## Sub-Tasks

- [ ] Implement strict artifact/hash/reference/content validator.
- [ ] Add hostile security and accessibility fixture suites.
- [ ] Run seven real browser flows in named Playwright session.
- [ ] Route defects to L01/L02, rebuild, and rerun until clean.
- [ ] Hand structured manifest/report/screenshots to TASK-548-05 and closure.

## Testing Requirements

```bash
SOURCE_DATE_EPOCH=1784764800 bun --cwd packages/docs-portal build
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
git diff --check
```

The generic repository Trivy command intentionally skips `dist`; the explicit,
bounded command above is mandatory and targets the validated portal artifact
without a `dist` exclusion. A workflow-contract test pins that target and
fail-closed exit code.

Then restart the preview server and run `playwright-cli -s=wf548portal` for all
seven scenarios. Store all seven targeted screenshots only below the bounded
`.tmp/docs-portal-smoke/task-548-04/<run-id>/` candidate directory. The final
TASK-548-07 gate reruns the same driver and writes the seven exact canonical
paths before TASK-545 phase 1. Every count must be at most 1,000; every
scenario/result and the final tracked-resume handoff are mandatory.

## Acceptance Criteria

- Validator proves the exact detached-manifest convention plus all other
  file/hash/reference closure and rejects every hostile/path/privacy/CSP/a11y
  fixture class.
- Static portal makes no provider, CMS, analytics, tracker, or external image
  request during search/read flows.
- At least seven distinct browser flows pass with visible-effect assertions,
  zero console errors, zero unexpected requests, and human-reviewable
  screenshots.
- TASK-548-07 alone writes the canonical final screenshots/manifest/checkpoint
  flow; TASK-548-04-L03 keeps mandatory targeted evidence temporary and cannot
  collide with final acceptance filenames.
- Wide/narrow, light/dark, keyboard/focus, reduced-motion, deep-link/latest,
  locale truth, and offline/static behavior are all demonstrated.
- No validation failure is suppressed, auto-baselined, or repaired in output;
  source fixes land through the exclusive L01/L02 owner and gates rerun.
- TASK-548-05 receives a clean immutable artifact plus validator/browser
  evidence suitable for publication.

## Documentation Updates Required

Hand detached-manifest, capsule-input, explicit artifact-scan, browser,
accessibility, CSP, offline, and failure-triage evidence to TASK-548-05/07; this
leaf edits no shared closeout documentation.
