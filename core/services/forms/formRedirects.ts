const FORM_REDIRECT_BASE = "https://coderso.local";

export const normalizeFormSuccessRedirectUrl = (value: unknown) => {
  if (value === null || value === undefined) return null;
  if (typeof value !== "string") throw new Error("form_invalid");

  const trimmed = value.trim();
  if (trimmed.length === 0) return null;
  if (!trimmed.startsWith("/") || trimmed.startsWith("//")) {
    throw new Error("form_success_redirect_url_invalid");
  }

  try {
    const url = new URL(trimmed, FORM_REDIRECT_BASE);
    if (url.origin !== FORM_REDIRECT_BASE) {
      throw new Error("form_success_redirect_url_invalid");
    }
    return `${url.pathname}${url.search}${url.hash}`;
  } catch (error) {
    if (error instanceof Error && error.message === "form_success_redirect_url_invalid") {
      throw error;
    }
    throw new Error("form_success_redirect_url_invalid");
  }
};
