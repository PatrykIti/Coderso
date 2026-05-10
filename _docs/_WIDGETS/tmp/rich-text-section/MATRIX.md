# Rich Text Section Research Matrix

| Researched option | Source family | Decision | Coderso editor/schema implication |
|---|---|---|---|
| Safe prose presets | Tailwind Typography | Keep | Add/confirm `prosePreset`, `size`, max width, and theme tone controls. |
| Heading/body/CTA section | HyperUI, shadcn.io | Keep | Support heading, rich text body, and optional safe CTA. |
| Constrained article width | Preline, Origin UI | Keep | Add width and spacing presets rather than arbitrary CSS. |
| Media-adjacent content | Flowbite, Tailwind UI Plus | Adapt | Use layout/media controls only if renderer already supports safe media. |
| Multi-column prose | Tailwind UI Plus | Adapt | Consider only for short controlled copy; avoid long inaccessible columns. |
| Pull quote | Tailwind UI Plus | Adapt | Optional structured quote field if editorial needs justify it. |
| Badge/eyebrow | ReUI | Keep | Add optional badge/eyebrow above heading. |
| Raw unsafe HTML | Multiple | Reject | Preserve sanitizer boundary; no arbitrary script/style support. |
| Decorative frames from unknown catalogs | Uilib | Reject | Use Coderso theme surfaces only. |
| Full article/CMS body replacement | Multiple | Reject | Rich Text Section stays a page widget, not the content-entry editor. |
