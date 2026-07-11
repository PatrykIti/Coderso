# Coderso Developer Handbook

Everything you need to **run, understand, extend, and ship** Coderso. These pages are written for
humans — concrete and practical. When you need the exhaustive contracts, they point you into `_docs/`.

> New here? Read [Local Development Setup](./getting-started.md) → [Project Structure](./project-structure.md)
> → [Architecture Overview](./architecture.md), then dive into whatever you're building.

---

## 🚀 Start here

| Page | What it covers |
|---|---|
| [Local Development Setup](./getting-started.md) | Prerequisites, install, env, migrations, running the dev server, the Setup Wizard |
| [Project Structure](./project-structure.md) | Repo map and the documentation taxonomy — where to find everything |
| [Architecture Overview](./architecture.md) | The runtime kernel, admin/public split, services/routes, and data layer |
| [The No-Restart Runtime](./runtime-model.md) | What applies live vs what needs a rebuild — Coderso's signature model |

## 🧱 Build & extend

| Page | What it covers |
|---|---|
| [Content Models, Sections & Blocks](./content-and-widgets.md) | The content engine, editor-owned section/block models, and separate Dashboard widgets |
| [Plugins, SDK & Store](./plugins-and-store.md) | The runtime plugin system, the SDK, and the store |
| [The AI Assistant](./assistant.md) | Docs-only vs LLM Guide modes, and how to extend the corpus |

## ✅ Quality & process

| Page | What it covers |
|---|---|
| [Testing](./testing.md) | The Bun and Vitest lanes, and how to choose and run them |
| [Security for Developers](./security.md) | Public-write hardening, secrets, RBAC/CSRF, and the scanners |
| [Contributing Workflow](./contributing.md) | Branches, conventional commits, pre-commit, gates, and releases |
| [Adding a Change: End to End](./adding-a-change.md) | The golden path from idea to merged PR |

---

## Related

- [Documentation hub](../README.md) — both the user guide and this handbook
- [User guide](../guide/) — end-user product docs (and the assistant corpus)
- [Project README](../../README.md) — product overview
- [`CONTRIBUTING.md`](../../CONTRIBUTING.md) · [`SECURITY.md`](../../SECURITY.md) · [`CODE_OF_CONDUCT.md`](../../CODE_OF_CONDUCT.md)
