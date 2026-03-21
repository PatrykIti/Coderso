---
title: "Coderso Posts"
audience: "editor"
productArea: "coderso-posts"
language: "en"
keywords:
  - posts
  - editor
  - publishing
  - editorial
---

# Basic

Posts is the editorial workflow for article-style content. It combines drafting,
editing, preview, and publishing in one writing-focused surface.

# Medium

Use Posts for narrative content such as blog posts, announcements, and release
notes. Prefer it when content is authored text rather than structured records
that need schema-driven querying.

Use this surface when:
- content quality and editorial flow matter,
- revisions and preview checks are required before publish,
- lifecycle management (draft, review, publish, update) is needed.

# Instruction

1. Open the posts list and create or locate the article.
2. Edit content, structure, and metadata in the post editor.
3. Preview formatting and publishing state before release.
4. Publish and return to the list for lifecycle management and follow-up edits.

# Advanced

- Define editorial conventions (title structure, category strategy, excerpt
  format) to keep multi-author output consistent.
- Use revision checkpoints for high-risk updates (legal, pricing, release
  communications).
- Keep reusable data (for example catalog or directory records) out of Posts and
  model them in Engine/Entries instead.

# Troubleshooting

- If preview differs from published output, verify render-related formatting and
  media references.
- If publishing is blocked, validate required metadata and status flags.
- If post data is hard to reuse, reassess whether the content belongs in Entries
  instead of Posts.

# Decision Guide

- Choose Posts for authored narrative content.
- Choose Entries for structured data.
- Choose Pages when the output is a landing/page composition rather than an
  editorial article.

# Checklist

1. Article draft complete and structured.
2. Metadata and taxonomy checked.
3. Preview verified on target layout.
4. Publish status confirmed.
5. Follow-up owner/date recorded for future updates.

# Security

- Avoid exposing internal-only notes in publishable fields.
- Validate embed/link targets before publish.
- Keep operational secrets outside editorial content.
