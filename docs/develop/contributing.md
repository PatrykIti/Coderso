# Contributing Workflow

Welcome! This page walks through the day-to-day loop for changing Coderso: branch, commit, validate, open a PR, and let automation handle the release. Following it keeps the gates green and your change reviewable — which is the fastest path to getting it merged.

If you only read one other file first, make it the root [`CONTRIBUTING.md`](../../CONTRIBUTING.md). This page is the friendly version; that one is the canonical contract.

## The loop at a glance

1. Branch off `main`.
2. Write code (and comments) in English. Docs may be in other languages.
3. Commit with [Conventional Commits](#conventional-commits) — the pre-commit hook formats and lint-checks your staged changes.
4. Run the right validation locally: `lint`, `lint:types`, and the [correct test lane](#validate-before-you-open-a-pr).
5. Open a PR and keep its `[Release Notes]` block accurate.
6. CI runs the [PR gates](#pr-gates); merge to `main` triggers an automated release.

## Branch and language conventions

Create a feature branch from `main` for every change — never commit straight to `main` (releases run from `main`, so it must stay protected).

```bash
git switch -c feature/my-change main
```

Write **code and code comments in English** so the whole contributor base can read them. Documentation and content can be authored in other languages.

## Enable the pre-commit hook

Hooks live in the committed `.githooks/` directory rather than `.git/hooks`, so you opt in once per clone:

```bash
git config core.hooksPath .githooks
```

After that, `.githooks/pre-commit` runs `bun run precommit` on every commit. It hard-fails if `bun` is not on your `PATH`. To bypass it intentionally (rare), set `CODERSO_SKIP_PRECOMMIT=1`.

`precommit` chains two steps:

| Step | Script | What it does |
|------|--------|--------------|
| Format | `format:staged` → `bun scripts/format-staged.ts` | Runs Prettier on staged `.ts .tsx .js .jsx .mjs .cjs .json .css .scss .html .yaml .yml` files and re-stages the result. Markdown is intentionally skipped. |
| Check | `precommit:check` | `bun --cwd core lint && bun --cwd core lint:types && bun --cwd store lint`, then `tsc --noEmit` for the SDK (`packages/sdk/tsconfig.json`) and the repo (`tsconfig.json`). |

The hook deliberately covers **format + lint + typecheck only**. It does not run unit, integration, security, performance, or release-gate tests — those are yours to run before a PR, or CI's to enforce. Note that ESLint runs with `--max-warnings=0` and rules like `@typescript-eslint/no-explicit-any: "error"`, so a stray `any` will block the commit.

## Conventional commits

Commit messages follow the Angular Conventional Commits preset, because they directly drive versioning and the changelog (see [Releases](#releases-are-automatic)). Use a `type(scope): summary` subject:

```
feat(menus): add nested menu drag-and-drop
fix(media): reject uploads above MEDIA_MAX_SIZE_BYTES
docs(release): clarify the gate report path
```

How types map to version bumps:

| Commit type | Effect on the next release |
|-------------|----------------------------|
| `feat` | Minor version bump |
| `fix` | Patch version bump |
| `perf` | Patch version bump |
| `build`, `ci` | Patch version bump (Coderso-specific rule) |
| `docs` with scope `release` | Patch version bump (other `docs` do not release) |
| `BREAKING CHANGE` footer | Major version bump |

## Validate before you open a PR

Run linting and typechecking, then the test lane that matches your change. Coderso splits tests by **runtime boundary, not folder**: Bun owns runtime/SSR/plugin/security/perf behavior, Vitest owns Bun-free domain logic and React/UI. See [`./testing.md`](./testing.md) for how to pick a lane.

```bash
# Lint + typecheck everything (also what the hook runs)
bun run lint
bun run lint:repo:types

# Bun-free domain + UI logic
bun run test:vitest

# Bun runtime / SSR / plugin / security / perf suites
bun run test:bun

# Both lanes (sources .env first)
bun run test
```

DB-backed Bun suites need a reachable PostgreSQL via `DATABASE_URL`. Most test and DB scripts source `.env` automatically; if you run lower-level commands, load it first:

```bash
set -a && source .env && set +a
```

When your change touches a release-gated surface, run the relevant gate too — but treat it as a baseline, not a replacement for targeted suites on the code you touched:

```bash
bun run gates:coderso            # all five gates -> .tmp/coderso-release-gates.json
bun run gates:coderso:security   # security gate only
bun run gates:coderso:perf       # performance gate only
```

A few guardrails worth internalizing: never truncate or delete whole domain tables from a shared test DB — create uniquely scoped fixtures and clean up only what you own. Never put secrets or provider keys in browser cache, `localStorage`, or debug payloads. The full Vitest run must be green **and** log-clean. The deeper rules live in [`AGENTS.md`](../../AGENTS.md), [`./testing.md`](./testing.md), and [`./security.md`](./security.md).

## PR gates

When you open a PR, the workflow at `.github/workflows/coderso-pr-gates.yml` enforces the same checks CI cares about. The jobs:

| Job | What it verifies |
|-----|------------------|
| `database-preflight` | Confirms `DATABASE_URL` and applies Drizzle migrations (`bun run db:migrate`) before tests. |
| `vitest-lane` | Runs the Vitest (Bun-free) suite. |
| `bun-lane` | Runs the Bun runtime suite. Parallel with `vitest-lane`. |
| `security-gate` | Semgrep, Trivy, and Gitleaks with SARIF uploads; blocks the PR on HIGH/CRITICAL findings. |
| `coderso-release-gates` | Runs the five release gates last and uploads the report. |

Keep a **`[Release Notes]` block** in your PR description, using `[Added]` / `[Changed]` / `[Fixed]` / `[Removed]` / `[Security]` subheadings. semantic-release reads merged PR bodies to assemble the changelog; empty blocks or placeholders like `None.` / `N/A` are ignored.

## Releases are automatic

You do not cut releases by hand. On every push to `main`, `semantic-release` (the `release:semantic` script) computes the next SemVer version from your commit types, then:

- prepends a Keep-a-Changelog entry to the root `CHANGELOG.md`;
- bumps the version in `package.json`, `core/package.json`, `store/package.json`, and `packages/sdk/package.json`, plus the `CORE_VERSION` fallback in `core/plugins/compat.ts`;
- refreshes `bun.lock`;
- creates the release commit (`chore(release): <version> [skip ci]`), a plain SemVer tag (e.g. `1.1.0`, no `v` prefix), and the GitHub release.

When a new version is produced, a follow-up CI stage builds the `Dockerfile` and pushes `ghcr.io/<owner>/coderso-core:<version>` and `:latest`. Release commits, tags, and the Docker push run with maintainer-held CI secrets (`SEMANTIC_RELEASE_APP_ID`, `SEMANTIC_RELEASE_APP_PRIVATE_KEY`, `DATABASE_URL`) — nothing you need locally.

To sanity-check the release machinery before merging, you can run the release unit tests and a dry run (it stops at the branch guard since you are off `main`):

```bash
bun test tests/unit/release
./node_modules/.bin/semantic-release --dry-run --no-ci
```

## Community and conduct

Coderso is an open project — please be the kind of contributor you'd want to work with.

- [`CODE_OF_CONDUCT.md`](../../CODE_OF_CONDUCT.md) — how we treat each other.
- [`SUPPORT.md`](../../SUPPORT.md) — where to ask questions and get help.
- [`SECURITY.md`](../../SECURITY.md) — private vulnerability reporting. Do **not** open a public issue for a security flaw.

## Where to go deeper

- [`_docs/RELEASE_PROCESS.md`](../../_docs/RELEASE_PROCESS.md) — the full semantic-release, PR-notes, and Docker-publish flow.
- [`_docs/CODERSO_RELEASE_GATES.md`](../../_docs/CODERSO_RELEASE_GATES.md) — every gate, budget, and pass/fail contract behind `gates:coderso`.
- [`./testing.md`](./testing.md) — the two test lanes and how to choose between them.
- [`./security.md`](./security.md) — the security model your changes must respect.
- [`./getting-started.md`](./getting-started.md) — install, env, and dev-server setup if you're new here.
