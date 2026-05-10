# Timeline Research Matrix

| Researched option | Source family | Decision | Coderso editor/schema implication |
|---|---|---|---|
| Vertical dated axis | Flowbite, Preline | Keep | Add/confirm `orientation`, `items[].date`, `connectorStyle`, and marker controls. |
| Alternating layout | MUI | Keep | Add `mode: alternating` with deterministic mobile fallback to vertical. |
| Opposite content | MUI | Adapt | Support optional `items[].oppositeLabel` for dates/status, not arbitrary rich sidebars. |
| Icon/status indicators | Chakra, Origin UI | Keep | Own `items[].icon` and `items[].status` as validated enums/tokens. |
| Activity-feed mode | Tailwind UI Plus, ReUI | Adapt | Reuse timeline widget with `mode: feed`; avoid a separate activity widget. |
| Sticky scroll narrative | Aceternity | Adapt | Allow named motion/scroll preset with reduced-motion fallback and no custom scripts. |
| Compact proof timeline | shadcn.io | Adapt | Add density and highlight controls; keep Hero integration separate. |
| Per-item CTA | Flowbite, ReUI | Keep | Support optional safe-link CTA per item with label/href validation. |
| Avatar-heavy feed | Tailwind UI Plus | Reject | Too operational for marketing timeline unless future task requires it. |
| Raw animation/code snippets | Aceternity unknown terms | Reject | No copied animation source in research or runtime. |
