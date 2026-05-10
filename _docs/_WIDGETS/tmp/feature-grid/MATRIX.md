# Feature Grid Research Matrix

| Researched option | Source family | Decision | Coderso editor/schema implication |
|---|---|---|---|
| Icon card grid | HyperUI, shadcn.io | Keep | Keep repeated `items` with icon/title/body and column controls. |
| Alternating feature rows | Preline, Flowbite | Keep | Add `layout: rows` and media position controls if renderer supports media. |
| Bento feature layout | Tailwind UI Plus | Adapt | Model as `mode: bento` with one featured item and strict item count guidance. |
| Optional feature link | Origin UI | Keep | Add safe optional `items[].href`/CTA label where useful. |
| Hover animation | Aceternity | Adapt | Use named effects only with reduced-motion fallback. |
| Badges/categories | ReUI | Adapt | Optional `items[].badge`; avoid full taxonomy unless later task needs it. |
| Rich media per card | Uilib, Preline | Adapt | Support constrained media/image fields, not arbitrary embeds. |
| Long prose cards | Tailwind Typography | Reject | Keep cards concise; use Rich Text Section for long editorial copy. |
| Duplicate specialized feature widgets | Multiple | Reject | Keep one feature-grid widget with modes/presets. |
| Unknown-license implementation details | Uilib | Reject | No code, names, or class recipes copied from unknown-license sources. |
