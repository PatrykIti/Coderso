import {
  PAGE_DOCUMENT_SCHEMA_VERSION,
  createPageSectionV2,
  normalizeStoredPageDocumentV2ForRead,
  type PageBlockType,
  type PageBlockV2,
  type PageDocumentV2,
  type PageSectionType,
} from "../pages/pageDocumentV2";
import {
  isMenuNavExtrasBlockType,
  menuNavExtrasAllowedBlockTypes,
  resolveStoredMenuNavExtras,
} from "./menuNavExtras";
import { resolveStoredMenuAppearance, type MenuAppearance } from "./normalizeMenuAppearance";

/**
 * Menu design document adapter (TASK-458-03).
 *
 * The menu design editor hosts the shared Page Editor v2 surface, so the
 * menu's designable state (appearance + nav extras) travels as a regular
 * `PageDocumentV2`: the appearance rides `settings.menuAppearance` and the
 * extras blocks live in a single fixed "Navigation extras" section. This
 * module owns the bidirectional mapping between that editor document and
 * the persisted `menus.settings` envelope.
 *
 * Both directions are fail closed: building from unreadable stored settings
 * degrades to an empty design document, and resolving a draft keeps only
 * allowlisted extras block types.
 *
 * This module is Bun-free and import-side-effect free (Vitest lane).
 */

export const MENU_DESIGN_DOCUMENT_TEMPLATE = "menu-design" as const;
export const MENU_DESIGN_EXTRAS_SECTION_ID = "sec_menu_nav_extras" as const;
export const MENU_DESIGN_EXTRAS_SECTION_NAME = "Navigation extras" as const;

/**
 * Host palette for the menu design editor: no insertable sections, blocks
 * restricted to the nav extras allowlist. The palette can only narrow the
 * globally insertable set — gated sections (e.g. `navigation`) stay gated.
 */
export const menuDesignEditorPalette: {
  sections: PageSectionType[];
  blocks: PageBlockType[];
} = {
  sections: [],
  blocks: [...menuNavExtrasAllowedBlockTypes],
};

/**
 * Builds the editor document for a menu's stored `settings` envelope.
 * Normalized through the stored-read pipeline so the editor always receives
 * a valid document, regardless of what the envelope contains.
 */
export function buildMenuDesignDocument(settings: unknown): PageDocumentV2 {
  const appearance = resolveStoredMenuAppearance(settings);
  const extras = resolveStoredMenuNavExtras(settings);
  return normalizeStoredPageDocumentV2ForRead({
    schemaVersion: PAGE_DOCUMENT_SCHEMA_VERSION,
    breakpoints: ["desktop", "tablet", "mobile"],
    seo: {},
    settings: {
      template: MENU_DESIGN_DOCUMENT_TEMPLATE,
      showInNav: false,
      ...(appearance && Object.keys(appearance).length > 0 ? { menuAppearance: appearance } : {}),
    },
    sections: [
      createPageSectionV2("custom", {
        id: MENU_DESIGN_EXTRAS_SECTION_ID,
        name: MENU_DESIGN_EXTRAS_SECTION_NAME,
        blocks: extras,
      }),
    ],
  });
}

export type MenuDesignDraft = {
  appearance: MenuAppearance | null;
  extras: PageBlockV2[];
};

/**
 * Collects the nav extras blocks from a design document draft: every
 * allowlisted top-level block across all sections, in document order
 * (section duplication in the editor flattens deterministically).
 */
export function collectMenuDesignExtras(document: PageDocumentV2): PageBlockV2[] {
  return document.sections
    .flatMap((section) => section.blocks)
    .filter((block) => isMenuNavExtrasBlockType(block.type));
}

/**
 * Maps an editor document draft back onto the persistable menu design
 * state. An absent or empty `settings.menuAppearance` resolves to `null`
 * (clears back to the legacy look).
 */
export function resolveMenuDesignDraft(document: PageDocumentV2): MenuDesignDraft {
  const appearance = document.settings.menuAppearance;
  return {
    appearance: appearance && Object.keys(appearance).length > 0 ? appearance : null,
    extras: collectMenuDesignExtras(document),
  };
}
