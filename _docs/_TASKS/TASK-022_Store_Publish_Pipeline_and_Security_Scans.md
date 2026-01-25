# TASK-022: Store Publish Pipeline and Security Scans
# FileName: TASK-022_Store_Publish_Pipeline_and_Security_Scans.md

**Priority:** High
**Category:** Store/Security
**Estimated Effort:** Large
**Dependencies:** TASK-021
**Status:** To Do

---

## Overview

Implement the publish pipeline and required security scans for plugin
packages.

**Goals:**
- Validate plugin manifest and metadata.
- Run SAST, CVE, secrets, license, bundle analysis, CSS lint.
- Block publish when scans fail.

---

## Architecture

```
store/pipeline/
  validator.ts
  scanners/
    sast.ts
    cve.ts
    secrets.ts
    license.ts
    bundleAnalysis.ts
    cssLint.ts
store/server/routes/
  publishRoutes.ts
```

---

## Sub-Tasks

### TASK-022-1: Publish endpoint

**Status:** To Do

- `POST /publish` (authenticated).
- Accept ZIP + plugin.json + metadata.
- Validate `apiVersion`, `coreVersion`, `entry`.

---

### TASK-022-2: Scan pipeline

**Status:** To Do

- SAST rules on ESM bundles.
- CVE scan via SBOM (CycloneDX) if provided.
- Secrets scan (tokens/keys).
- License scan (whitelist).
- Bundle analysis for duplicate React/ReactDOM.
- CSS lint to flag hardcoded colors.

Example scan result:

```json
{
  "scanStatus": "warning",
  "details": [
    { "type": "bundle", "message": "react found in bundle" }
  ]
}
```

---

### TASK-022-3: Review workflow

**Status:** To Do

- `scanStatus=failed` blocks publish.
- `scanStatus=warning` requires manual approval.

---

## Testing Requirements

- [ ] Invalid manifest blocks publish.
- [ ] Duplicate React triggers bundle scan warning.
- [ ] Secrets scan detects embedded keys.

---

## Documentation Updates Required

- `_docs/STORE_SPEC.md` (scan rules and statuses).

---

## Changelog Entry (planned)

- `_docs/_CHANGELOG/{N}-{YYYY-MM-DD}-store-publish-pipeline.md`
- Notes: publish validation and scans.

---

## Additional Docs

- `_docs/SECURITY_SPEC.md`
