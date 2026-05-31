# Newsletter Focused Editor Probe

- **Generated:** 2026-05-26T00:25:38.008Z
- **Admin:** http://localhost:5173/admin
- **Widget:** `newsletter`
- **Probe:** selected the Newsletter fixture, inspected Visual and Advanced, clicked `Run setup again`, and inspected Wizard.

## Result

| Mode | Status | Root | Visible sections | Writable paths | Missing metadata | Raw technical controls | Raw technical text |
|---|---|---:|---:|---|---:|---:|---|
| Visual | passed | 1 | 9 | `variant`, `title`, `description`, `placeholder`, `form.emailLabel`, `form.showEmailLabel`, `form.firstName.enabled`, `consent.enabled`, `consent.label`, `consent.required`, `optIn.mode`, `submission.mode`, `stateCopy.loadingMessage`, `stateCopy.errorMessage`, `submit.label`, `stateCopy.successMessage`, `style.background`, `style.textColor`, `style.buttonBackground`, `style.buttonTextColor`, `style.spacing`, `style.alignment`, `style.width`, `layout.container`, `layout.padding.top`, `layout.padding.bottom`, `layout.margin.top`, `layout.margin.bottom`, `visibility.devices.desktop`, `visibility.devices.tablet`, `visibility.devices.mobile` | 0 | 0 | no |
| Advanced | passed | 1 | 4 | `none` | 0 | 0 | no |
| Wizard | passed | 1 | 1 | `none` | 0 | 0 | no |

## Checks

- Overall passed: yes
- Wizard before `Run setup again`: root 0, tab 0
- Visual style raw color text inputs: 0
- Advanced writable paths: 0
- Advanced raw controls: 0
- Wizard writable paths after `Run setup again`: 0
