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

## Commands (if needed)

```bash
# store
bun add fflate
```

---

## Sub-Tasks

### TASK-022-01_Publish_endpoint

**Status:** To Do

- `POST /publish` (authenticated).
- Accept ZIP + plugin.json + metadata.
- Validate `apiVersion`, `coreVersion`, `entry`.
- Reject if version already exists.

**Implementation Checklist:**

| File | What to Add |
| --- | --- |
| `store/server/routes/publishRoutes.ts` | publish endpoint |
| `store/services/publishService.ts` | orchestrate pipeline |

Publish flow sketch:

```ts
const zip = await readUpload(req);
const manifest = await readManifest(zip);
await validateManifest(manifest);
const report = await runScans(zip);
return saveVersion(manifest, report);
```

---

### TASK-022-02_Scan_pipeline

**Status:** To Do

- SAST rules on ESM bundles.
- CVE scan via SBOM (CycloneDX) if provided.
- Secrets scan (tokens/keys).
- License scan (whitelist).
- Bundle analysis for duplicate React/ReactDOM.
- CSS lint to flag hardcoded colors.
- Record scan report per version.

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

Scan sketch:

```ts
export async function runScans(zip) {
  return {
    sast: await scanSast(zip),
    secrets: await scanSecrets(zip),
  };
}
```

CSS lint sketch:

```ts
const HEX_COLOR = /#([0-9a-fA-F]{3}){1,2}/g;
if (HEX_COLOR.test(cssText)) addWarning("Hardcoded color detected");
```

---

### TASK-022-03_Review_workflow

**Status:** To Do

- `scanStatus=failed` blocks publish.
- `scanStatus=warning` requires manual approval.
- `scanStatus=passed` auto-publishes.

**Implementation Checklist:**

| File | What to Add |
| --- | --- |
| `store/services/publishService.ts` | scan status logic |

Status rules sketch:

```ts
if (report.hasFailures) return { scanStatus: "failed" };
if (report.hasWarnings) return { scanStatus: "warning" };
return { scanStatus: "passed" };
```

---

## Testing Requirements

- [ ] `store/tests/unit/validator.test.ts` rejects invalid manifest.
- [ ] `store/tests/unit/scans.test.ts` detects duplicate React.
- [ ] `store/tests/integration/publish.test.ts` blocks failed scan.
- [ ] `store/tests/integration/publish.test.ts` enforces unique version.

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
