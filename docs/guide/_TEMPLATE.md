---
title: "Document Title"
audience: "admin"
productArea: "area-name"
language: "en"
keywords:
  - keyword-one
  - keyword-two
---

# Basic

Explain in 2-4 sentences what the screen/workflow/feature is and why it exists.
Keep it fast to scan and beginner-friendly.

# Medium

Provide additional context:
- when to use this surface,
- what outcomes it is best for,
- where it fits relative to adjacent modules.

# Instruction

1. Describe the default step-by-step path through the UI.
2. Mention critical options, validations, and prerequisites.
3. State what successful completion looks like.

# Advanced

- Add realistic advanced scenarios and trade-offs.
- Include anti-patterns and scaling/maintenance guidance.
- Explain constraints that matter for production operation.

# Troubleshooting

- List likely failure modes.
- Give practical diagnosis + recovery steps.

# Decision Guide

- Clarify "choose X vs Y" decisions with explicit criteria.

# Checklist

1. List pre-launch or completion checks in deterministic order.

# Security

- Call out data exposure risks, auth/RBAC boundaries, and hardening notes.
- Mention secret handling rules and backend-only constraints where applicable.

---

Legacy section names (`What Is It`, `When To Use`, `Step By Step`, `Examples`,
`Common Mistakes`) remain ingest-compatible, but all new or heavily edited docs
should use the multi-level section contract above.
