<p align="center">
  <img src="./.github/banner.png" alt="Coderso - modular web platform" />
</p>

<p align="center">
  <strong>Build websites without limits.</strong>
</p>

<p align="center">
  A modular web platform for websites, content systems, business workflows, and custom digital products.
  <br />
  Simple on the surface. Powerful underneath.
</p>

<p align="center">
  <a href="#what-is-coderso">Overview</a>
  ·
  <a href="#features">Features</a>
  ·
  <a href="#architecture">Architecture</a>
  ·
  <a href="#getting-started">Getting Started</a>
  ·
  <a href="#development">Development</a>
</p>

---

## What is Coderso?

**Coderso** is a modern, modular CMS and web platform built for people who want the simplicity of WordPress with the flexibility of a developer-first architecture.

It is designed to start simple:

- create pages,
- write posts,
- manage media,
- build forms,
- publish content,
- configure navigation.

And grow into advanced systems:

- custom content models,
- reusable widgets,
- custom admin screens,
- runtime plugins,
- store-distributed extensions,
- AI-assisted setup flows,
- business-specific workflows.

> Coderso is pronounced **ko-der-so**.

---

## Product Philosophy

Coderso is built around one principle:

> **Simple on top, powerful underneath.**

Most users should not have to think about schemas, runtimes, plugins, or data models.

They should be able to build, edit, preview, and publish.

The advanced layer stays available when teams need deeper control:

- custom content structures,
- plugin-based extension points,
- developer workflows,
- runtime configuration,
- automation,
- security and performance gates.

Coderso is not only a CMS.

It is a foundation for modular websites, business workflows, and custom web applications.

---

## Features

### User-friendly publishing

Coderso aims to keep everyday workflows familiar and approachable:

- Pages
- Posts
- Media
- Forms
- Menus
- Settings

The default experience is designed for creators and site owners, not only developers.

---

### Visual builder

Build pages and interfaces with reusable blocks and widgets.

Coderso is designed around visual composition while still keeping structured data underneath.

---

### Content engine

Create custom content models for real business data.

Use content types, entries, screens, widgets, and listings to build more than simple pages.

---

### Runtime plugin system

Coderso is designed around a plugin architecture where extensions can be installed without rebuilding the core application.

The long-term goal is a WordPress-like extension experience with a more modern runtime and developer workflow.

---

### Store foundation

The repository includes a separate `store` workspace intended for plugin distribution, verification, and future marketplace workflows.

---

### AI-assisted admin flows

Coderso includes architecture for assistant-driven setup, docs navigation, planning flows, and guided execution.

The goal is to make advanced configuration easier without exposing unnecessary complexity.

---

### Security and quality gates

Coderso includes scripts for:

- linting,
- type checking,
- Bun tests,
- Vitest tests,
- coverage lanes,
- security scans,
- release gates.

---

## Architecture

Coderso is organized as a monorepo:

```text
.
├── core
├── store
└── packages
```

### Core

The main application runtime and admin experience.

Includes:

- Bun server runtime,
- React admin UI,
- Vite build pipeline,
- content and page runtime,
- plugin loading foundations,
- database services,
- admin modules,
- public rendering.

### Store

Foundation for the future plugin store and distribution layer.

### Packages

Shared packages such as SDKs and reusable contracts.

---

## Tech Stack

Coderso is built with:

- **Bun** – runtime and test execution
- **React** – admin UI
- **Vite** – build pipeline
- **TypeScript** – typed application code
- **Tailwind CSS** – styling system
- **Radix UI** – accessible UI primitives
- **Drizzle ORM** – database layer
- **PostgreSQL** – primary database target

---

## Getting Started

> Coderso is under active development. APIs, setup steps, and internal architecture may change.

Clone the repository:

```bash
git clone https://github.com/PatrykIti/Coderso.git
cd Coderso
```

Install dependencies:

```bash
bun install
```

Run the development environment:

```bash
bun run dev
```

Run only the core app:

```bash
bun run dev:core
```

Run only the store workspace:

```bash
bun run dev:store
```

---

## Development

### Lint

```bash
bun run lint
```

### Tests

```bash
bun run test
```

### Full test suite

```bash
bun run test:full
```

### Bun test lane

```bash
bun run test:bun
```

### Vitest lane

```bash
bun run test:vitest
```

### Coverage

```bash
bun run test:coverage:all
```

### Security scans

```bash
bun run scan:security
```

Strict mode:

```bash
bun run scan:security:strict
```

---

## Project Status

Coderso is currently in active development.

The project already contains the foundation for:

- modular core architecture,
- admin UI,
- content workflows,
- plugin/runtime direction,
- store workspace,
- testing lanes,
- security gates,
- assistant and guided setup architecture.

Some parts are still evolving and should be treated as pre-stable.

---

## Naming

Coderso combines two ideas:

- **Code + Resources**
- **Code + Orchestrator**

It represents a platform that connects pages, posts, media, forms, widgets, plugins, screens, runtime behavior, and business resources into one modular system.

---

## Vision

Coderso aims to become:

> **WordPress for everyone, with superpowers for developers.**

A platform where non-technical users can manage real websites comfortably, while developers can extend the system into custom products, business tools, and advanced web applications.

---

## Repository Resources

- [Contributing](CONTRIBUTING.md)
- [Code of Conduct](CODE_OF_CONDUCT.md)
- [Support](SUPPORT.md)
- [Security Policy](SECURITY.md)
- [License](LICENSE.md)

---

## License

Apache-2.0
