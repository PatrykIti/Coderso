# TASK-547-03-L03: Contact Form, Action and Generator Tests
# FileName: TASK-547-03-L03-Contact-Form-Action-And-Generator-Tests.md

**Parent Subtask:** TASK-547-03
**Priority:** High
**Category:** Forms / Reference Example
**Estimated Effort:** Medium
**Dependencies:** TASK-547-03-L01, TASK-547-03-L02
**Status:** ⏳ To Do

## Overview

Own the real `project-brief` form seed, fields, safe success-message action and combined
TASK-547-03 slice tests.

## Security Contract

Public form uses native nonce, `public_write` rate charge and optional reCAPTCHA.
Package contains no SMTP/webhook secret. Consent is required; fixture data is fake.
The mandatory enabled action is native `success_message`, not recipient indirection.

## Implementation Pseudocode

```ts
export function buildProjectBriefForm(): FormSeed {
  return normalizeFormSeed({
    key:"project-brief", submissionAccess:"public",
    fields:[nameField(), emailField(), stageField(), messageField(), consentField()],
    actions:[enabledSuccessMessageAction("Dziękujemy! Odezwiemy się wkrótce.")],
  });
}
```

Data flow: fixed config → native Form/action normalize → package seed. Reject
unknown fields/actions, secret-bearing config and invalid public access settings.

Regression tests in `tests/vitest/kits/projekty-domow-form-and-slice.test.ts`:
field order/required/types, exactly one enabled normalized `success_message`
action, secret-free config, full-slice
reference closure and deterministic output.

## Sub-Tasks

- [ ] Build form/field/action seed.
- [ ] Add the named Vitest generator test and run existing
  `tests/unit/forms/formActionsContract.test.ts` read-only; no new Bun file here.

## Testing Requirements

Targeted Vitest/Bun Forms suites; security scan; core lint/types; line counts.

## Documentation Updates Required

Send form setup and optional post-install email/webhook configuration guidance to
TASK-547-06.
