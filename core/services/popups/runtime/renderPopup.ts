import type { PublicPopup } from "../popupPublicContract";

/**
 * Popup DOM builder (TASK-486-03-L01) + present-only theme (TASK-558).
 *
 * Pure builder: every browser global is injected through `env`, so the module
 * stays DOM-agnostic and its helpers remain serializable into the runtime IIFE
 * (TASK-486-03-L02). All authored content is set via `textContent` / created
 * text nodes — never `innerHTML` — making this the client-side XSS gate. The
 * CTA href is sanitized by the local `isSafeHref` (IIFE-serializable `SAFE`
 * regex), which reimplements the shared `startsWith("/")` / `http(s)://` rule
 * without importing helpers that close over module state.
 *
 * TASK-558 theme: the fixed-preset stylesheet (`THEME_CSS` below) is injected
 * as a single `<style data-coderso-popup-theme>` element ONLY when a popup
 * renders, so a page with no popups carries zero popup-theme bytes
 * (present-only discipline). The literal is byte-identical to
 * `POPUP_DEFAULT_THEME_CSS` in popupThemeCss.ts — it must stay inline here
 * because `renderPopup.toString()` is serialized into the runtime IIFE and a
 * module-level reference would be an unbound identifier in the emitted script.
 * The popup-theme-render Vitest suite pins the injected style's textContent
 * against the canonical builder to prevent drift.
 *
 * Accessibility (TASK-558): focus moves into the popup on open (close button
 * when dismissible, else the panel), focus is restored on close, ESC closes
 * dismissible popups, Tab is trapped while a modal popup is open
 * (`aria-modal="true"`), and `prefers-reduced-motion` is respected via CSS.
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

  // Present-only theme (TASK-558). Injected once per document, only when a
  // popup renders. Byte-identical to popupThemeCss.ts `POPUP_DEFAULT_THEME_CSS`.
  const THEME_CSS = `[data-coderso-popup]{position:fixed;top:0;right:0;bottom:0;left:0;z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px;box-sizing:border-box;pointer-events:none;margin:0}
[data-coderso-popup].coderso-popup--overlay{pointer-events:auto;background:rgba(15,23,42,.5)}
[data-coderso-popup].coderso-popup--bottom_right{align-items:flex-end;justify-content:flex-end}
[data-coderso-popup].coderso-popup--bottom_right .coderso-popup__panel{max-width:min(380px,100%)}
[data-coderso-popup].coderso-popup--top_banner{align-items:flex-start;justify-content:center}
[data-coderso-popup].coderso-popup--top_banner .coderso-popup__panel{width:100%;max-width:min(1080px,100%);border-radius:0 0 14px 14px}
[data-coderso-popup] .coderso-popup__panel{pointer-events:auto;position:relative;box-sizing:border-box;max-width:min(560px,100%);max-height:100%;overflow:auto;-webkit-overflow-scrolling:touch;background:var(--color-bg,#fff);color:inherit;border:1px solid rgba(15,23,42,.12);border-radius:14px;box-shadow:0 12px 32px rgba(15,23,42,.16);padding:24px;font-family:inherit;font-size:1rem;line-height:1.5}
[data-coderso-popup] .coderso-popup__panel h2{margin:0 0 8px;padding-right:28px;font-size:1.25rem;font-weight:600;line-height:1.3;color:inherit}
[data-coderso-popup] .coderso-popup__panel p{margin:0 0 16px}
[data-coderso-popup] .coderso-popup__panel a{display:inline-block;padding:10px 18px;border-radius:8px;background:#0f172a;color:#fff;text-decoration:none;font-weight:500}
[data-coderso-popup] .coderso-popup__panel a:hover,[data-coderso-popup] .coderso-popup__panel a:focus-visible{background:#1e293b}
[data-coderso-popup] .coderso-popup__panel button{position:absolute;top:8px;right:8px;width:32px;height:32px;padding:0;border:none;border-radius:50%;background:rgba(15,23,42,.06);color:inherit;font-size:18px;line-height:1;cursor:pointer;display:flex;align-items:center;justify-content:center}
[data-coderso-popup] .coderso-popup__panel button:hover,[data-coderso-popup] .coderso-popup__panel button:focus-visible{background:rgba(15,23,42,.12)}
[data-coderso-popup] :focus-visible{outline:2px solid #2563eb;outline-offset:2px}
@media (max-width:639px){[data-coderso-popup]{padding:12px}[data-coderso-popup] .coderso-popup__panel{padding:20px 16px}}
@media (prefers-reduced-motion:no-preference){[data-coderso-popup] .coderso-popup__panel{animation:coderso-popup-in .18s ease-out}}
@keyframes coderso-popup-in{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
@media (prefers-reduced-motion:reduce){[data-coderso-popup] .coderso-popup__panel,[data-coderso-popup].coderso-popup--overlay{animation:none;transition:none}}`;

  if (!d.querySelector("style[data-coderso-popup-theme]")) {
    const style = d.createElement("style");
    style.setAttribute("data-coderso-popup-theme", "");
    style.textContent = THEME_CSS;
    const host = d.head ?? d.body;
    if (host) host.appendChild(style);
  }

  const panel = d.createElement("div");
  panel.className = "coderso-popup__panel";
  panel.setAttribute("tabindex", "-1"); // programmatic focus target (dialog)

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

  const previouslyFocused = d.activeElement as HTMLElement | null;
  let closed = false;

  function onKeydown(e: KeyboardEvent) {
    if (e.key === "Escape" && popup.settings.dismissible) {
      e.preventDefault();
      close();
      return;
    }
    if (e.key === "Tab" && popup.settings.showOverlay && root.isConnected) {
      // Cycle only genuinely tabbable descendants; the panel itself is
      // tabindex="-1" so it must not be part of the wrap sequence.
      const focusables = root.querySelectorAll("a[href], button:not([disabled])");
      const active = d.activeElement;
      if (focusables.length === 0) {
        e.preventDefault();
        panel.focus();
        return;
      }
      const first = focusables[0] as HTMLElement;
      const last = focusables[focusables.length - 1] as HTMLElement;
      if (e.shiftKey) {
        if (!active || !root.contains(active) || active === first) {
          e.preventDefault();
          last.focus();
        }
      } else if (!active || !root.contains(active) || active === last) {
        e.preventDefault();
        first.focus();
      }
    }
  }

  function close() {
    if (closed) return;
    closed = true;
    d.removeEventListener("keydown", onKeydown);
    root.remove();
    if (previouslyFocused && previouslyFocused !== d.body && previouslyFocused.isConnected) {
      previouslyFocused.focus();
    }
  }

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
  d.addEventListener("keydown", onKeydown);

  // Move focus into the dialog (close button when dismissible, else panel);
  // restored to the previously focused element by close().
  const closeButton = panel.querySelector("button");
  if (closeButton) (closeButton as HTMLElement).focus();
  else panel.focus();

  return { close, element: root };
}
