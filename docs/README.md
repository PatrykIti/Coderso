# Coderso Documentation

Welcome to the Coderso documentation. It is split by audience so you can go straight to what you need.

| If you want to… | Go to |
|---|---|
| **Use the product** — build pages, manage content, run business modules | [`guide/`](./guide/) |
| **Develop or extend Coderso** — set up locally, add features, write plugins | [`develop/`](./develop/) |
| Get the big picture / marketing overview | [Project README](../README.md) |

---

## 📘 For users & operators — [`guide/`](./guide/)

End-user product documentation written in plain language. This is also the knowledge corpus that
powers the built-in **AI assistant** (it is ingested from `docs/guide/` — see
[the corpus README](./guide/README.md)).

- [Getting started](./guide/getting-started/) — orientation and your first publish
- [Admin screens](./guide/screens/) — every core screen and setting
- [Coderso modules](./guide/coderso/) — Engine, Forms, Listings, Booking, Commerce, Posts, and more
- [Solution Kits](./guide/solution-kits/) — ready-made setups for whole verticals
- [Playbooks](./guide/playbooks/) — goal-oriented, end-to-end guides

---

## 🛠️ For developers & contributors — [`develop/`](./develop/)

Everything you need to run, understand, extend, and ship Coderso. Friendly and practical — for the
exhaustive internal specifications, these pages link into `_docs/` where it helps.

Start with the [**developer handbook index**](./develop/README.md), or jump in:

- [Local Development Setup](./develop/getting-started.md)
- [Project Structure](./develop/project-structure.md)
- [Architecture Overview](./develop/architecture.md)
- [The No-Restart Runtime](./develop/runtime-model.md)
- [Content Models & Widgets](./develop/content-and-widgets.md)
- [Plugins, SDK & Store](./develop/plugins-and-store.md)
- [The AI Assistant](./develop/assistant.md)
- [Testing](./develop/testing.md)
- [Security for Developers](./develop/security.md)
- [Contributing Workflow](./develop/contributing.md)
- [Adding a Change: End to End](./develop/adding-a-change.md)

---

## 🤖 Internal reference — `_docs/`

`_docs/` holds the exhaustive, internal documentation used primarily by AI coding agents: detailed
specs, the task board, ADRs, and the changelog. It is intentionally dense and is **not** required
reading for using or contributing to Coderso — the human-facing docs above cover that. It remains in
the repository for full transparency and deep reference.
