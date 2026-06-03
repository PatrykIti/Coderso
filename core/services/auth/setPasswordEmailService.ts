import { assertSystemEmailConfigured, sendSystemEmail } from "../email/emailSettingsService";
import { getSetting } from "../settings/settingsService";
import { resolveAdminPath } from "../../server/utils/adminPath";

export type SetPasswordEmailUser = {
  email: string;
  name?: string | null;
};

const SET_PASSWORD_ROUTE = "/reset/confirm";

const trimTrailingSlash = (value: string) =>
  value.length > 1 && value.endsWith("/") ? value.slice(0, -1) : value;

const normalizePath = (value: string) => {
  const prefixed = value.startsWith("/") ? value : `/${value}`;
  return trimTrailingSlash(prefixed);
};

const escapeHtml = (value: string) =>
  value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

async function resolveAdminBaseUrl() {
  const [adminBaseUrl, publicBaseUrl] = await Promise.all([
    getSetting("site.adminBaseUrl"),
    getSetting("site.publicBaseUrl"),
  ]);
  if (typeof adminBaseUrl === "string" && adminBaseUrl.trim()) {
    return { baseUrl: adminBaseUrl.trim(), includesAdminPath: true };
  }
  if (typeof publicBaseUrl === "string" && publicBaseUrl.trim()) {
    return { baseUrl: publicBaseUrl.trim(), includesAdminPath: false };
  }
  return null;
}

export async function buildSetPasswordUrl(token: string) {
  const [baseUrlConfig, adminPath] = await Promise.all([resolveAdminBaseUrl(), resolveAdminPath()]);
  const tokenQuery = `token=${encodeURIComponent(token)}`;
  const relativePath = `${normalizePath(adminPath)}${SET_PASSWORD_ROUTE}`;

  if (!baseUrlConfig) {
    return `${relativePath}?${tokenQuery}`;
  }

  const url = new URL(baseUrlConfig.baseUrl);
  const basePath = normalizePath(url.pathname || "/");
  const adminRoot = basePath === "/" ? normalizePath(adminPath) : basePath;
  url.pathname = baseUrlConfig.includesAdminPath
    ? `${adminRoot}${SET_PASSWORD_ROUTE}`
    : relativePath;
  url.search = tokenQuery;
  url.hash = "";
  return url.toString();
}

export async function assertSetPasswordEmailConfigured() {
  await assertSystemEmailConfigured();
}

export async function sendSetPasswordEmail(input: {
  user: SetPasswordEmailUser;
  token: string;
  expiresAt: Date;
  reason: "invite" | "reset";
}) {
  const link = await buildSetPasswordUrl(input.token);
  const safeName = input.user.name?.trim() || input.user.email;
  const subject =
    input.reason === "invite" ? "Set your Coderso password" : "Reset your Coderso password";
  const intro =
    input.reason === "invite"
      ? "An administrator invited you to Coderso."
      : "A password reset was requested for your Coderso account.";
  const expiration = input.expiresAt.toISOString();

  await sendSystemEmail({
    to: input.user.email,
    subject,
    text: [
      `Hello ${safeName},`,
      "",
      intro,
      `Set your password using this link: ${link}`,
      `This link expires at ${expiration} and can be used once.`,
      "",
      "If you did not expect this email, ignore it.",
    ].join("\n"),
    html: [
      `<p>Hello ${escapeHtml(safeName)},</p>`,
      `<p>${escapeHtml(intro)}</p>`,
      `<p><a href="${escapeHtml(link)}">Set your password</a></p>`,
      `<p>This link expires at ${escapeHtml(expiration)} and can be used once.</p>`,
      "<p>If you did not expect this email, ignore it.</p>",
    ].join(""),
  });
}
