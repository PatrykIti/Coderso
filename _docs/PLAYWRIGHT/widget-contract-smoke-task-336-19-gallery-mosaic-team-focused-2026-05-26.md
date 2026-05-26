# Gallery Mosaic and Team Focused Editor Probe

- **Generated:** 2026-05-26T03:24:38.342Z
- **Admin:** http://localhost:5173/admin
- **Widgets:** `gallery-mosaic`, `team`
- **Probe:** opens existing fixture pages directly, inspects active Visual and Advanced editor roots, and verifies swatch-only Visual colors plus read-only/confirm-gated Advanced behavior.

## Result

| Widget | Status | Visual root/sections | Advanced root/sections | Advanced writable paths | Advanced `<pre>` payloads | Visual raw color inputs | Confirm dialog |
|---|---|---:|---:|---:|---:|---:|---|
| `gallery-mosaic` | passed | 1/9 | 1/6 | 0 | 0 | 0 | yes |
| `team` | passed | 1/6 | 1/6 | 0 | 0 | 0 | yes |

## Checks

- Overall passed: yes
- Gallery Mosaic overlay helper present: yes
- Team Advanced form controls: 0
