# TASK-551 S1 — spina wykonania ręcznego

## Status startowy

- Worktree: /home/coder/project/Coderso-551; gałąź feat/task-551-db-cache;
  HEAD 7bc41f75b9de972ce3ee4d794cf5fce14e08c5cb.
- Drzewo jest współdzielone i brudne. Nie resetować, nie czyścić, nie checkoutować
  cudzych plików; zawsze odczytać aktualne bajty przed własną zmianą.
- TASK-551 i L11: 🚧 In Progress; L01/L03/L04/L02: ⏳ To Do.
- TASK-550/545/511/493/517/518 są ✅ Done, więc external dispatch gate produktu
  jest spełniona (TASK-551...md:674-704).
- L11 ma gotową granicę deklaracji/typów i testowy receipt 87 pass, 0 fail.
  Nie jest gotowy automatyczny runner, lecz ręczne owner-led wykonanie jest
  dozwolone na warunkach AGENTS.md.

## Reguła nadrzędna

task-551-author-audit.mjs i task-551-implement.mjs są kontraktami orkiestracji,
nie runtime aplikacji. Obecny publiczny automatyczny route
runTask551ImplementWorkflow fail-close'uje bez realnych adapterów
(task-551-implement.mjs:644-657). Nie uruchamiać test-only callbacków/seamów
jako zastępczego runnera i nie fałszować automatycznych permitów, snapshotów
ani receiptów.

W produkcyjnym API implementer przyjmuje tylko `authorAuditDispatch` i
`scheduledOccurrenceIds`; po dozwolonym fail-closed preflight odrzuca brak
adapterów przed snapshotem, leaf/child/gate i durable evidence. Wersja
`runTask551ImplementWorkflowForTests` ma callback-rich test seam oraz testowy
permit, więc nie jest ręcznym runnerem. Author-audit umie pobrać zaufany Git
snapshot, ale jego `auditAgent`/`reconcileAgent` wymagają przyszłego,
zatwierdzonego bindingu providera dla automatyzacji.

Ręczny owner/Codex/agent workflow jest osobną, legalną drogą: zachowuje ten sam
graf, single-writer, świeże audyty, gates, evidence, smoke i closure. Dokładne
rozróżnienie jest w L11 :14,930-937 i w rodzicu :888.

## Spina kolejności

    L01(initial) → L03 → L04 → L02 → 02-L01 → 02-L02 → 02-L03 →
    08-L03(initial) → 05-L01 → 05-L03 → 05-L02 → 03-L01 →
    06-L01 → 06-L02 → 06-L03 → 07-L01 → 09-L04(initial) →
    03-L02 → 07-L02 → 08-L01 → 08-L02 → 08-L03(final) → 03-L03 →
    04-L01 → 04-L02 → 09-L01 → 09-L02 → 09-L03 → 09-L04(final) →
    L01(final) → 10-L01 → 10-L02

L11 pozostaje sidecarem bez węzła produktu. Po L04 i przed L02 występuje jego
nieproduktowa bramka: four-test pre-classifier → jeden snapshotowany classifier
→ exact-nine manifest; nie jest to trzeci leaf ani prawo do ręcznej edycji
manifestu.

## Pierwszy ruch: manual L01 initial

1. Przed edycją: odczytaj HEAD/status, L01, rodzica, L11, źródła/testy i diff.
2. Zbierz komplet fresh-context pre-audit + reconcile. Brak wyniku lub
   HIGH/MEDIUM = brak admission.
3. Owner/Codex ręcznie potwierdza aktualny snapshot, external gate, scope,
   jednego writera i occurrence TASK-551-01-L01:initial; nie używa automatycznej
   struktury permitu L11.
4. Writer L01 ma literalnie tylko 26 paths (25 TypeScript + manifest) z
   TASK-551-01-L01...md:46-106,1490-1516; core/** jest read-only inputem.
5. Zapisuje/ocenia dokładne gates L01 initial: trzy Bun suite, CLI initial,
   root types, literalny ESLint, core types/lint, literalny line count i
   git diff --check.

## Aktualne bajty L01

- Zestaw 25 TypeScript paths jest kompletny i bez extra; wszystkie mają <=1000
  linii (dwa pliki są dokładnie na 999, więc kolejne rozszerzenie wymaga
  spójnego splitu).
- Stan lane to recovery-initial: sześć referencji L03/L02 obecne, test L04
  nieobecny, manifest bez row TASK-551. To oznacza wyłącznie DB-free L01
  inventory, bez zależnego runnera/fixture/classifiera.
- Bieżący receipt: 40/40 Bun pass; CLI initial PASS; literalny ESLint PASS;
  line cap i git diff --check PASS.
- Pięć split helperów dynamicznych capability jest zapisanych we wszystkich
  L01/L11 literalnych projekcjach. Auxiliary capability-routes test jest
  bramką L01, ale jest poza L11 barrier/nine-path/recovery.

## Provider — gdy będzie potrzebny automatyczny runner

Najpierw owner musi zatwierdzić provider/model/wersję/profil/schema wyniku,
auth/custody/rotację, permission policy i lifecycle. Host providera ma
wywoływać workflow tylko z zatwierdzonymi rolami/modelami i redagowanymi,
ustrukturyzowanymi dowodami; nie wolno go odpalać w ciemno.

Lokalny OpenCode probe nie ustanowił bindingu: v1.18.23, jawny
9router:ds/deepseek-v4-pro, JSON/noninteractive, bez tajemnic, zakończył się
fallbackiem profilu i zredagowaną kategorią Unknown/server error (exit 1), bez
wynikowego JSON. Claude Code można użyć wyłącznie po wyraźnej decyzji ownera dla
nazwanego scope; nie jest fallbackiem automatycznym.

## Uwaga na walidację globalną

Nie utożsamiać scope'owych receiptów L01 z pełnym repo typecheck/lint w brudnym
drzewie. Jeśli szeroka bramka jest czerwona, odizolować diagnostykę do konkretnego
pliku i nie naprawiać ani nie formatuj masowo cudzych zmian. Brak automatycznego
provider bindingu jest nierozstrzygnięty tylko dla przyszłego automatycznego
runnera — nie blokuje ręcznego wykonania tej spiny.

## Wykonanie 2026-09-02/03 — receipts i stan

- Odebrane wystąpienia (w kolejności spiny): **01-L01:initial**
  (INITIAL_ADMITTED_GATES_GREEN, wariant recovery-initial), **08-L03:initial**
  (istniejący receipt zweryfikowany), **01-L03** (SINGLE_ADMITTED_GATES_GREEN),
  **01-L04** (workflow wf_0c86990d-39f; potwierdzony LOW → per-field non-string
  negatives; fresh re-audit czysty), **bramka klasyfikatora L11**
  (BARRIER_PASSED_L01_GATES_GREEN_MANIFEST_MATERIALIZED), **01-L02**
  (wf_7674d018-d6c; ADMITTED_AFTER_FIX: 1 potwierdzone MEDIUM — brak
  kontraktowego testu export-surface; domknięte w rundzie 1 fix, re-audit czysty).
- Receipts w `_docs/_workflows/_smoke/task-551/`: `impl-01-l01-initial.json`,
  `impl-08-l03-initial.json`, `impl-01-l03.json`, `impl-01-l04.json`,
  `impl-11-classifier-gate.json`, `impl-01-l02-single.json`.
  UWAGA: stary `impl-01-l02.json` jest STALE (sprzed active-v2, pass:false) —
  NIE nadpisywać ani nie usuwać (własność protokołu recovery L11).
- Korekta kontraktowa L01 z datą 2026-09-02 (sekcja :1717-1749, append-only):
  slice = planned + task551-marked MINUS dokładnie pięć skontraktowanych
  literalnych ścieżek (produktów TASK-551-02-L02 / TASK-551-11, przypiętych
  we własnych kontraktach); `bunLane.ts` ma case-insensitive stray predicate
  (case-varied stray odrzucany z realnymi zębami); membership suite przypina
  piątkę jako present/unique/valid-bucket.
- Stan lane po materializacji: `bun scripts/task-551-query-inventory.ts
  --check --phase initial` fail-close'uje (`query_inventory_invalid:
  initial-inventory-state`, zero skanów) — następcą jest `--phase final`
  dopiero na **01-L01:final**. To oczekiwane, nie regresja.
- Piny niezmienne: freezeReceipts.ts sha256 `17da0343…`; manifest
  `0da92555…` (454 rows, 9/9 planned). Pre-existing (właściciel **07-L01**,
  nie naprawiać wcześniej): 2 czerwone testy cache — TTL undefined→throw vs
  test oczekuje null; codec-keys 65534 vs 65536.
- Bariery ownera nietknięte: zero commitów/stagingu, zero połączeń DB,
  real-DB --initialize/--freeze/--check i reviewed-pair promotion zostają
  za chainem commitów, changelog **1310** dopiero na **10-L02**.

## Następny krok i wznowienie

- Postój 2026-09-03 rano na wyraźny rozkaz ownera (peak hours w z.ai) zaraz po
  domknięciu 01-L02; wznowienie **od 12:02 CEST 2026-09-03** (trwały wybudzacz
  ustawiony, job `336f7c48`).
- Kolejne wystąpienie spiny: **TASK-551-02-L01**, potem 02-L02, 02-L03
  (kontrakty: `_docs/_TASKS/TASK-551-02-*.md`). Per wystąpienie: świeży recon
  read-only → adversarial verify (0 HIGH/MEDIUM) → single writer w allowliście
  kontraktu → exact gates → fresh delta re-audit → receipt JSON.
- Zakres: **tylko task 551**. Orkiestracja przez agentów (sonnet
  GLM-5.3-Flash, /workflows; opus tylko przy trudniejszych sytuacjach), wg
  AGENTS.md.

### TASK-551-02-L01 — ADMITTED_CLEAN (2026-09-03)

- Workflow wf_bf2e5e4d-8c0 (11 agentów, 0 błędów). Baseline PARTIAL:
  suite 34/0, ale branch coverage `core/db/databaseConfig.ts` 95% (57/60)
  vs kontraktowe 100%. Oba pliki allowlisty istniały jako drafty z 26.08
  (przypisane przez impl-08-l03-initial.json do strumienia 02).
- Writer (2 pliki): `core/db/databaseConfig.ts` → 443 linie
  (safeAdd/safeMultiply wyeksportowane, bo walidowane granice capują
  intermediates na 27 656 → guards nieosiągalne przez parsery; kontrakt
  ogranicza eksport parserów, client.ts bez zmian); 
  `tests/vitest/db/databaseConfig.test.ts` → 933 linie (34 → 42 testy:
  keyless-message, overflow-guards → budgetOverflow, session-mode pricing,
  fixture-mismatch, purity + export-surface pin).
- Gates: vitest 42/42, coverage 100% branch (60/60), core lint:types 0,
  core lint 0, scoped eslint 0, `lint:repo:types` 0, diff --check czysty,
  canary 8/0/285. Post-audit: 7 findings → 2 LOW potwierdzone (rezydualne,
  zapisane w receipt), 5 odrzuconych z byte-level uzasadnieniem.
- Receipt: `impl-02-l01.json`. Orkiestrator niezależnie powtórzył baterię
  (42/42, 8/0/285, eslint/types 0, piny dokładne, git status 131 == sprzed
  okna). Uwaga: klasifikator bezpieczeństwa providera był rate-limited przy
  ocenie writera — skompensowane niezależną weryfikacją orkiestratora.
- Rezydualne LOW (test-only hardening, nie blokują admission; kandydaci na
  scoped pass później): (1) brak akceptującego testu DISTINCT
  DB_MAINTENANCE_URL przy transaction+DATABASE_URL; (2) catch-all w secret
  non-return scanie zamienia unexpected throw w próżny pass.

### TASK-551-02-L02 — ADMITTED_AFTER_FIX (2026-09-03, wieczór)

- Workflow wf_32103940-de1 (13 agentów; 2 weryfikatory padły na retry capie
  StructuredOutput — provider rate-limit). Baseline PARTIAL; writer domknął
  luki produkcyjne i testowe w 15 plikach allowlisty (client.ts 736,
  runtimeLifecycle 301, runtimeEntrypoint 324, prod 19, dev 53,
  databaseLifecycle 104, queryTelemetry 347, task-551-pg-stat-interval.ts,
  5 suite'ów). Siedem owner barier spisanych (real-DB lifecycle, syntetyczne
  widoki + realne rozszerzenie pg_stat, sesyjne proofy application_name,
  live wiring serwera, reviewed-pair promotion).
- Rozliczenie 15 findingów post-auditu: w flow zweryfikowano tylko 6
  (4 confirmed: 3 MEDIUM → runda 1: pin 2000 ms, clocked 10s drain +
  createShutdownAbsoluteDeadline pre-drain, five diagnostic families; 1 LOW).
  11 osieroconych → oddzielny workflow weryfikacyjny wf_76df9ed8-597:
  **7 odrzuconych NOT_A_DEFECT** (sanitize entrypoint — postgres.js nie
  eksponuje statement text przy debug off; rejestr 1065 vs 1069 → własność
  03-L02, exact-set weryfikuje finalny 01-L01; statementTimeoutMs tylko
  deklarowany w kontrakcie; test-seam load-bearing), **#2 MEDIUM
  potwierdzony** (brak fail-closed dla query-ID reuse z innym digestem),
  4 LOW potwierdzone; #13/#14 zweryfikowane inline (orchestrator): #13
  real LOW, #14 już rozwiążany przez rundę 1 (test clocked 10s jest
  behavioralny: overstep dokończony, jeden globalny budżet).
- Runda fix 2 (9 pozycji, jeden writer): 3 defekty bramek wyłapane
  niezależną baterią orkiestratora (2× martwy import; typ
  `buildIntervalReceipt` bez `cleanAfterDiagnostics` → TS2339), #2
  implementacja + test, **datowana korekta kontraktu** (append-only,
  dziewięć kodów `pg_stat_interval_*` ztriggerowanych z bajtów), piny
  0600/bounds/zero-reset, 2 testy terminacji advisory-lock (branch
  `unlockedExactly===false` stał się deletion-detectable), niezależna
  rekomputacja digestu rejestru (prawdziwa asercja sha256), wymagane
  `signal`/`conflictCode` w `DedicatedAdvisoryLockInput`. Re-audit: CLEAN
  + 2 LOW → mikro-runda: wrap JSON.parse → `pg_stat_interval_evidence_invalid`
  (bez echa payloadu), poprawa 2 cytatów linii w dokumencie (389/430 =
  bajty).
- Finalne gates (niezależnie, real exit codes): bun **56/0/2404** +
  pg-stat **15/0/2250**, vitest **77/77** (z canary databaseConfig 42),
  canary L04 8/0/285, eslint 15 plików **0**, `lint:repo:types` **0**,
  core types/lint **0**, diff --check czysty, piny `17da0343`/`0da92555`
  exact, git status 131 == sprzed.
- Receipt: `impl-02-l02.json`. Następne w spine: **02-L03** (measure wiring
  i pool telemetry gates; ostatnie w rodzinie 02).

### TASK-551-02-L03 — ADMITTED_CLEAN (2026-09-03, noc)

- Workflow wf_53ad40c2-33a (6 agentów, 0 błędów; bez znanych wcześniej
  awarii — wszystkie findingi zweryfikowane, bez slice cap). Baseline
  MISSING_MAJOR: jedyny plik allowlisty nie istniał (0 bajtów). Writer
  autorował `tests/perf/database-pool-telemetry.test.ts` (409 linii):
  real-pool gate na zamkniętej powierzchni L02 (measureDatabaseQuery,
  databaseTelemetry, probeDatabasePoolHealth) przez review'owany fingerprint
  `cache_outbox_oldest_unprocessed`; 5 testów — wiring pins, exact
  closed-snapshot (luźne tylko osie wall-clock z uzasadnieniem), driver_error
  z zachowaniem tożsamości błędu, probe + dowód zwrotu wszystkich sesji w
  `finally` (bounded deadline), sentinel sweep ze strukturalnym domknięciem
  kluczy. Fail-closed przez design: import `core/db/client` bez DB rzuca
  `database_url_missing` — zero skipIf, zero `process.env`.
- Rozliczenie post-auditu: lens A 0 findingów; lens B 1 finding →
  adversarial verify → **odrzucony NOT_A_DEFECT** (mechanika
  `coderso-release-gates.ts` pre-existing od 9ad48e53, własność
  **TASK-551-10-L01**, kontrakt klasyfikuje coderso-gate jako DB-dependent).
  Zero rund fix.
- Bariery ownera (4): wykonanie pool-telemetry-test przez mapę
  `task551-db-test` (live Postgres, >=2 sesje, saturacja probe); brak
  DB-free fake dla probeDatabasePoolHealth (module-level primary pool);
  runner gates:coderso → 10-L01; fail-before-listen/scheduler gate pozostaje
  w suitach lifecycle 02-L02.
- Transparentność: recon błędnie zaliczył coderso-gate do DB-free i agenty
  flow wykonały go kilkukrotnie w oknie. Dowód maszynowy (report
  `.tmp/coderso-release-gates.json`, ostatni przebieg 23:15Z): wszystkie 3
  komendy DB-backed `skipped: true, skipReason: database_url_missing` przy
  ~0.0x s — scrub propagował się przez łańcuch `bun run`, brak jakiegokolwiek
  dowodu diala. Rezydualna niepewność zarejestrowana; gate wykluczony z
  moich baterii; mechanika `.env` → raport do 10-L01.
- Sequencing trap (oczekiwany): nowy plik w gitGoldenLaneFiles →
  `bunLaneManifest.test.ts` **14/2** do regeneracji manifestu na
  **01-L01:final** (membership guard dalej 10/0/154).
- Gates (niezależnie, real exit codes): pool-telemetry scrub exit 1
  `database_url_missing` (dowód fail-closed, 247 ms), core lint:types 0,
  core lint 0, vitest guard 20/20, eslint pliku 0, `lint:repo:types` 0,
  canary freeze 8/0/285, canary databaseConfig 42/42, diff --check 0,
  purity czysty, 409 linii, piny exact, git status 132 == 131 + 1 nowy
  plik.
- Receipt: `impl-02-l03.json`. Rodzina 02 domknięta (02-L01, 02-L02,
  02-L03). Następne w spine: **05-L01**, potem 05-L03, 05-L02.

## 05-L01 — ADMITTED (2026-09-04, 9-rundowa pętla fixów)

- **Incydent (na czele receiptu)**: 2026-09-04 ~07:57 agent round-3-close
  odpalił `bun --cwd <worktree> test <plik>`; bun rozwiązał `test` do skryptu
  z package.json, który `. ./.env` i odpala lane runner na WSPÓLDZIELONEJ DB —
  `bun_worker_0` zdropowany ("drop cascades to 86 other objects"), odtwarzanie
  migracji przerwane SIGTERM (exit 143). Ujawnione szczerze; flow NIE
  remediował zdalnie; stan po incydencie do inspekcji ownera. Od tego momentu
  każdy mandat prepisuje formę airtight (`env DATABASE_URL='postgresql://
  127.0.0.1:1/none' bun --env-file=/dev/null test <pliki>` z cwd w worktree)
  i banuje `bun --cwd … test` / gołe `bun test`. Lekcja w pamięci trwałej.
- Przebieg: R1 authoring (pre-audit 6 findinek ukształtował build;
  IMPLEMENTED_GATES_GREEN) → R2 datowana korekta kontraktowa (drizzle 0.45.2
  `$inferSelect` wymaga każdej zadeklarowanej kolumny; +2 null keys w 4
  konsumerach; post-audit clean) → R3–R9 pogłębiające audyty: findinki
  7 → 10 → 10 → 6 → 3 → 1 → 0. Klasy, które padły po kolei: nieosiągalne
  fazy/maszyna stanów, martwe rozpoznawacze journal-insert, relkind 'i' vs
  'I', kształty runtime postgres.js 3.4.9 (bool→boolean, int4→number,
  `::text` surowe 't'/'f'), enshrine wad w pinach suite, martwe sufity
  preflight, niezjedzony interval predecision 01-L02, fail-open evidence
  fazy-6, overwrite frozen digestu przy resume, niescope'owane sondy
  katalogowe, wyścig statfs (domknięty z konstrukcji: seam
  `injectFreeDiskBytes`, jeden guard finite/positive dla obu gałęzi).
  R7: pełny spis WSZYSTKICH porównań live-value (27 zapytań × typy parsera
  z zainstalowanego node_modules) — od tamtej pory zero niedomkniętych.
- Dostarczenie: split schemy (3 nowe moduły + 14 właścicieli), tripla 0081
  (transakcyjna 0 CONCURRENTLY / 0 CREATE INDEX / dokładnie 1 seam EXCLUDE;
  80 wpisów journalu, tail idx 81) + companion
  `0081_task551_online_indexes.sql` (DDL CONCURRENTLY dla runnera), runner
  `scripts/task-551-online-indexes.ts` 964/1000 linii (lease + PID proof na
  sparsowanych kształtach, reverse z per-member CAS, poisoned lease =
  brak SQL/nie release, sufity health w kanonicznym digescie preflight,
  write-cost gate `TASK551_WRITE_COST_EVIDENCE` + `TASK551_AUTOSCALING_ENABLED`,
  zamknięty zbiór 20 kodów), suite deployment dokładnie 1000 linii
  (49 testów / 2299 expect), łącznie 9 plików testowych.
- Gates (moje, niezależne, real exit codes, forma airtight): bateria 7
  plików **79 pass / 16 skip / 0 fail / 3373 expect** (16 skip = testIfDb,
  owner-executed), suite ×2 identycznie 49/0/2299, vitest 14/14, unit db
  102/0, root+core tsc 0, core lint 0, eslint obu plików 0, generate
  offline zero-drift, piny exact (`17da0343…`, `0da92555…`), diff --check 0.
- Adjudicacje: preflight.digest ≠ aggregateSha256 (wiąże stany pre-DDL);
  reverse bez health rechecku z designu (:303-314); H-4 reużywa
  receiptConflict (zbiór 20 kodów zamknięty); nowe env-sygnały
  kontraktowo-nienazwane, celowe — flagged dla 05-L02/L03.
- Receipt: `impl-05-l01.json` — verdict **SINGLE_ADMITTED_GATES_GREEN**
  (2026-09-04T20:57:52Z, hash runnera `882ea4e5…`, suite `d6410f82…`).
  5 agentów zginęło na StructuredOutput retry-cap — wszystkie ratowane
  z transkryptów, zero utraconej pracy. Rezydualne LOW poza surface:
  auth.test.ts:90 (linia ownera lane'u routes). Następne w spine:
  **05-L03** (task551SolutionKitRollbackAuthoritySchema.test.ts), potem
  05-L02 (konsumuje redacted l05-concurrency-receipt@v1).

## 05-L03 — ADMITTED (2026-09-05, 3 rundy; rodzina 05 zamyka się 05-L02)

- Leaf test-only: jedyny plik `task551SolutionKitRollbackAuthoritySchema.test.ts`
  (allowlist kontraktu :801-803), dokładnie **1000 linii**, 14 statycznych
  pass + 6 żywych za `testIfDb` (538 expect). Eksport
  `EXACT_L01_SOLUTION_KIT_ROLLBACK_AUTHORITY` (4 tabele / 49 kolumn / 10 FK
  z target+action / 6 checków z pełnym SQL / 14 wierszy indeksów / 9 nazwanych
  checków) — kontrakt konsumpcji dla L02 :135/:157-162. Zero bajtów
  produkcyjnych napisanych; dated APPEND-ONLY korekta kontraktowa :861-915
  (powierzchnia six-count preflight → owner-routed residual do 10-L01).
- Przebieg: recon `READY_WITH_CONTRACT_GAPS` → R1 autoryng + korekta
  (audit 8 findinek, 4 HIGH: fixtury żywej połowy naruszały własne checki —
  niemożliwe ramiona, niedopuszczalny helper, bind 'zzzz' na uuid, kompozyt
  FK) → R2 „landed bytes są jedyną prawdą" (6 findinek: release-parity bez
  kolumny phase → 23514, martwy persist w modelu = tautologie, 8. artefakt
  .js poza core, liczenie VALUES zamiast tuples, wąski guard, brak size-pinów)
  → R3 wszystkie naprawione, verify **CLEAN, 0 findinek**.
- Dyscyplina: R1 auditor sam naprawiał (130 Editów — „touch ONLY" poczytane
  jako permit); bajty potraktowane jako nieprzejrzane, od R2 twarde
  **STRICTLY READ-ONLY** w każdym mandacie audytu (lekcja w pamięci trwałej).
- Gates (moje, real exits): suite ×2 identycznie 14/6/0/538; bateria 8 plików
  **93 pass / 22 skip / 0 fail / 3911 expect** (arytmetyka exact 79+14 /
  16+6 / 3373+538); unit db 102/0; manifest 14/2 = kontraktowe czerwone
  (463-vs-454, regeneracja tylko 01-L01:final); vitest 14; root+core tsc 0;
  core lint 0; eslint 0; generate zero-drift (nadal 3 pre-L01 pliki);
  reziduum .js = 0; piny exact; journal 80/tail 81.
- Receipt: `impl-05-l03.json` — **SINGLE_ADMITTED_GATES_GREEN**
  (2026-09-05T02:57:33Z, hash suite `8424bb44…`). Żywa połowa zdysk-checkowana
  względem lanowanych bajtów (predykaty cytowane in-source), wykonanie
  real-DB = bariera ownera. Następne w spine: **05-L02** (zamyka rodzinę 05),
  potem 03-L01.

## 05-L02 — fix loop R1-R5 + incydent formatu (stan 2026-09-05 wieczór)

- R1 (wf_f14f6b82-e99): autoryng per-file — S1 fixtura 1292L (ujawnione
  złamanie konwencji), S2 CLI 577L fail-closed, S3 970L, S4 1257L; audit
  10 findinek (3H/4M/3L). R2 (wf_d0d2df34-5c7): 11 findinek naprawionych
  rzeczowo (normalizacja sygnatur proc 9/9, EXCLUDE wspólną ścieżką
  kanoniczną, pełne porównanie indeksów, pg_get_expr, freeze gate,
  combined p95, ACTUAL rows, mutation arms); re-audit 1M+4L. R3
  (wf_abe95709-10d): domknięte (syntetyczny katalog S3 → airtight wykonanie
  nowych ścieżek + 14 ramion mutacji; actual-rows w S4; doc-forma CLI);
  verify clean poza pustym `.tmp/task-551/` (pre-existing, tolerowane).
- R4 (wf_530ea84c-a08): 7 błędów root-tsc (S1×2, S3×2, S4×3) naprawionych
  (fixer S4 zginął na StructuredOutput retry-cap — edity salwowane
  z transkryptu i zweryfikowane bezpośrednio); root tsc **0**, core tsc 0.
- **INCYDENT FORMATU (2026-09-05)**: owner autoryzował bieżące commity na
  worktree („pamiętaj commitować na bieżąco"); pierwszy snapshot-commit
  `62438e4e` odpalił pre-commit hook `format-staged.ts` → **160 plików
  przepisanych** ze stylu long-line flow na kanoniczny zawijany (root tsc,
  core lint/tsc, eslint w hooku zielone; semantyka zachowana). Pin manifestu
  zmienił bajty `0da92555…`→`3a522218…` (treść ta sama — test dalej
  **14/2**, ta sama klasa golden-count; nowy hash do ujawnienia w receipcie,
  regeneracja nadal własność 01-L01:final). Historyczne hashe w receiptach
  odnoszą się do stanu pre-format (append-only, nie przepisuję).
- Sweep po formacie: S3 64/6/0 i L03 14/6/0 zielone; suite deploymentu
  L01 **26/49 fail** (piny sha/lines runnera), S4 **1 fail** (self-source
  contract), query-inventory **1 fail** (immutable receipt vs sformatowany
  skan), pool-telemetry **3 fail** — **nie format**: regresja fail-closed
  z 02-L03 (import `database_url_missing` przestał failować, gdy 05-L01
  wprowadziło `core/db/databaseConfig.ts`; niezabezpieczone testy real-pool
  odpalają się bez mapy ownera). Vitest cache 1+1 = znane pre-existing
  czerwone własności 07-L01. `task551WorkflowContracts` 2 fail = pre-existing
  seam-red (01/L11, osobny trop).
- R5 (wf_6b490c60-3a1): rebaseline WYKONANY — deployment 130 pinów
  re-bound 1:1 (49/0/2299), S4 self-source contract re-bound (27/0/1897),
  query-inventory receipt ZREGENEROWANY lanowanym skanerem L01 (po
  weryfikacji DB/env-free; 1150==1150 wierszy, tylko 16 komórek linii
  + 2 digesty; 23/0/6190), pool-telemetry bramka owner-map PRZYWRÓCONA
  (skipIf na 3 testach real-pool; 2/3 skip/0). Verify: SOUND (1 LOW
  księgowy: 128 vs 130 w prozie).
- **05-L02 ADMITTED** 2026-09-05 (`impl-05-l02.json`,
  SINGLE_ADMITTED_GATES_GREEN) na bajtach kanonicznych. Bateria 12 ścieżek
  **206 pass / 13 skip / 0 fail / 19163 expect**; root+core tsc 0; generate
  **zero-drift na sformatowanych modułach**; manifest 14/2 (kontraktowe);
  vitest 14; CLI fail-closed ×2; piny: freezeReceipts `17da0343…` (bez
  zmian), manifest `3a522218…` (drift bajtowy ujawniony, treść ta sama).
  Canonical hashe: S1 `83179c31…` (4142L), S2 `e851021c…` (757L),
  S3 `7576ab9b…` (2661L), S4 `5af207c1…` (2576L), L03 suite `369b5ba8…`
  (2182L), runner `71fd8520…` (2959L), inventory fixtura `9abc05cf…`
  (30741L). Limity linii (>1000) ujawnione w receipcie (formatter = polityka
  repo; allowlisty zabraniają splitów).
- Rezidualne czerwone: **`task551WorkflowContracts` ZAMKNIĘTE** (2026-09-05
  późny wieczór, wf_a7aee7f5-6a0): root cause — canned payload harnessu
  pisał artefakt bez `noLeak` (parser wymaga exact 7 kluczy; test z 09-01
  pisany przed lanem parsera, nigdy nie wykonany do dziś). Jedno-edytowa
  reconciliacja (keep noLeak), 25/0/385 ×2, read-only verify CLEAN, zero
  osłabień (oba negatywne ramiona dalej asertują swoje rejection regexy).
  Pozostaje: vitest cache 2 (własność 07-L01 wg spiny); manifest 14/2
  (kontraktowe, do 01-L01:final).
- Następne w spine: **03-L01**, potem 06-L01 → 06-L02 → 06-L03 → 07-L01.

## 03-L01 (Shared Keyset Cursor And Bounded Read Contracts) — w toku (2026-09-05 wieczór)

- Recon (wf_3d0712f9, read-only): verdict **READY_WITH_CONTRACT_GAPS**. Wszystkie 6 plików
  allowlisty istnieje i należy do tego leafa (weszły do gita w snapshocie `62438e4e`,
  bez walidacji; zero adopcji poza 3 plikami core; `core/services/database/` i
  `tests/vitest/database/` zawierają WYŁĄCZNIE pliki allowlisty). Implementacja pokrywa
  kontrakt: MAC-all-candidates constant-time, b64url 2-segment, TTL 24h+60s skew,
  keyring rotation/retired, 16-rzędowa tabela comparatora, ORDER BY reversal, limit+1,
  parsePageLimit 50/100, piny nazw eksportów, czystość importów, lifecycle handoff.
- **Brak (jeden)**: test kolejności weryfikacji (doc L276-279) — instrumentacja
  wszystkich kandydatów HMAC, zero dostępu do payload-JSON/keyVersion przed
  bounded comparisons. Dodawany w R1 (keysetCursor.test.ts, bez edycji produkcji).
- **Defekty kontraktu** (ujawnione, nie naprawiane — doc to forbidden file):
  M1 doc L265-268 wymaga truth-table „against PostgreSQL", ale envelope działa
  profile none → noga PG nieegzekwowalna; L2 impl pinuje dodatkowo asc/last;
  L3 impl+testy pinują 2 kody więcej niż wylicza doc L208-212
  (pagination_cursor_config_invalid, bounded_read_window_overflow);
  L4/L5 sygnatury (toBoundedPage object-arg, buildKeysetPredicate 3-arg);
  L6 doc L309 „source .env" sprzeczne z L339-341 database-free.
- Baza bramek (moje własne runy airtight na HEAD `bb7d7cad`): keysetCursor 32/0
  (vitest), paginationCursorLifecycle 4/0/17 (bun), boundedReadContract **19 pass /
  1 FAIL** — noga „executes all 16 modes on real PostgreSQL" ma guard na samą
  OBECNOŚĆ `DATABASE_URL`, forma airtight ustawia martwy URL → próba połączenia.
  Ten sam mechanizm co regresja pool-telemetry z R5; naprawa w R1: gate owner-map
  (mirror 1:1 z tests/perf/database-pool-telemetry.test.ts, ZERO zmian asercji).
- workflowContracts 25/0/385 potwierdzone na HEAD po commicie #3 (`bb7d7cad`).
- R1 (wf_d7e25c1b) w toku: 2 author-agenty per-file (A: test kolejności;
  B: gate alignment) + verify per plik, STRICTLY READ-ONLY. Następnie moje bramki
  wolne + bateria admission + receipt `impl-03-l01.json` + commit #4.

- **03-L01 ADMITTED** 2026-09-05 (`impl-03-l01.json`,
  SINGLE_ADMITTED_GATES_GREEN): R0 recon (READY_WITH_CONTRACT_GAPS, korekta
  recona — noga PG NIE skipowała pod formą airtight) → R1 (wf_d7e25c1b):
  +1 test kolejności MAC-vs-parse w keysetCursor.test.ts (mutant-check
  autorza; produkcja nietknięta, PROD_CLEAN zweryfikowane), gate owner-map
  w boundedReadContract.test.ts (mirror pool-telemetry R5, asercje
  byte-identical; 19 pass / 1 skip / 0 fail). Bateria: vitest 52/1skip/0,
  lifecycle 4/0/17, pool 2/3/0, workflowContracts 25/0/385, manifest 14/2
  (kontraktowe), root tsc 0, wc 754/512, diff --check clean. 6 defektów
  kontraktu ujawnionych w receipcie (1M+5L); eslint 314:64 pre-existing
  (2× niezależnie na HEAD). Produkcja 3 plików core nietknięta.
  Następne w spine: **06-L01**, potem 06-L02 → 06-L03 → 07-L01.
