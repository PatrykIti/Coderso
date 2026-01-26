# Design Tokens (v1)

Cel: wspolny system wygladu dla core i pluginow, aby uniknac
niestandardowych klas Tailwind w runtime.

## Zasady

- Tokeny sa expose jako CSS variables w `:root`.
- Pluginy powinny uzywac tokenow zamiast hardcode kolorow.
- Wszelkie niestandardowe style pluginu musza byc w `dist/style.css`.
- Core dostarcza domyslne wartosci tokenow w theme (np. `/themes/default`).
- Admin moze zmieniac wartosci tokenow na poziomie global settings.
- Override tokenow jest przechowywany w `settings` pod kluczem `design.tokens`.
- Merge order: theme defaults -> global overrides (`design.tokens`).

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
