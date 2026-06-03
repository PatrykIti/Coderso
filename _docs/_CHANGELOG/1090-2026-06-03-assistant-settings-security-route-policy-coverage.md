# 1090 - Assistant settings security route policy coverage

Date: 2026-06-03
Version: Unreleased
Tasks: N/A - Vitest assistant policy coverage fix

## Key Changes

### Assistant / Settings

- Added assistant operation policy coverage for the Settings Security subroutes:
  Sessions, Login Alerts, and IP Allowlist.
- Kept those privileged settings surfaces `live-gated` and redacted so provider
  guidance cannot expose secrets or executable mutations without typed action
  contracts.
- Updated the checked-in LLM Guide live coverage matrix and Settings docs to
  match the canonical admin settings sidebar routes.

### Testing

- Updated assistant policy resource expectations for the new security settings
  subroute policies.
- Increased provider registry alias retention so the grouped settings surface
  keeps the generic `settings` alias after adding subroute-specific aliases.

## Validation

- `bun run test:vitest`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run gates:coderso`
- `bun run scan:security:strict`
