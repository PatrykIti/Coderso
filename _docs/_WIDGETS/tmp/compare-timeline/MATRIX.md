# Compare Timeline Research Matrix

| Researched option | Source family | Decision | Coderso editor/schema implication |
|---|---|---|---|
| Alternating two-side layout | MUI, Preline | Keep | Add/confirm `segments[].side` and deterministic mobile stacking. |
| Dated event segments | Flowbite | Keep | Keep title/date/body fields and marker controls. |
| Track labels | ReUI, Tailwind UI Plus | Keep | Add `tracks` or `trackLabel` only if comparison requires named lanes. |
| Status/current highlight | Chakra, Origin UI | Keep | Add `state`/`highlightCurrent` enums for segments. |
| Scroll narrative | Aceternity | Adapt | Optional named motion preset with reduced-motion fallback. |
| Avatar/activity feed metadata | Tailwind UI Plus | Reject | Too operational for compare timeline marketing surface. |
| Progress indicator | shadcn.io | Adapt | Support simple progress/current state, not arbitrary progress math. |
| Per-item CTA | ReUI | Adapt | Optional safe CTA per segment when comparison needs evidence links. |
| More than two tracks | Multiple | Reject | Keep compare timeline understandable; future task can expand. |
| Unknown copied timeline source | Any unverified source | Reject | No source copy; summaries only. |
