---
title: "Form Action Logs"
audience: "admin"
productArea: "coderso-forms"
language: "en"
keywords:
  - action logs
  - form actions
  - retries
  - observability
  - automation
---

# Basic

Form Action Logs is the operational view for what happened after form actions
ran. It shows status counts, lets you filter runs by outcome, and gives you a
retry path for failed runs.

In the current UI, the route includes:
- top actions:
  `Back to form`, `Refresh`
- stats cards:
  `Success`, `Failed`, `Skipped`
- status filter,
- runs table with retry support,
- empty state guidance when no runs exist yet.

# Medium

Use Action Logs when the form itself is already configured and you need evidence
about execution after submissions. This is not the place to design field
structure; it is the place to verify and troubleshoot what happened downstream.

The route answers questions such as:
- did form actions run,
- how many failed,
- which runs were skipped,
- whether a failed run should be retried.

The main workflow areas are:
- high-level status counters,
- status filtering,
- row-by-row run review,
- retry for failed runs,
- return path back to the form builder.

# Instruction

1. Open a form’s `Action logs`.
2. Start at the top stats cards.
   Check:
   - `Success`
   - `Failed`
   - `Skipped`
3. If the run history is noisy, use the `Filter status` control.
4. In the runs table, inspect:
   - action label,
   - action type,
   - status,
   - attempt number,
   - created time,
   - error message,
   - actions column.
5. Retry only failed runs.
6. Use `Refresh` after a retry or after external changes.
7. Use `Back to form` when the issue is clearly in form configuration rather
   than in run execution.
8. If there are no runs yet, treat the empty state literally:
   use runtime preview or real submissions to generate execution history.

Use this safe operations flow when you want the clearest diagnosis:
1. Check counters.
2. Filter to `Failed` if needed.
3. Inspect the error text.
4. Retry only when the failure looks transient.
5. Return to the builder if the issue is configuration rather than execution.

# Advanced

- Action Logs should be part of the release workflow for forms with automation,
  not only a last-resort debugging screen.
- Retry is a corrective tool, not a substitute for root-cause analysis. If many
  runs fail the same way, fix the configuration first.
- `Skipped` runs matter operationally. They often indicate branch logic or
  gating conditions rather than outright failure.
- Empty logs are still signal. They often mean the form has not been exercised
  through runtime preview or actual submissions yet.
- Stats cards are useful for triage, but the row-level history is where timing,
  attempt counts, and error messages make the diagnosis concrete.

# Troubleshooting

- No action runs yet:
  use runtime preview or a real test submission to generate logs.
- A run failed:
  inspect the error message before retrying.
- Many retries fail the same way:
  go back to the form builder and review settings or automation.
- Success count is zero but the form submits:
  check whether automation is actually configured and whether runs are being
  filtered out by status.
- A run shows `Skipped`:
  review whether the action was intentionally gated rather than broken.

# Decision Guide

- Choose retry vs reconfigure:
  retry when the failure looks transient; reconfigure when the pattern is
  repeatable and systemic.
- Choose logs vs builder:
  use logs for operational evidence; use builder when the issue is clearly in
  form structure or settings.
- Choose all statuses vs filtered view:
  use all statuses for broad health review; filter when you need faster triage.

# Checklist

1. Confirm the correct form is open.
2. Check success/failed/skipped counters.
3. Filter by status if needed.
4. Inspect failed runs before retrying.
5. Retry only when appropriate.
6. Return to the form builder if the issue is configuration-level.

# Security

- Action Logs is an authenticated admin surface and should only be used by users
  with the appropriate operational permissions.
- Error messages can expose operational context, so they should be treated as
  internal admin information.
- Retry actions should be deliberate because they can repeat downstream side
  effects.
