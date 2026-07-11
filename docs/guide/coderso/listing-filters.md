---
title: "Listing Filters"
audience: "admin"
productArea: "coderso-listings"
language: "en"
keywords:
  - filters
  - runtime query string
  - listing filters
  - preview
  - url tokens
---

# Basic

Listing Filters is the runtime-token preview surface for listing blocks. It
lets you pick a listing query, build a runtime query string, preview how tokens
resolve, and inspect the rows snapshot before that logic is trusted in blocks
or public routes.

In the current UI, the screen includes:
- a listing query selector,
- runtime query string input,
- `Run preview`,
- optional examples/help section,
- preview summary cards and rows snapshot.

# Medium

Use Filters after a listing query already exists. This screen does not replace
Listings; it tests how runtime URL tokens interact with an existing query
preset.

The current workflow is:
- choose the listing query,
- type runtime tokens,
- review examples when the token format is unclear,
- run preview,
- inspect totals, applied filters, rejected tokens, and rows.

This is best used when:
- a listing block or route will depend on runtime filtering,
- you want to validate token syntax before using it in production,
- you need evidence that filters match the intended fields and operators.

# Instruction

1. Open `Coderso > Filters`.
2. Start by reading the helper section at the top:
   this screen expects the core data logic to already exist in `Coderso →
   Listings`.
3. Choose a `Listing query` first when one is available.
4. Use the `Runtime query string` input to define tokens such as:
   - search,
   - sort,
   - page,
   - field/operator filters.
5. Click `Run preview`.
6. If token format is unclear, open `Show examples`.
7. In the examples/help area, review:
   - token prefix format,
   - search/paging tokens,
   - field filter token format,
   - supported operators,
   - ready-made example queries.
8. After preview runs, inspect the summary cards:
   - total,
   - applied filters,
   - rejected tokens,
   - runtime search state.
9. Review the rows snapshot to confirm the filter result is actually useful.
10. If preview fails, fix token syntax or listing-query selection before trying
    again.

Use this safe test order when you want fewer mistakes:
1. Select the right listing query.
2. Start with one simple token.
3. Run preview.
4. Add complexity only after the simple case works.
5. Review rejected tokens before trusting the result.

# Advanced

- Runtime tokens are part of the contract between listing blocks and query
  logic. Treat them as configuration, not just temporary debug strings.
- Rejected tokens are valuable signal. They often show either syntax mistakes or
  an invalid assumption about supported fields/operators.
- A correct-looking query string can still be wrong for business intent. Always
  inspect the returned rows, not just the fact that preview succeeded.
- `Show examples` is especially useful for onboarding and for preventing drift
  in token style across teams.
- This screen is best used after Listings logic is stable. If the base query is
  still moving, filters preview will produce noisy feedback.

# Troubleshooting

- Preview fails immediately:
  verify listing-query selection and token format first.
- The wrong rows are returned:
  inspect the rows snapshot and compare field/operator assumptions.
- Tokens appear to do nothing:
  check whether they were rejected or whether the listing query itself does not
  support the assumed field.
- Search and paging are mixed into one string and hard to debug:
  test one token at a time before combining them.

# Decision Guide

- Choose Listings vs Filters:
  use Listings to define the base query; use Filters to test runtime tokens
  against that query.
- Choose examples vs freehand token writing:
  use examples when syntax confidence is low; write freehand only when the token
  contract is already familiar.
- Choose simple preview vs combined query:
  start simple for diagnosis; combine tokens only after each piece is validated.

# Checklist

1. Confirm the right listing query is selected.
2. Confirm token syntax matches the expected prefix and operator pattern.
3. Run preview.
4. Review rejected tokens.
5. Review rows snapshot.
6. Only then trust the runtime filter setup.

# Security

- Filters is an authenticated admin preview surface and should only be used by
  users with the appropriate configuration permissions.
- Runtime token design can indirectly expose or hide draft/internal data if the
  underlying listing query is too permissive.
- Treat token patterns as operational configuration that should be reviewed
  before use in public-facing listing blocks.
