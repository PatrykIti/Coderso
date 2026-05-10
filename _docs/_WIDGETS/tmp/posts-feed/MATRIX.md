# Posts Feed Decision Matrix

| Researched option | Sources | Decision | Coderso editor/schema implication |
|---|---|---|---|
| Latest/category/featured/manual source modes | WordPress Latest Posts and Query Loop | Keep | Visual `Source` section exposes mode-specific controls with normalized fallbacks; Contentful remains Adapt reference material. |
| Card/list/compact density | Current Coderso posts-feed variants | Keep | Preserve card/list/compact variants without changing post resolver; Tailwind/Preline/HyperUI editorial polish remains Adapt reference material. |
| Author/date/category toggles | WordPress Latest Posts | Keep | Field visibility belongs in Visual; diagnostics stay Advanced; Contentful field mapping remains Adapt reference material. |
| Reading time | Preline, blog starters | Adapt | Optional display field only when source has computed or stored value. |
| Infinite feed | Commerce/blog examples | Reject | Out of scope for editor parity; needs runtime pagination and cache contract first. |
| Free-form post template editing | WordPress Query Loop | Reject | Too broad for this widget; use schema-owned fields and variants. |
