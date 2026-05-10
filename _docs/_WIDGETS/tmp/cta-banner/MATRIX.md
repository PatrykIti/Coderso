# CTA Banner Research Matrix

| Researched option | Source family | Decision | Coderso editor/schema implication |
|---|---|---|---|
| Simple centered CTA | HyperUI, shadcn.io | Keep | Keep heading/body plus one or two CTA links and alignment. |
| Split CTA layout | Preline | Keep | Add `layout: split` and CTA position controls. |
| High-contrast band | Tailwind UI Plus | Keep | Add tone/contrast preset while preserving theme tokens. |
| Background media/overlay | Tailwind UI Plus, Uilib | Adapt | Support constrained background media only with overlay controls. |
| Badge/icon CTA strip | Origin UI | Keep | Add optional badge/icon for compact announcement CTA. |
| App store buttons | Flowbite | Adapt | Model as button group/link styles, not store-specific fields. |
| Signup form in CTA | Flowbite | Reject | Requires form composition/slot work; keep out of this slice. |
| Animated backgrounds | Aceternity | Adapt | Named motion presets only, reduced-motion safe. |
| Countdown urgency | Common marketing pattern | Reject | Not in cited source families and risks nondeterministic content. |
| Unknown-license decorative code | Uilib | Reject | No copied markup/classes/effects. |
