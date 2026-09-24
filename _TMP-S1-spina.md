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
- 03-L01 post-commit (`801334e2`): hook format-staged — 3 pliki **unchanged**
  (bajty admission = kanoniczne, hashe z receiptu ważne); rerun vitest
  52/1skip/0 identycznie; drzewo czyste. Scope repo-eslinta potwierdzony
  (`{server,services,ui,db,src}` — tests/vitest/ poza bramką).

## 06-L01 (retention family) — w toku (2026-09-05 noc)

- Recon (wf_099b11a8, read-only): verdict **READY_WITH_CONTRACT_GAPS**. Allowlista
  31 plików (20 prod + 11 testów); **20 missing/pre-change**: 14 prod brakuje
  (retentionPolicy, appendHeavyRetentionRegistry, 8 retention services,
  searchHistoryContract, searchHistoryRetentionService, legacyRollbackProgressDigest,
  solutionKitRetentionService), 2 sprzeczne (searchHistoryService — inline
  pruneHistory/preflight do usunięcia wg L70-80; actionExecutionStore — execution+undo
  w JEDNEJ transakcji wg L590-596), trafficRepository — wyciąć inline-prune (L67-70).
  Istniejące 5 testów pre-change / 6 testów brakuje.
- **Defekty kontraktu** (ujawnione): M1 Validation Commands każą „source .env" — to
  narusza twardą formę airtight; envelope L873/887/898 (`bun --env-file=/dev/null` +
  task551-db-test) jest zgodny i NADPISUJE prozę; M2 Testing Requirements nie mają
  gate'ów owner-map — obowiązują kanoniczne wzorce (pool-telemetry L61-65 /
  boundedReadContract L421-430). LOW: deps L9 vs envelope L835 (oba lądowały),
  stare komentarze TASK-483 w parach traffic, L703 wskażówka na
  task551DatabaseBudgets.ts (nie-allowlista → binding read-only do
  task551DatabaseScale.ts), limit 1000L ciasny dla legacyRollbackProgressDigest.
- Prereqy na ziemi: nic nie importuje 14 brakujących modułów (czysty start);
  tabele 05-L01 (rollbackProof, owners/legacyEvidence/legacyProgress) są;
  zamrożony zegar 01-L02 (2036-01-01, task551DatabaseScale.ts L33) zgodny z
  L651-654; searchRoutes.ts:76 ignoruje zwrotkę recordSearch — zmiana sygnatury
  kompiluje bez edycji routes.
- R1 (wf_302630b5) w toku: 9 author-agentów Wave A równolegle → bariera → 3
  DB-suite'y (owner-map) → 12 verify read-only. Potem moje bramki wolne + bateria
  + receipt `impl-06-l01.json` + commit #5.

- **06-L01 R1 wynik** (wf_302630b5; 18 agentów, 17 done): 9/9 grup na dysku
  (20/20 prod, 8/11 testów); CLEAN: retentionPolicy (137/0), searchHistoryContract
  (19/0), store tx-wrap. 6× FINDINGS. **Śmierć #7**: A2 (registry) zmarł na
  StructuredOutput retry-cap PO wylądowaniu pliku (527L na dysku, verified) —
  przez to `landed===8` i **Wave B (3 DB-suite'y) nie wystartowała** (gate w
  skrypcie). Findings R1: **HIGH systemowy** — licznik deleted czyta `rowCount`,
  a postgres.js wystawia `count` → deleted zawsze 0 → drain po 1 paczce (8
  jednolitych serwisów + access + audit + trafficRepository); HIGH kit — proof
  szablonu nie przeliczony (hash zapamiętanych digiestów → usuwa zamiast
  proof_invalid); MED: unique-identity w combined parserze (A3), normalizacja
  strict path (A5), dry-run analytics (A6), cap kit bez evidence, unbudgeted
  child sweeps (assistant/forms); LOW: martwy maybePruneExpiredTraffic,
  hardcoded KEEP_NEWEST_PER_USER, komentarze registry, inventowane kody błędów.
  **Do mojej ręki po R2**: frozen query-inventory czerwony 1205 vs 1150 (call
  site'y leafa) → regeneracja skanerem L01 + machine-check diff (procedura R5).
- R2 (wf_a9a94cec) w toku: 6 fixerów → bariera → B1/B2/B3 (suite'y owner-map) →
  9 verify. Potem: moje bramki wolne, regeneracja inventory, bateria, receipt
  `impl-06-l01.json`, commit #5.

- **06-L01 R2 wynik** (wf_a9a94cec; 18/18, zero błędów): count-bug naprawiony we
  WSZYSTKICH 11 modułach bounded-delete (postgres.js `count`, stub-y driver-accurate;
  konwergencja zpinowana: 10×500+200+0, caps trzymają); analytics dry-run wg L614-622
  (zero DELETE, obserwacyjne count; nogi airtight (5)/(5b)); martwy
  maybePruneExpiredTraffic usunięty; identity-uniqueness w combined parserze
  (mutational proof); normalizacja strict path przed bound 2..200; KEEP_NEWEST
  z constant; hygiene registry (nagłówek/komentarz/kody). **Wave B wylądowała CLEAN**:
  B1 9/4skip/0 (994L, gate byte-identical z kanonem), B2 8/6skip/0 (891L; 14 rodzin/
  7 exemptions; schema-sweep realnie wykonany), B3 37/2skip/0 (859L; sufity zgodne
  3-krotnie: fixture=policy=registry; sentinel 2001). Verifies: 4 CLEAN, 5 FINDINGS
  → R3: MED terminality predicate kit (L209-211/L424-427), HIGH coverage (kit graph
  zero testów behawioralnych; preview/forms/assistant untested AND uncalled, B2 ma
  6/9 rodzin), assertion-loss listRecentSearches (3 asercje), ternary→verbatim skipIf,
  source-guardy L685-687, kłamliwy header retentionPolicy. LOW ujawniane bez walki:
  4 kody spoza zamkniętego zbioru (graph_unresolved, digest_schema/_value_invalid,
  idempotency_namespace_invalid).
- R3 (wf_4ada1fe8) w toku — ostatnia runda 06-L01: G1 (terminality + coverage B2→9
  rodzin + B3 kit nogi), G2 (restauracja asercji search), G3 (nagłówek). Potem moje
  bramki wolne + regeneracja query-inventory (1205 vs 1150) + bateria + receipt +
  commit #5.

- **06-L01 R3 wynik** (wf_4ada1fe8; 5/6, verify G2 zmarł na retry-cap — śmierć #8,
  substytuowane moim spot-checkiem + rerunami G1): G1 CLEAN — terminality
  predicate `solutionKitRetentionGraphIsTerminal` (L209-211/L424-427; non-terminal
  → graph_unresolved skip, zero deletes; mutational proof: wpuszczenie „planned"
  flipuje graph_unresolved→proof_invalid i przewala nogi), B2 rozszerzony do
  9/9 rodzin (3 nowe nogi DB skipują czysto; 8/9skip/0, 999L), B3 +5 nóg kit
  (42/2skip/0, 995L, 998L serwis); G2 naprawiony (18 pass/3 skip/0, 118 expect;
  listRecentSearches ×10, verbatim skipIf L151, source-guardy; potwierdzone
  moim grepem); G3 nagłówek prawdziwy (137/137; FINDING tylko o niedowodliwości
  „comment-only" na untracked — do ujawnienia). Wszystkie 31 plików ≤1000 (max 999).
- **06-L01 R4 w toku** (wf_854cfb58): 12 błędów typów (root 10 + core 2) na 6
  plikach — 4 fixerów (T1 core prod: assistantRetentionService SQLWrapper,
  digest generic T; T2 store-suite nulls ×4; T3 insert partials + nazwy eksportów
  executorów w 2 unit suite'ach; T4 digest-test unknown/symbol). Równolegle agent
  regeneracji query-inventory (1207 vs 1150; driver .tmp, machine-check diff,
  procedura R5). Po obu: mój rerun tsc (oczekiwane 0), pełna bateria airtight
  (wszystkie 31 plików + sąsiedzi), receipt `impl-06-l01.json`, commit #5.

- **06-L01 R4 + typy**: 12 → 3 → **0** (root i core tsc ZERO). Root cause pary
  TS2339: **TS 6.0.3 nie eksponuje type-only exports przez `typeof import(...)`
  indexed access** — naprawione `import type` (forma kanoniczna, jak w B3);
  store-test `expected` miroruje produkcyjny guard `canonicalize` (throw zamiast
  `?? ''` — zero osłabienia). Store suite dokładnie 1000L (zero zapasu).
- **Query-inventory: deferral do skonsolidowanej rebaseline'y na ogonie spiny**
  (decyzja orchestratora, kit w
  `_docs/_workflows/_smoke/task-551/inventory-rebase-kit/`): agent regeneracji
  STOP"kował poprawnie — 64 nowe wiersze wymaga 17 pól review-owned (kind/
  transactionMode/disposition/owner; codebook A-G bez litery 06-L01; fixtura
  zabrania inferencji), 7 wierszy stale (call-site'y leafa przeształtowane),
  test ma literalne `toHaveLength(1150)` (L109-110). 1150 → 1207 odkrytych.
  Późniejsze leafy (07 cache, 03-L02/L03, 09-x) też dodadzą call-site'y → jedna
  rebaseline przy 01-L01:final (który i tak regeneruje manifest). Kit
  zwalidowany: 1150/1150 byte-exact re-serializacji.
- **Pre-existing na HEAD (do decyzji ownera)**: CLI
  `task-551-query-inventory --check` failuje `query_inventory_invalid:initial-
  inventory-state` — lane resolves to post-finalization (pliki lane-state
  w snapshocie 62438e4e), check.ts:88 odmawia przed skanem. Niezależne od
  fixtury. Nie ruszane.
- Bateria admission w toku; potem receipt `impl-06-l01.json` + commit #5.

- **06-L01 ADMITTED — SINGLE_ADMITTED_GATES_GREEN** (receipt
  `_docs/_workflows/_smoke/task-551/impl-06-l01.json`, head 801334e2,
  2026-09-06T02:23Z). Bateria pełna: leaf bun 54/8skip/0/270 + store
  13/4skip/0/40 + appendHeavy 17/9skip/0/540 + retention-batches 44/2skip/0/570
  + analytics 17/6skip/0/45 + pool 5/3skip/0/32 + workflowContracts 25/0/385 +
  lifecycle 4/0/17; manifest 14/2 (kontraktowe, 01-L01:final); inventory
  22/1/6187 (udokumentowany deferral + kit); 05-guardy **146/6skip/0/7969**
  (1 fail był od 18 plików roboczych regena w `.tmp/task-551/` — kit
  ewakuowany do _docs, katalog opróżniony, rerun zielony). Vitest: leaf 191/0,
  03-suite 52/1skip/0, cache 75/2 (07-L01-owned). eslint 28 plików exit 0;
  root+core tsc 0; diffcheck clean. 31 plików ≤1000L (dwa dokładnie 1000).
  Roundy R1–R4 i śmierci agentów #7/#8 w receipcie; defekty M1/M2 (inventory
  stale + brak litery codebooka) ujawnione, NIE naprawiane; kit rebaseline'y
  trwały. Następne: **06-L02**.

- **Incydent cap-1000 na commicie 5b360430** (06-L01): hook `format:staged`
  (Prettier printWidth 100) rozwinął 7 plików autorowanych z liniami >100 zn.;
  3 testy przekroczyły cap: appendHeavy 1000→**1139**, retention-batches
  995→**1151**, digest 971→**1086** (access/audit/searchContract/searchService
  się zmieniły, ale zostały ≤1000). Bateria liczona była na bajtach
  pre-format → claim „31 plików ≤1000" prawdziwy w momencie baterii, fałszywy
  dla bajtów commita. Fix w toku: 3 równoległych agentów (jeden na plik)
  kompresuje do ≤980L prettier-stabilnie (pętle data-driven, helpery,
  skrót komentarzy; nazwy testów/gate'e owner-map/540+570 expect + 35 pass
  vitest zachowane 1:1), potem recompute 31 hashy → update receipt →
  **amend** 5b360430 (lokalny, nigdzie nie wypchnięty) → rerun 3 suite'ów
  na bajtach finalnych.

- **06-L02 recon** (read-only agent; weryfikacja kontraktu własna): 10 plików —
  prod: MISSING `core/services/database/revisionAllocation.ts`
  (`withRevisionParentLock(identity, tx, run)` / `allocateRevision(input, tx)`,
  `RevisionFamily` 5 literałów, `revision_conflict`, retry ≤3 tylko
  serialization/deadlock), MISSING `core/services/content/revisionRetentionService.ts`
  (L03 to konsumuje — zamrozić kształty eksportów), PRE-CHANGE
  `core/services/pages/revisionService.ts` (428L: nextRevisionVersion bez
  advisory lock, listRevisions raw-array unbounded, autosave ładuje WSZYSTKIE
  autosaves + ID-list delete, pruneRevisionsTx offset-bulk) i
  `core/services/content/detailPageRevisionService.ts` (200L: list raw-array).
  Testy: MISSING vitest `tests/vitest/database/revisionAllocation.test.ts`,
  MISSING integration `task551RevisionConcurrency` + `task551RevisionRetention`,
  MISSING perf `database-revision-budgets`, PRE-CHANGE 2 unit suite'y (dziś
  dzwonią po ambient DATABASE_URL przez `hasDb` probe — **HIGH**: przepisać na
  OWNER_DB_TEST_MAP_PRESENT + czyste nogi airtight). Envelope
  `RevisionPage<T>` {items,nextCursor,hasMore}, default 50 cap 100, LIMIT+1,
  „no raw-array compatibility overload" — potwierdzone w kontrakcie L208-222;
  przerwa w routes/clients do 03-L02 kontraktowa (do ujawnienia).
- **06-L02 defekty kontraktu (4×MEDIUM + 4×LOW)**: M1 `source .env` w walidacji
  (airtight obowiązuje); M2 „no request-path bulk prune" niewykonalne w
  allowliście — `pageService.ts:238` woła `pruneRevisionsTx` (plik chroniony,
  L49-51); dyspozycja: przepisać pruneRevisionsTx na bounded per-parent LIMIT +
  ujawnić (pełne usunięcie = własność 03-L02/09); M3 envelope łamie
  nieallowlistowanych konsumentów do 03-L02 (pageRoutes:277, detailPageRoutes:222,
  detailPagesClient:400, DetailTemplateEditorPage:477, pageService.test,
  pageRevisionAutosave.test, detailPagesClient.test:375); M4 fixture inventory
  debt rośnie (rows :8233/:23158, `toHaveLength(1150)`). Prereqy L01/05 wszystkie
  na drzewie (dryRun, resolveRetentionBatchSize/MaxBatchesPerRun, exemptions
  revisions owner 06-L02, indeksy retention na 5 tabelach rewizji, zegar 2036).
  Mismatch: RetentionPolicy.family = zamknięte 14 rodzin — literały rewizji NIE
  przechodzą przez normalizer L01; użyć resolverów knobów + leaf-local bounds.
- **Incydent — wymiar 2 (produkcyjny)**: patch receiptu ujawnił, że formatter
  rozwinął też 6 plików PRODUKCYJNYCH (access 946→948, audit 616→626,
  actionExecutionStore 170→168, submission 405→400, digest 825→869,
  **solutionKitRetentionService 998→1033 = PONAD CAP**). 3 testy już
  skompresowane (922/970/966, prettier-stabilne, liczby identyczne: 8/9/0/540,
  42/2/0/570, 35/35 vitest, 191/191 trio; prettier 2× unchanged; agent digestu:
  bun 1.4.0 bez `bunx` → forma kanoniczna vitest = builtin
  `node_modules/vitest/vitest.mjs` pod tą samą kopertą env). W toku: 4. agent
  (produkcja, zero zmian semantycznych — terminality gate/proof recompute/
  LIMIT 2001/evidence-counted cap strzeżone; weryfikacja: core+root tsc 0,
  oba suite'y 1:1, eslint 0). Potem: finalny patch receiptu (13+1 wpisów),
  amend 5b360430, rerun, spine.
- **06-L01 DOMKNIĘTY na bajtach kanonicznych: amend 5b360430 → `7132f3b6`**
  (hook: 5 plików wszystkie „(unchanged)" — prettier-stabilność potwierdzona na
  poziomie hooka; exit 0; drzewo czyste poza spiną). Komplet hashy receiptu =
  bajty commita (solutionKit 968L `9677…`, appendHeavy 922L `40a4…`,
  retention-batches 970L `5807…`, digest-test 966L `c96d…`). Incydent
  formattera zamknięty dwuwymiarowo (3 testy + 1 produkcja), wszystkie liczby
  suite'ów 1:1 odtworzone. Start **06-L02**: fala A (4 autorów prod).
- **06-L02 Fala A landed (4/4 prod)** — wszystkie prettier-stabilne, smoke
  load-OK airtight: `revisionAllocation.ts` **443L** `de898d4f…` (advisory
  int4+int4, klucze rodzin 551001–551005, scope digest `revision:<f>:v1:<hex>`,
  retry tx-level `retryRevisionAllocation` — w-tx retry niemożliwy po 40001;
  pisarze tylko page/detail_page, reszta fail-closed
  `revision_family_writer_unavailable`); `revisionRetentionService.ts` **647L**
  `1b6f0952…` (5 rodzin→tabele, knoby z L01, dry-run = 1 LIMIT-read zero
  `FOR UPDATE`, SKIP LOCKED + `.returning().length` (bez rowCount), kotwice
  strukturalne — floor keepNewestPerParent + newest publish; global drain
  `created_at ASC` (indeks retention_idx), per-parent `version ASC`;
  env-sweep fail-closed); `pages/revisionService.ts` **680L** `29eb62be…`
  (autosave 2/5 stmt budżet, envelope 1-stmt, nextRevisionVersion usunięty,
  pruneRevisionsTx → delegacja bounded per-parent, pageService 6/6 kompat.);
  `detailPageRevisionService.ts` **399L** `8ae7c37b…` (envelope 6-kol.,
  punktowy odczyt, discard/restore byte-identical z HEAD, autosave writer
  odroczony — mieszka w zakazanym detailPageDocumentService, 09-L03).
  Interim-redy policzone (kontraktowe, do 03-L02): pageService.test :197/272,
  revisionService.test :117, pageRevisionAutosave.test :135/148,
  detailPagesClient UI/client — envelope adoptuje 03-L02. Uwaga międzyleafowa:
  sweep L01 `assertNoUnsupportedRetentionEnvKeys` nie zna 5 prefixów
  `RETENTION_*_REVISIONS_*` — rejestracja przy starcie = 06-L03/integracja.
- **06-L02 bramy po Fali A**: core lint:types **0**, core lint **0**; root tsc
  — 1 prawdziwy błąd naprawiony (revisionService.ts:526 TS2352, cast zbędny →
  `created.id`; prettier unchanged), pozostałe **13 błędów = policzony interim
  kontraktowy**: pageService.test ×6 + pageRevisionAutosave.test ×5 (03-L02
  owns) + revisionService.test ×2 (zniknie w Fali B). Zero błędów w plikach
  produkcyjnych leafa. **Fala B start** (6 autorów: vitest allocation, rewrite
  revisionService.test + detailPageRevision.test na owner-map gate, integration
  concurrency/retention, perf budgets) — wszyscy prettier-stabilni ≤950L,
  gate bajt-w-bajt z kanonu, markery `task551-06l02-*`.
- **06-L02 DOMKNIĘTY (2026-09-06): receipt `impl-06-l02.json`** —
  SINGLE_ADMITTED_GATES_GREEN na bajtach kanonicznych (head bazowy 7132f3b6).
  Allowlista 10 plików, wszystkie prettier-stabilne, max 959L — prod:
  revisionAllocation **444L** `3de658ad…`, revisionRetentionService **649L**
  `756ffc64…`, pages/revisionService **680L** `fd2ab07d…`,
  detailPageRevisionService **401L** `0ff5ecfd…`; testy: vitest allocation
  **859L** `c374abde…`, revisionService.test **949L** `09f375b0…`,
  detailPageRevision.test **947L** `c130f03a…`, concurrency **752L**
  `4481b45a…`, retention **945L** `5d73c261…`, budgets **959L** `6a551017…`.
  Bateria: bun aggregate 5 plików **92/20/0/1013**, vitest pure lane **36/36**;
  sąsiedzi: appendHeavy 8/9/0, store 9/4/0, retention-batches 42/2/0/570,
  traffic 11/6/0, pool 2/3/0, 05-guardy (constraints+onlineIndex) 50/3/0/2325,
  lifecycle 26/0, workflowContracts 34/0/448; manifest **14/2 kontraktowe**
  (do 01-L01:final); vitest cache **2 znane redy 07-L01**; root tsc **11
  interim** (pageService ×6 + pageRevisionAutosave ×5 — 03-L02 owns); core
  tsc+lint **0**; diffcheck clean; query-inventory FAIL
  `initial-inventory-state` — **pre-existing dowiedziony na czystym HEAD**
  (git-archive probe, ten sam kod błędu), decyzja ownera, nietknięte.
- **Pętla fixów 06-L02 (R3)** — 8 błędów tsc w 2 testach leafa, naprawione
  inline, ZERO zmian semantycznych (liczby 1:1 po prettier reflow): retention
  test (import type z revisionAllocation; `family as RevisionFamily` w mapie
  gramatyki ENV; cast `unknownField`), budgets test (casty wrapperów
  unsafe/begin/then na własne sygnatury, `beginCaller` rest-parameter view dla
  spreadu, brakujący import typu `RevisionRetentionPolicyInput`). Core lint
  przy re-runie na zamrożonych bajtach złapał nieużywany import
  `RETENTION_POLICY_ERROR_CODE` (wcześniejsze 0 wyścigało bajty autorów) —
  usunięty; lint+tsc 0; wszystko przeliczone na finalnych bajtach.
- **Fala C — weryfikatorzy READ-ONLY**: V-TEST **9/9 PASS, zero findinek**
  (owner-map kanon w 5 plikach bun + 20 skipów, markery per-run, stuby
  driver-accurate bez rowCount, piny 50/51, 100/101, budżety 2/6, 500/2000,
  10/100, 180/30/2555, 50/1/500, zegar 2036-01-01, retry cap 3, grep .env
  pusty); V-PROD **12/12 PASS + 4 LOW**: (1) nagłówek allocation mylił revival
  widget_template z 09 — komentarz naprawiony; (2) docstring
  getDetailPageRevision „ONLY" — naprawiony (jedyne CZYTANIE pełnego
  dokumentu; discard/restore to pisarze); (3) **UJAWNIONE, nie naprawiane**:
  list createdBy.email = raw `users.email` vs `resolveEmailValue` na point
  read (drift przy szyfrowanych mailach — decyzja kształtu envelope, owner);
  (4) martwy eksport `type Db` — usunięty; dodatkowo nagłówek retention
  doprecyzowany do dokładnej semantyki published anchor (NOT EXISTS: chroni
  całą linię od newest publish w górę).
- **Kwalifikacje verdictu 06-L02**: envelope interim breakage (routes/client/
  2 suite'y = 11 błędów root tsc) kontraktowy do 03-L02 („No raw-array
  compatibility overload is permitted"); 55P03 lock_timeout możliwy na
  wolnym owner DB (nogi concurrency 50-way); zmiana semantyki prune na
  request path (per-page keepNewestPerParent + published anchor + age
  zamiast czystego licznika); lekcja lane-form: plik vitest odpalony pod
  bunem = 8 fałszywych faili (fake-timery) — agregaty tylko per lane.
- **Następne w spine: 06-L03** (Maintenance Scheduling / Partition Readiness —
  konsumuje zamrożoną powierzchnię eksportu revisionRetentionService), potem
  **07-L01** (właściciel 2 cache redów). Commit #6 (10 plików + receipt +
  spina) zaraz po tym wpisie.
- **STOP na życzenie ownera (2026-09-09) — stan zamrożony przed commit #6.**
  06-L02 autored + zweryfikowany (V-TEST 9/9, V-PROD 12/12+4 LOW), receipt
  `impl-06-l02.json` gotowy i prettier-stabilny, spine zaktualizowana. Commit
  #6 **ZATRZYMANY przez hook**: `precommit:check` odpala pełny root tsc, a
  envelope z 06-L02 łamie typy w 2 plikach **poza** allowlistą leafa —
  `pageService.test.ts` ×6 (:198 `.length`, :199/200 indeksy `0`,
  :273 `.length`, :274/275 indeksy `0`/`1`) i `pageRevisionAutosave.test.ts`
  ×5 (:137/138/139 indeksy, :141/146 indeksy) — jedyne ofiary w root tsconfig
  (routes/client/UI siedzą w tsconfigach admina i hooka nie dotykają).
  Konflikt: kontrakt 06-L02 przydziela te pliki 03-L02 („sole later writer of
  … their page/detail UI/tests"), a AGENTS.md nie przewiduje bypassu.
- **Decyzja ownera (2026-09-09, AskUserQuestion): „Mechaniczna adaptacja
  teraz"** — naprawić wyłącznie przesunięcie dostępu do właściwości
  (`revisions.length` → `revisions.items.length`, `revisions[0]` →
  `revisions.items[0]`) w tych 2 plikach, zero zmian asercji/mocków/liczb,
  zapis jako datowany wyjątek sekcji w receipt; pełna adopcja envelope
  (semantyczne piny, routes/client/UI) zostaje własnością 03-L02.
  Odrzucone opcje: `--no-verify` (seria bypassów do 03-L02), pełne 03-L02
  przed commitem (przestawienie spiny).
- **Next session — dokładna kolejność domknięcia 06-L02**: (1) 11 edycji
  `.items` w podanych liniach; (2) `node_modules/.bin/prettier --write` obu;
  (3) rerun airtight obu suite'ów — bez owner map są DB-gated i skipują
  (pomiar bazowy: 0 pass / 6 skip / 0 fail — liczb się nie zmienia, edycja
  tylko dostępowo-typowa); (4) pełny root tsc → **0**; (5) aktualizacja
  receiptu: ROOT_TSC 0, allowlista +2 pliki (linie+sha256), nowa sekcja
  `ownerDecision` (data + decyzja „Mechaniczna adaptacja teraz"), kwalifikacja
  verdictu bez „11 interim"; (6) prettier receipt+spina; (7) commit — 12
  ścieżek już ZASTAGOWANE + 2 adaptowane, wiadomość
  „feat(task551): admit 06-L02 (SINGLE_ADMITTED_GATES_GREEN) — revision
  allocation, envelopes, retention"; hook musi pokazać wszystkie
  „(unchanged)"; (8) mirror w głównym repo z sha commita.
- **Stan gita w chwili STOP-u**: worktree `/home/coder/project/Coderso-551`,
  branch `feat/task-551-db-cache`, HEAD `7132f3b6`, index: 12 ścieżek staged
  (4 prod + 6 testów leafa + receipt + spina), drzewo robocze poza tym czyste,
  nic nie commitowane, nic nie pushowane. Po domknięciu: spine dalej bez
  zmian — **06-L03** (konsumuje zamrożony eksport revisionRetentionService),
  potem **07-L01**.
- **06-L02 ZAMKNIĘTY (2026-09-15/16)** — decyzja ownera wykonana dokładnie wg
  planu: writer-agent 11/11 wstawek `.items` (pageService.test ×6
  :198-200/:273-275, pageRevisionAutosave.test ×5 :137-139/:141/:146),
  prettier oba „(unchanged)", airtight rerun 0 pass / 6 skip / 0 fail
  identycznie przed i po, linie 315/155 bez zmian. Moje bramki wolne:
  root tsc **0** (exit 0). Niezależny verify read-only (wf_a19642e5-3fd):
  **8/8 PASS** + 3 informacyjne LOW (brak behawioralnych); orkiestrator
  potwierdził diff bajt-po-bajcie (dokładnie 11 zmienionych linii, każda
  czysta wstawka `.items`). Receipt `impl-06-l02.json` zaktualizowany:
  `ownerDecision` (data decyzji 2026-09-09, applied 2026-09-15), allowlista
  **12** wpisów (+2 pliki z sha256/liniami), ROOT_TSC → 0, LINE_CAP/
  PRETTIER_CHECK → 12/12, R5 w rounds, kwantyfikacja verdictu bez „11
  interim". Reziduum ujawnione w honestyNotes: `expect(...).toHaveLength(n)`
  na kopercie :136/:149 (semantyka envelope, ślinie skipują pod airtight) —
  pełna adopcja semantyczna zostaje **03-L02**. Commit #6 = 14 ścieżek
  (12 staged + 2 adaptowane). Następne w spine: **06-L03** → **07-L01**.

## 06-L03 — W TOKU (2026-09-16, faza kontraktowa domknięta, Wave A wgrana)

- FAZA 0 (3 obiektywy read-only): READY_WITH_CONTRACT_GAPS — 1 HIGH
  (analytics rodzinny pruner domyślnie related do global pool → łamie
  one-PID), 7 MEDIUM (seam executorów drizzle-vs-TransactionSql; brak
  RETENTION_FAMILY_REGISTRY/isDedicatedSessionLoss; whole-family drain bez
  sygnału; pułapka sweepa env; withDedicatedDatabaseAdvisoryLock rezerwuje
  DRUGĄ sesję; per-batch statementTimeoutMs voidowany; abort conflated z
  lock loss).
- Pętla kontraktowa (3 rundy, sekcja „Dated Contract Corrections —
  2026-09-16" append-only po :417, obecnie +237 linii, prettier-stabilna,
  verify pass:true): R1 autor C1-C9 → re-audyt 2×sonnet: **9 findinek**
  (HIGH: C2(b) autocommit NIEOSIĄGALNY przez API sesji — jedyny
  mostkowalny handle to TransactionSql; MEDIUM: ban-clause C4
  samosprzeczne; solution_kit exec.transaction → runtime TypeError
  [client.begin nieobecne]; analytics whole-drain w jednej transakcji;
  mechanika cancel; LOW: C7 pole wymagane typem, C8 precedence
  abort>session-loss, pełna tabela 14 mapowań, C6 jako amendment 02-L02).
  R2 autor (R1-R9) → re-audyt: R1-R5,R7-R9 PASS, R6 PARTIAL — **HIGH:
  session-level statement_timeout to DB_STATEMENT_TIMEOUT_MS default
  15 000 ms (databaseConfig.ts:293-299, client.ts:71-89), NIE 4 000**.
  R3 autor (A1-A8): mechanizm containment = `select
  set_config('statement_timeout','4000',true)` jako PIERWSZA instrukcja
  każdego run(tx) (tx-local; SET LOCAL nie przyjmuje bindów); analytics
  pin `{ dryRun: policy.dryRun }` (bez opcji = cichy APPLY w dry-run!);
  search_history wymaga cast-bridge; solution_kit shim + cast; enabled
  gate per rodzina w rejestrze (analytics nie ma wewnętrznego gate);
  inwentarz kluczy advisory: 20260604/400, 20260604/403, 20260628/484,
  20260818/571, 551551551. Verify R3: **pass:true**, 2 LOW (precyzja
  cytatów). Uwaga: startupMigrations precedens to :123 (nie :122).
- **Wave A (wf_43d74c1d-35a)**: 4 autorów równolegle → A1
  `core/services/maintenance/retentionJobService.ts` 950L
  (lock pair 551063/3; rejestr 19 rodzin; adapter
  `drizzle(tx as unknown as Sql,{schema})`; shim solution_kit;
  analytics per-batch maxBatchesPerRun:1 + dryRun pin; C8 precedence
  abort-first; publish przed unlock) → moj core tsc: 10 błędów
  mechanicznych (3× TS2307 ../..-paths, 3× TS2540 Readonly, 3× TS7006,
  1× TS2322 union w schedulerze) → 2 fixerów → A1 947L sha
  `2dc125235d2243cd9f94976765e963280a257f41330b73a6e681c4ccafdf3b65`,
  A3 `core/server/jobs/retentionScheduler.ts` 770L sha
  `9eb5485097b90e439d197482ec5515e93f5c6287575fb7bf5c66ed7215ac0ba`.
  **core tsc rerun: EXIT 0, 0 błędów.** A2
  `partitionReadinessService.ts` 610L sha `fbe20d9872110b35ea2debb83a6
  7696c1073f22a3536ef45f27c68639ffdbae8`; A4
  `scripts/task-551-partition-readiness.ts` (sha w wyniku workflow).
  Prettier+eslint wszystkich 4: clean.
- **Wave B (wf_b871ce37-127) W TOKU**: 5 autorów testów (B1 vitest
  partition unit airtight; B2 scheduler runtime; B3 retention job
  2-replika PID+kill+source guard; B4 perf budgets/ten-batch; B5 perf
  partition+CLI --check). Owner-map gate wg pool-telemetry idiomu;
  airtight = skippy, 0 fail.
- Dalej: moje bramki wolne (core+root tsc, eslint, bateria airtight 5
  plików + CLI --check smoke airtight), post-audyt 3 obiektywy, receipt
  `impl-06-l03.json` (inventoryDebt obowiązkowy wg C9.5), commit, mirror
  spina. Changelog **1310 NIE tutaj** (rezerwa na 10-L02).

## 06-L03 — ZAMKNIĘTY (2026-09-16) — post-audit + fix wave + receipt + commit

- **Post-audyt 3 obiektywy read-only (wf_767664b8-98a)**: zgodność
  11/11 CONFORM (C1-C8, ownership, line caps, source-guard premise);
  security czysta (sanityzacja, closed sety, allowlisting, DDL=0,
  containment, fail-closed config, lock safety); test-quality pełna mapa
  pokrycia + gates sprawdzone po predykacie. **2 HIGH + 2 MEDIUM + 12 LOW**:
  (H1) CLI facade wymagał `classification` vs serwis `status` → każde
  żywe `--check` exit 3/report_invalid, komenda walidacyjna kontraktu
  nieosiągalna; (H2) default binding schedulera
  `runRetentionPlan as unknown as RetentionPlanRunner` wołał pozycyjny
  job obiektem → TypeError w każdym produkcyjnym ticku (retencja martwa,
  redagowana jako run_failed); (M1) RETENTION_SCHEDULER_MAX_RUN_MS martwy
  knob; (M2) odwrócona mapa kodów CLI (unavailable → unexpected/exit 4,
  reason ucinany).
- **Fix wave (wf_e4c4b543-fe4, 2 łańcuchy prod→test)**: facade przyjmuje
  wiersze `status` + pinuje ids do PARTITION_READINESS_TABLE_IDS +
  mapa C10 (typed → unavailable/exit 3 z całym reason, unexpected/4
  tylko untyped); scheduler: adapter createDefaultRunRetentionPlan(
  config.maxRunMs) → runRetentionPlan(now, signal, {maxRunMs}), cast
  usunięty, failedFamily w telemetry (C11). Testy: nogi CLI na realnym
  kształcie serwisu, smoke leg = prawdziwy e2e pin, nowa noga
  default-binding (scheduler BEZ wstrzykniętego runnera → realny job
  kończy się completed, zero SQL, brak run_failed), bare-token skan
  CLI_SOURCE, gate z routability probe, 2 tautologie usunięte.
- **Korekty kontraktu**: dopisane **C10** (CLI shape + exit taxonomy) i
  **C11** (budget forwarding + failedFamily) — append-only potwierdzony
  (273 insertions, 0 deletions vs 43ca2ed1), prettier-stable.
- **Bramy finalne**: core tsc 0, root tsc 0, eslint 4/4 (w tym
  scripts/), prettier 9/9 (md ignorowane), vitest 33/33, bun lane 47 pass / 21 skip /
  0 fail / 1415 expect (scheduler 13p/3s po nowej nodze; perf partition
  20p/5s), CLI smoke na martwym URL: exit 3, code
  partition_readiness_unavailable, reason catalog_read_failed w całości.
- **Receipt** `_docs/_workflows/_smoke/task-551/impl-06-l03.json`:
  verdict SINGLE_ADMITTED_GATES_GREEN, allowlista 9 plików z sha256,
  inventoryDebt wg C9.5 (4+2 szablony SELECT/lock (drift 2026-09-24:
  partition 4->2), 0 nowych DML, 19 call-site rows; scanner nadal
  query_inventory_invalid — pre-existing),
  postAudit z 4 fixami + 11 accepted-LOW, honestyNotes (m.in. nogi DB
  reviewed-not-executed wg prawa airtight; snapshot kontraktu 303L w
  głównym repo = stale, kanon na tej gałęzi).
- **Stan gita przed commitem**: HEAD `43ca2ed1`, branch
  `feat/task-551-db-cache`; 9 nowych plików + kontrakt (+273) + spina +
  receipt. Nic nie pushowane. Changelog **1310 NIE tutaj** (rezerwa
  10-L02). **Następne w spine: 07-L01** (dziedziczy 2 znane czerwone
  vitest cache: server-cache-codec-keys, server-cache-contracts).

## 07-L01 — ZAMKNIĘTY (2026-09-24) — FAZA-0 + 4 rundy kontraktu + 11 pisarzy + post-audyt

- **Nowe zasady ownera (2026-09-24)**: wszyscy agenci `.claude/agents/*` na
  Opus 5.5 (effort high: auditor/implementer; medium: smoke/closure; nigdy
  xhigh/max); **≥2 audytorów na zakres, 1 implementator na plik, ≥2
  post-audytorów**. Zgoda ownera na merge `feat/task-551-db-cache` →
  `feat/implementations` (root repo) po domknięciu całego 551; push =
  osobna decyzja.
- **Drift 06-L03 na `8f73a0f8`** (2 audytorów): fix-wave PASS; 1 LOW w
  receipcie (inventoryDebt partition 4→2, literówka klucza, prettier na
  .md ignorowane) — naprawione, zacommitowane razem z checkpointem.
- **FAZA-0 07-L01** (3 obiektywy): 8 plików allowlisty istniało ze
  snapshotu `62438e4e` (nigdy niegate'owane); 1160L/1458L ponad limit
  1000; `hasExactFields` z `in` (HIGH); brak `namespace` w handoffie
  fabryki; DRY stałych namespace; 2 redy = błędy wektorów testowych.
- **Kontrakt: 4 rundy × 4 audytorów (2 pre + 2 reconcile)** → C1-C11
  (split na serverCacheCoherence.ts + serverCacheConditionalWrite.ts +
  server-cache-coherence-conditional-write.test.ts; reguła export-surface
  bez re-eksportów; C9 fail-closed skalarów polityki w kodeku; C11
  dispatch 11 pisarzy z ekstrakcją z `git show 8f73a0f8:`). R1 złapał
  HIGH: fragment JSON w ogrodzeniu ```json wywalał preflight dispatchu
  całej rodziny 551 (envelope poprawiony in-place). Lustra: 07-L02, 07,
  09-L04, 10-L01. R4 PASS 4/4. **Checkpoint `f6dd0ace`** (hook zielony).
- **Implementacja**: 11 pisarzy sekwencyjnie wg C11 (implementer, Opus 5.5
  @ high); RED→GREEN zapisane (C9: 12 fail → 38/38; C4: 1 → 31/31).
  Byte-identity ruchów vs baseline: 387/387, 6/6, 393/393, 47/47.
- **Bramki grupowe**: vitest 4 pliki **144/144** (było 105/107 z 2 redami),
  core eslint 0, core tsc 0, root tsc 0 (baseline 0), prettier 11/11,
  linie max 895/1000. **Post-audyt 2 obiektywy: PASS/PASS** (0 H/M; 5 LOW
  → 3 naprawione in-leaf, 2 zaakceptowane: tautologie w verbatim-moved
  suite'ach = TASK-9999 na 10-L02; 33-tag nie izoluje length guard).
- **Receipt** `impl-07-l01.json` (SINGLE_ADMITTED_GATES_GREEN, 11 sha256).
  Changelog 1310 = rezerwa 10-L02. **Następne w spine: 09-L04(initial)**
  → 03-L02 → 07-L02 → 08-L01 → 08-L02 → 08-L03(final) → 03-L03 → 04-L01 →
  04-L02 → 09-L01 → 09-L02 → 09-L03 → 09-L04(final) → L01(final) → 10-L01
  → 10-L02.

## 09-L04 INITIAL — ZAMKNIĘTY (2026-09-24) — seam installation-authority

- **Preflight** (skill task-preflight): zakres INITIAL = dokładnie 2 nowe
  pliki (moduł + test); anchory adminPaths OK; wykryte: argv/prose z
  `.env`, brak pseudokodu INITIAL, niejasna reguła błędów subskrybentów.
- **FAZA-0 (2 audytorów)**: HIGH — reguła przepełnienia MAX_SAFE_INTEGER
  nietestowalna przez 5-symbolowe API → fabryka testowa
  `createAdminCacheInstallationAuthority({ initialGeneration })`; 6 MEDIUM.
- **Kontrakt: 2 rundy × 4 audytorów** → I1-I8 + Round-2 record (R1 HIGH:
  komentarz szkicu I2 zawierał identyfikatory z regexu guarda I3 — złapane
  przez 3 audytorów niezależnie). Lustra: 03-L02 (M1-M3; adminPrefetch.test
  allowlistowany; reset prefetchera należy do 03-L02, L04 FINAL tylko
  weryfikuje), 10-L01 (blok przebudowany z envelope), 04-L01, rodzic 09
  (P1-P3). R2: PASS 3/4 + MEDIUM procesowy (prettier przed bramkami —
  wdrożony). **Checkpoint `e7ce7d78`** (5 .md, hook zielony).
- **Implementacja**: W-module (102L) → W-test (560→578L, 38/38);
  porcelain = dokładnie 2 `??`; prettier OK; add -N + diff-check OK;
  eslint 0; core lint 0; core tsc 0; root tsc 0; 0 słów guardowanych;
  5 eksportów runtime + typ. **Post-audyt 2 obiektywy: PASS/PASS**
  (3 LOW → 2 naprawione, 1 INFO). Receipt `impl-09-l04-initial.json`.
- Status leafa zostaje ⏳ To Do do 10-L02 (I7). **Następne w spine:
  03-L02** (konsumuje INITIAL; własna FAZA-0 — m.in. `bunx vitest run`
  w argv, reset prefetchera per M2).
