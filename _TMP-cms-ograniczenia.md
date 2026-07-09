# Ograniczenia CMS-a — czego NIE dało się odtworzyć z prototypu

Zestawienie ograniczeń page-toolkitu (PageDocumentV2) napotkanych przy przebudowie
strony `projekty-domow-demo` na podstawie prototypu `_docs/projekty-domow-wow-site`.
Źródło: raport 7 agentów (per-sekcja) + błędy z live smoke + **audyt completeness/accuracy
zweryfikowany wobec renderera** (`pageRendererV2.tsx`, `pageAuthoringSanitizers.ts`,
`pageCompositionEffects.tsx`, `pageDocumentV2.ts` — z numerami linii).

Legenda: 🔴 twarde ograniczenie (brak prymitywu) · 🟡 przybliżenie (jest gorszy odpowiednik) · 🟢 naprawione w trakcie.

---

## 1. Ograniczenia globalne / systemowe (dotyczą wielu sekcji)

### 🔴 Brak jakiejkolwiek interaktywności JS
Page document jest STATYCZNY. Nie da się odtworzyć żadnego zachowania z `app.js`:
- przełącznik stylu barn/villa/eco (`styleData` swap bryły/labelki/opisu) — wysłany jako stan „barn”, pigułki to nieklikalne badge;
- `.button.magnetic` (przyciąganie do kursora);
- cursor-glow podążający za myszą (jest tylko globalny `cursorSpotlight` w settings);
- pointer-driven tilt z dokładną matematyką `rotateX(-y*7) rotateY(x*7)` — jest `tilt: subtle|strong` (kierunek liczony przez renderer, nie przez nas);
- scroll-hint (animowana kropka) — brak odpowiadającego bloku;
- filtr portfolio po `data-category`.
**Zastąpione:** `surfacePreset: ambient-orbs`, `tilt + tiltGlare`, `customSvg drawIn`, `decoration.motion (float/drift/pulse)`, `settings.effects.cursorSpotlight`.

### 🔴 Tła tylko JEDNOWARSTWOWE (sanitizer `isSingleGradientLayer`)
Prototyp masowo używa `radial-gradient(...) , linear-gradient(...)` (glow NA gradiencie).
Authoring sanitizer ODRZUCA stringi wielowarstwowe (rozdzielone przecinkiem). Dotknięte:
- hero sun-ring, karty realizacji `art-*` (radial glow nad bazowym gradientem),
- `preview-glass` i `.wow-panel` (radial + linear),
- `.cta-card` (radial + linear).
**Zastąpione:** tylko warstwa BAZOWA (single gradient / solid) + `surfaceTint` / `surfacePreset` jako namiastka poświaty.

### 🔴 Tło bloku i sekcji = brak WIELOWARSTWOWEGO tła (identyczna reguła)
`block.style.background` przechodzi przez `readOptionalSafeBackground` → `sanitizeAuthoringCssBackground` (pageAuthoringSanitizers.ts:100-106), DOKŁADNIE ten sam sanitizer co tło sekcji: akceptuje pojedynczy solid **lub jednowarstwowy gradient**. Czyli `block.style.background: 'linear-gradient(135deg,#f7fbff,#b8f4ff 55%,#d8c9ff)'` (jednowarstwowy) JEST poprawnym, zapisywalnym tłem bloku. Gradienty przycisków/kart spłaszczono nie dlatego, że „blok = jeden kolor”, tylko bo są **wielowarstwowe** (przecinkowe → odrzucone) albo z wyboru. Realne ograniczenie = brak wielowarstwowego/złożonego tła, tożsame z regułą sekcji — nie ma osobnego, ostrzejszego limitu na bloku:
- diagonalne szkło kart usług (`linear 145deg, rgba(...) , rgba(...)` — WIELOwarstwowe) → `surfacePreset: glass` + `surfaceTint`;
- przycisk primary spłaszczony **z wyboru** do `#eaf3ff` (jego 3-stopowy gradient `135deg,#f7fbff,#b8f4ff 55%,#d8c9ff` jest jednowarstwowy i faktycznie by przeszedł — DO POPRAWY na żywej stronie).

### 🔴 Cień = enum (`none|sm|md|lg`), brak kolorowej poświaty
Kolorowe glow-shadow (`0 18px 45px rgba(142,232,255,.22)`, `0 0 28px aqua` itd.) — pominięte, bo nie ma arbitralnego box-shadow.

### 🔴 `letterSpacing` renderuje się jako px, nie em — cały tracking wyzerowany
Renderer emituje BEZWARUNKOWO `letterSpacing: ${value}px` (pageRendererV2.tsx:775), a clamp to `-2..8 px`. Builder podaje magnitudy w intencji `em` (eyebrow `0.08`, nagłówki `-0.03`/`-0.04`), więc `.08em` (na `.78rem` ≈ +1px) → `0.08px` ≈ 0, a `-0.03em` (na 4.4rem h1 ≈ -2.1px) → `-0.03px` ≈ 0. **Praktycznie CAŁA intencja letter-spacingu (każdy eyebrow + każdy nagłówek) jest utracona** — nie da się zadać trackingu w em ani nawet ręcznie przeliczyć bez znajomości docelowego font-size w px (a font-size to token, nie px). To fakt potwierdzony, nie „możliwy rozjazd”.

### 🔴 Font-size = dyskretne tokeny (`2xs..5xl`), brak `clamp()`/rem
Płynne rozmiary prototypu (`clamp(2.6rem,5vw,4.4rem)`, `1.45rem`, `.78rem`) → najbliższy token. Tracimy responsywne skalowanie viewportowe i dokładne wartości.

### 🔴 Font-weight max = `bold` (~700)
Prototyp używa `font-weight: 950` (numery kroków, badge realizacji) → clamp do `bold`. Wizualnie lżejsze.

### 🔴 Brak `text-transform` / dekoracyjnej kreski eyebrow
- uppercase pisany DOSŁOWNIE w treści;
- `.eyebrow span` (34px kreska `linear-gradient(90deg, aqua, transparent)`) → zastąpione glifem `◆` lub myślnikiem `—` + `textColor` aqua.

### 🔴 Brak per-edge border (border-block sekcji)
`.intro-strip` ma górną+dolną kreskę 1px `rgba(255,255,255,.1)` → zostaje tylko wypełnienie tła, kreski pominięte.

### 🔴 Siatki tylko symetryczne, brak row/col span
- asymetria `1fr / 1.2fr` (intro) i `1.15fr / .85fr` (realizacje) → równe kolumny;
- `.project-card.large` (`grid-row: span 2`, karta Aurora 2× wyższa) → NIE do wyrażenia; Aurora wyróżniona tylko wyższym paddingiem nagłówka (132 vs 86px);
- `.split-head` (h2 z lewej, `.section-lead` z prawej, wyrównane do dołu) → stack pełnej szerokości nad siatką.

### 🔴 Efekty (decoration/tilt/surface/hover/composition/marquee/customSvg) = BASE-ONLY, brak per-device
Wszystkie te efekty są autorowane `responsive:false` (pageDocumentV2.ts:632-640) — model przyjmuje je tylko na bazowym breakpoincie; per-device renderują się WYŁĄCZNIE numeryczne `layer.x/y/z`. Nie da się więc wyłączyć/przestroić float/drift/pulse chipów, tilta, szkła ani tickera na mobile (prototyp: `@media(max-width:700px) .floating-chip{display:none}`). Chipy zostają animowane na telefonie bez per-device off-switcha.

### 🔴 Blok `statistic` — renderer wstawia SZTYWNY jasny skin (walczy z ciemnym tłem)
Renderer `case 'statistic'` (pageRendererV2.tsx:2202-2225) opakowuje wartość/label/caption w `<div className="rounded border border-slate-200 p-5">` z jasnymi tokenami tekstu (`#020617/#334155/#64748b`). Builder ustawia ciemne tło/border/radius na RAMCE bloku, ale wewnętrzny div i tak stempluje jasny `border-slate-200` i slate tekst → na ciemnych kafelkach mini-dashboardu w hero błędna jasna obwódka i wymuszony kontrakt koloru. Dodatkowo layout/kolejność (`value + label + caption`) i rozmiary są wbudowane w renderer — zmapowano liczba→`value`, podpis→`label`, `caption` pusty; nie ustawialne per-pole.

### 🔴 `radius` clampuje się TAKŻE na tle full-bleed (100vw dostaje zaokrąglone rogi)
Na sekcji `fullBleed` clampowany `radius` ląduje na pudle `width:100vw` (`borderRadius: ${radius}px`, pageRendererV2.tsx:487). Builder ustawia `radius:28 + fullBleed:true` na hero/intro/featuredProjects/process, więc krawędź-do-krawędzi tło dostaje 28px zaokrąglone rogi — prototypowe sekcje pełnej szerokości są prostokątne. Nie da się mieć full-bleed tła BEZ zaokrąglenia (radius i fullBleed nie są rozłączne).

### 🔴 Brak warstwy grain/noise + brak `mix-blend-mode`
Globalny overlay `.noise` prototypu (fixed fractalNoise SVG data-URI, `position:fixed;inset:0;opacity:.07;mix-blend-mode:screen`) nie ma żadnego prymitywu — nie istnieje blok/sekcja/page-effect na teksturę/ziarno, a `mix-blend-mode` nie jest autorowalny nigdzie. Faktura ziarna całej strony jest pominięta.

### 🔴 `backdrop-filter: blur()` — sztywna wartość zamknięta w presecie `glass`
Jedyny sposób na backdrop-blur to `[data-surface="glass"]`, gdzie `backdrop-filter: blur(14px)` jest wpisany na sztywno (pageCompositionEffects.tsx:71). Nie da się zadać promienia blura ani dołożyć backdrop-filter do dowolnego bloku bez wywołania całego presetu glass. Prototyp używa różnych promieni per element (header/menu `blur(20px)`, pills/chips `blur(14px)`) i nakłada backdrop-filter na nie-glass elementy — nieodtwarzalne.

### 🟡 `radius: 999` → clamp do 64
Pigułki/chipy/badge: `normalizePageDocumentV2ForWrite` obcina radius do max 64. W praktyce krótkie pigułki i tak są w pełni zaokrąglone — wizualnie OK.

### 🟡 `t()` (blok text) nie wystawia `textColor`
Część treści (opisy kroków, meta) dziedziczy domyślny `muted` sekcji zamiast dokładnego hexa (`#a8b5c7`). Na ciemnym tle prawie nieodróżnialne.

### 🟡 Badge — rozmiar/waga z enuma
Trust-pills: `badge size` ∈ `2xs..md` (wybrane `sm`); dokładne `.84rem` / `9px 12px` tylko przybliżone.

### 🟡 Marquee = pętla o STAŁYM dystansie (`-50%`), brak dowolnego px
Ticker prototypu to `@keyframes translateX(-260px)` (sztywny dystans px) na JEDNYM zestawie tagów. Ręczna duplikacja 5→10 tagów była NIEPOTRZEBNA: toolkit ma `marquee.seamless: true`, który sam renderuje drugi `aria-hidden .cx-marquee-track` z JEDNEGO zestawu (pageRendererV2.tsx:2030-2033) dla bezszwowej pętli — builder go nie użył (podwojenie DOM jest self-inflicted, DO POPRAWY). REALNE ograniczenie: pętla zawsze przewija się o STAŁE `translateX(-50%)`, więc nie da się wyrazić dowolnego dystansu px jak `-260px`.

### 🟡 `letterSpacing` / `lineHeight` = liczby (nie stringi z jednostką)
`letterSpacing` (px, clamp -2..8) i `lineHeight` (unitless, clamp 1..2.5) — wartości `em` z CSS trzeba podać jako gołe liczby (`-.04em → -0.04`). Konsekwencja px-owego renderowania letterSpacingu → patrz osobny wpis 🔴 wyżej (cały tracking wyzerowany).

### 🟡 Layered-canvas `layer.z` clampowany do max 20 (sufit pod cursor-spotlight)
`PAGE_LAYER_Z_CLAMP {0,20}` (pageDocumentV2.ts:341) — celowo tuż pod z-index overlaya spotlightu (30), by żadna autorowana warstwa go nie przesłoniła. Blueprint-chipów hero nie da się ułożyć powyżej `z 20`. Tu wystarcza (prototyp używa z 1/2/3), ale to realny strukturalny limit dla bogatszych stacków.

### 🟡 `hoverEffect: lift`/`lift-glow` — brak autorowalnego docelowego koloru bordera hover
Hover transituje `border-color` (pageCompositionEffects.tsx:108-109), ale NIE ma pola na docelowy kolor — przechodzi ku własnemu resolved border-color bloku, czyli bez widocznej zmiany. Prototyp `.project-card:hover` przesuwa border na aqua `rgba(142,232,255,.34)` i skaluje sylwetkę. Systemowy brak: nigdzie nie da się zadać kolorów stanu hover.

### 🟡 `surfacePreset: ambient-orbs` — drugi orb ma sztywny fioletowy kolor
Autorowalny jest tylko PIERWSZY orb (`--orb-color` z surfaceTint/accent); drugi (`.cx-orb-b`) używa sztywnego `--orb-color-2: rgba(199,183,255,.42)`, którego żaden resolver nie ustawia. Dwa orby hero (aqua + fiolet) trafiają przypadkiem — nie da się niezależnie zabarwić drugiego orba.

### 🟢 `--jsx not set` przy `tsc --noEmit` — diagnostyka środowiskowa, nie defekt
Jedyna diagnostyka `tsc --noEmit` (`--jsx not set`, z tranzytywnego importu w pageDocumentV2.ts) jest środowiskowa — plik wykonuje się poprawnie pod wymaganym runtime `bun`. Nie jest to błąd buildera; walidacja tłem pozostaje uruchomienie `bun scripts/demo-projekty-domow.tsx` (patrz sekcja 3).

---

## 2. Co się nie udało — per sekcja

### Hero
- 🟡 eyebrow: uppercase + kreska → literalny uppercase + `—` + aqua `textColor` (a `letterSpacing` i tak wyzerowany, patrz sekcja 1);
- 🟡 przycisk primary: 3-stopowy gradient `135deg,#f7fbff,#b8f4ff 55%,#d8c9ff` jest JEDNOwarstwowy i faktycznie by przeszedł jako `background` bloku — spłaszczony z wyboru do `#eaf3ff` + ciemny tekst; aqua glow-shadow pominięty (cień = enum);
- 🟡 przycisk secondary (outline) też stracił gradient — wymuszony na płaski `rgba(255,255,255,.08)`;
- 🔴 kafelki `statistic` — sztywny jasny skin renderera (jasna obwódka na ciemnym tle, patrz sekcja 1);
- 🔴 sun-ring (ciepły radial za domem) i siatka blueprint (`:before` `#8ee8ff0f` 34px) — pseudo-elementy bez odpowiednika bloku, POMINIĘTE (namiastka: `surfacePreset glass` + `surfaceTint` na karcie);
- 🔴 keyframes `floatOrb/floatChip/pulseRing/scrollDot` i timing draw-in — brak kontroli, przybliżone.

### Intro + ticker
- 🔴 border-block (górna/dolna kreska) — pominięte;
- 🔴 ratio `1fr / 1.2fr` → `columns: 2` (równo);
- 🟡 marquee: podwojone 10 tagów zamiast `seamless` (patrz sekcja 1); `lineHeight` leada `1.5` zamiast globalnego `1.75`; `1.1rem → token lg`.

### Usługi (3 karty)
- 🔴 diagonalne szkło karty (`gradient 145deg` WIELOwarstwowy) → `glass` + `surfaceTint`;
- 🔴 `.service-card:after` (aqua radial glow na hover) + tilt 3D → `hoverEffect: lift-glow` + `tilt: subtle` (glow toolkitowy, nie dokładny aqua radial);
- 🟡 `.icon-orb` (sztywny kwadrat 54×54) → wyśrodkowany `h3` z paddingiem (wysokość zależna od treści, nie sztywne 54px);
- 🟡 link karty (inline aqua tekst, weight 800) → `button` (brak wariantu „inline-aqua-link” przez helper `btn`); dodano `→` i anchor;
- 🟡 `.split-head` side-by-side → stack;
- ℹ️ reveal delays 0/140/280 (brief) zamiast 0/80/160 (prototyp).

### Panel „wybierz klimat” (wowPanel)
- 🔴 live switcher barn/villa/eco → statyczny stan „barn”, pigułki jako nieklikalne badge (pierwsza aktywna);
- 🔴 morphing clip-path bryły (barn/villa/eco, transition .35s) → jeden statyczny `customSvg` domu;
- 🔴 wielowarstwowe tła `preview-glass` i panelu → `radial-glow` + `surfaceTint` nad płaskim tłem; zewnętrzny `:before` strip pominięty;
- 🔴 semantyka `role=tablist`/aria — brak; pominięto też `[data-reveal]` scroll-in całego `.wow-panel` (żaden per-section reveal nie utrzymuje panelu);
- 🟢 **naprawione w smoke**: sekcja świeciła jaskrawym cyjanem (`surfacePreset: glass` + aqua-akcent) → usunięty glass; biały placeholder „Media” (sekcja była `media-split` z zarezerwowanym slotem) → zmiana na `feature-grid`; znikający rysunek domu (`composition: layered` układał dzieci absolutnie) → usunięte.

### Realizacje (project grid)
- 🔴 dwuwarstwowe `art-*` (radial glow nad linear) → tylko baza linear + `surfaceTint`;
- 🔴 pierwsza karta „large” (span-2, 2× wyższa, ratio 1.15/.85) → 3 równe kolumny, Aurora tylko wyższy padding nagłówka;
- 🔴 biała sylwetka domu (`.project-art:after` clip-path) + przyciemniający overlay (`:before`) — pseudo-elementy, POMINIĘTE (widoczny tylko badge na gradiencie);
- 🟡 hover: prototyp lift + zmiana border-color na aqua + skala sylwetki → tylko `hoverEffect: lift` (brak aqua-bordera, patrz sekcja 1);
- 🟡 badge weight 950 → clamp `bold`;
- 🟡 per-card reveal stagger (`data-delay 0/80/160`) → `revealDelay` per grupa; honorowanie per-block zależy od tego, czy renderer respektuje `revealDelay` bloku pod `scrollEffect` sekcji.

### Proces (4 kroki)
- 🔴 `.split-head` (h2 lewo / lead prawo, dół) → stack pełnej szerokości;
- 🔴 subtelny pionowy wash `.process-home` (`linear 180deg transparent→rgba(255,255,255,.028)→transparent`) → płaski `#07111f`, wash pominięty;
- 🟡 numer aqua weight 950 → `bold` + `fontSize xl` + aqua;
- 🟡 body kroków dziedziczy `muted` sekcji (brak `textColor` w `t()`);
- 🟡 per-card reveal stagger (`data-delay 0/70/140/210` + `.8s cubic-bezier translateY(22px)→0`) → `revealDelay` + sekcyjny `scrollEffect: reveal-up`; dokładna krzywa easingu i offset 22px DEFINIOWANE PRZEZ ENGINE;
- ℹ️ dodany `hoverEffect: lift` (prototyp ma statyczne karty) — można usunąć dla ścisłej wierności.
- ℹ️ UWAGA: użyto siatki, ale toolkit MA natywny typ sekcji `timeline` (pageDocumentV2.ts:39) i jego renderer daje per-item kropki akcentu + kolumnę-oś markerów: `<span class='mt-1 h-3 w-3 rounded-full ring-4 ring-white' style=backgroundColor:var(--coderso-section-accent)>` w gridzie `grid-cols-[auto_minmax(0,1fr)]` (pageRendererV2.tsx:2468-2499). Kropki i oś-markerów SĄ dostępne natywnie — brakuje tylko CIĄGŁEJ linii łączącej kropki (`.timeline:before` pionowa aqua) i GLOW kropek (natywna kropka ma sztywny biały `ring-white`, nie aqua glow).

### CTA
- 🔴 compound tło `.cta-card` (radial 82%/10% + linear 145deg) → `radial-glow` + `surfaceTint` nad płaskim szkłem; pozycja glow narzucona presetem (nie 82%/10%);
- 🔴 gradient przycisku primary + glow → wariant `primary` (theme-baked; najbliżej);
- 🔴 kreska eyebrow → glif `◆`;
- 🟡 desktop `.cta-card` = flex row space-between (kopia lewo / przycisk prawo) → wyśrodkowany stack (zgodny z responsywnym collapse ≤1060px);
- 🟡 `clamp()` fonty → tokeny `3xl` / `xs`.

---

## 3. „Ciche pułapki” toolkitu (walidacja fail-soft — MILCZĄCO odrzuca)

Te wartości NIE rzucają błędu, tylko są po cichu usuwane/clampowane przy zapisie — łatwo o zły efekt:
- `style.letterSpacing` / `style.lineHeight` to **liczby**, nie stringi (`"-.04em"` → dropowane) — trzeba `-0.04`;
- `style.width` to **enum** `auto|full` — px/% (np. `54px`, `560px`) dropowane;
- `style.column` to **liczba 1..4** (lub null), nie string (`"1 / -1"` poza zakresem → drop);
- `radius > 64` → clamp do 64;
- tła wielowarstwowe (przecinek) → odrzucone przez `isSingleGradientLayer`;
- `surfaceTint`/kolory przechodzą przez `sanitizeAuthoringCssColor` (rgba OK);
- brak odpowiednika `html{scroll-behavior:smooth}` (płynny skok kotwic in-page nav) — kotwice prototypu na tym polegają;
- `::selection` (`rgba(142,232,255,.28)`) — kolor zaznaczenia tekstu bez kontroli (domyślny przeglądarki/motywu);
- `.site-header` (pływająca pigułka nav z `is-scrolled`, backdrop-blur, hamburger→menu) NIE jest treścią strony — to osobne chrome frontu (sticky nav); żadne scroll-reaktywne stylowanie headera nie jest odtwarzalne jako page content;
- `form` (kontakt): pola renderują się z własnym stylem, brak autorowania focus-ring/border pola (prototyp `input:focus` aqua border + `box-shadow 0 0 0 4px rgba(142,232,255,.1)`) — realny gap dla strony kontaktowej (tu nieużyty).

**Wniosek:** twardą bramką walidacji jest uruchomienie buildera (`bun scripts/demo-projekty-domow.tsx`) — `normalizePageDocumentV2ForWrite` przepuszcza dobre enumy i wycina resztę, więc trzeba weryfikować efekt na ŻYWYM froncie, nie tylko „że się zbudowało”.

---

## 4. Sekcje/typy warte dodania do CMS-a (żeby domknąć wierność)

Gdyby rozwijać toolkit pod takie strony wow:
1. wielowarstwowe tła (radial glow + gradient) na sekcji i bloku;
2. WIELOWARSTWOWE/złożone tło na bloku (single-layer gradient już działa — brak wielu warstw);
3. arbitralny kolorowy box-shadow (poświata) + autorowalne kolory stanu hover (border/tło);
4. `text-transform` + dekoracyjna kreska/linia (eyebrow);
5. per-edge border sekcji (border-block); rozłączność `radius` × `fullBleed`;
6. row/col span w siatce + asymetryczne ratio kolumn;
7. płynny font-size (`clamp`/rem) obok tokenów; font-weight > bold; `letterSpacing` w em (dziś tylko px);
8. `textColor` na bloku `text` (helper `t()`); kontrola skinu bloku `statistic` (ciemny wariant);
9. lekka interaktywność (tabs/switcher, filtr) jako prymityw deklaratywny;
10. natywny `timeline` DAJE oś-markerów + kropki akcentu per item (zweryfikowane: pageRendererV2.tsx:2468-2499) — brakuje tylko CIĄGŁEJ linii łączącej kropki oraz GLOW kropek (natywna ma sztywny biały `ring-white`);
11. warstwa grain/noise + `mix-blend-mode`; autorowalny promień `backdrop-filter: blur()` poza presetem glass;
12. efekty (decoration/tilt/surface/marquee) per-device (dziś base-only, `responsive:false`); `marquee.seamless` + dowolny dystans pętli; sufit `layer.z` konfigurowalny.
