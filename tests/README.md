# Tests README

This repository uses a hybrid testing model aligned with the product architecture.

## Runner ownership

- Bun owns runtime-kernel validation:
  - `tests/integration/*`
  - `tests/perf/*`
  - `tests/security/*`
  - plugin lifecycle and bundle/runtime contracts
- Vitest owns Bun-free tests in `tests/vitest/*`:
  - pure admin utilities
  - admin/UI component logic
  - SDK/shared contracts
  - DOM-rich editor helpers through `happy-dom`

## Commands

```bash
bun run test:vitest
bun run test:coverage
bun run test:coverage:bun
bun run test:coverage:bun:full
bun run test:coverage:all
```

## Lane guidance

- Prefer adding new Bun-free tests to `tests/vitest/*`.
- Keep existing Bun suites when they validate runtime semantics.
- Use `// @vitest-environment happy-dom` for DOM-heavy Vitest files.
- Do not move runtime/plugin/install/security/perf suites to Vitest only for coverage.
