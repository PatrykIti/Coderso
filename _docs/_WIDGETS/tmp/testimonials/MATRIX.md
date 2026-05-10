# Testimonials Research Matrix

| Researched option | Source family | Decision | Coderso editor/schema implication |
|---|---|---|---|
| Quote card grid | HyperUI, shadcn.io | Keep | Keep repeated quote items with author, role, avatar, and existing variant-count layout; do not add a standalone grid-count field. |
| Single spotlight quote | Preline | Keep | Add `mode: spotlight` and optional featured item; Aceternity remains Adapt-only motion reference. |
| Ratings | Preline, Origin UI | Keep | Add optional rating fields with scale and visibility controls. |
| Company/logo metadata | Flowbite, ReUI | Adapt | Optional `company` and `logo`; keep hidden by default unless populated. |
| Masonry layout | Tailwind UI Plus | Adapt | Support only if deterministic and accessible; otherwise use balanced grid. |
| Animated carousel | Aceternity, Flowbite React | Adapt | Add carousel-ready schema but keep auto-rotation opt-in and reduced-motion safe. |
| Avatar shape | Multiple | Keep | Add constrained `avatarShape` enum. |
| Long case-study text | Multiple | Reject | Keep testimonial quote concise; link out via CTA if needed. |
| Anonymous quotes without source | Multiple | Reject | Avoid encouraging untrusted social proof; editor should favor author metadata. |
| Unknown-license block implementation | Uilib | Reject | Do not copy markup or class recipes. |
