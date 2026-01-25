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
```

---

## Sub-Tasks

### TASK-017-1: Store client

**Status:** To Do

Endpoints:
- `GET /plugins`
- `GET /plugins/:name`
- `GET /plugins/:name/versions/:version/metadata`
- `GET /plugins/:name/versions/:version/metadata.sig`
- `GET /plugins/:name/versions/:version/download`
- `GET /revocations.json`

---

### TASK-017-2: Signature and checksum verification

**Status:** To Do

- Verify ed25519 signature for `metadata.json`.
- Verify SHA256 checksum for ZIP.

Example:

```ts
const metaBytes = canonicalizeJson(metadata);
verifyEd25519(metaBytes, signature, storePublicKey);
verifySha256(zipBytes, metadata.checksum.sha256);
```

---

### TASK-017-3: Install and update flow

**Status:** To Do

- Download ZIP to temp.
- Unpack into `plugins-runtime/<name>/<version>`.
- Atomically switch active version.
- Store integrity metadata in registry.

---

### TASK-017-4: Update policy

**Status:** To Do

- Default: `auto-security`.
- Auto-apply only releases with `release.type=security`.
- Normal releases require manual confirm in admin.

---

### TASK-017-5: Revocation checks

**Status:** To Do

- Pull `revocations.json` on interval (e.g. hourly).
- Disable revoked plugins and surface warning in admin.

---

## Testing Requirements

- [ ] Invalid signature blocks install.
- [ ] Checksum mismatch blocks install.
- [ ] Auto-security updates apply only security releases.
- [ ] Revoked plugin is disabled on refresh.

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
