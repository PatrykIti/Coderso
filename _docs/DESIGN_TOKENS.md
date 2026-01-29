# Design Tokens (v1)

Cel: wspolny system wygladu dla core i pluginow, aby uniknac
niestandardowych klas Tailwind w runtime.

## Zasady

- Tokeny sa expose jako CSS variables w `:root`.
- Pluginy powinny uzywac tokenow zamiast hardcode kolorow.
- Wszelkie niestandardowe style pluginu musza byc w `dist/style.css`.
- Core dostarcza domyslne wartosci tokenow z aktywnego theme (np. `/themes/default`).
- Admin moze zmieniac wartosci **site tokens** na poziomie global settings.
- Override tokenow frontu jest przechowywany w `settings` pod kluczem `design.tokens`.
- Merge order (front): theme defaults -> global overrides (`design.tokens`) -> profile overrides.
- **Admin UI** ma osobny zestaw tokenow (patrz sekcja niżej) i nie używa `design.tokens`.

## Token groups (v1)

- colors: `--color-primary`, `--color-secondary`, `--color-accent`
- neutrals: `--color-bg`, `--color-surface`, `--color-text`
- spacing: `--space-xs` ... `--space-2xl`
- radius: `--radius-sm` ... `--radius-xl`
- typography: `--font-sans`, `--font-display`, `--text-sm` ... `--text-2xl`

## Tailwind integration

- Core build mapuje tokeny na utility classes.
- Pluginy nie polegaja na `bg-[#123456]` bezposrednio.
- Dla dynamicznych klas plugin uzywa safelist w swoim buildzie.

Przyklad mapowania w tailwind.config:

```js
theme: {
  colors: {
    primary: "var(--color-primary)",
    secondary: "var(--color-secondary)",
    accent: "var(--color-accent)"
  }
}
```

## Admin UI (shadcn + Tailwind v4)

Admin UI korzysta z osobnych **Admin UI Theme Tokens** przechowywanych w DB.

- Tokeny admina sa przechowywane w `admin_theme_templates` i aktywowane przez `admin_theme_profiles`.
- UI edycji to **Visual → Admin UI Theme** (tylko pickery, JSON tylko export/import).
- Admin UI mapuje tokeny na zmienne shadcn (`--background`, `--foreground`, itp.) przez `--admin-*`.
- Tailwind v4 uzywa `@theme` w CSS do generowania klas `bg-background`, `text-foreground`, itd.
- Mapowanie jest w `core/admin/styles/globals.css`.

### Admin UI Theme Tokens (granular)

Minimalny zestaw grup:

```ts
base: { bg, surface, text, border }
buttons: {
  primary: { bg, text, hoverBg, hoverText },
  secondary: { bg, text, hoverBg, hoverText },
  outline: { border, text, hoverBg, hoverText },
  ghost: { hoverBg, hoverText }
}
inputs: { bg, border, text, placeholder, focusRing }
sidebar: { bg, text, activeBg, activeText, hoverBg }
topbar: { bg, text, border }
card: { bg, border }
state: { success, warning, danger }
```

## Example usage

```css
.plugin-card {
  background: var(--color-surface);
  color: var(--color-text);
  padding: var(--space-lg);
  border-radius: var(--radius-md);
}
```

## Token compliance (store)

- Store moze flagowac hardcode kolorow w CSS pluginu.
- Preferowane jest uzywanie tokenow dla spojnosc i kompatybilnosci.
