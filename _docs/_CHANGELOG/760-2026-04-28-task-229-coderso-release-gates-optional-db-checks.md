# 760 - TASK-229 Coderso Release Gates Optional DB Checks

- Date: 2026-04-28
- Version: Unreleased
- Tasks: TASK-229

## Key Changes

### Release Gates

- Split DB-backed Coderso release-gate commands from pure security and
  reliability commands.
- Added explicit skipped command reporting when `DATABASE_URL` is absent, using
  `skipReason: "database_url_missing"` in the gate report.
- Kept the Coderso release-gate workflow wired to `secrets.DATABASE_URL` so a
  maintained Render test database can enable DB-backed smoke checks.
- Moved installer template seed checks behind a Bun-free helper and pointed the
  nonce gate at the existing Vitest suite path.

### Security

- Removed import-time DB coupling from `securitySettings.ts`; default security
  settings can now be imported without `DATABASE_URL`.
- Kept pure public-write security baseline checks mandatory without a database.

## Validation

- Passed:
  - `bun test tests/security/codersoSecurityGate.test.ts`
  - `bun test tests/security/codersoSecurityGate.test.ts tests/unit/kits/kitInstaller.test.ts`
  - `bun run test:vitest -- tests/vitest/forms/submissionNonce.test.ts`
  - `bun scripts/coderso-release-gates.ts --gate security --report .tmp/coderso-release-gates-security-no-db.json`
  - `bun scripts/coderso-release-gates.ts --gate reliability --report .tmp/coderso-release-gates-reliability-no-db.json`
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`
  - `bun run lint:repo:types`
  - `ruby -e 'require "yaml"; YAML.load_file(".github/workflows/coderso-release-gates.yml"); puts "coderso-release-gates.yml YAML OK"'`
  - `git diff --check`
