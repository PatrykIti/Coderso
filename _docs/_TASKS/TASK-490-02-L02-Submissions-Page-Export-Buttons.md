# TASK-490-02-L02: Export CSV/JSON actions on the submissions page
# FileName: TASK-490-02-L02-Submissions-Page-Export-Buttons.md

**Parent Subtask:** TASK-490-02
**Priority:** Medium
**Category:** Forms / admin-ui
**Estimated Effort:** Small
**Dependencies:** TASK-490-02-L01 (`exportFormSubmissions`).
**Status:** ✅ Done
**Completed:** 2026-08-14
**Started:** `<YYYY-MM-DD>`
**Completed:** `<YYYY-MM-DD>`

---

## Overview

- **Goal:** Add **Export CSV** and **Export JSON** actions to
  `FormSubmissionsPage`'s `PageHeader` actions slot (next to Back/Refresh) that
  call `exportFormSubmissions` and trigger a browser download from the envelope,
  reusing the `downloadTextFile` shape from `TopPagesDrawer`.
- **Owning module(s) to create-or-extend:** `core/admin/ui/forms/FormSubmissionsPage.tsx`
  (header actions, a small `downloadExportFile` helper, export busy/error state).
- **Source-of-truth docs:** `_docs/CMS_API.md`, `_docs/SECURITY_SPEC.md`,
  `_docs/TESTING_STRATEGY.md`.
- **Out-of-scope:** the client method (L01); the route/service (TASK-490-01); any
  new layout/screen.

---

## Security Contract

- **Endpoint visibility:** N/A (browser UI). It calls only the internal
  `exportFormSubmissions` client, which targets `/admin/api/forms/.../export`.
- **Auth model / RBAC:** the page is already behind the admin session +
  `forms:read` (it renders only after `listFormSubmissions` succeeds); export
  reuses that exact gate. No new client-side gating needed.
- **CSRF:** N/A — read/GET download.
- **Rate-limit bucket:** server-side `admin_read`; the button is disabled while a
  request is in flight to avoid hammering.
- **Anti-abuse for public writes:** N/A — internal authenticated read.
- **Secret/PII handling:** the downloaded `content` may contain submission
  answers. It lives only in a transient `Blob`/object URL that is **revoked**
  immediately after the click; it is never logged or persisted by the app. The
  download helper no-ops safely in non-DOM/test environments
  (`typeof document === "undefined"` guard, as `TopPagesDrawer` does).

---

## Implementation Pseudocode

### `core/admin/ui/forms/FormSubmissionsPage.tsx`

```tsx
import {
  exportFormSubmissions,
  getFormDetailCached,
  listFormSubmissions,
  type FormSubmission,
  type FormSubmissionsExport,
  type FormSubmissionsExportFormat,
} from "@/services/formsClient";

// Reused Blob/anchor download (same shape as analytics TopPagesDrawer.downloadTextFile)
const downloadExportFile = (file: FormSubmissionsExport) => {
  if (typeof document === "undefined" || typeof URL.createObjectURL !== "function") {
    throw new Error("download_unavailable");
  }
  const blob = new Blob([file.content], { type: file.contentType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = file.fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
};

// inside the component:
const [exporting, setExporting] = useState<FormSubmissionsExportFormat | null>(null);

const handleExport = useCallback(async (format: FormSubmissionsExportFormat) => {
  if (!formId || exporting) return;
  setExporting(format);
  setError(null);
  try {
    downloadExportFile(await exportFormSubmissions(formId, format));
  } catch (err) {
    setError(isApiClientError(err) ? err.message : "Failed to export submissions.");
  } finally {
    setExporting(null);
  }
}, [exporting, formId]);

// in PageHeader actions (export disabled while loading, exporting, or empty):
<Button
  variant="outline"
  disabled={isLoading || submissions.length === 0 || exporting !== null}
  onClick={() => handleExport("csv")}
>
  {exporting === "csv" ? "Exporting…" : "Export CSV"}
</Button>
<Button
  variant="outline"
  disabled={isLoading || submissions.length === 0 || exporting !== null}
  onClick={() => handleExport("json")}
>
  {exporting === "json" ? "Exporting…" : "Export JSON"}
</Button>
```

**Data flow:** click → `handleExport(format)` → `exportFormSubmissions` →
`downloadExportFile(envelope)` → browser save dialog. Errors reuse the existing
`error` Alert at the top of the page.

**Error handling:** failures (404/400/network) set the existing `error` state via
`isApiClientError`; the busy state always clears in `finally`. Buttons are
disabled when there are no submissions (nothing to export) and during any export.

**Regression-test shape (Vitest UI):** render the page with mocked
`listFormSubmissions`/`getFormDetailCached`/`exportFormSubmissions`; assert both
buttons render, are disabled on empty/loading, call the client with the right
format, invoke the (mocked) URL/anchor download, and render the error alert when
`exportFormSubmissions` rejects.

---

## Testing Requirements

Lane: **Vitest (admin-UI render flow)**.

- Extend `tests/vitest/ui/form-submissions-page.test.tsx`:
  - Export CSV / Export JSON buttons render in the header;
  - disabled while loading and when `submissions.length === 0`;
  - clicking calls `exportFormSubmissions(formId, "csv" | "json")`;
  - on success the Blob/anchor download path runs (mock `URL.createObjectURL`,
    `HTMLAnchorElement.prototype.click`, `URL.revokeObjectURL`);
  - on rejection the error Alert shows the message and buttons re-enable.
- Gates: `bun --cwd core lint`, `bun --cwd core lint:types`.
