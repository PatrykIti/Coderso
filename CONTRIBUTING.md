# Contributing To Coderso

Coderso is a modular web platform: simple on the surface, powerful underneath.
Contributions should protect that product direction while keeping the codebase
clear, tested, and easy to operate.

## Before You Start

- Read `README.md` for product positioning.
- Read `AGENTS.md` for repository workflow, architecture, task, testing, and
  validation rules.
- Check `_docs/` for the contract that owns the area you want to change.
- Check `_docs/_TASKS/README.md` and the relevant task files before starting
  non-trivial work.
- For security-sensitive work, read `SECURITY.md` and `_docs/SECURITY_SPEC.md`.

## Documentation Model

Coderso uses two documentation layers with different audiences:

- `docs/` is the official product documentation surface. Treat it as
  user-facing, stable, and suitable for public readers.
- `_docs/` is the local technical documentation workspace for maintainers,
  implementation planning, architecture contracts, task tracking, changelog
  entries, testing strategy, and AI-agent-assisted development.

Use `_docs/` when documenting implementation contracts, task breakdowns,
internal decisions, validation lanes, architecture notes, or agent handoff
context. It can be more operational and detailed than public documentation.

Use `docs/` when the content is ready to become official product or developer
documentation for external readers.

When a change affects both layers, update `_docs/` first to keep the task,
architecture, and validation contract accurate, then promote the stable
user-facing explanation into `docs/`. Do not publish temporary plans,
implementation scratch notes, or agent-only instructions in `docs/`.

## Local Setup

Install dependencies from the repository root:

```bash
bun install
```

For database-backed commands or tests, load repository environment variables
before running the command:

```bash
set -a && source .env && set +a
```

Do not commit local secrets, `.env` files, database URLs, provider keys, or
private credentials.

## Development Workflow

- Prefer a dedicated branch or worktree for non-trivial changes.
- Keep changes scoped to the task and surrounding contract.
- Follow existing architecture and UI patterns before adding new abstractions.
- Keep code, comments, identifiers, and public developer-facing docs in English.
- Update task docs, source-of-truth docs, and changelog entries when behavior,
  architecture, process, security posture, or public documentation changes.
- Do not silently reduce agreed scope to a smaller MVP.

## Testing And Validation

Run the narrowest relevant checks first, then broaden when the touched contract
requires it.

Baseline validation for code changes:

```bash
bun --cwd core lint
bun --cwd core lint:types
```

Use Bun for runtime-kernel behavior, route integration, plugin lifecycle,
performance gates, security gates, and DB-backed flows. Use Vitest for Bun-free
domain, admin UI, SDK, and pure TypeScript surfaces.

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

Use the GitHub issue forms for bugs, feature requests, support, and
documentation issues. Do not use public issues for vulnerabilities.

## Security And Conduct

- Follow `SECURITY.md` for vulnerability reports. Use GitHub Private
  Vulnerability Reporting or email `security@paktryiti.pl`; do not disclose
  vulnerabilities in public issues.
- Follow `CODE_OF_CONDUCT.md` in all project spaces.
- Use `SUPPORT.md` for support, bug report, and feature request routing.
