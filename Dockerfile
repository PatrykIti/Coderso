# Core runtime image (admin UI + API)
ARG BUILDPLATFORM
ARG TARGETPLATFORM
ARG APP_VERSION=1.0.0

FROM oven/bun:1.3.13 AS builder
WORKDIR /app

COPY package.json bun.lock ./
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

FROM oven/bun:1.3.6 AS runner
WORKDIR /app

ARG APP_VERSION=1.0.0
ENV NODE_ENV=production
ENV CORE_VERSION=${APP_VERSION}

LABEL org.opencontainers.image.title="coderso-core"
LABEL org.opencontainers.image.version="${APP_VERSION}"

COPY --from=builder --chown=bun:bun /app /app

WORKDIR /app/core
EXPOSE 3000

USER bun

CMD ["bun", "run", "server/dockerStart.ts"]
