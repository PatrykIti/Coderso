import { expect, test } from "bun:test";

import { DEFAULT_ADMIN_THEME_TOKENS } from "../../../core/services/adminThemes/tokenTypes";
import { assertAdminThemeTokens } from "../../../core/services/adminThemes/tokenValidation";
import {
  DEFAULT_ADMIN_PROFILE_NAME,
  DEFAULT_ADMIN_TEMPLATE_NAME,
  type AdminThemeSeedStore,
  runDefaultAdminThemeSeed,
} from "../../../core/db/seedAdminTheme";
import type { AdminThemeTokens } from "../../../core/services/adminThemes/tokenTypes";

type TemplateRow = {
  id: string;
  name: string;
  description: string;
  tokens: AdminThemeTokens;
};
type ProfileRow = {
  id: string;
  name: string;
  templateId: string;
  isActive: boolean;
};

/**
 * In-memory {@link AdminThemeSeedStore} that emulates the unique-`name` template
 * index. No real DB — the seed orchestration is pure and DB-agnostic by design.
 */
function createFakeStore(seed: { templates?: TemplateRow[]; profiles?: ProfileRow[] } = {}) {
  const templates: TemplateRow[] = [...(seed.templates ?? [])];
  const profiles: ProfileRow[] = [...(seed.profiles ?? [])];
  let seq = 0;

  const store: AdminThemeSeedStore = {
    async findTemplateByName(name) {
      const row = templates.find((t) => t.name === name);
      return row ? { id: row.id } : null;
    },
    async insertTemplate(input) {
      if (templates.some((t) => t.name === input.name)) {
        throw new Error("admin_theme_templates_name_idx unique violation");
      }
      const id = `tmpl-${++seq}`;
      templates.push({ id, ...input });
      return { id };
    },
    async findActiveProfile() {
      const row = profiles.find((p) => p.isActive);
      return row ? { id: row.id } : null;
    },
    async insertProfile(input) {
      profiles.push({ id: `prof-${++seq}`, ...input });
    },
  };

  return { store, templates, profiles };
}

test("seeds a 'Soft Violet' template + active 'Default' profile on a fresh DB", async () => {
  const { store, templates, profiles } = createFakeStore();

  const result = await runDefaultAdminThemeSeed(store);

  expect(result.templateCreated).toBe(true);
  expect(result.profileCreated).toBe(true);
  expect(templates).toHaveLength(1);
  expect(templates[0].name).toBe(DEFAULT_ADMIN_TEMPLATE_NAME);
  // The seeded row carries the canonical L02 violet defaults verbatim.
  expect(templates[0].tokens).toEqual(DEFAULT_ADMIN_THEME_TOKENS);
  expect(() => assertAdminThemeTokens(templates[0].tokens)).not.toThrow();

  expect(profiles).toHaveLength(1);
  expect(profiles[0].name).toBe(DEFAULT_ADMIN_PROFILE_NAME);
  expect(profiles[0].isActive).toBe(true);
  expect(profiles[0].templateId).toBe(templates[0].id);
});

test("is idempotent — running twice yields exactly one template and one active profile", async () => {
  const { store, templates, profiles } = createFakeStore();

  await runDefaultAdminThemeSeed(store);
  const second = await runDefaultAdminThemeSeed(store);

  expect(second.templateCreated).toBe(false);
  expect(second.profileCreated).toBe(false);
  expect(templates).toHaveLength(1);
  expect(profiles).toHaveLength(1);
  expect(profiles.filter((p) => p.isActive)).toHaveLength(1);
});

test("does NOT deactivate or replace an operator's already-active profile", async () => {
  const operatorTemplate: TemplateRow = {
    id: "operator-tmpl",
    name: "Operator Custom",
    description: "hand-rolled",
    tokens: DEFAULT_ADMIN_THEME_TOKENS,
  };
  const operatorProfile: ProfileRow = {
    id: "operator-prof",
    name: "Operator Active",
    templateId: operatorTemplate.id,
    isActive: true,
  };
  const { store, templates, profiles } = createFakeStore({
    templates: [operatorTemplate],
    profiles: [operatorProfile],
  });

  const result = await runDefaultAdminThemeSeed(store);

  // The Soft Violet template is still seeded (discoverable/editable)...
  expect(result.templateCreated).toBe(true);
  expect(templates.some((t) => t.name === DEFAULT_ADMIN_TEMPLATE_NAME)).toBe(true);
  // ...but no new profile is created and the operator's active profile is intact.
  expect(result.profileCreated).toBe(false);
  expect(profiles).toHaveLength(1);
  expect(profiles[0]).toEqual(operatorProfile);
});

test("never overwrites an operator-edited 'Soft Violet' template", async () => {
  const editedTokens: AdminThemeTokens = {
    ...DEFAULT_ADMIN_THEME_TOKENS,
    buttons: {
      ...DEFAULT_ADMIN_THEME_TOKENS.buttons,
      primary: {
        ...DEFAULT_ADMIN_THEME_TOKENS.buttons.primary,
        bg: "#ff0000",
      },
    },
  };
  const edited: TemplateRow = {
    id: "edited-tmpl",
    name: DEFAULT_ADMIN_TEMPLATE_NAME,
    description: "operator edited",
    tokens: editedTokens,
  };
  const { store, templates, profiles } = createFakeStore({ templates: [edited] });

  const result = await runDefaultAdminThemeSeed(store);

  expect(result.templateCreated).toBe(false);
  expect(templates).toHaveLength(1);
  // Operator's edited tokens are preserved verbatim.
  expect(templates[0].tokens.buttons.primary.bg).toBe("#ff0000");
  // With no active profile, a Default profile is activated against the existing row.
  expect(result.profileCreated).toBe(true);
  expect(profiles).toHaveLength(1);
  expect(profiles[0].templateId).toBe(edited.id);
});

test("a template insert failure is non-fatal (logs and continues)", async () => {
  const throwingStore: AdminThemeSeedStore = {
    async findTemplateByName() {
      return null;
    },
    async insertTemplate() {
      throw new Error("connection reset");
    },
    async findActiveProfile() {
      return null;
    },
    async insertProfile() {
      throw new Error("should not be reached");
    },
  };

  const result = await runDefaultAdminThemeSeed(throwingStore);

  expect(result.templateCreated).toBe(false);
  expect(result.templateId).toBeNull();
  expect(result.profileCreated).toBe(false);
});
