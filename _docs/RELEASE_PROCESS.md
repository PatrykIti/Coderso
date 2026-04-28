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
Stage 1 runs `bun run release:semantic`, which:

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
the generated release tag and builds the runtime image from `Dockerfile`.

The image is pushed to GHCR as:

```text
ghcr.io/<owner>/coderso-core:<version>
ghcr.io/<owner>/coderso-core:latest
```

The Docker build also receives `APP_VERSION=<version>`, and the runtime image
sets `CORE_VERSION` plus OCI labels to the same value.
