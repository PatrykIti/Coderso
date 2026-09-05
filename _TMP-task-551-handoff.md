# TASK-551 — handoff ręcznego prowadzenia prac

**Stan zapisany:** 2026-09-01
**Worktree:** /home/coder/project/Coderso-551
**Gałąź / HEAD:** feat/task-551-db-cache / 7bc41f75b9de972ce3ee4d794cf5fce14e08c5cb

To jest czarno-na-białym szablon i checklista dla dalszego, ręcznie
prowadzonego wykonania TASK-551. Nie oznacza, że TASK-551 lub L01 są zakończone,
i nie jest automatycznym zezwoleniem na uruchamianie workflow albo komend z
uprawnieniami do danych. Drzewo jest silnie brudne i współdzielone: nie czyścić,
nie resetować, nie przełączać worktree ani nie traktować cudzych zmian jako
własnych.

## Co jest już prawdziwe

- Rodzic TASK-551 i TASK-551-11 mają status 🚧 In Progress; L01 oraz jego
  rodzeństwo pozostają ⏳ To Do.
- Zewnętrzna bramka produktu nie jest już blokadą: TASK-550, TASK-545,
  TASK-511, TASK-493, TASK-517 i TASK-518 są ✅ Done. Dowód:
  _docs/_TASKS/TASK-551_Scalable_Database_Query_And_Cache_Optimization.md:8-10,674-704
  oraz nagłówki tych sześciu zadań.
- L11 ma wdrożoną i sprawdzoną granicę deklaracji/typów: cztery test-only
  deklaracje .d.mts, publiczny argument unknown dla projekcji dowodu oraz trzy
  istniejące testy workflow. Świeży przebieg task551AuthorAudit,
  task551WorkflowContracts i task551EvidenceContract: 87 pass, 0 fail.
- L01 ma już w drzewie roboczym, lecz nadal niezatwierdzony formalnym ręcznym
  admission, pełny zamknięty zestaw implementacji: 21 modułów skanera/fasady,
  fixture i trzy testy, czyli 25 plików TypeScript; z manifestem daje to 26
  literalnych ścieżek allowlisty. Porównanie filesystemu z envelope L01:
  missing: [] i extra: [].
- Najważniejsze elementy L01 są realne, a nie tylko opisane: fasada CLI jest w
  scripts/task-551-query-inventory.ts:1-31, ścisła gramatyka/stan/odbiór w
  scripts/task551QueryInventory/check.ts:46-127, a kontrola dokładnego planu
  Bun w scripts/task551QueryInventory/bunLane.ts:203-319.
- Pięć wydzielonych modułów bezpieczeństwa dynamicznych capability jest objętych
  zamkniętą własnością L01 i L11: gscDynamicCapabilitySafety.ts,
  literalDynamicCapabilityFactories.ts, literalDynamicCapabilityTypeFlow.ts,
  literalDynamicCapabilityOpaqueTypeFlow.ts oraz
  literalDynamicCapabilitySafety.ts. L11 zapisuje je literalnie w proweniencji
  (_docs/_TASKS/TASK-551-11-Workflow-Audit-And-Evidence-Sidecar.md:95-123), a
  test kontraktu pin'uje pełną piątkę
  (tests/unit/workflows/task551WorkflowContracts.test.ts:452-495).
- Osobny test tests/perf/database-query-inventory-capability-routes.test.ts jest
  bezpośrednią bramką L01, ale świadomie nie należy do dziewięciu ścieżek
  lifecycle, czterech testów pre-classifier ani snapshotu/barrier L11. Reguła
  jest w L01 :172-177 i teście workflow :428-495.

## Obecny, sprawdzony stan L01

Aktualny worktree jest dokładnie stanem recovery-initial, nie
post-finalization:

1. Obecne są sześć referencyjnych ścieżek L03/L02:
   task551FixtureTargetBootstrap.test.ts, database-query-baseline.test.ts,
   digestContract.test.ts, fixtureTarget.test.ts, reviewedPairPersistence.test.ts
   i runnerLifecycle.test.ts.
2. Test L04 freezeCandidateGenerationBootstrap.test.ts nie istnieje.
3. W tests/bun-lane-manifest.json nie ma jeszcze żadnego wiersza TASK-551.

To jest dopuszczony wariant L01: może wykonać wyłącznie DB-free inventory,
bez testów zależnych, fixture, procesu, dowodów i klasyfikatora. Definicja i
zakazy są w L01 :198-253; bieżący test pin'uje wariant w
tests/integration/server/task551BunLaneMembership.test.ts:136-179.

Świeże, wykonane na aktualnych bajtach dowody L01:

    bun test tests/perf/database-query-inventory.test.ts \
      tests/perf/database-query-inventory-capability-routes.test.ts \
      tests/integration/server/task551BunLaneMembership.test.ts
    # 40 pass, 0 fail

    bun scripts/task-551-query-inventory.ts --check --phase initial
    # task551-query-inventory: PASS

    bunx eslint --max-warnings=0 <dokładne 25 ścieżek L01 z kontraktu>
    # exit 0; tylko ostrzeżenie narzędzia o legacy .eslintignore

    wc -l <dokładne 25 ścieżek L01>
    # każda <= 1000; najbliżej granicy:
    # clientNamespaceAssignments.ts=999, database-query-inventory.test.ts=999,
    # fixture=970, typeFlow=972, safety=981

    git diff --check
    # exit 0

Test capability-routes sprawdza m.in. const/alias computed member, chain,
ekstrakcję/destructure metody, call/bind, konstruktor, Promise/callback,
tablicę, logical flow i przepływ GSC
(tests/perf/database-query-inventory-capability-routes.test.ts:480-577).
Nie wolno rozluźniać tych asercji, aby dopasować skaner do niezweryfikowanej
ścieżki.

## Workflow L11 a runtime aplikacji

_docs/_workflows/task-551-author-audit.mjs i
_docs/_workflows/task-551-implement.mjs są szablonami/kontraktami orkiestracji
zadań, **nie** runtime aplikacji Coderso ani zwykłymi narzędziami produkcyjnymi.
Obecna gałąź celowo fail-close'uje automatyczną, wewnątrzprocesową ścieżkę
runTask551ImplementWorkflow: nie ma realnego owner-controlled providera, a
implementer odrzuca brak adapterów przed snapshotem, leaf albo gate
(task-551-implement.mjs:644-657). Callback-rich API jest wyłącznie seamem
testowym, a nie obejściem.

Dokładna granica API jest istotna przy dalszej pracy. Produkcyjny
`runTask551ImplementWorkflow` przyjmuje tylko `authorAuditDispatch` i
`scheduledOccurrenceIds`; może zweryfikować nieprzezroczysty permit i wykonać
fail-closed preflight, ale kończy się
`task551_implement_production_adapters_unavailable` zanim pozyska autorytatywny
snapshot, uruchomi leaf/child/gate albo zapisze durable phase evidence.
`runTask551ImplementWorkflowForTests` otwiera callback-rich, test-only seam z
testowym permitiem i sesją; nie jest komendą dla ręcznego wykonawcy. Z kolei
`runTask551AuthorAuditWorkflow` pobiera produkcyjny snapshot przez zaufany Git,
ale przyjmuje funkcje `auditAgent` i `reconcileAgent`. Bez zatwierdzonego przez
ownera bindingu providera oba moduły pozostają wzorcem/checklistą kontraktu,
a nie autonomicznym workerem aplikacji.

To ograniczenie automatycznego runnera **nie blokuje** ręcznego, owner-led
wykonania istniejących leafów przez Codex i uprawnionych agentów zgodnie z
AGENTS.md. Korekta L11 i rodzica zapisuje to wprost:

- automatyczny route pozostaje fail-closed;
- test-only callback/seam nie może wyprodukować udawanego permitu, snapshotu
  ani receiptu automatycznego runnera;
- ręczna ścieżka zachowuje pełny graf, single writer, audyty, gates, evidence,
  smoke i closure, a nie uruchamia workflow na skróty.

Patrz _docs/_TASKS/TASK-551-11-Workflow-Audit-And-Evidence-Sidecar.md:14,930-937
i rodzic TASK-551...md:888.

## Dokładny porządek grafu produktu

L11 jest sidecarem, a nie dodatkowym węzłem produktu. Obowiązująca kolejność
32 occurrence jest następująca:

    01-L01:initial → 01-L03 → 01-L04 → 01-L02 →
    02-L01 → 02-L02 → 02-L03 → 08-L03:initial →
    05-L01 → 05-L03 → 05-L02 → 03-L01 →
    06-L01 → 06-L02 → 06-L03 → 07-L01 →
    09-L04:initial → 03-L02 → 07-L02 → 08-L01 → 08-L02 →
    08-L03:final → 03-L03 → 04-L01 → 04-L02 →
    09-L01 → 09-L02 → 09-L03 → 09-L04:final →
    01-L01:final → 10-L01 → 10-L02

Źródło: canonical JSON w rodzicu
_docs/_TASKS/TASK-551_Scalable_Database_Query_And_Cache_Optimization.md:966+.
Pomiędzy L04 i L02 pozostaje nieproduktowa bramka L11 (four-test
pre-classifier → jednorazowy classifier → exact-nine manifest), ale nie tworzy
kolejnego leafa ani nie zmienia kolejności L01 → L03 → L04 → L02.

## Następna ręczna kontynuacja: L01 initial

1. **Zamroź kontekst przed pisaniem.** Odczytaj ponownie HEAD, pełny
   git status --short, L01, jego rodzica, L11 oraz aktualne źródła/testy L01.
   Nie adoptuj istniejących untracked bajtów automatycznie.
2. **Wykonaj świeżą rundę pre-audytu.** Wymagane są kompletne wyniki
   fresh-context audytów plus reconcile; każdy finding należy zweryfikować
   lokalnie. HIGH/MEDIUM lub brak wyniku oznaczają brak admission. Wymóg:
   AGENTS.md:208-245,297-316.
3. **Zapisz ręczne admission/evidence.** Owner/Codex potwierdza aktualny
   snapshot źródeł, external gate, dokładny scope L01, jednego piszącego i
   rozpoczęcie occurrence TASK-551-01-L01:initial. Nie twórz ani nie naśladuj
   automatycznego permitu/receiptu L11.
4. **Jeden writer L01.** Może dotknąć wyłącznie 26 literalnych ścieżek z
   L01 :46-106,1490-1516; core/** jest tylko wejściem skanera. Nie zmieniaj
   L03/L04/L02, workflow, task/changelog, package.json ani manifestu ręcznie.
5. **Wykonaj dokładne gates occurrence initial.** Są to trzy Bun suite,
   --check --phase initial, root lint:repo:types, literalny ESLint 25 ścieżek,
   core lint:types, core lint, literalny wc -l oraz git diff --check
   (L01 :1287-1396,1533-1693). Błędy globalne należy odizolować do nazwanych
   plików; nie przypisywać ich L01 bez dowodu.
6. **Dopiero potem L03, L04, L02.** L01 initial nie uruchamia dependent suite
   ani classifiera. Po materializacji siedmiu zależnych testów L11 wykonuje
   osobno pre-classifier i jednorazową, snapshotowaną klasyfikację.

## Jak uruchamiać z providerem

Provider host ma najpierw zostać wybrany przez ownera, a następnie jawnie
skonfigurować/wywołać workflow z zatwierdzonymi rolami/modelami i
ustrukturyzowanym, redagowanym dowodem. Musi mieć: nazwę dostawcy, dokładny
model i wersję, checked-in profil/konfigurację z tożsamością integralności,
zamknięty schema wyniku/błędu, sposób auth/custody/rotacji, least privilege i
lifecycle należący do ownera. Nie wolno po prostu uruchomić
task-551-implement.mjs lub wstrzyknąć callbacków z testów.

Aktualny probe lokalnego OpenCode nie ustanowił takiego bindingu: opencode
wersji 1.18.23 przy pojedynczym, nieinteraktywnym wywołaniu JSON z jawnym
9router:ds/deepseek-v4-pro nie zaakceptował żądanego profilu subagenta jako
primary, przeszedł do default agenta i zwrócił zredagowaną kategorię
Unknown/server error (exit 1), bez użytecznego JSON acknowledgement. Nie
drukowano ani nie odczytywano credentiali i nie wykonano retry. To nie jest
provider contract.

Zasady AGENTS.md pozostają wiążące:

- domyślny implementer OpenCode coder: 9router:ds/deepseek-v4-flash;
- świeże audyty: zatwierdzony zestaw 9router:ds/deepseek-v4-pro,
  9router:ds/deepseek-v4-pro-max i pomocniczo 9router:glm/glm-5.3;
- fallback openai/gpt-5.6-terra tylko w opisanym wyjątku i z handoffem;
- Claude Code tylko wtedy, gdy owner **jawnie wybierze go dla nazwanego scope**;
  nie jest automatycznym fallbackiem.

Brak automatycznego provider bindingu pozostaje nierozstrzygnięty dla przyszłego
automatycznego runnera, ale nie zatrzymuje ręcznego procesu agentowego.

## Znane granice walidacji

- Pełny wynik root bun run lint:repo:types nie jest zapisanym receipt'em tej
  notatki; nie zakładaj zielonego wyniku na podstawie gates częściowych.
  Przy następnej admission przypisz każdą diagnostykę do konkretnego pliku.
- Whole-repository formatter/lint mogą widzieć równoległe, nie-L01 zmiany w
  silnie brudnym worktree. L01 kontrakt wymaga literalnego scoped ESLint i
  line-count; nie masowo formatuj współdzielonych plików, aby ukryć cudzy drift.
- tests/bun-lane-manifest.json ma pozostać niezmieniony w recovery-initial.
  Jedyna późniejsza mutacja jest dokładnie jednorazowym bun
  scripts/bun-lane-classify.ts po L03+L04+L02 i pozytywnej bramce L11.
