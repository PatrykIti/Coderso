import type { AdminThemeTokens } from "./tokenTypes";
import { getDefaultAdminThemeTokens, mergeAdminThemeTokens } from "./tokenUtils";

const tokenGroups = {
  base: ["bg", "surface", "text", "border"],
  buttons: ["primary", "secondary", "outline", "ghost"],
  buttonPrimary: ["bg", "text", "hoverBg", "hoverText"],
  buttonSecondary: ["bg", "text", "hoverBg", "hoverText"],
  buttonOutline: ["border", "text", "hoverBg", "hoverText"],
  buttonGhost: ["hoverBg", "hoverText"],
  primarySoft: ["bg", "text"],
  inputs: ["bg", "border", "text", "placeholder", "focusRing"],
  sidebar: [
    "bg",
    "text",
    "activeBg",
    "activeText",
    "hoverBg",
    "muted",
    "accent",
    "accentForeground",
    "border",
  ],
  topbar: ["bg", "text", "border"],
  card: ["bg", "border"],
  typography: ["sans", "display", "sm", "md", "lg", "xl", "2xl", "mutedText"],
  state: [
    "success",
    "warning",
    "danger",
    "info",
    "infoForeground",
    "successForeground",
    "warningForeground",
    "dangerForeground",
    "successSoft",
    "warningSoft",
    "infoSoft",
  ],
  effects: ["shadowSoft", "shadowCard", "shadowPop"],
} as const;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function assertStringRecord(value: Record<string, unknown>, allowed: readonly string[]) {
  for (const [key, entry] of Object.entries(value)) {
    if (!allowed.includes(key)) {
      throw new Error("admin_theme_tokens_invalid");
    }
    if (typeof entry !== "string") {
      throw new Error("admin_theme_tokens_invalid");
    }
  }
}

function assertAllowedKeys(value: Record<string, unknown>, allowed: readonly string[]) {
  for (const key of Object.keys(value)) {
    if (!allowed.includes(key)) {
      throw new Error("admin_theme_tokens_invalid");
    }
  }
}

/**
 * Validate a leaf (string-record) token group. When `requireAll` is true the
 * group MUST be present (strict write path); otherwise a missing group is
 * tolerated (lenient read path) so legacy rows that predate the group normalize
 * instead of throwing. Present groups always reject unknown keys / non-string
 * leaves.
 */
function validateLeafGroup(value: unknown, allowed: readonly string[], requireAll: boolean) {
  if (value === undefined) {
    if (requireAll) throw new Error("admin_theme_tokens_invalid");
    return;
  }
  if (!isPlainObject(value)) throw new Error("admin_theme_tokens_invalid");
  assertStringRecord(value, allowed);
}

function validateAdminThemeTokenShape(input: unknown, requireAll: boolean) {
  if (!isPlainObject(input)) {
    throw new Error("admin_theme_tokens_invalid");
  }

  for (const key of Object.keys(input)) {
    if (!(key in tokenGroups)) {
      throw new Error("admin_theme_tokens_invalid");
    }
  }

  validateLeafGroup(input.base, tokenGroups.base, requireAll);

  const buttons = input.buttons;
  if (buttons === undefined) {
    if (requireAll) throw new Error("admin_theme_tokens_invalid");
  } else {
    if (!isPlainObject(buttons)) throw new Error("admin_theme_tokens_invalid");
    assertAllowedKeys(buttons, tokenGroups.buttons);
    validateLeafGroup(buttons.primary, tokenGroups.buttonPrimary, requireAll);
    validateLeafGroup(buttons.secondary, tokenGroups.buttonSecondary, requireAll);
    validateLeafGroup(buttons.outline, tokenGroups.buttonOutline, requireAll);
    validateLeafGroup(buttons.ghost, tokenGroups.buttonGhost, requireAll);
  }

  validateLeafGroup(input.primarySoft, tokenGroups.primarySoft, requireAll);
  validateLeafGroup(input.inputs, tokenGroups.inputs, requireAll);
  validateLeafGroup(input.sidebar, tokenGroups.sidebar, requireAll);
  validateLeafGroup(input.topbar, tokenGroups.topbar, requireAll);
  validateLeafGroup(input.card, tokenGroups.card, requireAll);
  validateLeafGroup(input.typography, tokenGroups.typography, requireAll);
  validateLeafGroup(input.state, tokenGroups.state, requireAll);
  validateLeafGroup(input.effects, tokenGroups.effects, requireAll);
}

/**
 * Strict, reject-unknown AND require-all validator. This is the schema owner for
 * `admin_theme_templates.tokens` on the WRITE path
 * (`createAdminThemeTemplate`/`updateAdminThemeTemplate`, theme import): the
 * editor always persists a complete token object including the NEW groups.
 */
export function assertAdminThemeTokens(input: unknown): asserts input is AdminThemeTokens {
  validateAdminThemeTokenShape(input, true);
}

/**
 * Lenient read-path guard: reject UNKNOWN keys and non-string leaves, but ALLOW
 * MISSING groups so a pre-existing row / stale `localStorage` cache written under
 * the smaller pre-TASK-479-05 shape passes (it is then back-filled by
 * {@link normalizeAdminThemeTokens}).
 */
export function assertKnownAdminThemeTokenShape(input: unknown): void {
  validateAdminThemeTokenShape(input, false);
}

/**
 * Normalize a known-but-possibly-legacy token payload to the CURRENT full shape.
 * Pure, non-destructive, additive: validates the input is a partial-but-known
 * shape (reject unknown keys/non-string leaves), then merges it over the
 * defaults so any missing NEW group (`primarySoft`/`effects`/new `sidebar`+
 * `state` keys) is filled from the violet/warm defaults. Used by read paths so
 * legacy rows surface complete instead of falling back to defaults wholesale.
 */
export function normalizeAdminThemeTokens(input: unknown): AdminThemeTokens {
  assertKnownAdminThemeTokenShape(input);
  return mergeAdminThemeTokens(getDefaultAdminThemeTokens(), input as Partial<AdminThemeTokens>);
}
