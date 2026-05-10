# Posts Feed Decision Matrix

| Researched option | Sources | Decision | Coderso editor/schema implication |
|---|---|---|---|
| Latest/category/featured/manual source modes | WordPress, Contentful | Keep | Visual `Source` section exposes mode-specific controls with normalized fallbacks. |
| Card/list/editorial density | HyperUI, Tailwind UI Plus, Preline | Keep | Add compact density and optional featured-first display without changing post resolver. |
| Author/date/category toggles | WordPress Latest Posts, Contentful | Keep | Field visibility belongs in Visual; diagnostics stay Advanced. |
| Reading time | Preline, blog starters | Adapt | Optional display field only when source has computed or stored value. |
| Infinite feed | Commerce/blog examples | Reject | Out of scope for editor parity; needs runtime pagination and cache contract first. |
| Free-form post template editing | WordPress Query Loop | Reject | Too broad for this widget; use schema-owned fields and variants. |
