import { toAdminThemeCssVariableMap } from "../../../ui/theme/tokenCss";
import {
  DEFAULT_ADMIN_THEME_TOKENS,
  type AdminThemeTokens,
} from "../../../services/adminThemes/tokenTypes";

/**
 * TASK-479-25-L01: NEW dedicated live mini-admin for the Admin UI Theme screen.
 *
 * Modeled on the WORKING mini-admin in `ThemeTemplateDrawer.tsx` (the
 * `NavigationPreview`/cards markup), it paints LIVE from the active profile's
 * resolved tokens by applying `toAdminThemeCssVariableMap(tokens)` on its root
 * and consuming the emitted `--admin-*` variables through arbitrary-value
 * utilities (`bg-[var(--admin-sidebar-bg)]`, …) — NOT shadcn
 * `bg-background`/`bg-card`/`border-border`, which that map never sets.
 *
 * The unrouted-only `ThemePreviewPanel.tsx` is intentionally left untouched and
 * is NOT repurposed here. The `tokens` default + the caller's `?? null`
 * `mergeAdminThemeTokens` fallback means the preview never throws when no
 * profile is active.
 */
export function ThemeLivePreview({
  tokens = DEFAULT_ADMIN_THEME_TOKENS,
}: {
  tokens?: AdminThemeTokens;
}) {
  const style = toAdminThemeCssVariableMap(tokens);

  return (
    <div
      style={style}
      className="overflow-hidden rounded-xl border border-[var(--admin-base-border)] bg-[var(--admin-base-bg)] font-[family-name:var(--font-sans)] text-[var(--admin-base-text)]"
    >
      <div className="flex">
        {/* mini sidebar */}
        <div className="w-28 shrink-0 space-y-3 border-r border-[var(--admin-sidebar-border)] bg-[var(--admin-sidebar-bg)] px-3 py-4 text-[var(--admin-sidebar-text)]">
          <div className="flex items-center gap-1.5">
            <span className="size-5 rounded-md bg-[var(--admin-button-primary-bg)]" />
            <span className="h-2 w-10 rounded-full bg-[var(--admin-sidebar-text)]/40" />
          </div>
          <div className="rounded-md bg-[var(--admin-sidebar-active-bg)] px-2 py-1 text-[10px] font-medium text-[var(--admin-sidebar-active-text)]">
            Dashboard
          </div>
          <div className="h-2 w-14 rounded-full bg-[var(--admin-sidebar-text)]/30" />
          <div className="h-2 w-10 rounded-full bg-[var(--admin-sidebar-text)]/30" />
        </div>

        {/* mini main */}
        <div className="flex-1 p-3">
          {/* topbar */}
          <div className="mb-3 flex items-center justify-between rounded-md border border-[var(--admin-topbar-border)] bg-[var(--admin-topbar-bg)] px-3 py-2 text-[10px] text-[var(--admin-topbar-text)]">
            <span>Admin</span>
            <span className="size-4 rounded-full bg-[var(--admin-topbar-text)]/20" />
          </div>

          {/* 2 mini stat cards */}
          <div className="grid grid-cols-2 gap-3">
            {[0, 1].map((index) => (
              <div
                key={index}
                className="rounded-lg border border-[var(--admin-card-border)] bg-[var(--admin-card-bg)] p-3"
              >
                <span className="block h-1.5 w-10 rounded-full bg-[var(--admin-text-muted)]/60" />
                <span className="mt-2 block h-3 w-14 rounded-full bg-[var(--admin-base-text)]/70" />
                <span className="mt-3 block h-5 rounded-md bg-[var(--admin-primary-soft)]" />
              </div>
            ))}
          </div>

          {/* primary button bar */}
          <div className="mt-3 flex justify-end">
            <div className="rounded-md bg-[var(--admin-button-primary-bg)] px-3 py-1.5 text-[10px] text-[var(--admin-button-primary-text)]">
              Save
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
