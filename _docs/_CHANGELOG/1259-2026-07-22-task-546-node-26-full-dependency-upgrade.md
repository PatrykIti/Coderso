# 1259 - TASK-546 Node 26 and Full Dependency Upgrade

Date: 2026-07-22
Version: Unreleased
Tasks: TASK-546, TASK-546-01, TASK-546-01-L01, TASK-546-02,
TASK-546-02-L01, TASK-546-04, TASK-546-04-L01, TASK-546-04-L02,
TASK-546-04-L03, TASK-546-03, TASK-546-03-L01

## Key Changes

### Runtime, dependencies, and reproducibility

- The supported tooling contract is Node.js `26.5.0` with Bun `1.3.14`; CI,
  both Docker stages, package metadata, tests, and contributor documentation now
  use the same pins. The runtime remains Bun-based.
- Root workspaces and the standalone prototype were resolved to the latest stable
  graph admitted by peer/engine/owner constraints and the new seven-day
  supply-chain release-age policy. Both Bun lockfiles reproduce with
  `--frozen-lockfile` and no changes.
- The final graph includes React `19.2.8`, Vite `8.1.5`, Vitest `4.1.10`,
  TypeScript `6.0.3`, and ESLint `9.39.5`. TypeScript 7 remains outside the
  latest `typescript-eslint` peer range (`<6.1`), while ESLint 10 remains outside
  `eslint-plugin-react` 7.37.5's peer range; neither major was forced.
- Normal `bun outdated --recursive` reports no admitted update. An explicit
  `--minimum-release-age=0` comparison found 17 newly published patches still
  inside quarantine: AWS S3 `3.1093.0`, the current patch set for 15 Radix UI
  packages, and `happy-dom` `20.11.1`. They were recorded rather than bypassing
  the repository's supply-chain policy.
- `fast-uri` now resolves only to `3.1.4` through Ajv's compatible `^3.0.1`
  range. `3.1.2` is absent; Bun audit and Trivy report zero HIGH/CRITICAL
  vulnerabilities, removing the two reported HIGH CVEs without a downgrade.

### Node 26 and UI compatibility

- Production startup preloads a narrowly scoped React production JSX adapter so
  Bun-rendered TSX works with React 19 in production. Node and Bun Argon2
  hash/verify probes and semantic-release imports pass.
- Removed Lucide brand exports were replaced with locally owned, path-identical
  SVG glyphs. Footer code was split by cohesive responsibility, and the prototype
  SVG prop boundary now excludes a ref the component does not forward. Focused
  render, accessibility, runtime, and byte-identity reviews found no UI/UX or DOM
  behavior change.
- Admin, public-site, and standalone-prototype production builds pass. The Admin
  browser/server boundary scans 823 files; bundle budgets pass with 33.30 KiB
  gzip entry and 196.10 KiB gzip initial static JavaScript.

### Scanner and CodeQL remediation

- TASK-522 sends audit findings as bounded structured JSON inside an explicit
  untrusted-data boundary instead of interpolating an unknown value into a
  script-bearing prompt. The focused regression and strict Semgrep scan pass.
- TASK-540 and TASK-543 now move hostile workflow values through bounded,
  canonical data channels and classify credential-bearing receipts before
  ordinary SHA-256 integrity handling. Their self-tests preserve scenarios,
  command order, evidence cardinality, browser-visible results, and cleanup while
  proving credential-derived values never enter a fast digest.
- Forms' scanner fixtures use linear regular expressions while preserving the
  same conservative policy rejection. The original suite was split into four
  independently runnable files (218 tests total), plus the 10-test runtime
  resolver companion; every touched production/test module remains below 1,000
  physical lines.
- Local structural regressions, focused Semgrep, and the complete strict scan are
  green for GitHub CodeQL alerts #30 and #77-#102. **PR CodeQL rerun: NOT RUN** —
  this working tree has not been committed or pushed and the local GitHub CLI is
  unauthenticated, so no remote alert is claimed closed.

## Validation and runtime smoke

- Final `bun run test`: Bun 1,733 passed, 0 failed, with one intentional
  provider-configured OpenAI live test skipped; Vitest 7,194/7,194 passed across
  868 files. The OpenRouter live matrix passed.
- Fresh final coverage: Vitest 82.98% lines / 79.88% statements / 79.96%
  functions / 71.50% branches; Bun runtime lane 287/287 with 36.77% lines and
  25.08% functions.
- `precommit:check`, all compiler/linter lanes, three production builds, Admin
  boundary/bundle checks, and all five functional/UX/performance/security/
  reliability release gates passed. Five post-implementation lenses ended with
  zero HIGH/MEDIUM/LOW findings after two documentation-only contract drifts were
  corrected and freshly re-audited.
- `scan:security:strict` passed without an exception: Semgrep 0 findings, Bun
  audit 0 vulnerabilities, Trivy lockfile/config/secret scans clean, and Gitleaks
  history/worktree clean.
- A fresh production server served `/`, `/admin/`, install-status JSON, and the
  built site CSS. No static route, enabled redirect, persisted page, or configured
  content-route owner exists for `/peri`; it returned exactly `404 Not Found`
  without a redirect, and `/` still returned 200 afterward. Logs were clean, the
  owned process stopped, and port 32147 was released.
- **Docker image build: NOT RUN** because Docker CLI is unavailable in this
  environment. Both stages were checked statically and Trivy found zero Dockerfile
  misconfigurations; this does not claim an image build or image scan.

No endpoint, schema, migration, RBAC, CSRF, rate-limit, public-write, or product
feature contract changed.
