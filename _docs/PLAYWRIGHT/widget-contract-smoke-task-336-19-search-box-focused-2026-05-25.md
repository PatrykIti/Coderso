# Search Box Focused Wizard Probe

- **Generated:** 2026-05-25T20:58:52.353Z
- **Admin:** http://localhost:5173/admin
- **Widget:** `search-box`
- **Probe:** selected the Search Box fixture, clicked `Run setup again`, inspected Listing, Global, and Route-submit Wizard states.

## Result

| Widget | Probe | Status | Root | Sections | Visible sections | Writable paths | Missing metadata | Raw endpoint/query/CSS inputs | Page picker |
|---|---|---|---:|---:|---:|---|---:|---:|---:|
| `search-box` | listing wizard | passed | 1 | 1 | 1 | `mode`, `listingQueryId` | 0 | 0 | 0 |
| `search-box` | global wizard | passed | 1 | 1 | 1 | `mode`, `sources.pages`, `sources.entries`, `sources.posts` | 0 | 0 | 0 |
| `search-box` | route-submit wizard | passed | 1 | 1 | 1 | `mode`, `targetRoute` | 0 | 0 | 1 |

## Checks

- Wizard passed: yes
- Global raw endpoint input present: no
- Global raw payload copy visible: no
- Route-submit query-param input present: no
- Route-submit page-first destination picker present: yes
