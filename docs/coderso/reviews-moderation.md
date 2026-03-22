---
title: "Reviews Moderation"
audience: "admin"
productArea: "coderso-engagement"
language: "en"
keywords:
  - reviews
  - moderation
  - social proof
  - approvals
  - spam
---

# Basic

Reviews Moderation is the admin surface for reviewing, filtering, and changing
the lifecycle state of customer reviews. It combines status-based moderation
tabs, free-text search, a reviews table, and a detail panel for one selected
review.

In the current UI, the screen includes:
- search field,
- moderation status tabs:
  `All`, `Pending`, `Approved`, `Rejected`, `Spam`
- review table,
- review details card,
- moderation actions such as approve, reject, pending, spam, and delete.

# Medium

Use Reviews when user feedback or moderation-managed trust signals are part of
the product. This screen is about keeping published feedback trustworthy and
operationally manageable, not just displaying testimonials.

The current moderation flow is straightforward:
- search or filter the queue,
- inspect one review in detail,
- apply a moderation decision,
- keep the published pool trustworthy.

The local dataset currently shows an empty-state path, but the screen contract
clearly supports full review lifecycle management once reviews exist.

# Instruction

1. Open `Coderso > Reviews`.
2. Start by choosing the right moderation tab:
   - `All`
   - `Pending`
   - `Approved`
   - `Rejected`
   - `Spam`
3. Use the search field when you need to narrow results by:
   - author,
   - entity,
   - title,
   - review body text.
4. Review the table columns:
   - review,
   - entity,
   - status,
   - created,
   - actions.
5. Select a review from the table to inspect it in the right-side details panel.
6. In the details panel, review:
   - author name,
   - rating,
   - moderation status,
   - entity type and entity id,
   - title,
   - review content.
7. Apply the appropriate moderation action:
   - `Approve`
   - `Pending`
   - `Reject`
   - `Spam`
8. Use delete only when the review should be removed rather than simply
   reclassified.
9. If the list is empty, treat the screen as ready but currently without review
   records to process.

Use this safe moderation order when you want fewer mistakes:
1. Filter to the right status bucket.
2. Open the review details.
3. Read the text fully.
4. Apply the right status.
5. Delete only when status change is not enough.

# Advanced

- Reviews should be treated as a trust surface, not as decoration. The
  moderation state determines what kind of social proof is actually safe to
  publish.
- The `Spam` and `Rejected` buckets serve different purposes. Spam is abuse or
  junk; rejected can still be legitimate feedback that should not be published.
- Entity references matter. A review linked to the wrong entity can create trust
  problems even if the text itself is acceptable.
- Search is operationally important because moderation teams often need to find
  feedback by customer name, entity, or key phrase rather than by status alone.

# Troubleshooting

- No reviews appear:
  confirm the correct moderation tab and search state first, then treat the
  empty state literally if the queue is truly empty.
- The right review is hard to find:
  use the search field with author, entity, or text fragments.
- You are unsure whether to reject or mark as spam:
  reject legitimate-but-unacceptable feedback; use spam for abuse or obvious
  junk.
- The details panel is empty:
  select a review row first.
- You are tempted to delete when a status change would work:
  prefer moderation state changes over deletion unless removal is truly needed.

# Decision Guide

- Choose approve vs pending:
  approve when the review is ready for trusted publication; keep it pending when
  it still needs moderation review.
- Choose reject vs spam:
  reject for legitimate feedback that should not be published; spam for abusive
  or clearly invalid content.
- Choose status change vs delete:
  use status change for moderation workflow; use delete only when the record
  should be removed entirely.

# Checklist

1. Confirm the correct moderation tab is selected.
2. Confirm search is not hiding the target review.
3. Read the full review in the details panel.
4. Verify the linked entity.
5. Apply the correct moderation state.
6. Delete only when removal is truly necessary.

# Security

- Reviews Moderation is an authenticated admin surface and should only be used
  by users with the appropriate moderation permissions.
- Moderation actions affect public trust signals, so status changes should be
  treated as operationally meaningful decisions.
- Review text can contain abuse, spam, or sensitive user-provided content, so it
  should be handled as moderated internal data before publication.
