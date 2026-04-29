# Release Process

Coderso releases are automated by GitHub Actions and semantic-release.

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
semantic-release. `semantic-release@25` requires Node `^22.14.0 || >=24.10.0`,
so CI uses `NODE_VERSION=22.14.0` and verifies `node --version` before
installing dependencies and running `bun run release:semantic`.

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
