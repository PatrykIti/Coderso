import { readFile } from "node:fs/promises";
import path from "node:path";

import { expect, test } from "vitest";

import {
  DEFAULT_ADMIN_THEME_TOKENS,
  DEFAULT_ADMIN_THEME_TOKENS_DARK,
} from "../../../core/services/adminThemes/tokenTypes";
import { toAdminThemeCssVariables } from "../../../core/ui/theme/tokenCss";

// TASK-479-05-L07 dark-mode guard. Per the L01 decision the chrome reads
// `--admin-*` DIRECTLY and the injected style wins source order, so "dark works"
// is asserted on the REAL chrome `--admin-*` values (button + sidebar + topbar +
// base) — NOT merely the presence of a `.dark` class. The globals.css half is
// parsed as TEXT (happy-dom/jsdom cannot resolve a `var()` cascade), proving the
// derived shadcn vars read `--admin-*` so the injected dark flip propagates.

const readGlobalsCss = () =>
  readFile(path.resolve(process.cwd(), "core", "admin", "styles", "globals.css"), "utf8");

test("injected dark block recolors the real chrome (button + sidebar + topbar + base)", () => {
  const css = toAdminThemeCssVariables(DEFAULT_ADMIN_THEME_TOKENS_DARK, ":root.dark");

  // Emitted under the :root.dark selector so it adds a specificity point over
  // the light :root block from the SAME injected style.
  expect(css.startsWith(":root.dark{")).toBe(true);

  // The four chrome surfaces the closure gate names — these are read directly by
  // button/SidebarNav/TopBar/body, so flipping them is what makes dark real.
  expect(css).toContain("--admin-button-primary-bg:#8b5cf6");
  expect(css).toContain("--admin-sidebar-bg:#1c1b1f");
  expect(css).toContain("--admin-topbar-bg:#18171a");
  expect(css).toContain("--admin-base-bg:#18171a");

  // The light default emits a DIFFERENT primary, proving the dark block is a
  // genuine re-color rather than the same palette under a new selector.
  const lightCss = toAdminThemeCssVariables(DEFAULT_ADMIN_THEME_TOKENS);
  expect(lightCss.startsWith(":root{")).toBe(true);
  expect(lightCss).not.toContain(":root.dark");
  expect(lightCss).toContain("--admin-button-primary-bg:#7c3aed");
});

test("globals.css @theme exposes the new Soft & Friendly shadcn color tokens", async () => {
  const css = await readGlobalsCss();

  expect(css).toContain("--color-primary-soft: var(--primary-soft);");
  expect(css).toContain("--color-info: var(--info);");
  expect(css).toContain("--color-success-soft: var(--success-soft);");
  expect(css).toContain("--color-sidebar-accent: var(--sidebar-accent);");
});

test("globals.css :root derives the new shadcn vars FROM --admin-* (so the dark flip propagates)", async () => {
  const css = await readGlobalsCss();

  // Each derived shadcn var reads a `--admin-*` token — when the injected
  // :root.dark flips the `--admin-*`, these follow automatically.
  expect(css).toContain("--primary-soft: var(--admin-primary-soft);");
  expect(css).toContain("--info: var(--admin-state-info);");
  expect(css).toContain("--success-soft: var(--admin-state-success-soft);");
  expect(css).toContain("--sidebar-accent: var(--admin-sidebar-accent);");

  // L01 popover re-map: --popover tracks the CARD surface (white), not
  // base.surface, fixing the prototype --muted/--popover conflation.
  expect(css).toContain("--popover: var(--admin-card-bg);");

  // The destructive foreground is now derived (was hard-coded #ffffff), so dark
  // can recolor the solid destructive foreground.
  expect(css).toContain("--destructive-foreground: var(--admin-state-danger-foreground);");
});

test("globals.css wires the shadow-card utility through --admin-shadow-card", async () => {
  const css = await readGlobalsCss();

  // Tailwind v4 generates the `.shadow-card` utility FROM this @theme entry; the
  // `-token` indirection avoids a self-referential cycle while the :root
  // resolution points it at the --admin-* shadow value.
  expect(css).toContain("--shadow-card: var(--shadow-card-token);");
  expect(css).toContain("--shadow-card-token: var(--admin-shadow-card);");
});

test("globals.css pre-paint :root.dark fallback mirrors DEFAULT_ADMIN_THEME_TOKENS_DARK chrome", async () => {
  const css = await readGlobalsCss();

  // The static fallback exists ONLY to avoid a one-frame light flash before
  // AdminApp mounts; its --admin-* values must match the canonical dark
  // constant the injected style emits (single source of truth).
  expect(css).toContain(":root.dark {");
  expect(css).toContain(`--admin-base-bg: ${DEFAULT_ADMIN_THEME_TOKENS_DARK.base.bg};`);
  expect(css).toContain(
    `--admin-button-primary-bg: ${DEFAULT_ADMIN_THEME_TOKENS_DARK.buttons.primary.bg};`
  );
  expect(css).toContain(`--admin-sidebar-bg: ${DEFAULT_ADMIN_THEME_TOKENS_DARK.sidebar.bg};`);
  expect(css).toContain(`--admin-topbar-bg: ${DEFAULT_ADMIN_THEME_TOKENS_DARK.topbar.bg};`);
});
