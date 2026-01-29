import type { AdminThemeTokens } from "./tokenTypes";

const tokenGroups = {
  base: ["bg", "surface", "text", "border"],
  buttons: ["primary", "secondary", "outline", "ghost"],
  buttonPrimary: ["bg", "text", "hoverBg", "hoverText"],
  buttonSecondary: ["bg", "text", "hoverBg", "hoverText"],
  buttonOutline: ["border", "text", "hoverBg", "hoverText"],
  buttonGhost: ["hoverBg", "hoverText"],
  inputs: ["bg", "border", "text", "placeholder", "focusRing"],
  sidebar: ["bg", "text", "activeBg", "activeText", "hoverBg"],
  topbar: ["bg", "text", "border"],
  card: ["bg", "border"],
  state: ["success", "warning", "danger"],
} as const;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function assertStringRecord(
  value: Record<string, unknown>,
  allowed: readonly string[]
) {
  for (const [key, entry] of Object.entries(value)) {
    if (!allowed.includes(key)) {
      throw new Error("admin_theme_tokens_invalid");
    }
    if (typeof entry !== "string") {
      throw new Error("admin_theme_tokens_invalid");
    }
  }
}

function assertAllowedKeys(
  value: Record<string, unknown>,
  allowed: readonly string[]
) {
  for (const key of Object.keys(value)) {
    if (!allowed.includes(key)) {
      throw new Error("admin_theme_tokens_invalid");
    }
  }
}

export function assertAdminThemeTokens(
  input: unknown
): asserts input is AdminThemeTokens {
  if (!isPlainObject(input)) {
    throw new Error("admin_theme_tokens_invalid");
  }

  const inputKeys = Object.keys(input);
  for (const key of inputKeys) {
    if (!(key in tokenGroups)) {
      throw new Error("admin_theme_tokens_invalid");
    }
  }

  const base = input.base;
  if (!isPlainObject(base)) throw new Error("admin_theme_tokens_invalid");
  assertStringRecord(base, tokenGroups.base);

  const buttons = input.buttons;
  if (!isPlainObject(buttons)) throw new Error("admin_theme_tokens_invalid");
  assertAllowedKeys(buttons, tokenGroups.buttons);

  const primary = (buttons as Record<string, unknown>).primary;
  const secondary = (buttons as Record<string, unknown>).secondary;
  const outline = (buttons as Record<string, unknown>).outline;
  const ghost = (buttons as Record<string, unknown>).ghost;

  if (!isPlainObject(primary)) throw new Error("admin_theme_tokens_invalid");
  if (!isPlainObject(secondary)) throw new Error("admin_theme_tokens_invalid");
  if (!isPlainObject(outline)) throw new Error("admin_theme_tokens_invalid");
  if (!isPlainObject(ghost)) throw new Error("admin_theme_tokens_invalid");

  assertStringRecord(primary, tokenGroups.buttonPrimary);
  assertStringRecord(secondary, tokenGroups.buttonSecondary);
  assertStringRecord(outline, tokenGroups.buttonOutline);
  assertStringRecord(ghost, tokenGroups.buttonGhost);

  const inputs = input.inputs;
  if (!isPlainObject(inputs)) throw new Error("admin_theme_tokens_invalid");
  assertStringRecord(inputs, tokenGroups.inputs);

  const sidebar = input.sidebar;
  if (!isPlainObject(sidebar)) throw new Error("admin_theme_tokens_invalid");
  assertStringRecord(sidebar, tokenGroups.sidebar);

  const topbar = input.topbar;
  if (!isPlainObject(topbar)) throw new Error("admin_theme_tokens_invalid");
  assertStringRecord(topbar, tokenGroups.topbar);

  const card = input.card;
  if (!isPlainObject(card)) throw new Error("admin_theme_tokens_invalid");
  assertStringRecord(card, tokenGroups.card);

  const state = input.state;
  if (!isPlainObject(state)) throw new Error("admin_theme_tokens_invalid");
  assertStringRecord(state, tokenGroups.state);
}
