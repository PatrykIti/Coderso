# 1030 - CI env loading for test lanes

Date: 2026-05-31
Version: Unreleased
Tasks: N/A

## Key Changes

### CI / Testing

- Made test script `.env` loading optional so local runs still read `.env` while GitHub Actions can rely on job environment variables.
- Passed `DATABASE_URL` into PR gate jobs from either the repository secret or repository variable, with secrets taking precedence, and updated the preflight message accordingly.
- Documented the optional `.env` behavior for Vitest and general test commands.

## Validation

- `bash -lc 'tmp=$(mktemp -d); cd "$tmp"; set -a && { [ ! -f .env ] || . ./.env; } && set +a && echo optional-env-ok'` - passed.
- `node -e "JSON.parse(require('fs').readFileSync('package.json', 'utf8')); console.log('package-json-ok')"` - passed.
- `bun run test:vitest -- tests/vitest/server/errorHandler.test.ts` - passed (`1` file, `3` tests).
- `bun --cwd core lint` - passed.
- `bun --cwd core lint:types` - passed.
