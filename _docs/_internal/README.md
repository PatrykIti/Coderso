# Internal Docs Knowledge Base

This folder is the source of truth for Assistant documentation ingest.
Only documents from `_docs/_internal` are loaded into Assistant DB knowledge base.

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
title: "Hero widget basics"
audience: "editor"
productArea: "widgets"
language: "pl"
keywords:
  - hero
  - widget
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
- Example: `widgets/hero-basics.md`

## Validation intent

Ingest pipeline validates:
- frontmatter presence,
- required sections,
- parseability of markdown + frontmatter.

Invalid docs are reported in ingest run logs.
