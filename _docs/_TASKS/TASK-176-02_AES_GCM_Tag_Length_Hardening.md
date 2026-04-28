# TASK-176-02: AES-GCM Tag Length Hardening
# FileName: TASK-176-02_AES_GCM_Tag_Length_Hardening.md

**Priority:** High
**Category:** Security + Crypto
**Estimated Effort:** Medium
**Dependencies:** TASK-176
**Status:** Done (2026-04-14)

---

## Overview

Fix Semgrep `javascript.node-crypto.security.gcm-no-tag-length.gcm-no-tag-length` findings by making AES-GCM authentication tag length explicit and validated.

Current findings:
- `core/services/security/piiEmail.ts`
- `core/services/security/secretStore.ts`

## Sub-Tasks

No child task files.

## Files to Change

- `core/services/security/piiEmail.ts`
- `core/services/security/secretStore.ts`
- Existing security/secret-store tests
- `_docs/SECURITY_SPEC.md` if the encryption contract is clarified

## Security Contract

- Visibility: backend-only crypto helpers.
- Auth model: not applicable.
- RBAC: not applicable.
- CSRF: not applicable.
- Rate-limit bucket: not applicable.
- Reject-unknown validation: encrypted payload parsers must reject malformed payloads.
- Anti-abuse:
  - explicit AES-GCM auth tag length,
  - reject truncated or wrong-length auth tags,
  - preserve backward compatibility only for valid existing payloads.
- Idempotency: decrypt/encrypt round trips must remain deterministic in tests except for random IV/ciphertext.
- Secret handling:
  - do not log plaintext, keys, ciphertext, IVs, or auth tags,
  - test fixtures must use fake values only.

## Testing Requirements

- Add/update unit tests for:
  - valid encrypt/decrypt roundtrip,
  - malformed auth tag rejection,
  - truncated auth tag rejection,
  - existing payload compatibility where applicable.
- Run:
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`
  - targeted security/secret tests
  - `bun run scan:semgrep`

## Documentation Updates Required

- `_docs/SECURITY_SPEC.md`
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/README.md` and changelog entry on completion.

## Acceptance Criteria

1. AES-GCM auth tag length is explicit in decrypt paths.
2. Malformed/truncated tags fail closed.
3. Semgrep AES-GCM tag-length findings are resolved.

## Progress Notes

- 2026-04-14: Completed AES-GCM tag length hardening. Email and secret encryption now pass explicit 16-byte GCM auth tag length to cipher/decipher creation and reject wrong-length IV/auth tags before decrypting.
- 2026-04-14: Validation passed:
  - `bun test tests/unit/security/secretStore.test.ts tests/unit/security/piiEmail.test.ts`
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`
  - `bun run scan:semgrep > /tmp/nextless-semgrep-176-02.txt 2>&1; if rg -q "gcm-no-tag-length|core/services/security/(piiEmail|secretStore)\\.ts" /tmp/nextless-semgrep-176-02.txt; then rg -n "gcm-no-tag-length|core/services/security/(piiEmail|secretStore)\\.ts" /tmp/nextless-semgrep-176-02.txt; exit 1; else echo "AES-GCM tag-length findings resolved"; rg -n "Findings:" /tmp/nextless-semgrep-176-02.txt | tail -1; fi`
