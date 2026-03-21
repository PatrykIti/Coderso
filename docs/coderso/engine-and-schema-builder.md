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

# What Is It

Coderso Engine and Schema Builder are the modeling surfaces for custom content
types, field structures, and the rules that later drive Entries, Listings,
Custom Screens, and other record-based workflows.

# When To Use

Use Engine before creating real records whenever the site needs repeatable,
structured content instead of one-off pages.

# Step By Step

1. Start by creating or opening a content type in Engine.
2. Define fields, labels, relationships, and schema details in Schema Builder.
3. Validate the model against the downstream workflows you expect to use.
4. Only then move into Entries, Listings, Forms, or Custom Screens.
5. Revisit Engine when the content model changes instead of patching records
   ad hoc downstream.

# Examples

- A clinic defines doctors, services, and locations as content types before
  building listings and booking flows.
- A directory project models providers and categories before creating public
  search/filter experiences.
- A small commerce setup models structured product-supporting records outside
  the core product catalog.

# Common Mistakes

- Creating records first and trying to invent the model later.
- Treating the content type label as enough without validating field structure.
- Forgetting that downstream screens inherit the strengths and weaknesses of the
  schema you create here.
