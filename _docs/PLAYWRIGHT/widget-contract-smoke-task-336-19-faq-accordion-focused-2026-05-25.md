# FAQ Accordion Focused Editor Probe

- **Generated:** 2026-05-25T23:27:36.353Z
- **Admin:** http://localhost:5173/admin
- **Widget:** `faq-accordion`
- **Probe:** selected a completed FAQ Accordion fixture, verified no Wizard tab before explicit re-entry, inspected Visual/Advanced, clicked `Run setup again`, and inspected Wizard.

## Result

| Area | Status | Key checks |
|---|---|---|
| Shell | passed | Wizard roots before re-entry: 0; Wizard tabs before re-entry: 0; Visual tabs: 1; Advanced tabs: 1 |
| Visual | passed | raw style inputs: 0; missing metadata: 0; raw text: no |
| Advanced | passed | writable paths: 0; raw controls: 0; raw text: no |
| Wizard Re-entry | passed | Wizard roots after `Run setup again`: 1; Advanced tabs during Wizard: 0; raw text: no |

## Checks

- Overall passed: yes
- Advanced raw payload snapshot or mutating controls present: no
- Wizard opens only through explicit `Run setup again`: yes
