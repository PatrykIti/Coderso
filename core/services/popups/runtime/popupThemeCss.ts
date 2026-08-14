/**
 * Popup visual theme (TASK-558).
 *
 * Fixed preset CSS for the client-rendered popup card, backdrop, close
 * affordance, placement variants, viewport clamping, mobile widths, and
 * reduced-motion respect.
 *
 * Present-only discipline (TASK-533/531 pattern): `buildPopupThemeCss(null)`
 * (and every unknown preset) returns ZERO bytes — the no-op gate pinned by
 * `tests/vitest/popups/popup-theme-css.test.ts`, mirroring
 * `buildSiteShellCss(null)`. The theme only materializes in a document when a
 * popup actually renders: `renderPopup` injects a single
 * `<style data-coderso-popup-theme>` element (see renderPopup.ts), so a page
 * with no popups carries zero popup-theme bytes in its DOM.
 *
 * HARD CONTRACT: the CSS below is the canonical byte source. `renderPopup`
 * embeds the SAME literal inline (the whole function is serialized into the
 * popup runtime IIFE, so it cannot reference this module at runtime); the
 * popup-theme-render Vitest suite asserts the injected style's textContent is
 * byte-identical to `buildPopupThemeCss("default")`, which pins the runtime
 * copy against this canonical string.
 */

export const POPUP_THEME_PRESETS = ["default"] as const;

export type PopupThemePreset = (typeof POPUP_THEME_PRESETS)[number];

/** Canonical fixed-preset popup stylesheet. Do not change without updating the renderPopup copy. */
export const POPUP_DEFAULT_THEME_CSS = `[data-coderso-popup]{position:fixed;top:0;right:0;bottom:0;left:0;z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px;box-sizing:border-box;pointer-events:none;margin:0}
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

/**
 * Maps a theme preset id to its CSS. Unknown or null input emits zero bytes
 * (present-only no-op, byte-identity gate). Only the bounded preset allowlist
 * is accepted — anything else fails closed to the empty string.
 */
export function buildPopupThemeCss(preset: PopupThemePreset | null | undefined): string {
  if (preset === "default") return POPUP_DEFAULT_THEME_CSS;
  return "";
}
