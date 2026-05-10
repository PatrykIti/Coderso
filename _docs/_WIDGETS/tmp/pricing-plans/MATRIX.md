# Pricing Plans Research Matrix

| Researched option | Source family | Decision | Coderso editor/schema implication |
|---|---|---|---|
| Tier cards | HyperUI, Flowbite, shadcn.io | Keep | Keep repeated `plans` with price, period, features, CTA, and existing plan-count variants; do not add a standalone grid-count field. |
| Highlighted/popular plan | HyperUI, ReUI | Keep | Add `highlightedPlanId` or `plans[].highlighted` as a single normalized choice. |
| Monthly/annual toggle | Preline, MUI | Keep | Add deterministic `billingToggle` labels and price fields per cycle. |
| Discount badge | Preline, shadcn.io | Adapt | Optional badge on plan or billing cycle; avoid pricing math in renderer. |
| Comparison table | Tailwind UI Plus, Uilib | Adapt | Consider `mode: comparison` only with explicit rows and mobile fallback. |
| Enterprise/custom price | Tailwind UI Plus | Keep | Support `customPriceLabel` when price is not numeric. |
| Feature groups | Uilib | Adapt | Add only if current plans need grouped rows; otherwise flat list remains simpler. |
| Icons/checkmarks per feature | Origin UI | Keep | Use style enum; feature data remains text-first. |
| Runtime checkout/payment logic | Multiple | Reject | Pricing widget remains display-only; commerce/payment belongs elsewhere. |
| Unknown-license implementation details | Uilib | Reject | No copied markup, plan names, or class recipes. |
