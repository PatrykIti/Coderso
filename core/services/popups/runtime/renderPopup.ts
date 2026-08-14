import type { PublicPopup } from "../popupPublicContract";

/**
 * Popup DOM builder (TASK-486-03-L01).
 *
 * Pure builder: every browser global is injected through `env`, so the module
 * stays DOM-agnostic and its helpers remain serializable into the runtime IIFE
 * (TASK-486-03-L02). All authored content is set via `textContent` / created
 * text nodes — never `innerHTML` — making this the client-side XSS gate. The
 * CTA href is sanitized by the local `isSafeHref` (IIFE-serializable `SAFE`
 * regex), which reimplements the shared `startsWith("/")` / `http(s)://` rule
 * without importing helpers that close over module state.
 */

export type RenderEnv = { document: Document; mountTo?: HTMLElement };

export type PopupRenderHandle = {
  close: () => void;
  element: HTMLElement;
};

/**
 * Allowed href schemes: root-relative `/` (but not protocol-relative `//`) and
 * `http://` / `https://`, case-insensitive. Everything else (`javascript:`,
 * `data:`, `mailto:`, ...) fails.
 */
export const SAFE = /^(\/(?!\/)|https?:\/\/)/i;

export const isSafeHref = (href: string | null): href is string =>
  typeof href === "string" && SAFE.test(href.trim());

export function renderPopup(popup: PublicPopup, env: RenderEnv): PopupRenderHandle {
  const d = env.document;
  const root = d.createElement("div");
  root.setAttribute("data-coderso-popup", popup.id);
  root.className =
    "coderso-popup coderso-popup--" +
    popup.settings.placement +
    (popup.settings.showOverlay ? " coderso-popup--overlay" : "");
  root.setAttribute("role", "dialog");
  root.setAttribute("aria-modal", popup.settings.showOverlay ? "true" : "false");

  const panel = d.createElement("div");
  panel.className = "coderso-popup__panel";

  if (popup.content.title) {
    const h = d.createElement("h2");
    h.textContent = popup.content.title; // textContent => no XSS
    panel.appendChild(h);
  }
  if (popup.content.body) {
    const p = d.createElement("p");
    p.textContent = popup.content.body;
    panel.appendChild(p);
  }
  if (popup.content.ctaLabel) {
    const cta = d.createElement("a");
    cta.textContent = popup.content.ctaLabel;
    if (isSafeHref(popup.content.ctaHref)) {
      cta.setAttribute("href", popup.content.ctaHref);
      cta.setAttribute("rel", "noopener noreferrer");
    }
    panel.appendChild(cta);
  }

  const close = () => {
    root.remove();
  };
  if (popup.settings.dismissible) {
    const x = d.createElement("button");
    x.type = "button";
    x.setAttribute("aria-label", "Close");
    x.textContent = "×";
    x.addEventListener("click", close);
    panel.appendChild(x);
    if (popup.settings.showOverlay) {
      root.addEventListener("click", (e) => {
        if (e.target === root) close();
      });
    }
  }

  root.appendChild(panel);
  (env.mountTo ?? d.body).appendChild(root);
  return { close, element: root };
}
