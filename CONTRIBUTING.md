# Contributing to Coderso

Thank you for your interest in contributing to Coderso.

Coderso is a modular web platform: simple on the surface, powerful underneath.
The project is built to help people create websites, content systems, business
workflows, and custom digital products with less friction and more freedom.

Contributions are welcome when they help make Coderso more useful, reliable,
secure, understandable, accessible, or kind to use.

You do not need to contribute a large feature to help. Small fixes, clear bug
reports, documentation improvements, tests, design feedback, and thoughtful
questions are all valuable.

## Project Philosophy

Coderso should be friendly for everyday users and powerful for developers.

When contributing, try to protect both sides:

- beginner-facing workflows should stay simple, clear, and human-friendly;
- advanced capabilities should remain flexible, typed, secure, and documented;
- technical power should not leak unnecessary complexity into the default user
  experience.

A good Coderso contribution should make the product easier to trust, easier to
understand, or easier to extend.

## Before You Start

Before making a non-trivial change:

- Read `README.md` for product positioning.
- Read `AGENTS.md` for repository workflow, architecture, task, testing, and
  validation rules.
- Check `_docs/` for the contract that owns the area you want to change.
- Check `_docs/_TASKS/README.md` and relevant task files before starting larger
  work.
- For security-sensitive work, read `SECURITY.md` and `_docs/SECURITY_SPEC.md`.

If you are unsure where to start, open a small issue or discussion with the
problem you want to solve.

## Documentation Model

Coderso uses two documentation layers with different audiences:

- `docs/` is the official product documentation surface. Treat it as
  user-facing, stable, and suitable for public readers.
- `_docs/` is the local technical documentation workspace for maintainers,
  implementation planning, architecture contracts, task tracking, changelog
  entries, testing strategy, and AI-agent-assisted development.

Use `_docs/` when documenting implementation contracts, task breakdowns,
internal decisions, validation lanes, architecture notes, or agent handoff
context.

Use `docs/` when the content is ready to become official product or developer
documentation for external readers.

When a change affects both layers, update `_docs/` first to keep the task,
architecture, and validation contract accurate, then promote the stable
user-facing explanation into `docs/`.

Do not publish temporary plans, implementation scratch notes, private operational
details, or agent-only instructions in `docs/`.

## Local Setup

Install dependencies from the repository root:

```bash
bun install
```

Run the development environment:

```bash
bun run dev
```

Run only the core app:

```bash
bun run dev:core
```

Run only the store workspace:

```bash
bun run dev:store
```

For database-backed commands or tests, load repository environment variables
before running the command:

```bash
set -a && source .env && set +a
```

Do not commit local secrets, `.env` files, database URLs, provider keys, private
credentials, or production data.

## Repository Secrets for CI

Coderso PR checks are intentionally repository-secret backed. Pull requests must
run against a maintained PostgreSQL test database, and the CI preflight applies
Drizzle migrations before the test lanes start.

Required repository secrets:

- `DATABASE_URL` - PostgreSQL connection string for PR gates. The database must
  be disposable test infrastructure, never production data.
- `SEMANTIC_RELEASE_APP_ID` - GitHub App id used by the release workflow on
  `main`.
- `SEMANTIC_RELEASE_APP_PRIVATE_KEY` - private key for the semantic-release
  GitHub App. The app must have repository access and branch-policy bypass for
  release commits/tags.

The repository-provided `GITHUB_TOKEN` is still used where GitHub Actions
requires it, such as code-scanning uploads, Gitleaks PR scanning, and GHCR
package publishing.

Do not add a personal access token unless a task explicitly requires one.

## Pre-commit Checks

This repository uses a committed Git hook directory:

```bash
bun run prepare
```

The hook runs before `git commit` and executes:

```bash
bun run precommit
```

The pre-commit command formats supported staged files with Prettier, stages the
formatted result, then runs lint and type checks. It does not run unit,
integration, security, performance, or release-gate tests; those remain manual
or CI-owned validation lanes.

If you need to bypass the local hook for an exceptional commit, use:

```bash
CODERSO_SKIP_PRECOMMIT=1 git commit
```

## Development Workflow

- Prefer a dedicated branch or worktree for non-trivial changes.
- Keep changes scoped to the task and surrounding contract.
- Follow existing architecture and UI patterns before adding new abstractions.
- Keep code, comments, identifiers, and public developer-facing docs in English.
- Update task docs, source-of-truth docs, and changelog entries when behavior,
  architecture, process, security posture, or public documentation changes.
- Do not silently reduce agreed scope to a smaller MVP.
- Leave the project easier to understand than you found it.

## Testing and Validation

Run the narrowest relevant checks first, then broaden when the touched contract
requires it.

Baseline validation for code changes:

```bash
bun --cwd core lint
bun --cwd core lint:types
```

Repository-level validation:

```bash
bun run lint
bun run test
```

Use Bun for:

- runtime-kernel behavior,
- route integration,
- plugin lifecycle,
- performance gates,
- security gates,
- DB-backed flows.

Use Vitest for:

- Bun-free domain logic,
- admin UI behavior,
- SDK contracts,
- pure TypeScript surfaces.

For Coderso release-gated behavior, keep the release gate contract synchronized:

```bash
bun run gates:coderso
```

Documentation-only changes should still be reviewed and checked for whitespace:

```bash
git diff --check
```

If a relevant command cannot run because of missing local services, database
access, or tooling, state that clearly in the pull request.

## Pull Requests

Pull requests should include:

- A clear title that matches the change.
- A summary of the user-facing or developer-facing impact.
- Testing and validation commands with results.
- Documentation and changelog updates when required.
- Security notes for API routes, public writes, auth, RBAC, CSRF, validation,
  secret handling, release automation, or dependency changes.

Keep pull requests reviewable. Split unrelated changes into separate pull
requests when they have different owners, risk profiles, or validation lanes.

Use GitHub issue forms or discussions for bugs, feature requests, support, and
documentation issues.

Do not use public issues for vulnerabilities.

## Good First Contributions

Helpful starter contributions include:

- fixing unclear documentation,
- improving error messages,
- adding small tests for existing behavior,
- reproducing and minimizing bugs,
- improving accessibility labels,
- simplifying confusing UI copy,
- cleaning up outdated references.

If your contribution helps someone else understand or use Coderso better, it
matters.

## Security and Conduct

- Follow `SECURITY.md` for vulnerability reports.
- Do not disclose vulnerabilities in public issues.
- Follow `CODE_OF_CONDUCT.md` in all project spaces.
- Use `SUPPORT.md` for support, bug report, and feature request routing.

## Community

Coderso is built with a bias toward kindness, practical help, and respect.

You are welcome here if you want to help build useful software and treat other
people well while doing it.
