# Hero Research Matrix

| Researched option | Source family | Decision | Coderso editor/schema implication |
|---|---|---|---|
| Centered copy with dual CTA | HyperUI, Tailwind UI Plus | Keep | Preserve `heading`, `body`, `primaryCta`, `secondaryCta`, alignment, and width controls. |
| Split media hero | Preline, Flowbite | Keep | Add/confirm `layout`, `media`, `mediaPosition`, and mobile stacking controls. |
| Badge or announcement line | shadcn.io, Origin UI | Keep | Own a `badge` object with label, optional href, tone, and visibility. |
| Social proof row | Origin UI, ReUI | Adapt | Use optional `proofItems` only when concise; editor should cap count and avoid noisy defaults. |
| Background image with overlay | Tailwind UI Plus | Adapt | Support `backgroundMedia` and overlay controls without copying premium design. |
| Product screenshot frame | Tailwind UI Plus, Preline | Adapt | Model as `mediaPresentation` rather than a separate widget type. |
| Animated background effects | Aceternity | Adapt | Keep as named `motionPreset` with reduced-motion fallback; avoid arbitrary animation knobs. |
| Embedded form/search hero | Flowbite | Adapt | Treat as future slot/compose behavior; do not hard-code form fields into Hero now. |
| Timeline/proof hybrid | shadcn.io | Adapt | Use supporting items only; full timeline remains the Timeline widget. |
| Unlicensed catalog block clones | Uilib unknown-license | Reject | Do not copy code, markup, names, or prose; use only high-level pattern observations. |
