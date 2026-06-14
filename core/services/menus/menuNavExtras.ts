import {
  PAGE_DOCUMENT_SCHEMA_VERSION,
  createPageSectionV2,
  isPageDocumentError,
  normalizePageDocumentV2ForWrite,
  normalizeStoredPageDocumentV2ForRead,
  type PageBlockType,
  type PageBlockV2,
} from "../pages/pageDocumentV2";

/**
 * Menu nav-extras contract (TASK-458-03).
 *
 * The menu design editor allows a restricted set of extra blocks — a CTA
 * `button` and a logo `image` — rendered in a dedicated nav extras slot
 * inside the public shell header. The blocks are persisted in the
 * `menus.settings` envelope (key `extras`) next to the appearance and reuse
 * the Page v2 block schema verbatim: validation delegates to the page
 * document normalizers, then enforces the menu-specific type allowlist.
 *
 * Write path: `normalizeMenuNavExtras` is strict — non-arrays, oversized
 * lists, schema-invalid blocks, and disallowed block types throw a
 * machine-readable `menu_nav_extras_invalid` error (with the offending
 * `field`) and nothing is persisted.
 *
 * Read/render path: `sanitizeStoredMenuNavExtras` /
 * `resolveStoredMenuNavExtras` are fail closed — unreadable stored values
 * resolve to an empty slot (the shell renders no extras) and never throw.
 *
 * This module is Bun-free and import-side-effect free (Vitest lane).
 */

export const MENU_NAV_EXTRAS_INVALID = "menu_nav_extras_invalid" as const;

export class MenuNavExtrasError extends Error {
  readonly code = MENU_NAV_EXTRAS_INVALID;
  readonly field: string;

  constructor(field: string) {
    super(MENU_NAV_EXTRAS_INVALID);
    this.name = "MenuNavExtrasError";
    this.field = field;
  }
}

export const isMenuNavExtrasError = (error: unknown): error is MenuNavExtrasError =>
  error instanceof MenuNavExtrasError;

/** Menu-appropriate extras only: a CTA button and a logo image. */
export const menuNavExtrasAllowedBlockTypes = ["button", "image"] as const;

export type MenuNavExtrasBlockType = (typeof menuNavExtrasAllowedBlockTypes)[number];

export const isMenuNavExtrasBlockType = (value: PageBlockType): value is MenuNavExtrasBlockType =>
  (menuNavExtrasAllowedBlockTypes as readonly PageBlockType[]).includes(value);

/** Clamped slot capacity: the header extras area is not a page canvas. */
export const MENU_NAV_EXTRAS_MAX_BLOCKS = 6 as const;

/**
 * Runs the extras through the real Page v2 document pipeline by wrapping
 * them in a single throwaway section, so block validation (ids, props,
 * style, visibility, slots) stays owned by the page document schema.
 */
const normalizeExtrasThroughPageDocument = (
  blocks: unknown[],
  mode: "write" | "stored-read"
): PageBlockV2[] => {
  const wrapper = {
    schemaVersion: PAGE_DOCUMENT_SCHEMA_VERSION,
    breakpoints: ["desktop", "tablet", "mobile"],
    seo: {},
    settings: {},
    sections: [
      {
        ...createPageSectionV2("custom", { id: "sec_menu_nav_extras", name: "Navigation extras" }),
        blocks,
      },
    ],
  };
  const document =
    mode === "write"
      ? normalizePageDocumentV2ForWrite(wrapper)
      : normalizeStoredPageDocumentV2ForRead(wrapper);
  return document.sections[0]?.blocks ?? [];
};

/**
 * Strict write-path validation. Non-arrays, lists beyond the slot capacity,
 * blocks rejected by the page block schema, and block types outside the
 * menu allowlist throw `MenuNavExtrasError` (`menu_nav_extras_invalid` +
 * offending `field`).
 */
export function normalizeMenuNavExtras(value: unknown): PageBlockV2[] {
  if (!Array.isArray(value)) {
    throw new MenuNavExtrasError("extras");
  }
  if (value.length > MENU_NAV_EXTRAS_MAX_BLOCKS) {
    throw new MenuNavExtrasError("extras");
  }

  let blocks: PageBlockV2[];
  try {
    blocks = normalizeExtrasThroughPageDocument(value, "write");
  } catch (error) {
    if (isPageDocumentError(error)) {
      throw new MenuNavExtrasError("extras");
    }
    throw error;
  }

  blocks.forEach((block, index) => {
    if (!isMenuNavExtrasBlockType(block.type)) {
      throw new MenuNavExtrasError(`extras[${index}].type`);
    }
  });
  return blocks;
}

/**
 * Fail-closed render-path sanitizer: an unreadable stored list resolves to
 * an empty slot, disallowed block types are dropped, and the slot capacity
 * is clamped. Never throws.
 */
export function sanitizeStoredMenuNavExtras(value: unknown): PageBlockV2[] {
  if (!Array.isArray(value)) return [];
  try {
    return normalizeExtrasThroughPageDocument(value, "stored-read")
      .filter((block) => isMenuNavExtrasBlockType(block.type))
      .slice(0, MENU_NAV_EXTRAS_MAX_BLOCKS);
  } catch {
    return [];
  }
}

/**
 * Reads the extras out of a stored `menus.settings` value. Fail closed:
 * `null`, non-object envelopes, and non-array `extras` values resolve to an
 * empty slot.
 */
export function resolveStoredMenuNavExtras(settings: unknown): PageBlockV2[] {
  if (typeof settings !== "object" || settings === null || Array.isArray(settings)) return [];
  return sanitizeStoredMenuNavExtras((settings as Record<string, unknown>).extras);
}

/**
 * Public render resolver for the published menu-design snapshot. New
 * settings envelopes store draft extras at the top level and the public
 * snapshot under `published`; legacy envelopes without `published` fall
 * back to the historical top-level shape for backward compatibility.
 */
export function resolvePublishedMenuNavExtras(settings: unknown): PageBlockV2[] {
  if (typeof settings !== "object" || settings === null || Array.isArray(settings)) return [];
  const record = settings as Record<string, unknown>;
  const published = record.published;
  if (typeof published === "object" && published !== null && !Array.isArray(published)) {
    return sanitizeStoredMenuNavExtras((published as Record<string, unknown>).extras);
  }
  return resolveStoredMenuNavExtras(settings);
}
