# RAPORT: Footer Widget - UI-first retest (31-05-2026)

> **Status:** Zakonczony UI-first pass dla Wizard / Visual / Advanced oraz public runtime.
> **Strona admin:** `Audit 31-05 Footer`
> **Admin page id:** `1683cc1f-3a2a-4111-858a-db0c0c6423c6`
> **Public route:** `/audit-31-05-footer`
> **Dodatkowe runtime routes:** `/audit-31-05-footer-rich`, `/audit-31-05-footer-minimal`, `/audit-31-05-footer-minimal-utility`, `/audit-31-05-footer-unsafe`
> **Playwright sessions:** `footer-fixture-31`, `footer-admin-31`, `footer-public-31`, `footer-admin-unsafe-31`
> **Claude:** ponowiono probe non-interactive; CLI zwrocil `401 Invalid authentication credentials`. Dodatkowy przeglad zrobiono subagentem Codex.

## Metoda

Test byl prowadzony od UI na stronie audytowej z blokiem `footer`.
Przed testami przeczytano `_docs/_WIDGETS/FOOTER.md`, taski
`TASK-268*` i `TASK-309*`, implementacje `core/widgets/core/footer.tsx`,
edytory `core/admin/ui/widgets/editors/FooterEditors.tsx` oraz testy
`tests/vitest/widgets/footer.test.tsx` i
`tests/vitest/ui/footer-editor-wave.test.tsx`.

Przez admin API utworzono i opublikowano kontrolowane strony:

- `/audit-31-05-footer-rich` - `columns-3`, brand/logo, legal, contact,
  social, back-to-top, style/layout i bottom slot,
- `/audit-31-05-footer-minimal` - compact minimal, legal/social/contact/back
  disabled,
- `/audit-31-05-footer-minimal-utility` - minimal z wylaczonym legal/social,
  ale wlaczonym contact i back-to-top,
- `/audit-31-05-footer-unsafe` - unsafe logo, legal/social/column href oraz
  malformed phone/email.

Admin UI pass objal `Run setup again` dla Wizard, Visual, Advanced, kontrole
wariantu, kolumn/linkow, brand/legal, utility strip, social, kolorow,
typografii, layoutu, slot overview i metadata kontrolek. Public runtime
sprawdzono realnym DOM-em na `http://localhost:3000`: footer landmark,
headings, nav minimal, linki, target/rel, social icon labels, contact
`tel:`/`mailto:`, back-to-top, unsafe values i body overflow.

## Pokrycie UI

Przetestowane:

- Wizard starter setup i przejscie do Visual,
- Visual: variant, kolumny/linki/order, LinkDestinationField, brand/logo,
  legal, contact, back-to-top, social profiles, kolory, typografia, layout,
  slot overview i shared block controls,
- Advanced: runtime/layout/style/support summaries jako read-only,
- public runtime: `columns-3`, `minimal`, unsafe payload, legal/social/contact,
  external rel/target, logo semantics, minimal utility edge case.

## Macierz opcji

| Kontrolka / opcja | Akcja UI | Wynik admin preview / editor | Wynik public | Status | Dlaczego / kod | Jak naprawic |
|---|---|---|---|---|---|---|
| Initial render | Otwarta `/audit-31-05-footer` i zaznaczony blok | Canvas pokazuje Footer `columns-2` z brand, kolumnami, legal/social. | Public bazowy i fixture routes HTTP 200. | Dziala | Renderer ma root `<footer>` i schema/defaults sa poprawne dla standardowego payloadu. | Brak. |
| Wizard | `Run setup again` | Wizard root istnieje; pokazuje wariant, visible columns, social basics, finish action. | Nie dotyczy. | Dziala funkcjonalnie, kontraktowo niespojny | Wizard ma interaktywny variant select mimo `visualOwnsVariantSelection`. | Patrz `FT-31-05-04`. |
| Visual sections | Otwarcie Visual | Sekcje: Variant and structure, Columns and links, Brand and legal, Utility strip, Social links, Colors, Typography, Layout, Slots overview. | Fixture public odzwierciedla data. | Dziala | Visual jest glownym ownerem edycji Footer. | Metadata gap w `FT-31-05-05`. |
| Advanced | Klik Advanced | `writablePaths=[]`, brak raw native controls; runtime/layout/style/support summaries read-only. | Nie dotyczy. | Dziala | `FooterAdvancedEditor` renderuje diagnostyke bez mutacji. | Brak poza `slots` metadata w `FT-31-05-05`. |
| Variant `columns-2` | Bazowa strona | Select pokazuje Columns 2. | Public ma 2 widoczne kolumny i bottom strip. | Dziala | `resolveFooterColumnCount()` mapuje `columns-2` na 2. | Brak. |
| Variant `columns-3` | `/audit-31-05-footer-rich` | Visual trzyma 3 kolumny i ukryte/preserved dane. | Public renderuje Company, Resources, Product z `h3`. | Dziala | `resolveFooterColumnsForVariant()` normalizuje kolumny do liczby wariantu. | Brak. |
| Variant `minimal` | `/audit-31-05-footer-minimal` | Visual opisuje compact row i preserved hidden columns. | Public nie renderuje `h3`; renderuje brand i inline nav `One`, `Two`; legal/social ukryte. | Dziala dla disabled legal/social | Minimal branch renderuje pierwsza kolumne jako inline nav. | Utility edge w `FT-31-05-01`. |
| Minimal + contact/back-to-top | `/audit-31-05-footer-minimal-utility` | Dane fixture maja contact i back-to-top wlaczone. | Public tekst zawiera tylko `Minimal Utility Footer` i `Primary`; brak address, `tel:`, `mailto:` i `#top`. | Nie dziala | Minimal utility area renderuje sie tylko przy legal/social. | Patrz `FT-31-05-01`. |
| Columns links | Rich fixture z 6 linkami | Labels, destination picker, target i order controls widoczne. | Safe links renderuja poprawne `href`; `_blank` ma `rel`. | Dziala | `resolveFooterLinkAttrs()` normalizuje href i target. | Unsafe `#` w `FT-31-05-02`. |
| Unsafe column links | Rich/unsafe fixtures | Editor pozwala zachowac saved custom destination. | `javascript:` i `//evil` nie trafiaja do DOM jako takie, ale widoczne sa klikalne linki `href="#"`. | Czesciowo nie dziala | `normalizeFooterLink()` fallbackuje unsafe href do `#`. | Patrz `FT-31-05-02`. |
| Brand logo/text | Rich fixture | Visual pokazuje logo image field i alt text. | Public ma `<img src="/media/footer-logo.svg" alt="Audit Footer logo" loading="lazy">` i landmark `aria-labelledby` do brand text. | Dziala | Runtime uzywa `normalizeFooterImageSrc()` i brand text jako label. | Editor unsafe preview w `FT-31-05-03`. |
| Unsafe logo runtime | `/audit-31-05-footer-unsafe` | Visual preview pokazuje raw saved logo. | Public nie renderuje `<img>` i nie zawiera `javascript:alert`. | Dziala public, nie dziala editor | Runtime sanitizuje, editor preview nie. | Patrz `FT-31-05-03`. |
| Legal enabled | Rich fixture | Legal enabled, copyright, labels, destinations, targets widoczne. | Copyright, Audit Privacy `_blank noopener noreferrer`, Audit Terms `_self` renderuja sie. | Dziala | `normalizeFooterLegal()` i `resolveFooterLinkAttrs()` odrzucaja unsafe href. | Brak. |
| Legal disabled | Minimal fixture | Dane legal zachowane, enabled false. | Brak Privacy/Terms/copyright. | Dziala | `showLegalContent` wymaga `legal.enabled`. | Brak. |
| Unsafe legal href | Unsafe fixture | Saved unsafe privacy istnieje w data. | Public privacy nie renderuje sie; safe terms renderuje sie. | Dziala | `normalizeFooterLegal()` zwraca `undefined` dla unsafe privacy. | Brak. |
| Contact valid | Rich fixture | Address/phone/email fields widoczne w Utility strip. | Address renderuje sie w `<address>`, phone `tel:+48600700800`, email `mailto:footer@example.com`. | Dziala | Phone/email maja bounded normalizers. | Brak dla columns wariantu. |
| Contact malformed | Unsafe fixture | Raw phone/email w data. | Address zostaje, brak `tel:` i `mailto:`. | Dziala | Malformed phone/email sa omitowane. | Brak. |
| Back to top | Rich/unsafe fixtures | Switch i label widoczne. | Link `href="#top"` z `data-footer-back-to-top="1"` renderuje sie. | Dziala w columns | `renderBackToTopLink()` jest anchor-only. | Minimal edge w `FT-31-05-01`. |
| Social enabled | Rich fixture | Social rows, platform select, profile/custom destination i add/remove/order controls widoczne. | LinkedIn/GitHub maja icon links, accessible labels `(...opens in new tab)`, target `_blank`, rel. Custom `/community` renderuje label `Community`. | Dziala | Social runtime wymusza safe attrs i icon-only accessible labels. | Brak. |
| Social disabled | Minimal fixture | Dane social preserved, `socialEnabled=false`. | Brak `aria-label="Footer social links"`. | Dziala | `socialVisible = data.socialEnabled !== false && social.length > 0`. | Brak. |
| Unsafe social href | Unsafe fixture | Unsafe social entries w data. | Public renderuje tylko safe GitHub, unsafe social links sa pominiete. | Dziala | `normalizeFooterSocialEntry()` zwraca `null`, gdy linkAttrs brak. | Brak. |
| Colors/style | Rich fixture | Swatch-first color controls, clear buttons, typography/link selects. | Public inline style: surface `#f8fafc`, border `#0f172a`, border top `3px`, text `#111827`; classes `px-8 py-12 text-base max-w-7xl`. | Dziala | `normalizeFooterRenderColor()` filtruje raw unsafe CSS i mapy tokenow sa bounded. | Brak. |
| Slots overview | Visual section | Sekcja opisuje column/bottom slots, bez edycji. | Rich bottom slot spacer renderuje sie bez invalid widget. | Dziala runtime, metadata gap | Contract deklaruje read-only `slots`, DOM nie ma path row. | Patrz `FT-31-05-05`. |
| Editor control wrapping | Visual inspect | `unwrappedControls=[]`; native controls maja ownership `writable` albo `action`. | Nie dotyczy. | Dziala | Footer ma dobra adopcje `data-widget-control`. | Duplicate path rows w `FT-31-05-05`. |

## Znaleziska do poprawy

### FT-31-05-01 - Minimal variant ukrywa contact i back-to-top, gdy legal/social sa wylaczone

**Objaw:** fixture `/audit-31-05-footer-minimal-utility` mial wlaczone:

- `contact.address = "Minimal Utility Address"`,
- `contact.phone = "+48 501 502 503"`,
- `contact.email = "utility@example.com"`,
- `backToTop.enabled = true`,
- `legal.enabled = false`,
- `socialEnabled = false`.

Public DOM:

```json
{
  "path": "/audit-31-05-footer-minimal-utility",
  "footerText": "Minimal Utility FooterPrimary",
  "anchors": [{ "text": "Primary", "href": "/primary-footer" }],
  "addressText": ""
}
```

Nie ma address, `tel:`, `mailto:` ani `href="#top"`.

**Dlaczego:**

- Minimal branch renderuje prawa strone utility tylko wtedy, gdy
  `showLegalContent || socialVisible`:
  `core/widgets/core/footer.tsx:1350`.
- W tym samym bloku sa `renderContactInfo()` i `renderBackToTopLink()`:
  `core/widgets/core/footer.tsx:1360`, `core/widgets/core/footer.tsx:1409`.
- Dla columns wariantu `showBottomStrip` uwzglednia `Boolean(contact)` i
  `Boolean(backToTop)`: `core/widgets/core/footer.tsx:1146-1151`, wiec bug
  dotyczy tylko `minimal`.

**Jak naprawic:**

1. Warunek minimal utility zmienic na
   `showLegalContent || socialVisible || Boolean(contact) || Boolean(backToTop)`.
2. Dodac regresje w `tests/vitest/widgets/footer.test.tsx`: minimal + disabled
   legal/social + contact/backToTop ma renderowac address, `tel:`, `mailto:`
   i `href="#top"`.
3. Powtorzyc public smoke dla `/audit-31-05-footer-minimal-utility`.

### FT-31-05-02 - Unsafe column links degraduja sie do klikalnego `href="#"`

**Objaw:** rich fixture mial link `Unsafe column` z
`href="javascript:alert(1)"`. Unsafe fixture mial `javascript:` i
protocol-relative `//evil.example/path`. Public DOM nie zawiera raw unsafe URL,
ale zostawia widoczne klikalne linki:

```json
[
  { "text": "Unsafe column", "href": "#" },
  { "text": "Script column", "href": "#" },
  { "text": "Protocol relative", "href": "#" }
]
```

Legal/social/logo unsafe values sa pominiete, wiec kolumny maja inny i bardziej
mylacy kontrakt.

**Dlaczego:**

- `normalizeFooterHref()` poprawnie odrzuca `javascript:`, `data:`,
  `vbscript:` i `//...` przez shared `normalizeWidgetSafeHref()`:
  `core/widgets/core/footer.tsx:680-685`,
  `core/widgets/core/widgetSafeHref.ts:15-25`.
- `normalizeFooterLink()` zamienia jednak brak safe href na `"#"`:
  `core/widgets/core/footer.tsx:737-744`.
- Potem `resolveFooterLinkAttrs("#")` traktuje to jako safe hash link:
  `core/widgets/core/footer.tsx:713-725`.

**Jak naprawic:**

1. Preferowane: unsafe column linki pomijac tak jak legal/social, zamiast
   fallbacku do `#`.
2. Jesli produkt chce pokazac label bez destination, renderowac go jako tekst
   nieklikalny z wyraznym editor warning, nie jako anchor.
3. Dodac testy dla `javascript:` i `//evil` w kolumnach: brak raw unsafe href i
   brak klikalnego `#` placeholdera.

### FT-31-05-03 - Visual editor preview renderuje raw unsafe `brand.logoUrl`

**Objaw:** public unsafe fixture usuwa logo, ale admin Visual dla tej samej
strony pokazal:

```json
{
  "editorImages": [
    { "src": "javascript:alert(1)", "alt": "Unsafe logo" }
  ],
  "canvasImages": [],
  "containsRawJavascript": true
}
```

**Dlaczego:**

- Runtime brand logo idzie przez `normalizeFooterImageSrc()`:
  `core/widgets/core/footer.tsx:687-692`, `core/widgets/core/footer.tsx:804`.
- `BrandLogoField` bierze raw `value.brand?.logoUrl?.trim()`:
  `core/admin/ui/widgets/editors/FooterEditors.tsx:621`.
- Ten raw string trafia bez normalizacji do `<img src={savedLogo}>`:
  `core/admin/ui/widgets/editors/FooterEditors.tsx:673-680`.

**Jak naprawic:**

1. Wyeksportowac albo wspoldzielic footer image-src normalizer z runtime.
2. W edytorze preview renderowac `<img>` tylko dla safe `logoUrl`; dla unsafe
   pokazac replace/clear warning.
3. Dodac test w `footer-editor-wave.test.tsx`, ze unsafe saved logo nie tworzy
   `<img src="javascript:...">` w Visual.

### FT-31-05-04 - Wizard variant selector jest niespojny z kontraktem ownership

**Objaw:** Wizard realnie pozwala zmienic wariant z `Columns 2`, ale contract i
capabilities mowia, ze Visual owns variant selection:

```json
{
  "wizard": {
    "writablePaths": ["variant"],
    "readonlyPaths": ["columns", "socialEnabled"]
  }
}
```

**Dlaczego:**

- `footerEditorContract` dla Wizard ma `writablePaths: []` i
  `readOnlyPaths: ["variant", "columns", "socialEnabled"]`:
  `core/widgets/core/footer.tsx:373-383`.
- Widget capabilities deklaruja `visualOwnsVariantSelection: true`:
  `core/widgets/core/footer.tsx:1471`.
- `FooterWizardEditor` renderuje `FooterVariantSelect` z `onVariantChange`:
  `core/admin/ui/widgets/editors/FooterEditors.tsx:1143-1148`.

**Jak naprawic:**

1. Wybrac jeden kontrakt.
2. Jesli Visual faktycznie ma byc ownerem wariantu, Wizard powinien pokazac
   read-only summary zamiast selecta.
3. Jesli Wizard ma byc starter setup dla wariantu, zaktualizowac
   `footerEditorContract`, docs i metadata, zeby `variant` byl writable/action
   zgodnie z DOM.

### FT-31-05-05 - Slot/LinkDestination metadata jest funkcjonalne, ale nieprecyzyjne

**Objaw:** Visual nie mial unwrapped native controls, ale probe znalazl:

- powtorzone writable paths dla destination pickerow, np.
  `columns.0.links.0.href` i `legal.privacy` pojawiaja sie dwa razy,
- brak read-only `data-widget-control-path="slots"` w Visual slot overview i
  Advanced support summary, mimo ze contract deklaruje `readOnlyPaths: ["slots"]`.

**Dlaczego:**

- Destination controls maja zewnetrzny wrapper z `controlAttributes(...)` i
  wewnetrzny `LinkDestinationField` z tym samym `controlPath`, np.
  `core/admin/ui/widgets/editors/FooterEditors.tsx:847-853`,
  `core/admin/ui/widgets/editors/FooterEditors.tsx:1359-1369`.
- Contract deklaruje `slots` dla Visual i Advanced:
  `core/widgets/core/footer.tsx:470-477`,
  `core/widgets/core/footer.tsx:526-533`.
- UI renderuje slot/support prose bez metadata-bearing summary row:
  `core/admin/ui/widgets/editors/FooterEditors.tsx:1783-1804`,
  `core/admin/ui/widgets/editors/FooterEditors.tsx:2013-2024`.

**Jak naprawic:**

1. Dla `LinkDestinationField` trzymac jeden owner path: albo wrapper, albo
   komponent wewnetrzny, nie oba.
2. Dodac `ReadonlyWidgetSummaryRow path="slots"` w Visual slot overview i
   Advanced support summary.
3. Dodac test DOM metadata: no duplicate writable paths poza jawnie
   allowlistowanymi przypadkami i read-only `slots` row obecny.

## Co dziala

- Public Footer renderuje poprawny landmark: `aria-labelledby` do brand text,
  a bez brand text fallbackuje do `aria-label="Site footer"`.
- Columns variants, headings, legal labels, target/rel, social icon accessible
  labels, malformed contact filtering, safe legal/social/logo runtime
  sanitization i style/layout tokens dzialaja.
- Advanced jest read-only i nie pokazuje edytowalnych Footer-specific controls.
- Visual ma kompletna sekcje IA i dobrze opakowuje native controls
  (`unwrappedControls=[]`).

## Walidacja

Do wykonania po zapisie raportu:

- `bun run test:vitest -- tests/vitest/widgets/footer.test.tsx tests/vitest/ui/footer-editor-wave.test.tsx`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `git diff --check -- _docs/PLAYWRIGHT/31-05-2026-widgets/REPORT_FOOTER_WIDGET.md _docs/PLAYWRIGHT/31-05-2026-widgets/README.md`
