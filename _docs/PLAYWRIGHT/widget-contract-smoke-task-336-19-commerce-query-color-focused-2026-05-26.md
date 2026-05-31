# TASK-336-19 Commerce Query/Color Focused Probe

- **Generated:** 2026-05-26T02:05:00.000Z
- **Admin:** http://localhost:5173/admin
- **Widgets:** `product-compare`, `product-gallery`
- **Result:** passed

## Checks

| Widget | Visual swatches | Visual value inputs | Raw color inputs | Media hint controls | Advanced `<pre>` | Advanced writable paths | Runtime paths | Raw Advanced copy | Source summary | Surface summary |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---|---|
| `product-compare` | 5 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | yes | yes |
| `product-gallery` | 4 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | yes | yes |

## Notes

- Probe used `playwright-cli` against the live admin page fixtures after
  strict widget-contract smoke passed.
- The focused selectors verify that Visual exposes swatches without raw
  CSS/token text inputs and Advanced exposes human summaries without raw query
  JSON, raw media IDs, `<pre>` payloads, mutating controls, or `runtime.*`
  control paths.
