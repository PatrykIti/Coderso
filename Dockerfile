# Core runtime image (admin UI + API)
ARG BUILDPLATFORM
ARG TARGETPLATFORM

FROM oven/bun:1.3.6 AS builder
WORKDIR /app

COPY package.json bun.lock ./
COPY core/package.json core/package.json
COPY store/package.json store/package.json
COPY packages/sdk/package.json packages/sdk/package.json

RUN bun install --frozen-lockfile

COPY core core
COPY packages packages
COPY themes themes

RUN cd core && bun x vite build --config vite.config.ts

FROM oven/bun:1.3.6 AS runner
WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder /app /app

WORKDIR /app/core
EXPOSE 3000

CMD ["bun", "run", "server/prod.ts"]
