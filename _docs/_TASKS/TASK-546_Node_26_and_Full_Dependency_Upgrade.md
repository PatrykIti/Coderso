# TASK-546: Node 26 and Full Dependency Upgrade

# FileName: TASK-546_Node_26_and_Full_Dependency_Upgrade.md

**Priority:** High
**Category:** Toolchain / Dependencies / Compatibility / Supply-Chain Security / Static Analysis
**Estimated Effort:** Large
**Dependencies:** TASK-545-02-L01 only for its TASK-522 strict-Semgrep fix at final closure; TASK-546-04 owns the exact CodeQL carveout below
**Status:** ✅ Done
**Completed:** 2026-07-22
**Started:** 2026-07-22
**Changelog:** 1259 (pinned; create only at implementation closure)

---

## Overview

Upgrade the active Coderso workspace to Node.js `26.5.0`, Bun `1.3.14`, and the
latest mutually compatible stable direct dependencies and root overrides. The
work includes compatibility repairs, reproducible lockfile resolution, Admin
and site builds, the complete test/gate surface, a strict security scan, and a
real server boot checked at the literal `/peri` path. The owner's added final
scope also removes the current CodeQL findings from the TASK-540/TASK-543
workflow harnesses and the Forms regex regression suite without changing their
product or workflow behavior.

The dependency scope is the root workspace (`core`, `store`, and `packages/*`)
plus the tracked standalone `_docs/_PROTOTYPE/` package and its independent
lockfile. The prototype is not a root-workspace input, so its install/build is
validated from its own directory and must not alter the root lock graph.
Coderso remains Bun-runtime software; Node 26 owns supported tooling and release
execution rather than replacing Bun as the runtime kernel.

No product feature, endpoint, schema, migration, permission, scanner exception,
or dependency downgrade belongs in this family. A necessary source/config/test
adaptation caused by a selected stable dependency is in scope only when it
preserves the existing product contract. The only additional non-dependency
scope is the exact CodeQL remediation assigned to TASK-546-04; it must remove
the source patterns rather than hide, dismiss, or suppress an alert.

## Version-selection policy

- Query authoritative registry/release metadata again immediately before
  editing. Select stable releases only; exclude prereleases, RCs, nightly
  builds, floating Git refs, and unverified action tags.
- "Latest admitted" means the highest stable version that satisfies the active
  dependency graph's peer, engine, runtime, transitive-owner, and configured
  seven-day release-age bounds. Newly published releases remain quarantined
  until that supply-chain window expires; do not bypass the window or force an
  incompatible major through an override.
- Keep manifest range style unless security or native-binary reproducibility
  requires an exact pin. Regenerate `bun.lock` with Bun `1.3.14`; never edit the
  lockfile by hand. A second frozen install must reproduce it without a diff.
- TypeScript is pinned to `6.0.3`, the highest stable compiler accepted by the
  latest `typescript-eslint` 8.x peer range. TypeScript 7 is not selected while
  that tool requires `<6.1.0` and the repository still depends on compiler API
  consumers.
- ESLint and `@eslint/js` are pinned to `9.39.5`, the highest stable line
  accepted by the latest `eslint-plugin-react` `7.37.5`. ESLint 10 must not be
  forced while that peer contract stops at ESLint 9.
- `fast-uri` must resolve to at least `3.1.4`. Ajv 8 owns a `^3.0.1` range, so
  `3.1.4` is the compatible security target; forcing `4.1.1` would violate the
  owner range.
- Preserve the SDK's intentional React peer breadth (`^18.0.0 || ^19.0.0`),
  while the application and React type packages move in lockstep.

## Authored target matrix

These are the verified stable candidates on 2026-07-22. A newer stable patch may
replace a row only when the implementation leaf re-verifies all compatibility
constraints and records the evidence.

### Root `package.json`

| Package | Current | Target |
|---|---:|---:|
| `semver` | `^7.7.3` | `^7.8.5` |
| `@eslint/js` | `^9.39.4` | `^9.39.5` |
| `@semantic-release/commit-analyzer` | `^13.0.1` | `^13.0.1` |
| `@semantic-release/git` | `^10.0.1` | `^11.0.0` |
| `@semantic-release/github` | `^12.0.6` | `^12.0.9` |
| `@types/node` | `^25.0.10` | `^26.1.1` |
| `@types/react` | `^19.2.9` | `^19.2.17` |
| `@types/react-dom` | `^19.2.3` | `^19.2.3` |
| `@typescript-eslint/eslint-plugin` | `^8.59.0` | `^8.65.0` |
| `@typescript-eslint/parser` | `^8.59.0` | `^8.65.0` |
| `@vitest/coverage-v8` | `^4.1.5` | `^4.1.10` |
| `brace-expansion` | `1.1.16` | `1.1.16` |
| `concurrently` | `^10.0.3` | `^10.0.3` |
| `eslint` | `^9.39.4` | `^9.39.5` |
| `eslint-plugin-react` | `^7.37.5` | `^7.37.5` |
| `eslint-plugin-react-hooks` | `^7.1.1` | `^7.1.1` |
| `globals` | `^17.5.0` | `^17.7.0` |
| `happy-dom` | `^20.9.0` | `^20.11.0` |
| `minimatch` | `^3.1.5` | `^3.1.5` |
| `prettier` | `^3.8.3` | `^3.9.6` |
| `semantic-release` | `^25.0.3` | `^25.0.8` |
| `typescript` | `^5.9.3` | `6.0.3` |
| `vitest` | `^4.1.5` | `^4.1.10` |

`brace-expansion@1.1.16` and `minimatch@3.1.5` are deliberate latest-patched
legacy-major hoists for consumers that still request those majors. Replacing
them with unrelated latest majors would not satisfy or remove the nested owner
ranges and is not an upgrade.

### `core/package.json`

| Package | Current | Target |
|---|---:|---:|
| `@aws-sdk/client-s3` | `^3.975.0` | `^3.1092.0` |
| `@azure/storage-blob` | `^12.30.0` | `^12.33.0` |
| `@noble/ed25519` | `^3.0.0` | `^3.1.0` |
| `@node-rs/argon2` | `1.8.3` | `2.0.2` |
| `@radix-ui/react-accordion` | `^1.2.12` | `^1.2.17` |
| `@radix-ui/react-avatar` | `^1.1.11` | `^1.2.3` |
| `@radix-ui/react-checkbox` | `^1.3.3` | `^1.3.8` |
| `@radix-ui/react-collapsible` | `^1.1.12` | `^1.1.17` |
| `@radix-ui/react-dialog` | `^1.1.15` | `^1.1.20` |
| `@radix-ui/react-dropdown-menu` | `^2.1.16` | `^2.1.21` |
| `@radix-ui/react-progress` | `^1.1.8` | `^1.1.13` |
| `@radix-ui/react-scroll-area` | `^1.2.10` | `^1.2.15` |
| `@radix-ui/react-select` | `^2.2.6` | `^2.3.4` |
| `@radix-ui/react-separator` | `^1.1.8` | `^1.1.12` |
| `@radix-ui/react-slider` | `^1.3.6` | `^1.4.4` |
| `@radix-ui/react-slot` | `^1.2.4` | `^1.3.0` |
| `@radix-ui/react-switch` | `^1.2.6` | `^1.3.4` |
| `@radix-ui/react-tabs` | `^1.1.13` | `^1.1.18` |
| `@radix-ui/react-tooltip` | `^1.2.8` | `^1.2.13` |
| `ajv` | `^8.17.1` | `^8.20.0` |
| `canonicalize` | `^2.1.0` | `^3.0.0` |
| `class-variance-authority` | `^0.7.1` | `^0.7.1` |
| `clsx` | `^2.1.1` | `^2.1.1` |
| `drizzle-orm` | `^0.45.2` | `^0.45.2` |
| `fflate` | `^0.8.2` | `^0.8.3` |
| `lucide-react` | `^0.563.0` | `^1.25.0` |
| `next-themes` | `^0.4.6` | `^0.4.6` |
| `nodemailer` | `^9.0.1` | `^9.0.3` |
| `postgres` | `^3.4.8` | `^3.4.9` |
| `react` | `^19.2.3` | `^19.2.8` |
| `react-dom` | `^19.2.3` | `^19.2.8` |
| `semver` | `^7.7.3` | `^7.8.5` |
| `sonner` | `^2.0.7` | `^2.0.7` |
| `tailwind-merge` | `^3.4.0` | `^3.6.0` |
| `@tailwindcss/vite` | `^4.2.4` | `^4.3.3` |
| `@types/bun` | `^1.3.6` | `^1.3.14` |
| `@types/nodemailer` | `^8.0.1` | `^8.0.1` |
| `@types/semver` | `^7.5.10` | `^7.7.1` |
| `@vitejs/plugin-react` | `^6.0.1` | `^6.0.4` |
| `drizzle-kit` | `^0.31.8` | `^0.31.10` |
| `tailwindcss` | `^4.2.4` | `^4.3.3` |
| `vite` | `^8.0.10` | `^8.1.5` |

### SDK, store, and root overrides

| Owner | Package | Current | Target |
|---|---|---:|---:|
| SDK dev | `@types/react` | `^19.2.9` | `^19.2.17` |
| SDK dev | `typescript` | `^5.9.3` | `6.0.3` |
| SDK peer | `react`, `react-dom` | `^18.0.0 || ^19.0.0` | unchanged |
| Store | dependencies | empty | unchanged |
| override | `esbuild` | `^0.28.1` | `^0.28.1` |
| override | `fast-uri` | `^3.1.2` | `^3.1.4` |
| override | `fast-xml-builder` | `^1.1.7` | `^1.3.0` |
| override | `fast-xml-parser` | `^5.5.6` | `^5.10.1` |
| override | `flatted` | `^3.4.2` | `^3.4.2` |
| override | `js-yaml` | `4.3.0` | `4.3.0` |
| override | `shell-quote` | `1.9.0` | `1.10.0` |
| override | `tar` | `7.5.19` | `7.5.21` |
| override | `ws` | `^8.21.0` | `^8.21.1` |
| override | `undici` | `^7.28.0` | `^7.28.0` |
| override | `vite` | `^8.0.16` | `^8.1.5` |
| override | `sigstore` | `^4.1.1` | `^4.1.1` |

### Standalone `_docs/_PROTOTYPE/package.json`

The prototype receives the same React/Vite/Tailwind/tooling versions as the
active application wherever it declares the same package: `lucide-react`
`^1.25.0`, React/React DOM `^19.2.8`, `tailwind-merge` `^3.6.0`, Tailwind and
`@tailwindcss/vite` `^4.3.3`, `@types/node` `^26.1.1`, React types
`^19.2.17`, `@vitejs/plugin-react` `^6.0.4`, Vite `^8.1.5`, and exact
TypeScript `6.0.3`. Its own `bun.lock` is regenerated and frozen independently.

The absolute latest `js-yaml@5`, `undici@8`, and `sigstore@5` are not valid
root-override targets until every transitive owner admits those majors. The
compatible secure majors above are intentional, evidence-backed constraints.

### Runtime, container, CI, and scanner pins

| Surface | Current | Target |
|---|---:|---:|
| Local/tooling Node | `26.5.0` observed | `26.5.0` contract |
| Root Node engine | absent | `>=26.5.0 <27` |
| Root package manager | absent | `bun@1.3.14` |
| CI Bun | `1.3.13` | `1.3.14` |
| Docker builder Bun | `1.3.13` | `1.3.14` |
| Docker runner Bun | `1.3.6` | `1.3.14` |
| CI Node | `22.14.0` | `26.5.0` |
| `actions/checkout` | v4 | v7.0.1 (`3d3c42e5aac5ba805825da76410c181273ba90b1`) |
| `actions/setup-node` | v4 | v7.0.0, full immutable SHA |
| `oven-sh/setup-bun` | v2.2.0 | v2.2.0, latest immutable SHA |
| `actions/upload-artifact` | v4 | v7.0.1, full immutable SHA |
| `actions/setup-python` | v5 | v7.0.0, full immutable SHA |
| `actions/create-github-app-token` | v2 | v3.2.0, full immutable SHA |
| `docker/setup-buildx-action` | v3 | v4.2.0, full immutable SHA |
| `docker/login-action` | v3 | v4.4.0, full immutable SHA |
| `docker/build-push-action` | v6 | v7.3.0, full immutable SHA |
| `github/codeql-action/upload-sarif` | v4 | v4.37.3 peeled commit (`e4fba868fa4b1b91e1fdab776edc8cfbe6e9fb81`) |
| `aquasecurity/trivy-action` | v0.36.0 | v0.36.0 peeled commit (`ed142fd0673e97e23eac54620cfb913e5ce36c25`) |
| `gitleaks/gitleaks-action` | v2 | v3.0.0, full immutable SHA |
| Semgrep CI package | floating | exact latest stable (`1.170.1` at authoring) |

Action major upgrades use their current Node 24 action runtime and therefore
require runner `2.327.1` or newer. GitHub-hosted `ubuntu-latest` satisfies this;
any future self-hosted runner must prove that floor before adoption.

## Security Contract

- **Endpoint visibility:** no route is added or changed; existing internal and
  public visibility remains byte-for-byte owned by current route contracts.
- **Auth/RBAC/CSRF/rate limits:** no auth model, permission, CSRF rule, bucket,
  nonce/HMAC, captcha, or anti-abuse behavior changes.
- **Validation:** dependency/API compatibility repairs must preserve existing
  strict reject-unknown schemas and fail-closed normalizers.
- **Secrets and supply chain:** action references remain full immutable SHAs;
  no credential, environment value, raw sensitive log, or private registry
  token enters task evidence. No scanner allowlist, suppression, or exception
  may be added.
- `fast-uri@3.1.4` must remove CVE-2026-13676 and CVE-2026-16221 from the
  resolved lock graph. `bun why fast-uri`, `bun audit --audit-level high`, and
  the strict Trivy path must prove the installed version.
- The existing strict-Semgrep finding in the TASK-522 author workflow remains
  TASK-545-owned. TASK-546 must neither edit that workflow nor suppress the
  rule; final strict-scan closure requires the TASK-545 fix to be present in the
  shared final tree.
- TASK-546-04 distinguishes password storage from non-secret evidence
  integrity: passwords continue to use the repository Argon2 contract, while
  SHA-256 may hash only a proved secret-free integrity projection. Raw selector,
  URL, key, value, or assertion data must never be concatenated into executable
  Playwright JavaScript. No `eval`, `Function`, shell-quoting workaround,
  scanner annotation, alert dismissal, or weaker validation is allowed.
- The Forms regression suite must not instantiate or forward a known
  catastrophically backtracking fixture merely to prove that the safety guard
  rejects it. Replace that redundant fixture with a linear pattern that reaches
  the same conservative rejection branch, retain the existing overlap/nested
  repetition assertions, and preserve all 218 baseline tests.

## Finding and compatibility coverage matrix

| Finding or risk | Owner | Required proof |
|---|---|---|
| Node release/release-plugin drift | 546-01/L01 | Node `26.5.0`; semantic-release and plugins load under Node 26; CI pin matches docs |
| Bun and Docker image drift | 546-01/L01 | Bun `1.3.14` locally/CI and both Docker stages; frozen install is reproducible |
| two HIGH `fast-uri@3.1.2` CVEs | 546-01/L01 | lock contains compatible `3.1.4+`; audit/Trivy report zero HIGH/CRITICAL for it |
| stale direct/override dependencies | 546-01/L01 | refreshed registry evidence and `bun outdated --recursive`; every residue has an owner-range rationale |
| TypeScript 7/tooling incompatibility | 546-02/L01 | TypeScript `6.0.3` plus latest typescript-eslint compile every root/core/SDK config |
| ESLint 10/React-plugin peer incompatibility | 546-02/L01 | ESLint `9.39.5` and full zero-warning lint; no peer override |
| Argon2 v2 native boundary | 546-02/L01 | Node 26 and Bun hash/verify tests plus auth regression suite |
| canonicalize v3 ESM/byte identity | 546-02/L01 | signing/undo/store canonical-byte and verification tests remain exact |
| lucide v1 and Radix/React UI changes | 546-02/L01 | typecheck, Admin build/bundle gates, focused UI tests, no missing exports or accessibility drift |
| AWS/Azure client upgrades | 546-02/L01 | storage adapter/provider tests pass without credential leakage |
| Vite/Tailwind/Vitest lockstep | 546-02/L01 | both production builds, full Vitest lane, coverage plugin load, bundle checks |
| CodeQL weak password-hash alerts #100 and #99 | 546-04/L01, L02 | password-derived values never reach a fast digest; Argon2 password tests and secret-free receipt-integrity tests pass |
| CodeQL self-replacement alert #30 | 546-04/L01 | remove the no-op replacement and pin the unchanged canonical result with a focused test |
| CodeQL improper code-sanitization alerts #90-98 | 546-04/L01 | TASK-540 run-code uses static executable templates plus bounded validated data; injection corpus remains data only |
| CodeQL improper code-sanitization alerts #77-89 | 546-04/L02 | TASK-543 run-code uses the same non-executable bounded-data contract; injection corpus remains data only |
| CodeQL inefficient-regex alerts #101-102 | 546-04/L03 | no dangerous regex fixture reaches `RegExp`; equivalent conservative guard coverage and all existing safety assertions pass |
| 1,695-line Forms validation test and stale workflow path | 546-04/L03 | four cohesive independently runnable files stay below 1,000 lines; TASK-536 gate names all four and preserves the complete suite |
| strict scanner baseline | 546-03/L01 | `bun run scan:security:strict` returns zero blocking findings without suppression |
| runtime viability | 546-03/L01 | static plus persisted redirect/page/content-route discovery identifies any `/peri` owner; otherwise fresh Bun server returns controlled `404`, stays responsive, then shuts down cleanly with zero startup errors |

## Sub-Tasks

| ID | Title | Leaves | Status |
|---|---|---|---|
| TASK-546-01 | Toolchain and Dependency Resolution | TASK-546-01-L01 | ✅ Done |
| TASK-546-02 | Compatibility, Build, and Security Remediation | TASK-546-02-L01 | ✅ Done |
| TASK-546-04 | CodeQL Workflow and Forms Scanner Remediation | TASK-546-04-L01, L02, L03 | ✅ Done |
| TASK-546-03 | Server Smoke, Docs, and Closure | TASK-546-03-L01 | ✅ Done |

Required physical descendants:

- `TASK-546-01-Toolchain-And-Dependency-Resolution.md`
- `TASK-546-01-L01-Upgrade-Manifests-Ci-Docker-And-Lockfile.md`
- `TASK-546-02-Compatibility-Build-And-Security-Remediation.md`
- `TASK-546-02-L01-Fix-Node-26-And-Dependency-Regressions.md`
- `TASK-546-04-CodeQL-Workflow-And-Forms-Scanner-Remediation.md`
- `TASK-546-04-L01-Remediate-Task-540-CodeQL-Findings.md`
- `TASK-546-04-L02-Remediate-Task-543-CodeQL-Findings.md`
- `TASK-546-04-L03-Remediate-Forms-Regex-And-Test-Modularity.md`
- `TASK-546-03-Server-Smoke-Docs-And-Closure.md`
- `TASK-546-03-L01-Validate-Build-Security-And-Peri-Smoke.md`

TASK-546-04 leaf contracts must preserve these exact boundaries when their
physical files are authored:

- `546-04-L01` is the sole TASK-546 writer for
  `_docs/_workflows/task-540-smoke-executor.mjs`, only the frozen executor SHA
  value in `_docs/_workflows/task-540-implement.mjs`, and its focused security
  regression tests. It removes alerts #30, #90-98, and #100. It separates
  keeps the credential-bearing restoration frame exact while omitting its
  unnecessary fast frame digest, separates credential receipt validation from
  non-secret evidence hashing,
  removes the self-replacement, and replaces raw run-code interpolation with
  static code plus a length-bounded schema-validated data channel.
- `546-04-L02` is the sole TASK-546 writer for
  `_docs/_workflows/task-543-implement.mjs` and its focused security regression
  tests. It removes alerts #77-89 and #99 through the same secret-free digest
  and static-code/data separation, independently tested against quotes,
  backticks, statement terminators, Unicode separators, shell metacharacters,
  and script-like input.
- `546-04-L03` owns `tests/vitest/forms/validation.test.ts`, the new focused
  `validation-field-schema.test.ts`, `validation-patterns.test.ts`, and
  `validation-submission.test.ts`, only the two matching repeated-star fixture
  occurrences in `formRuntimeResolver.test.ts`, plus only the validation-suite path list in
  `_docs/_workflows/task-536-implement.mjs`. Keep the existing file as the
  normalization/field-behavior suite, move whole cohesive suites without
  rewriting assertions, replace only the redundant unsafe regex fixture with a
  linear conservatively rejected grouped repetition, execute all four split
  files individually and together, and run the touched companion independently.
  Every touched test file must be below 1,000 physical lines.

Conceptual implementation shape:

```js
const trustedData = parseBoundedRunCodePayload(untrustedWorkflowValue);
const encodedData = encodeValidatedRunCodePayload(trustedData);
const command = buildStaticRunCodeCommand(STATIC_OPERATION, encodedData);

const receipt = validateCredentialReceiptWithoutReadingSecretOutput(rawReceipt);
const integrity = digestSecretFreeEvidence(projectSecretFreeReceipt(receipt));
```

The encoded payload is data, not code: validate before encoding, accept only a
canonical bounded alphabet after encoding, decode inside a fixed operation
template, validate again after decoding, and never interpolate decoded values
into source. The credential receipt path requires empty/redacted output and
must not hash a password, password-derived value, credential command payload,
or unredacted stream.

## Ownership, collision guards, and land order

Land strictly by child:

`546-01 → 546-02 → 546-04 → 546-03`.

Inside the new scanner child, land
`546-04-L01 → 546-04-L02 → 546-04-L03`; each leaf reads the current shared
workflow state before editing and passes its focused gate before the next leaf.

- `546-01-L01` is the sole writer for active and prototype manifests/lockfiles,
  Node/Bun package-manager/engine pins, Docker images, CI
  dependency/action/scanner pins, the exact release/security tests that assert
  those pins, and the four version-contract docs named below. It does not
  repair unrelated production source.
- `546-02-L01` reads the landed lock fresh and is the sole writer for necessary
  compiler/linter config, production compatibility fixes, and focused
  regression tests. It must fix source/config rather than weaken assertions.
- `546-04` owns only the exact workflow/test carveout listed above. Its leaves
  remove CodeQL source patterns without changing the workflows' observable
  commands, smoke scenarios, result schemas, task semantics, or Forms product
  validation behavior.
- `546-03-L01` does not reopen dependency, source, test, or version-contract
  docs, including TASK-546-04 output. It owns final validation, the real
  `/peri` smoke/evidence, TASK-546 status files, changelog 1259, and exact
  TASK-546 index/statistics deltas after fresh reads.
- The board follows the established umbrella-only convention used by the
  TASK-536–545 program: only TASK-546 has a board row/statistics count; the ten
  descendants are tracked and closed in their physical files, not duplicated
  as board rows.
- A final-gate regression is routed back to its sole writer: dependency/pin/test
  drift to `546-01-L01`, compatibility source/config/test drift to
  `546-02-L01`, and an owned CodeQL/workflow/Forms regression to its exact
  `546-04` leaf. That leaf reruns its targeted gate before `546-03-L01` reruns
  the entire final validation from a fresh tree. Closure never patches source
  ad hoc.
- `_TMP-pr-feature-tasks-fixes.md` is a forbidden path. Do not read it for
  implementation evidence, modify it, stage it, or delete it.
- TASK-545 retains its broad workflow-convergence program, changelog 1257, and
  the TASK-522 Semgrep prompt finding. The exact collision carveout added by the
  owner belongs to TASK-546-04: complete remediation of
  `task-540-smoke-executor.mjs`, complete remediation of
  `task-543-implement.mjs`, only the Forms validation-suite path reference in
  `task-536-implement.mjs`, the four Forms validation test files listed
  above, and the exact repeated-star fixture occurrences in
  `tests/vitest/forms/formRuntimeResolver.test.ts`. TASK-545 must read these
  landed files fresh and must not revert or
  duplicate that remediation; TASK-546-04 must not widen into any other
  TASK-545 workflow-convergence file or rule. The other disjoint exception is
  TASK-546 smoke evidence named `_docs/_workflows/_smoke/task-546-*`, owned by
  `546-03-L01`. A TASK-546 orchestration script, if needed, is authored only by
  the orchestrator and must remain disjoint from TASK-545 files.
- Never revert unrelated dirty-tree changes. Changelog `1259` is reserved only
  for TASK-546; closure agents read both indexes fresh and edit only TASK-546
  rows/statistics and the 1259 row.

## Testing Requirements

- Record `node --version` = `v26.5.0`, `bun --version` = `1.3.14`, the refreshed
  registry evidence, `bun outdated --recursive`, and `bun pm ls`/`bun why`
  evidence for constrained packages.
- Regenerate once with Bun `1.3.14`, then prove `bun install --frozen-lockfile`
  leaves manifests and `bun.lock` unchanged. The lockfile root workspace name
  must match `coderso` and contain no `fast-uri@3.1.2`. Repeat install,
  frozen-lock, typecheck, and production build from `_docs/_PROTOTYPE/` against
  its independent lockfile.
- Run root/core/SDK/store type and lint gates: `bun --cwd core lint`,
  `bun --cwd core lint:types`, `bun --cwd store lint`,
  `tsc -p packages/sdk/tsconfig.json --noEmit`, and
  `tsc -p tsconfig.json --noEmit`.
- For TASK-546-04 run `node --check` for all four touched workflow scripts,
  the TASK-540 smoke executor self-test, and focused unit regressions that prove
  credential receipts never enter a fast digest and hostile workflow values
  remain inert data. Run the four split Forms Vitest files one at a time and
  together, plus the touched resolver companion independently,
  assert the unchanged 218-test baseline, and verify each file has at most
  1,000 physical lines. A local CodeQL CLI is optional; the PR CodeQL rerun is
  the authoritative alert-closure proof, while local Semgrep/strict scans and
  regressions must already be green before push.
- Run `bun --cwd core build:admin`, `bun --cwd core build:site`,
  `bun run check:admin-boundary`, and `bun run check:admin-bundle`.
- Run `bun test tests/unit/release/releaseConfig.test.ts
  tests/unit/release/releaseWorkflowConfig.test.ts
  tests/unit/security/securityGateConfig.test.ts`, `bun test
  tests/unit/auth/password.test.ts`, `bun test tests/unit/media/s3Adapter.test.ts
  tests/unit/media/azureAdapter.test.ts tests/unit/media/storageResolver.test.ts`,
  `bun test tests/unit/sdk`, and the canonical-signing/store suites discovered by
  dependency search. Run the focused Vitest UI/build-contract files selected by
  changed imports. Also execute Node 26 dynamic imports of semantic-release and
  every configured release plugin, and both Node and Bun Argon2 hash/verify
  probes. Re-run every named failing file once in isolation before
  classification.
- Before DB/settings tests run `set -a; source .env; set +a`, verify that
  `DATABASE_URL` is non-empty without printing it, and execute a bounded
  repo-owned `postgres` `select 1` probe. If it is missing or unreachable, mark
  the DB-backed/full lanes **NOT RUN**, continue Bun-free gates, and do not claim
  a pass for skipped suites. With the database preflight green, run full `bun run test`,
  `bun run precommit:check`, `bun run gates:coderso`, and
  `bun run scan:security:strict`. No live provider test requiring real external
  credentials is implied.
- Start a fresh Bun server after builds with repository environment loading,
  copy the built site manifest to the same production location used by the
  Dockerfile, unset `VITE_DEV_SERVER_URL` and `VITE_SITE_DEV_SERVER_URL`, start
  the production entry, and wait for readiness without inventing a health
  route. Verify `/`, the existing Admin/API boundary, and a built static asset;
  then request the
  literal `/peri`, and first check static registrations plus current persisted
  redirect, page, and configured content-route owners. Because it is currently
  absent, assert a controlled `404` with
  no stack trace or sensitive error leakage, then prove the server still answers
  a known route. Never add a route just to force `2xx`. Require no
  startup/runtime errors, stop the exact owned process, and prove cleanup.
- The smoke runs `bun run start:prod` from `core/`, never `dockerStart.ts`,
  with `NODE_ENV=production`, `BACKUP_SCHEDULER_ENABLED=false`, and all Vite
  development URL overrides unset. Bun 1.3.14 runtime TSX emitted `jsxDEV`
  while React 19.2.8 leaves that export undefined in production, so the
  canonical script preloads `core/server/productionReactRuntime.ts` to delegate
  the emitted call to React's production JSX factory. Before boot it requires
  `assistant.docs.reindexOnBoot !== true`; otherwise use an isolated database or
  report the smoke blocked. It must not run migrations, reindex docs, create a
  backup, or send an HTTP write request.
- Docker is unavailable in the authoring container (`docker=missing`). Update
  and statically inspect both Docker stages locally, but record local image
  validation as **NOT RUN**, never PASS. The authorized-host command is
  `docker build --pull --no-cache -t coderso:task-546 .`; record its actual
  result when available rather than inferring it from static checks. Local
  static Docker validation plus an explicit **NOT RUN** image-build limitation
  is accepted for task closure, but the changelog/final report must not describe
  the Docker image itself as built or passing.
- Finish with `git diff --check` and physical line counts for every touched
  human-authored production/test module; no touched production/test file may
  exceed 1,000 lines. The verified pre-family baseline is
  `d49e1027e3e8826c6a56cc967421073a5dae0e22`; collect the union of paths changed
  from that commit through HEAD and the final worktree. The initial unrelated
  `_TMP-pr-feature-tasks-fixes.md` path remains excluded and untouched.

## Documentation Updates Required

`546-01-L01` updates `_docs/RELEASE_PROCESS.md`,
`_docs/TESTING_STRATEGY.md`, and `_docs/CODERSO_RELEASE_GATES.md` for the exact
Node 26/Bun 1.3.14/action contract while updating their owning tests. Update
`docs/develop/getting-started.md` for the supported local tooling floor. The
command surface does not change, so `tests/README.md` and all other
runtime/testing/security documents remain untouched. At closure create changelog 1259,
close all ten physical descendants in dependency order, update only the
TASK-546 umbrella row and task-board statistics in `_docs/_TASKS/README.md`,
and add only the 1259 index row in `_docs/_CHANGELOG/README.md`.
