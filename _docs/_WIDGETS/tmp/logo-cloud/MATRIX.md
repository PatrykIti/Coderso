# Logo Cloud Research Matrix

| Researched option | Source family | Decision | Coderso editor/schema implication |
|---|---|---|---|
| Static responsive grid | HyperUI, Preline, Flowbite | Keep | Keep repeated logo items with image, alt, href, existing `variant`, `style.gap`, and `style.logoHeight`; do not add a standalone grid-count field. |
| Intro text with logos | Flowbite | Keep | Support optional heading/intro and intro position; Tailwind UI Plus split composition stays Adapt. |
| Grayscale/muted logo treatment | HyperUI, Preline | Keep | Add `logoTone` enum rather than arbitrary filters. |
| Dark/surface variants | Tailwind UI Plus, shadcn.io | Adapt | Use theme token surface/tone controls. |
| Marquee mode | Aceternity, Uilib | Adapt | Add optional `mode: marquee` with pause and reduced-motion fallback. |
| Multi-row cloud | Flowbite | Keep | Add row/wrap behavior through layout controls; ReUI partner row polish stays Adapt. |
| Per-logo custom sizing | Multiple | Reject | Keep one max logo height for consistency. |
| Missing alt text | Multiple | Reject | Require alt text/accessible label in schema/editor. |
| Partner descriptions | Multiple | Reject | Too much content for logo cloud; use Feature Grid or Testimonials. |
| Unknown-license marquee implementation | Uilib | Reject | No copied source or class recipes. |
