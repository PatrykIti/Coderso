# Team Research Matrix

| Researched option | Source family | Decision | Coderso editor/schema implication |
|---|---|---|---|
| Team member grid | HyperUI, Preline, Flowbite grid portions | Keep | Keep repeated members with photo, name, role, bio, and columns; profile-link behavior from Flowbite remains Adapt below. |
| Social links | HyperUI, Flowbite social-icon portions | Keep | Add validated repeated social links with platform and safe href; ReUI department/profile patterns remain Adapt below. |
| Photo shape | Preline, Flowbite React | Keep | Add `photoShape` enum and fallback initials behavior. |
| Profile link | Flowbite, Origin UI | Adapt | Optional safe profile URL; avoid action-heavy cards. |
| Leadership/featured mode | Tailwind UI Plus | Adapt | Add optional featured member or layout mode only if product needs it. |
| Department labels | ReUI | Adapt | Optional small label; do not create taxonomy management. |
| Hover overlays | Uilib | Adapt | Use simple overlay/caption controls only; no copied effects. |
| Contact buttons per person | Multiple | Reject | Keep team public profile focused; contact workflows belong elsewhere. |
| Missing image alt/fallback | Multiple | Reject | Require accessible name/fallback for every member. |
| Unknown-license card implementation | Uilib | Reject | No copied source/classes. |
