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

The whole release workflow uses the constant `coderso-release` concurrency
group with `cancel-in-progress: false`. This serializes semantic-release and
Docker promotion, so a slow older run cannot overlap a newer run and race it for
`:latest`. GitHub keeps at most one pending run in a concurrency group and may
replace that pending run with a newer queued run; this is deliberately not
described as a durable FIFO release queue. Serialization is only the TOCTOU
guard between release workflows; it does not establish which queued or rerun
job owns the newest release. The promotion script determines that independently
from fresh remote Git tags immediately before every GHCR write.

Stage 2 runs only when semantic-release publishes a new version. It checks out
the generated release tag with the same GitHub App auth pattern and builds the
runtime image from `Dockerfile` twice through one warm Buildx builder. The first
export stays in the runner's Docker daemon and must boot and serve successfully
before the workflow logs in to GHCR. The second export publishes only the
run-scoped `candidate-<run-id>-<attempt>` tag with BuildKit SLSA provenance. It
uses one explicit registry output with OCI media types and `oci-artifact=true`;
the workflow does not depend on the exporter's legacy attestation defaults or
add a second output through the `push` shorthand.

The candidate is inspected by the immutable digest returned by
`docker/build-push-action`; the mutable candidate tag is never used as the
verification or promotion source. Before stable tags move, the gate requires:

- the candidate's uncompressed layer digests and startup configuration to match
  the image that passed the boot gate;
- an exact single-platform index containing one `linux/amd64` runnable manifest
  and one `unknown/unknown` OCI attestation manifest;
- the attestation manifest's raw digest and byte size to match its index
  descriptor;
- the index reference annotation and the attestation `subject` digest, media
  type, and byte size to bind that attestation exactly to the runnable manifest
  descriptor;
- the OCI artifact config to be the canonical empty JSON descriptor (`{}`:
  SHA-256 `44136f…`, size `2`, with optional inline data exactly `e30=`);
- exactly one in-toto layer whose descriptor is SLSA provenance v0.2;
- the exact layer bytes fetched from GHCR to match the descriptor's byte size
  and SHA-256 digest, and to decode as `https://in-toto.io/Statement/v1` with a
  `https://slsa.dev/provenance/v0.2` predicate and the runnable manifest as its
  sole subject;
- that predicate to name the current GitHub Actions run as its builder and to
  be canonically identical to the predicate Buildx exposes. An SBOM-only,
  annotation-only, malformed, missing, duplicated, or mismatched attestation
  fails closed.

The identity step receives the workflow token only as `GHCR_TOKEN`. It uses
Basic authentication to request a repository-scoped GHCR pull bearer, feeds
both credentials to curl through stdin configuration rather than command-line
arguments, and stores the fetched envelope in mode-`0600` temporary files that
are removed on exit. No additional action or registry client is introduced.

Only after those checks pass may the promotion script write a stable registry
tag. Before any write it requires `git ls-remote --tags --refs origin` to
succeed, parses only exact stable `MAJOR.MINOR.PATCH` tags without leading
zeroes, requires the candidate version tag to exist, and compares arbitrarily
long numeric segments by length and bytewise lexical order rather than bounded
machine integers. A candidate newer than the highest remote stable tag, a
missing candidate tag, malformed enumeration, or remote failure aborts closed.

The script obtains a repository-scoped GHCR pull bearer and uses authenticated
Distribution API `HEAD` requests with OCI and Docker media types to resolve the
exact version tag. Credentials travel to curl through stdin configuration and
all response/header state is private and removed on exit. Token and manifest
requests have bounded connection and overall timeouts. Only an exact `404` means
absent; an exact `200` must carry one valid `Docker-Content-Digest`. Any other
status, network/authentication failure, timeout, or malformed response aborts.

The version tag is immutable: when absent it is created from the verified
candidate digest and then resolved again; when already equal it is a no-op; and
when it resolves to any other digest promotion stops without a write. If the
candidate is the highest stable remote version, a separate command then updates
`:latest` from the same immutable candidate digest and verifies it with a fresh
authenticated `HEAD`. If a newer stable Git tag exists, the historical version
may still fill its own absent tag, but it explicitly leaves `:latest` untouched:

```text
ghcr.io/<owner>/coderso-core:<version>
ghcr.io/<owner>/coderso-core:latest
```

An identity or provenance failure therefore leaves both existing stable tags
untouched. A failure after the version write but before the latest write needs
special handling: rerunning the Docker job re-exports time-bearing provenance,
so its new candidate index may have a different digest even when the runnable
filesystem is unchanged. Normal promotion rejects that rebuilt candidate
against the immutable version tag and does not write `:latest`; it never assumes
that a rerun reproduced the original artifact.

Recovery is an explicit operator action through this workflow's
`workflow_dispatch` inputs. The operator must take the exact version and
immutable candidate/index digest from the original run whose identity gate
passed and whose version-tag write succeeded, then provide both
`recovery_image_version` and `recovery_image_digest`. The dedicated
`recover-docker-image` job performs no build and publishes no new candidate. It
validates both inputs before writing workflow outputs: the version must be exact
stable SemVer and the digest must be lowercase `sha256:<64 hex>`, so whitespace,
newlines, prerelease/build syntax, leading zeroes, and shell/output metacharacters
fail before any derived ref exists. The job then requires the version to remain
the highest stable tag on `origin`, resolves the
existing version tag through an authenticated GHCR `HEAD`, requires byte-exact
digest equality with the supplied original digest, then copies only
`<version>@<digest>` to `:latest` and verifies the result. A missing input,
different pre-write registry digest, stale version, tag-enumeration failure, or
pre-write registry error aborts without a write. After Docker returns from the
`:latest` write, a fresh authenticated `HEAD` verifies the result. A timeout,
network error, or digest mismatch at that post-write check fails the job with
the tag state explicitly unconfirmed; it cannot truthfully promise that no
write occurred. The operator may safely rerun the same recovery inputs: the
source remains the same pinned version digest and all pre-write guards execute
again. This makes partial-promotion recovery executable without trusting the
newly attested candidate from a rerun.

The promotion step never rebuilds the image or re-resolves a mutable candidate
or version tag as its source.

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
