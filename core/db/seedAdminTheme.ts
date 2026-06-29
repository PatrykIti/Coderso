import {
  DEFAULT_ADMIN_THEME_TOKENS,
  type AdminThemeTokens,
} from "../services/adminThemes/tokenTypes";
import { assertAdminThemeTokens } from "../services/adminThemes/tokenValidation";

/**
 * Default admin-theme seed (TASK-479-05-L04).
 *
 * Seeds a discoverable, editable "Soft Violet" admin theme template so the
 * violet/soft look is visible from Visual -> Admin UI Theme on a fresh install,
 * and activates it ONLY when the operator has no active profile yet. The token
 * VALUES are the single source of truth {@link DEFAULT_ADMIN_THEME_TOKENS} (L02),
 * the same set {@link import("../services/adminThemes/tokenUtils").mergeAdminThemeTokens}
 * falls back to when no profile exists — so the DB row and the code default agree.
 *
 * The orchestration is pure and DB-agnostic: it talks to an {@link AdminThemeSeedStore}
 * port so it is unit-testable without a live database (the real Drizzle-backed
 * store is wired in `core/db/seed.ts`). `admin_theme_templates.tokens` is a `jsonb`
 * column, so no schema migration is required to carry the L02 token fields.
 */

export const DEFAULT_ADMIN_TEMPLATE_NAME = "Soft Violet";
export const DEFAULT_ADMIN_TEMPLATE_DESCRIPTION = "Soft & Friendly violet admin look (default).";
export const DEFAULT_ADMIN_PROFILE_NAME = "Default";

/**
 * Minimal persistence port the default-admin-theme seed needs. Keeping the seed
 * logic behind this interface lets it run against an in-memory fake in unit tests
 * (no real DB) while `core/db/seed.ts` supplies a Drizzle-backed implementation.
 */
export interface AdminThemeSeedStore {
  findTemplateByName(name: string): Promise<{ id: string } | null>;
  insertTemplate(input: {
    name: string;
    description: string;
    tokens: AdminThemeTokens;
  }): Promise<{ id: string }>;
  findActiveProfile(): Promise<{ id: string } | null>;
  insertProfile(input: { name: string; templateId: string; isActive: boolean }): Promise<void>;
}

export interface SeedDefaultAdminThemeResult {
  /** A new "Soft Violet" template row was inserted this run. */
  templateCreated: boolean;
  /** The id of the (existing or newly inserted) "Soft Violet" template, if any. */
  templateId: string | null;
  /** A new active "Default" profile was inserted this run. */
  profileCreated: boolean;
}

function describeError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * Idempotently ensure the default "Soft Violet" admin theme exists and is active
 * on an un-themed install. Never clobbers operator state:
 * - inserts the template only when it is missing (upsert-by-unique-`name`);
 *   an operator-edited template of the same name is left untouched;
 * - activates a "Default" profile ONLY when no active profile exists, so an
 *   operator's chosen active profile is never deactivated;
 * - on any insert failure the seed logs and continues (never crashes the run).
 */
export async function runDefaultAdminThemeSeed(
  store: AdminThemeSeedStore,
  log: (message: string) => void = () => {}
): Promise<SeedDefaultAdminThemeResult> {
  const tokens = DEFAULT_ADMIN_THEME_TOKENS;
  // Guard the seed payload exactly like the write-path service does.
  assertAdminThemeTokens(tokens);

  const existing = await store.findTemplateByName(DEFAULT_ADMIN_TEMPLATE_NAME);
  let templateId = existing?.id ?? null;
  let templateCreated = false;

  if (existing) {
    log(
      `Admin theme template "${DEFAULT_ADMIN_TEMPLATE_NAME}" already exists; leaving its tokens untouched.`
    );
  } else {
    try {
      const inserted = await store.insertTemplate({
        name: DEFAULT_ADMIN_TEMPLATE_NAME,
        description: DEFAULT_ADMIN_TEMPLATE_DESCRIPTION,
        tokens,
      });
      templateId = inserted.id;
      templateCreated = true;
      log(`Created admin theme template "${DEFAULT_ADMIN_TEMPLATE_NAME}".`);
    } catch (error) {
      // Idempotent / non-fatal: a concurrent seed or unique-name race must not
      // crash the seeding run.
      log(
        `Admin theme template "${DEFAULT_ADMIN_TEMPLATE_NAME}" insert skipped: ${describeError(error)}`
      );
      return { templateCreated: false, templateId, profileCreated: false };
    }
  }

  let profileCreated = false;
  if (templateId) {
    const active = await store.findActiveProfile();
    if (active) {
      log("Active admin theme profile already present; not overriding operator choice.");
    } else {
      try {
        await store.insertProfile({
          name: DEFAULT_ADMIN_PROFILE_NAME,
          templateId,
          isActive: true,
        });
        profileCreated = true;
        log(`Activated admin theme profile "${DEFAULT_ADMIN_PROFILE_NAME}".`);
      } catch (error) {
        log(`Admin theme profile insert skipped: ${describeError(error)}`);
      }
    }
  }

  return { templateCreated, templateId, profileCreated };
}
