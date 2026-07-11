# Internal Docs Knowledge Base

This folder is a retired documentation-template archive. The current Assistant
knowledge corpus and ingest source of truth is `docs/guide/`; files in
`_docs/_internal` are not ingested.

## Goal

Write docs for end users in plain language:
- simple,
- explicit,
- step by step,
- with practical examples.

The user should understand what to do even without technical background.

## Required document structure

Each markdown file must contain these sections:
1. `What Is It`
2. `When To Use`
3. `Step By Step`
4. `Examples`
5. `Common Mistakes`

Optional:
- `Related`

## Required frontmatter

Use this frontmatter block at the top of every file:

```yaml
---
title: "Hero Page block basics"
audience: "editor"
productArea: "pages"
language: "pl"
keywords:
  - hero
  - block
  - layout
---
```

## Writing rules

1. Keep sentences short and direct.
2. Explain terms before using shortcuts.
3. Prefer numbered steps over long paragraphs.
4. Show at least one realistic example.
5. Add one "wrong vs correct" example in `Common Mistakes`.
6. Avoid internal implementation details unless needed by user flow.

## File naming

- Use lowercase kebab-case file names.
- One topic per file.
- Current docs belong under `docs/guide/`, for example
  `docs/guide/pages/hero-block-basics.md`; do not add a new file here.

## Validation intent

The active `docs/guide` ingest pipeline validates:
- frontmatter presence,
- required sections,
- parseability of markdown + frontmatter.
- document body size guard (`doc_body_too_large`),
- chunk generation guard (`assistant_doc_chunk_limit_invalid`, `assistant_doc_chunk_oversized`),
- max chunks-per-doc guard (`assistant_doc_chunks_excessive`),
- structured chunk build errors (`chunk_build_failed`).

Invalid docs are reported in ingest run logs.
