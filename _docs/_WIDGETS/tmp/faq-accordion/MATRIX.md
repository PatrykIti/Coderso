# FAQ Accordion Research Matrix

| Researched option | Source family | Decision | Coderso editor/schema implication |
|---|---|---|---|
| Basic accordion rows | HyperUI, Flowbite, shadcn/ui | Keep | Keep repeated question/answer items with default-open controls. |
| Single vs multiple open | shadcn/ui | Keep | Map current `options.allowMultipleOpen` and `options.defaultOpenIndex` into planned `openMode`, `defaultOpenIds`, and `collapsible` semantics; Flowbite React remains Adapt reference material. |
| Categories | Tailwind UI Plus, Origin UI | Adapt | Support optional category labels; avoid full tabbed search unless justified. |
| Support/contact CTA | ReUI | Keep | Add optional `supportCta` below FAQ list; Tailwind UI Plus category/layout references remain Adapt. |
| Disabled FAQ item | MUI | Reject | Not useful for published marketing FAQs. |
| Search box | Origin UI | Adapt | Defer unless FAQ volume requires it; do not add by default. |
| Icon position/style | Preline | Keep | Add constrained icon placement/style enum; Chakra remains Adapt reference material. |
| Rich HTML answer expansion | Multiple | Reject | Preserve sanitizer boundary and safe rich text rules. |
| Nested accordion | Multiple | Reject | Avoid complex hierarchy in beginner-friendly editor. |
| Unknown-license block details | Origin UI/ReUI if unverified | Reject | Summaries only; no copied markup/classes. |
