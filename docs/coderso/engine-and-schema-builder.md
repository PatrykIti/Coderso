---
title: "Coderso Engine and Schema Builder"
audience: "admin"
productArea: "coderso-engine"
language: "en"
keywords:
  - engine
  - schema
  - content type
  - fields
---

# Basic

Engine and Schema Builder define structured content models. Use them to design
content types, fields, and relationships before teams start creating records.

# Medium

Engine is the source of truth for record structure. Entries, Listings, Forms,
and Custom Screens consume the schema you define here. Strong schema decisions
reduce downstream rework, migration noise, and UI inconsistency.

Use this surface when:
- you need repeatable structured records,
- multiple modules depend on the same data model,
- validation and relationship rules must stay deterministic.

# Instruction

1. Create or open a content type in Engine.
2. Define fields, labels, validations, and relationships in Schema Builder.
3. Validate required/optional boundaries and relation cardinality.
4. Confirm the model against expected downstream use (Entries, Listings, Forms,
   Custom Screens).
5. Only then create real records.

# Advanced

- Model for queryability first: stable slugs, explicit enums, and predictable
  relation keys.
- Avoid schema churn by versioning changes and migrating incrementally when
  records already exist.
- Prefer explicit defaults and bounded field constraints to reduce runtime
  branching in downstream modules.

# Troubleshooting

- If records fail validation, re-check required fields and enum values in schema
  definitions.
- If downstream screens render inconsistent data, verify relation field names
  and type compatibility.
- If teams frequently patch records manually, review missing defaults and weak
  model constraints in Engine.

# Decision Guide

- Choose Engine when content must be structured and reused by workflows.
- Choose page/post authoring when content is narrative and not record-centric.
- Choose schema refactor before UI refactor if display problems originate from
  inconsistent data shape.

# Checklist

1. Content type and field structure finalized.
2. Validation rules and defaults defined.
3. Relationship model reviewed for downstream screens.
4. Record lifecycle expectations documented.
5. Team ready to create records in Entries only after schema sign-off.

# Security

- Do not encode secrets or privileged operational tokens as content fields.
- Keep admin-only operational data behind RBAC-protected internal surfaces.
- Validate unknown fields strictly at API boundaries to prevent schema abuse.
