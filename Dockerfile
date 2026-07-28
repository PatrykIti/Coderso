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
# `bun build` resolves the entire import graph from the real entrypoints and
# exits non-zero on the first specifier it cannot find. A package the runtime
# needs but which sits in devDependencies therefore fails `docker build` here,
# loudly, instead of failing the container at boot -- or worse, on the first
# request that reaches a lazily-imported module.
#
# The template globs matter: core/themes/resolver.ts loads templates by
# filesystem path at request time (`await import(pathToFileURL(...))`), an edge
# no static graph can see, so they are named as entrypoints here to bring their
# imports under the same check. The glob rather than a fixed list so a newly
# added template is covered automatically.
#
# This runs in the runner stage on purpose: BuildKit skips stages that nothing
# depends on, so the same check in a trailing stage of its own would be silently
# never executed. Output goes to /tmp and is deleted in the same layer; only the
# exit code is wanted.
RUN cd /app \
 && bun build --target=bun --outdir=/tmp/resolve-check \
      core/server/dockerStart.ts \
      core/server/productionReactRuntime.ts \
      core/templates/*.tsx \
 && rm -rf /tmp/resolve-check

WORKDIR /app/core
EXPOSE 3000

USER bun

CMD ["bun", "--config=/app/bunfig.toml", "--preload=/app/core/server/productionReactRuntime.ts", "run", "server/dockerStart.ts"]
