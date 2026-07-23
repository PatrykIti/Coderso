# Release Process

Coderso releases are automated by GitHub Actions and semantic-release.

## Required Repository Secrets

Repository CI/CD expects these GitHub Actions secrets:

- `DATABASE_URL` - PostgreSQL test database used by `Coderso PR Gates`.
  The PR workflow runs `bun run db:migrate` before tests, so changing this
  secret to a clean database is supported as long as the database is disposable
  CI infrastructure.
- `SEMANTIC_RELEASE_APP_ID` - GitHub App id for semantic-release.
- `SEMANTIC_RELEASE_APP_PRIVATE_KEY` - GitHub App private key for
  semantic-release release commits, tags, and GitHub releases.

Do not point `DATABASE_URL` at production data. PR checks are allowed to mutate
the configured test database through migrations and DB-backed test fixtures.

## Pull Request Notes

Every pull request should keep the default release-note block and fill only the
categories that matter:

```md
[Release Notes]
- [Added] New user-facing capability.
- [Changed] Changed behavior or operational process.
- [Fixed] Bug fix.
- [Removed] Removed behavior.
- [Security] Security-impacting change.
```

Empty categories, `None.`, `N/A`, and placeholder lines are ignored.

## Semantic Release Stage

The `Semantic Release` workflow runs on pushes to `main` and manual dispatch.
Stage 1 first creates a GitHub App installation token from:

- `SEMANTIC_RELEASE_APP_ID`
- `SEMANTIC_RELEASE_APP_PRIVATE_KEY`

That app token is used for the checkout credentials and is passed to
semantic-release as `GH_TOKEN` and `GITHUB_TOKEN`. Release commits, tags, and
GitHub release API calls therefore run as the bypass-approved semantic-release
GitHub App, not as the default repository workflow token. The token request is
scoped to the current repository through `owner` and `repositories`.

The workflow pins Node through `actions/setup-node` before running
semantic-release. `semantic-release@25.0.8` admits Node 26, so CI uses
`NODE_VERSION=26.5.0` and verifies `node --version` before installing
dependencies and running `bun run release:semantic`. Node is the supported
release/tooling runtime only; the Coderso server remains Bun-based.

CI and release actions are pinned to full immutable commits with exact stable
tag comments. The current action majors use the Node 24 action runtime and
require Actions Runner `2.327.1` or newer; GitHub-hosted `ubuntu-latest` meets
that floor, and a self-hosted replacement must prove it explicitly.

Then stage 1 runs `bun run release:semantic`, which:

- calculates the next SemVer tag from conventional commits;
- reads merged PR bodies through the GitHub API;
- extracts categorized `[Release Notes]` items;
- prepends a Keep a Changelog entry to root `CHANGELOG.md`;
- updates version-bearing manifests:
  - `package.json`
  - `core/package.json`
  - `store/package.json`
  - `packages/sdk/package.json`
- updates the `CORE_VERSION` fallback in `core/plugins/compat.ts`;
- refreshes `bun.lock`;
- creates the release commit, Git tag, and GitHub release.

Tags use the plain SemVer value, for example `1.1.0`.

## Docker Image Stage

Stage 2 runs only when semantic-release publishes a new version. It checks out
the generated release tag with the same GitHub App auth pattern and builds the
runtime image from `Dockerfile`.

The image is pushed to GHCR as:

```text
ghcr.io/<owner>/coderso-core:<version>
ghcr.io/<owner>/coderso-core:latest
```

The workflow lowercases the GHCR owner and image name before calling
`docker/build-push-action`, because Docker image repository names must be
lowercase even when the GitHub owner contains uppercase characters.

The Docker build also receives `APP_VERSION=<version>`, and the runtime image
sets `CORE_VERSION` plus OCI labels to the same value.

GHCR publishing still uses the workflow `GITHUB_TOKEN` with `packages: write`
because package publishing does not require branch-protection bypass.

The Dockerfile uses the named core build scripts:

```bash
bun --cwd core build:admin
bun --cwd core build:site
```

The runtime image preloads `core/server/productionReactRuntime.ts` before
starting `core/server/dockerStart.ts`, keeping runtime TSX on React's
production JSX factory. The startup flow otherwise remains unchanged: by
default, `dockerStart.ts` runs Drizzle migrations from `core/db/migrations`
before importing the main production server:

```text
run startup migrations -> start core HTTP server
```

`DATABASE_URL` must be present at container runtime. If migrations fail, the
container exits before serving traffic so the app is not run against an older
schema. The startup migrator takes a Postgres advisory lock while Drizzle runs,
so multiple replicas wait on the same migration step instead of racing it. Set
`CODERSO_RUN_MIGRATIONS_ON_START=false` only when the deployment uses a
separate migration job. `CODERSO_MIGRATIONS_FOLDER` may override the migration
folder for custom image layouts, but the default Docker image uses the
checked-in core migration artifacts.

For local Docker smoke tests, pass runtime database settings through the
container environment, for example `docker run --env-file .env ...`, as long as
the `DATABASE_URL` host is reachable from that container/network.

When admin bundle structure or static chunk serving changes, run the local
image build before release closure:

```bash
docker build -t coderso-docker-smoke:lazy-routes --build-arg APP_VERSION=0.0.0-lazy-routes -f Dockerfile .
```

The smoke must preserve `/admin/assets/*` serving for hashed lazy chunks and
deep-link fallback to admin `index.html`.

## Local Validation

Run the release config and workflow contract tests before changing release
automation:

```bash
bun test tests/unit/release
```

For a deeper smoke test, run semantic-release in dry-run mode on a supported
Node runtime:

```bash
./node_modules/.bin/semantic-release --dry-run --no-ci
```

The dry-run contacts GitHub to inspect remote branches and PR metadata. On a
non-release branch it should pass runtime/plugin loading and stop at the
expected branch guard because releases are configured for `main` only.
