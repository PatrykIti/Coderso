# TASK-017: Store Client and Update Policy
# FileName: TASK-017_Store_Client_and_Update_Policy.md

**Priority:** High
**Category:** Core/Store
**Estimated Effort:** Large
**Dependencies:** TASK-015
**Status:** To Do

---

## Overview

Implement the core-side store client, signature verification, and update
policy. Default update policy is `auto-security` with manual updates for
normal releases.

**Goals:**
- Fetch plugin metadata and revocations.
- Verify signatures and checksums.
- Download, unpack, and switch plugin versions safely.

---

## Architecture

```
core/store/
  client.ts
  verifier.ts
  downloader.ts
  updater.ts
core/plugins/
  installService.ts

tests/unit/store/
  verifier.test.ts
  updater.test.ts
```

---

## Sub-Tasks

### TASK-017-01_Store_client

**Status:** To Do

Endpoints:
- `GET /plugins`
- `GET /plugins/:name`
- `GET /plugins/:name/versions/:version/metadata`
- `GET /plugins/:name/versions/:version/metadata.sig`
- `GET /plugins/:name/versions/:version/download`
- `GET /revocations.json`

**Implementation Checklist:**

| File | What to Add |
| --- | --- |
| `core/store/client.ts` | HTTP client + responses |

---

### TASK-017-02_Signature_and_checksum_verification

**Status:** To Do

- Verify ed25519 signature for `metadata.json`.
- Verify SHA256 checksum for ZIP.

Example:

```ts
const metaBytes = canonicalizeJson(metadata);
verifyEd25519(metaBytes, signature, storePublicKey);
verifySha256(zipBytes, metadata.checksum.sha256);
```

**Implementation Checklist:**

| File | What to Add |
| --- | --- |
| `core/store/verifier.ts` | signature + checksum helpers |

---

### TASK-017-03_Install_and_update_flow

**Status:** To Do

- Download ZIP to temp.
- Unpack into `plugins-runtime/<name>/<version>`.
- Atomically switch active version.
- Store integrity metadata in registry.

**Implementation Checklist:**

| File | What to Add |
| --- | --- |
| `core/store/downloader.ts` | download + unzip |
| `core/store/updater.ts` | install/update logic |
| `core/plugins/installService.ts` | integrate with registry |

---

### TASK-017-04_Update_policy

**Status:** To Do

- Default: `auto-security`.
- Auto-apply only releases with `release.type=security`.
- Normal releases require manual confirm in admin.

**Implementation Checklist:**

| File | What to Add |
| --- | --- |
| `core/store/updater.ts` | policy checks |

---

### TASK-017-05_Revocation_checks

**Status:** To Do

- Pull `revocations.json` on interval (e.g. hourly).
- Disable revoked plugins and surface warning in admin.

**Implementation Checklist:**

| File | What to Add |
| --- | --- |
| `core/store/client.ts` | revocation fetch |
| `core/plugins/installService.ts` | disable revoked |

---

## Testing Requirements

- [ ] `tests/unit/store/verifier.test.ts` rejects invalid signature.
- [ ] `tests/unit/store/updater.test.ts` handles auto-security policy.
- [ ] `tests/integration/store/install.test.ts` installs plugin from ZIP.
- [ ] `tests/integration/store/revocations.test.ts` disables revoked plugin.

---

## New Files to Create

- `core/store/client.ts`
- `core/store/verifier.ts`
- `core/store/downloader.ts`
- `core/store/updater.ts`
- `core/plugins/installService.ts`
- `tests/unit/store/verifier.test.ts`
- `tests/unit/store/updater.test.ts`
- `tests/integration/store/install.test.ts`
- `tests/integration/store/revocations.test.ts`

---

## Documentation Updates Required

- `_docs/STORE_SPEC.md` (verification details if changed).
- `_docs/ARCHITECTURE.md` (update policy default).
- `_docs/CMS_API.md` (install/update endpoints behavior).

---

## Changelog Entry (planned)

- `_docs/_CHANGELOG/{N}-{YYYY-MM-DD}-store-client-and-updates.md`
- Notes: store client and update policy.

---

## Additional Docs

- `_docs/SECURITY_SPEC.md`
