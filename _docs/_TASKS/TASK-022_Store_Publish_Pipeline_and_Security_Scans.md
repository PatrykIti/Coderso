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
store/services/
  publishService.ts

store/tests/unit/
  validator.test.ts
  scans.test.ts
```

---

## Sub-Tasks

### TASK-022-01_Publish_endpoint

**Status:** To Do

- `POST /publish` (authenticated).
- Accept ZIP + plugin.json + metadata.
- Validate `apiVersion`, `coreVersion`, `entry`.

**Implementation Checklist:**

| File | What to Add |
| --- | --- |
| `store/server/routes/publishRoutes.ts` | publish endpoint |
| `store/services/publishService.ts` | orchestrate pipeline |

---

### TASK-022-02_Scan_pipeline

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

**Implementation Checklist:**

| File | What to Add |
| --- | --- |
| `store/pipeline/validator.ts` | manifest validation |
| `store/pipeline/scanners/*.ts` | scanners |

---

### TASK-022-03_Review_workflow

**Status:** To Do

- `scanStatus=failed` blocks publish.
- `scanStatus=warning` requires manual approval.

**Implementation Checklist:**

| File | What to Add |
| --- | --- |
| `store/services/publishService.ts` | scan status logic |

---

## Testing Requirements

- [ ] `store/tests/unit/validator.test.ts` rejects invalid manifest.
- [ ] `store/tests/unit/scans.test.ts` detects duplicate React.
- [ ] `store/tests/integration/publish.test.ts` blocks failed scan.

---

## New Files to Create

- `store/pipeline/validator.ts`
- `store/pipeline/scanners/sast.ts`
- `store/pipeline/scanners/cve.ts`
- `store/pipeline/scanners/secrets.ts`
- `store/pipeline/scanners/license.ts`
- `store/pipeline/scanners/bundleAnalysis.ts`
- `store/pipeline/scanners/cssLint.ts`
- `store/services/publishService.ts`
- `store/server/routes/publishRoutes.ts`
- `store/tests/unit/validator.test.ts`
- `store/tests/unit/scans.test.ts`
- `store/tests/integration/publish.test.ts`

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
