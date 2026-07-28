# Core runtime image (admin UI + API)
ARG BUILDPLATFORM
ARG TARGETPLATFORM
ARG APP_VERSION=1.0.0

# ---------------------------------------------------------------------------
# prod-deps: the dependency tree the runtime actually needs, and nothing else.
#
# This is deliberately a separate stage from `builder` rather than a
# `--production` flag on the builder's install. The builder genuinely needs
# core's devDependencies -- vite, @vitejs/plugin-react, @tailwindcss/vite and
# tailwindcss all drive build:admin / build:site -- so pruning there would
# break the build. Resolving the production tree in its own stage keeps the two
# dependency sets apart, and this stage depends on nothing the builder produces
# so it resolves in parallel with it.
#
# --frozen-lockfile is preserved: --production selects a subset of the same
# lockfile and leaves bun.lock byte-identical.
# ---------------------------------------------------------------------------
FROM oven/bun:1.3.14 AS prod-deps
WORKDIR /app

COPY package.json bun.lock bunfig.toml ./
COPY core/package.json core/package.json
COPY store/package.json store/package.json
COPY packages/sdk/package.json packages/sdk/package.json

RUN bun install --production --frozen-lockfile

FROM oven/bun:1.3.14 AS builder
WORKDIR /app

COPY package.json bun.lock bunfig.toml ./
COPY core/package.json core/package.json
COPY store/package.json store/package.json
COPY packages/sdk/package.json packages/sdk/package.json

RUN bun install --frozen-lockfile

COPY core core
COPY docs docs
COPY packages packages
COPY themes themes

WORKDIR /app/core
RUN bun run build:admin
RUN bun run build:site \
  && if [ -f dist/site/.vite/manifest.json ] && [ ! -f dist/site/manifest.json ]; then \
       cp dist/site/.vite/manifest.json dist/site/manifest.json; \
     fi

FROM oven/bun:1.3.14 AS runner
WORKDIR /app

ARG APP_VERSION=1.0.0
ENV NODE_ENV=production
ENV CORE_VERSION=${APP_VERSION}

LABEL org.opencontainers.image.title="coderso-core"
LABEL org.opencontainers.image.version="${APP_VERSION}"

# ---------------------------------------------------------------------------
# Why the runner no longer inherits the builder's modules.
#
# This used to be a single `COPY --from=builder /app /app`, which dragged the
# builder's node_modules -- every devDependency, so eslint, vitest, typescript,
# vite, semantic-release and their transitive trees -- into the shipped image.
# Nothing under the CMD below imports any of it; it was pure attack surface,
# and it is why lint-only advisories kept turning up in image scans.
#
# So node_modules comes from prod-deps (production tree only) and the
# application content is listed explicitly. Do NOT collapse these back into one
# `COPY --from=builder /app /app` -- that silently reinstates the entire
# devDependency tree, and nothing in the build would fail to tell you.
#
# The runtime executes TypeScript from source (see CMD), so every path the
# import graph can reach has to be present:
#   package.json/bun.lock  workspace identity for Bun's resolver
#   bunfig.toml            named literally by CMD
#   core                   server/services/widgets, db/migrations, templates, dist
#   docs                   ingested by the startup assistant-docs reindex
#   packages               imported by relative path from core/plugins and pluginsRoutes
#   themes                 theme registry scan target
#   store                  package.json only; keeps node_modules/@coderso/store resolvable
# ---------------------------------------------------------------------------
COPY --from=prod-deps --chown=bun:bun /app/node_modules /app/node_modules
COPY --from=builder --chown=bun:bun /app/package.json /app/bun.lock /app/bunfig.toml ./
COPY --from=builder --chown=bun:bun /app/core /app/core
COPY --from=builder --chown=bun:bun /app/docs /app/docs
COPY --from=builder --chown=bun:bun /app/packages /app/packages
COPY --from=builder --chown=bun:bun /app/themes /app/themes
COPY --from=builder --chown=bun:bun /app/store /app/store

# Build-time proof that the pruned tree is complete.
#
# The check bundles the whole import graph from the real entrypoints -- the CMD
# entry, the --preload, and the templates -- and fails the build if anything the
# graph reaches is missing from the tree above. A package the runtime needs but
# which sits in devDependencies therefore fails `docker build` here, loudly,
# instead of failing the container at boot, or worse on the first request that
# reaches a lazily-imported module.
#
# This is NOT a bare `bun build`, and the reason is the whole point of the
# script. `bun build` reports an unresolvable import as an error -- unless the
# import sits inside a try/catch, in which case it downgrades it to an external
# and exits 0 with no diagnostic. core/services/email/emailProvider.ts is
# exactly that shape (`try { await import("nodemailer") } catch`), so deleting
# nodemailer from a pruned tree left the old bare-`bun build` check passing: it
# was blind to the single import it was added to protect. The script reads the
# bundler's --metafile instead of trusting its exit code, and fails on any
# first-party edge marked external that is not a Node/Bun builtin.
#
# What it cannot cover, and says so on every run: dynamic imports with a
# computed specifier. core/site/renderPublicPage.tsx and renderPublicEntry.tsx
# do `await import(pathToFileURL(templatePath).href)` to load a template per
# request. No static tool can confirm that path. Naming core/templates/*.tsx as
# entrypoints brings everything those templates IMPORT under the check, but the
# path resolution itself is only proven by serving a page -- which is the CI
# image-boot gate's job (build image, run it against a throwaway Postgres, poll
# /admin/ until it answers), not this check's. The glob rather than a fixed list
# so a newly added template is covered automatically; the script fails if the
# glob comes back empty rather than quietly checking less.
#
# This runs in the runner stage on purpose: BuildKit skips stages that nothing
# depends on, so the same check in a trailing stage of its own would be silently
# never executed. The script writes its bundle to a temp dir and removes it
# itself; only the exit code is wanted. The script is deleted in the same layer
# so it does not ship.
COPY .github/scripts/docker-resolve-check.mjs /tmp/docker-resolve-check.mjs
RUN bun /tmp/docker-resolve-check.mjs /app \
 && rm -f /tmp/docker-resolve-check.mjs

WORKDIR /app/core
EXPOSE 3000

USER bun

# ---------------------------------------------------------------------------
# What has been proven about this image, and where the proof stops.
#
# The prune above and the resolve-check were developed and verified WITHOUT
# Docker -- it is absent from the environment this work was done in, so no
# image here has ever been built or started. Two claims in the commit that
# introduced the prune (08387ef7) were wider than their evidence. Corrected,
# because a reader meeting them would otherwise assume coverage that does not
# exist:
#
# ESTABLISHED. The production dependency tree resolves (142 packages against
# the same lockfile, versus 747 with devDependencies). Every module the runtime
# import graph reaches -- 595 first-party, ~3100 total -- loads against that
# pruned tree. The process starts.
#
# NOT ESTABLISHED: that the application SERVES. Every HTTP request in that
# evidence died in the same place, before routing. httpServer.ts's `fetch()`
# awaits resolveAdminPath() as its very first statement, which reads the
# `site.adminPath` setting from the database, and then enforceHostPolicy(),
# which reads four more. Both run before the handler is picked. With no
# database reachable, no route handler module was ever executed over HTTP. So
# the evidence shows the module graph loads and the server accepts a
# connection; it does not show a request being answered.
#
# NOT ESTABLISHED: that the CMD below is what was exercised. The program that
# served those requests was the HTTP server underneath it -- prod.ts ->
# httpServer.ts. dockerStart.ts runs runStartupMigrations() and
# runStartupAssistantDocsReindex(), both of which need a database, before it
# ever reaches `await import("./prod")`. Those two startup steps are unproven.
#
# The evidence is kept because it is real and useful: it is what makes the
# prune safe to ship. It is simply narrower than it was described as.
#
# What closes the gap is the CI image-boot gate added on
# feature/task-540-ci-image-gate -- .github/scripts/verify-image-boot.sh, run
# from the "Verify the image boots and serves" step of
# .github/workflows/coderso-pr-gates.yml. It builds this image, starts it
# against a throwaway Postgres service container, and polls /admin/ until it
# answers 200. That gate, and nothing above it, is what proves this image
# serves.
# ---------------------------------------------------------------------------
CMD ["bun", "--config=/app/bunfig.toml", "--preload=/app/core/server/productionReactRuntime.ts", "run", "server/dockerStart.ts"]
