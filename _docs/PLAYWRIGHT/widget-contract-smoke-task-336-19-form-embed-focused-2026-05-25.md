# Form Embed Focused Editor Probe

- **Generated:** 2026-05-25T23:07:27.832Z
- **Admin:** http://localhost:5173/admin
- **Widget:** `form-embed`
- **Probe:** selected the Form Embed fixture, inspected Visual and Advanced, clicked `Run setup again`, and inspected Wizard.

## Result

| Mode | Status | Root | Visible sections | Writable paths | Missing metadata | Raw technical controls | Raw technical text |
|---|---|---:|---:|---|---:|---:|---|
| Visual | passed | 1 | 9 | `title`, `description`, `submitLabel`, `successMessage`, `layout.alignment`, `layout.width`, `layout.spacing`, `layout.buttonAlignment`, `layout.sectionPaddingX`, `layout.sectionPaddingY`, `layout.fieldGap`, `fields.showLabels`, `fields.showRequiredIndicator`, `style.background`, `style.surface`, `style.borderColor`, `style.borderWidth`, `style.radius`, `style.inputSize`, `style.titleColor`, `style.titleSize`, `style.titleWeight`, `style.labelColor`, `style.helperColor`, `style.submitBackground`, `style.submitTextColor`, `layout.headingLevel`, `navigation.backLabel`, `navigation.nextLabel`, `navigation.showProgress`, `navigation.savedProgressTtlDays`, `submitBehavior.loadingLabel`, `submitBehavior.successBehavior`, `layout.container`, `layout.padding.top`, `layout.padding.bottom`, `layout.margin.top`, `layout.margin.bottom`, `visibility.devices.desktop`, `visibility.devices.tablet`, `visibility.devices.mobile` | 0 | 0 | no |
| Advanced | passed | 1 | 6 | `none` | 0 | 0 | no |
| Wizard | passed | 1 | 2 | `formId` | 0 | 0 | no |

## Checks

- Overall passed: yes
- Visual form preview role: `summary`
- Visual style raw color text inputs: 0
- Advanced writable paths: 0
- Advanced raw payload/endpoint/security text present: no
- Wizard only writable path is `formId`: yes
