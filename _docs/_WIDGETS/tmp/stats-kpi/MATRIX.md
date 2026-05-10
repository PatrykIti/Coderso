# Stats KPI Research Matrix

| Researched option | Source family | Decision | Coderso editor/schema implication |
|---|---|---|---|
| Stat grid | HyperUI, Flowbite | Keep | Keep repeated stat items with value, label, description, and columns. |
| Prefix/suffix | ReUI | Keep | Add explicit `prefix` and `suffix` fields instead of parsing value strings. |
| Icon per KPI | Preline, Uilib | Keep | Add optional icon field and icon tone controls. |
| Trend label/direction | Origin UI, ReUI | Adapt | Support optional trend text/direction but avoid live data semantics. |
| Strip mode | Tailwind UI Plus | Keep | Add `mode: grid|strip|split` if renderer supports stable layout. |
| Media split stat section | Tailwind UI Plus | Adapt | Consider only if current widget needs media; otherwise use Split Layout + Stats. |
| Animated counters | Common pattern | Reject | Avoid nondeterministic counting unless later accessibility/perf task approves it. |
| Dashboard actions | MUI-style cards | Reject | Public marketing KPI should not expose operational actions. |
| Long narrative text | Tailwind Typography | Reject | Use Rich Text Section for long copy. |
| Unknown-license implementation details | Uilib | Reject | No copied source/classes. |
