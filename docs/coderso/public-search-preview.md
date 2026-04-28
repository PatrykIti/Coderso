---
title: "Public Search Preview"
audience: "admin"
productArea: "coderso-listings"
language: "en"
keywords:
  - search
  - public search
  - search preview
  - search-box widgets
---

# Basic

Public Search Preview is the admin testing surface for global public search used
by search-box widgets. It lets you define a query, set a limit, choose which
sources are searchable, and inspect the returned result items before using the
behavior in production.

In the current UI, the screen includes:
- query input,
- result limit input,
- source toggles for `Pages`, `Entries`, and `Posts`,
- `Run preview`,
- preview result list.

# Medium

Use Search Preview when you need to validate what the public search layer will
actually look through and what kind of results it returns. This is not full
site-wide QA for every rendered body fragment; it is a preview of the indexed
search contract currently implemented.

The current helper copy makes two things explicit:
- what is indexed now,
- what is not indexed yet.

This screen is best used when:
- a search-box widget is being configured,
- teams need to confirm which sources are currently searchable,
- the preview result quality needs to be checked before rollout.

# Instruction

1. Open `Coderso > Search`.
2. Read the helper section first.
   It tells you what the current preview actually searches:
   - pages title/slug,
   - entries title/slug,
   - entries data title,
   and what it does not search yet.
3. Enter a query in the `Query` field.
4. Set a result `Limit`.
5. Choose which sources should participate:
   - `Pages`
   - `Entries`
   - `Posts`
6. Click `Run preview`.
7. After preview runs, inspect:
   - resolved query,
   - selected sources,
   - item count,
   - returned items with source and href.
8. If there are no results, adjust the query or source toggles before assuming
   search is broken.

Use this safe preview order when you want clearer signal:
1. Start with the default source set.
2. Use a short but specific query.
3. Run preview.
4. Narrow or expand sources only after seeing the first result set.

# Advanced

- Source toggles are part of search strategy, not just a testing convenience.
  They define the kind of discovery experience users can have.
- The helper section matters because the current product intentionally does not
  search all rendered widget/page body content yet.
- If search quality feels weak, the issue may be the indexed field set rather
  than the query term itself.
- Preview should be used to validate practical discovery expectations, not only
  whether the endpoint returns something.

# Troubleshooting

- No results:
  try a simpler query and confirm the right sources are enabled.
- Results seem incomplete:
  re-check the helper text for what is currently indexed and what is not.
- A source should be searchable but is missing:
  confirm its toggle is enabled before debugging anything deeper.
- Preview returns items but relevance feels off:
  the issue may be the limited indexed fields rather than a route failure.

# Decision Guide

- Choose Search Preview vs Filters:
  use Search Preview for global public search behavior; use Filters for runtime
  query-string behavior tied to a listing query.
- Choose broad sources vs narrow sources:
  start broad when validating coverage; narrow sources when the search box
  should support a specific discovery experience.
- Choose query refinement vs source refinement:
  refine the query first when the intent is clear; refine sources first when the
  result set includes the wrong content family.

# Checklist

1. Confirm the query is meaningful.
2. Confirm the limit is intentional.
3. Confirm the right sources are enabled.
4. Run preview.
5. Review returned items and hrefs.
6. Confirm the search behavior is acceptable before using it in widgets.

# Security

- Search Preview is an authenticated admin surface and should only be used by
  users with the appropriate configuration permissions.
- Search source choice can affect what content becomes discoverable through
  public search experiences.
- Treat source toggles and preview results as operational behavior that should be
  reviewed before enabling public-facing search flows.
