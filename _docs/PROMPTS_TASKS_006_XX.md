# Prompts for TASK-006-14..TASK-006-41 (Admin UI Visual)

Uwaga: zakres 006-14..006-41 to **28** tasków (nie 27). Poniżej są prompty dla wszystkich 28.
Jeśli chcesz pominąć któryś ekran, wskaż numer – przygotuję wersję 27‑promptową.

Każdy prompt jest przeznaczony dla osobnego agenta.
Zasady wspólne:
- Pracuj zgodnie z `AGENTS.md` (Clean Architecture, YAGNI/SOLID/DRY/KISS, code po angielsku).
- Wykonuj tylko UI (wizualnie), bez backend integracji.
- **Nie edytuj** `core/admin/app/AdminApp.tsx`, `core/admin/ui/navigation/sidebarConfig.ts`, `core/admin/ui/settings/SettingsSidebar.tsx`.
  Integracja routing/menu jest w osobnym TASK-006-42.
- Korzystaj z istniejących wzorców UI w repo i shadcn.
- Dodaj/aktualizuj testy renderu zgodnie z taskiem.
- Po zmianach uruchom: `bun --cwd core lint`, `bun --cwd core lint:types`, `bun test`.
- Jeśli musisz logicznie coś poprawić, odnotuj to w podsumowaniu.
- Nie przejmuj sie dodatkowymi zmianami w git status bo pracuje 28 agentow jednoczesnie, skup sie wylacznie na swoim zakresie

---

## Prompt 1 — TASK-006-14 (API Keys UI)
Zrealizuj **TASK-006-14**.
- Task: `_docs/_TASKS/TASK-006-14_API_Keys_UI.md`
- Referencje: `_docs/UI/admin_panel/14-api-keys/code.html`, `_docs/UI/admin_panel/14-api-keys/screen.png`
- Zbuduj UI zgodnie z planem w tasku (settings layout, tabela, modal).
- Twórz pliki tylko w `core/admin/ui/settings/` + test w `tests/unit/ui/`.
- Nie ruszaj AdminApp/Sidebar.
- Pracuj zgodnie z `AGENTS.md` (Clean Architecture, YAGNI/SOLID/DRY/KISS, code po angielsku).
- Wykonuj tylko UI (wizualnie), bez backend integracji.
- **Nie edytuj** `core/admin/app/AdminApp.tsx`, `core/admin/ui/navigation/sidebarConfig.ts`, `core/admin/ui/settings/SettingsSidebar.tsx`.
  Integracja routing/menu jest w osobnym TASK-006-42.
- Korzystaj z istniejących wzorców UI w repo i shadcn.
- Dodaj/aktualizuj testy renderu zgodnie z taskiem.
- Po zmianach uruchom: `bun --cwd core lint`, `bun --cwd core lint:types`, `bun test` (instalacja bun jesli cos nie dziala i trzeba uzyc sciezki pelnej - /Users/pciechanski/.bun/bin/bun)
- Jeśli musisz logicznie coś poprawić, odnotuj to w podsumowaniu.
- Nie przejmuj sie dodatkowymi zmianami w git status bo pracuje 28 agentow jednoczesnie, skup sie wylacznie na swoim zakresie

---

## Prompt 2 — TASK-006-15 (Audit Logs UI)
Zrealizuj **TASK-006-15**.
- Task: `_docs/_TASKS/TASK-006-15_Audit_Logs_UI.md`
- Referencje: `_docs/UI/admin_panel/15-ui-audit-logs/code.html`, `_docs/UI/admin_panel/15-ui-audit-logs/screen.png`
- Zaktualizuj `core/admin/ui/audit/` wg nowego layoutu (filtry, tabela, drawer).
- Dodaj testy renderu wg tasku.
- Nie ruszaj AdminApp/Sidebar.
- Pracuj zgodnie z `AGENTS.md` (Clean Architecture, YAGNI/SOLID/DRY/KISS, code po angielsku).
- Wykonuj tylko UI (wizualnie), bez backend integracji.
- **Nie edytuj** `core/admin/app/AdminApp.tsx`, `core/admin/ui/navigation/sidebarConfig.ts`, `core/admin/ui/settings/SettingsSidebar.tsx`.
  Integracja routing/menu jest w osobnym TASK-006-42.
- Korzystaj z istniejących wzorców UI w repo i shadcn.
- Dodaj/aktualizuj testy renderu zgodnie z taskiem.
- Po zmianach uruchom: `bun --cwd core lint`, `bun --cwd core lint:types`, `bun test` (instalacja bun jesli cos nie dziala i trzeba uzyc sciezki pelnej - /Users/pciechanski/.bun/bin/bun)
- Jeśli musisz logicznie coś poprawić, odnotuj to w podsumowaniu.
- Nie przejmuj sie dodatkowymi zmianami w git status bo pracuje 28 agentow jednoczesnie, skup sie wylacznie na swoim zakresie

---

## Prompt 3 — TASK-006-16 (Content Entries List UI)
Zrealizuj **TASK-006-16**.
- Task: `_docs/_TASKS/TASK-006-16_Content_Entries_List_UI.md`
- Referencje: `_docs/UI/admin_panel/16-content-entries/code.html`, `_docs/UI/admin_panel/16-content-entries/screen.png`
- Aktualizuj `core/admin/ui/entries/EntryList.tsx` i dodaj nowe komponenty wg tasku.
- Dodaj testy renderu.
- Nie ruszaj AdminApp/Sidebar.
- Pracuj zgodnie z `AGENTS.md` (Clean Architecture, YAGNI/SOLID/DRY/KISS, code po angielsku).
- Wykonuj tylko UI (wizualnie), bez backend integracji.
- **Nie edytuj** `core/admin/app/AdminApp.tsx`, `core/admin/ui/navigation/sidebarConfig.ts`, `core/admin/ui/settings/SettingsSidebar.tsx`.
  Integracja routing/menu jest w osobnym TASK-006-42.
- Korzystaj z istniejących wzorców UI w repo i shadcn.
- Dodaj/aktualizuj testy renderu zgodnie z taskiem.
- Po zmianach uruchom: `bun --cwd core lint`, `bun --cwd core lint:types`, `bun test` (instalacja bun jesli cos nie dziala i trzeba uzyc sciezki pelnej - /Users/pciechanski/.bun/bin/bun)
- Jeśli musisz logicznie coś poprawić, odnotuj to w podsumowaniu.
- Nie przejmuj sie dodatkowymi zmianami w git status bo pracuje 28 agentow jednoczesnie, skup sie wylacznie na swoim zakresie

---

## Prompt 4 — TASK-006-17 (Content Entry Editor UI)
Zrealizuj **TASK-006-17**.
- Task: `_docs/_TASKS/TASK-006-17_Content_Entry_Editor_UI.md`
- Referencje: `_docs/UI/admin_panel/17-entry-editor/code.html`, `_docs/UI/admin_panel/17-entry-editor/screen.png`
- Aktualizuj `core/admin/ui/entries/EntryEditor.tsx` i dodaj komponenty wg tasku.
- Dodaj testy renderu.
- Nie ruszaj AdminApp/Sidebar.
- Pracuj zgodnie z `AGENTS.md` (Clean Architecture, YAGNI/SOLID/DRY/KISS, code po angielsku).
- Wykonuj tylko UI (wizualnie), bez backend integracji.
- **Nie edytuj** `core/admin/app/AdminApp.tsx`, `core/admin/ui/navigation/sidebarConfig.ts`, `core/admin/ui/settings/SettingsSidebar.tsx`.
  Integracja routing/menu jest w osobnym TASK-006-42.
- Korzystaj z istniejących wzorców UI w repo i shadcn.
- Dodaj/aktualizuj testy renderu zgodnie z taskiem.
- Po zmianach uruchom: `bun --cwd core lint`, `bun --cwd core lint:types`, `bun test` (instalacja bun jesli cos nie dziala i trzeba uzyc sciezki pelnej - /Users/pciechanski/.bun/bin/bun)
- Jeśli musisz logicznie coś poprawić, odnotuj to w podsumowaniu.
- Nie przejmuj sie dodatkowymi zmianami w git status bo pracuje 28 agentow jednoczesnie, skup sie wylacznie na swoim zakresie

---

## Prompt 5 — TASK-006-18 (Settings Security UI)
Zrealizuj **TASK-006-18**.
- Task: `_docs/_TASKS/TASK-006-18_Settings_Security_UI.md`
- Referencje: `_docs/UI/admin_panel/18-security-settings/code.html`, `_docs/UI/admin_panel/18-security-settings/screen.png`
- Utwórz nowe komponenty w `core/admin/ui/settings/` zgodnie z planem.
- Dodaj testy renderu.
- Nie ruszaj SettingsSidebar.
- Pracuj zgodnie z `AGENTS.md` (Clean Architecture, YAGNI/SOLID/DRY/KISS, code po angielsku).
- Wykonuj tylko UI (wizualnie), bez backend integracji.
- **Nie edytuj** `core/admin/app/AdminApp.tsx`, `core/admin/ui/navigation/sidebarConfig.ts`, `core/admin/ui/settings/SettingsSidebar.tsx`.
  Integracja routing/menu jest w osobnym TASK-006-42.
- Korzystaj z istniejących wzorców UI w repo i shadcn.
- Dodaj/aktualizuj testy renderu zgodnie z taskiem.
- Po zmianach uruchom: `bun --cwd core lint`, `bun --cwd core lint:types`, `bun test` (instalacja bun jesli cos nie dziala i trzeba uzyc sciezki pelnej - /Users/pciechanski/.bun/bin/bun)
- Jeśli musisz logicznie coś poprawić, odnotuj to w podsumowaniu.
- Nie przejmuj sie dodatkowymi zmianami w git status bo pracuje 28 agentow jednoczesnie, skup sie wylacznie na swoim zakresie

---

## Prompt 6 — TASK-006-19 (Webhooks UI)
Zrealizuj **TASK-006-19**.
- Task: `_docs/_TASKS/TASK-006-19_Webhooks_UI.md`
- Referencje: `_docs/UI/admin_panel/19-webhooks/code.html`, `_docs/UI/admin_panel/19-webhooks/screen.png`
- Utwórz nowe komponenty w `core/admin/ui/settings/` wg tasku.
- Dodaj testy renderu.
- Nie ruszaj SettingsSidebar.
- Pracuj zgodnie z `AGENTS.md` (Clean Architecture, YAGNI/SOLID/DRY/KISS, code po angielsku).
- Wykonuj tylko UI (wizualnie), bez backend integracji.
- **Nie edytuj** `core/admin/app/AdminApp.tsx`, `core/admin/ui/navigation/sidebarConfig.ts`, `core/admin/ui/settings/SettingsSidebar.tsx`.
  Integracja routing/menu jest w osobnym TASK-006-42.
- Korzystaj z istniejących wzorców UI w repo i shadcn.
- Dodaj/aktualizuj testy renderu zgodnie z taskiem.
- Po zmianach uruchom: `bun --cwd core lint`, `bun --cwd core lint:types`, `bun test` (instalacja bun jesli cos nie dziala i trzeba uzyc sciezki pelnej - /Users/pciechanski/.bun/bin/bun)
- Jeśli musisz logicznie coś poprawić, odnotuj to w podsumowaniu.
- Nie przejmuj sie dodatkowymi zmianami w git status bo pracuje 28 agentow jednoczesnie, skup sie wylacznie na swoim zakresie

---

## Prompt 7 — TASK-006-20 (Analytics UI)
Zrealizuj **TASK-006-20**.
- Task: `_docs/_TASKS/TASK-006-20_Analytics_UI.md`
- Referencje: `_docs/UI/admin_panel/20-analytics/code.html`, `_docs/UI/admin_panel/20-analytics/screen.png`
- Utwórz nowe komponenty w `core/admin/ui/analytics/` wg tasku.
- Dodaj testy renderu.
- Nie ruszaj AdminApp/Sidebar.
- Pracuj zgodnie z `AGENTS.md` (Clean Architecture, YAGNI/SOLID/DRY/KISS, code po angielsku).
- Wykonuj tylko UI (wizualnie), bez backend integracji.
- **Nie edytuj** `core/admin/app/AdminApp.tsx`, `core/admin/ui/navigation/sidebarConfig.ts`, `core/admin/ui/settings/SettingsSidebar.tsx`.
  Integracja routing/menu jest w osobnym TASK-006-42.
- Korzystaj z istniejących wzorców UI w repo i shadcn.
- Dodaj/aktualizuj testy renderu zgodnie z taskiem.
- Po zmianach uruchom: `bun --cwd core lint`, `bun --cwd core lint:types`, `bun test` (instalacja bun jesli cos nie dziala i trzeba uzyc sciezki pelnej - /Users/pciechanski/.bun/bin/bun)
- Jeśli musisz logicznie coś poprawić, odnotuj to w podsumowaniu.
- Nie przejmuj sie dodatkowymi zmianami w git status bo pracuje 28 agentow jednoczesnie, skup sie wylacznie na swoim zakresie

---

## Prompt 8 — TASK-006-21 (Backups UI)
Zrealizuj **TASK-006-21**.
- Task: `_docs/_TASKS/TASK-006-21_Backups_UI.md`
- Referencje: `_docs/UI/admin_panel/21-backups/code.html`, `_docs/UI/admin_panel/21-backups/screen.png`
- Utwórz nowe komponenty w `core/admin/ui/backups/` wg tasku.
- Dodaj testy renderu.
- Nie ruszaj AdminApp/Sidebar.
- Pracuj zgodnie z `AGENTS.md` (Clean Architecture, YAGNI/SOLID/DRY/KISS, code po angielsku).
- Wykonuj tylko UI (wizualnie), bez backend integracji.
- **Nie edytuj** `core/admin/app/AdminApp.tsx`, `core/admin/ui/navigation/sidebarConfig.ts`, `core/admin/ui/settings/SettingsSidebar.tsx`.
  Integracja routing/menu jest w osobnym TASK-006-42.
- Korzystaj z istniejących wzorców UI w repo i shadcn.
- Dodaj/aktualizuj testy renderu zgodnie z taskiem.
- Po zmianach uruchom: `bun --cwd core lint`, `bun --cwd core lint:types`, `bun test` (instalacja bun jesli cos nie dziala i trzeba uzyc sciezki pelnej - /Users/pciechanski/.bun/bin/bun)
- Jeśli musisz logicznie coś poprawić, odnotuj to w podsumowaniu.
- Nie przejmuj sie dodatkowymi zmianami w git status bo pracuje 28 agentow jednoczesnie, skup sie wylacznie na swoim zakresie

---

## Prompt 9 — TASK-006-22 (Global Search UI)
Zrealizuj **TASK-006-22**.
- Task: `_docs/_TASKS/TASK-006-22_Global_Search_UI.md`
- Referencje: `_docs/UI/admin_panel/22-global-search/code.html`, `_docs/UI/admin_panel/22-global-search/screen.png`
- Utwórz/zmodyfikuj komponenty w `core/admin/ui/search/` wg tasku.
- Dodaj testy renderu.
- Nie ruszaj AdminApp/Sidebar.
- Pracuj zgodnie z `AGENTS.md` (Clean Architecture, YAGNI/SOLID/DRY/KISS, code po angielsku).
- Wykonuj tylko UI (wizualnie), bez backend integracji.
- **Nie edytuj** `core/admin/app/AdminApp.tsx`, `core/admin/ui/navigation/sidebarConfig.ts`, `core/admin/ui/settings/SettingsSidebar.tsx`.
  Integracja routing/menu jest w osobnym TASK-006-42.
- Korzystaj z istniejących wzorców UI w repo i shadcn.
- Dodaj/aktualizuj testy renderu zgodnie z taskiem.
- Po zmianach uruchom: `bun --cwd core lint`, `bun --cwd core lint:types`, `bun test` (instalacja bun jesli cos nie dziala i trzeba uzyc sciezki pelnej - /Users/pciechanski/.bun/bin/bun)
- Jeśli musisz logicznie coś poprawić, odnotuj to w podsumowaniu.
- Nie przejmuj sie dodatkowymi zmianami w git status bo pracuje 28 agentow jednoczesnie, skup sie wylacznie na swoim zakresie

---

## Prompt 10 — TASK-006-23 (Media Details UI)
Zrealizuj **TASK-006-23**.
- Task: `_docs/_TASKS/TASK-006-23_Media_Details_UI.md`
- Referencje: `_docs/UI/admin_panel/23-media-details/code.html`, `_docs/UI/admin_panel/23-media-details/screen.png`
- Dodaj drawer w `core/admin/ui/media/` wg tasku.
- Dodaj testy renderu.
- Nie ruszaj AdminApp/Sidebar.
- Pracuj zgodnie z `AGENTS.md` (Clean Architecture, YAGNI/SOLID/DRY/KISS, code po angielsku).
- Wykonuj tylko UI (wizualnie), bez backend integracji.
- **Nie edytuj** `core/admin/app/AdminApp.tsx`, `core/admin/ui/navigation/sidebarConfig.ts`, `core/admin/ui/settings/SettingsSidebar.tsx`.
  Integracja routing/menu jest w osobnym TASK-006-42.
- Korzystaj z istniejących wzorców UI w repo i shadcn.
- Dodaj/aktualizuj testy renderu zgodnie z taskiem.
- Po zmianach uruchom: `bun --cwd core lint`, `bun --cwd core lint:types`, `bun test` (instalacja bun jesli cos nie dziala i trzeba uzyc sciezki pelnej - /Users/pciechanski/.bun/bin/bun)
- Jeśli musisz logicznie coś poprawić, odnotuj to w podsumowaniu.
- Nie przejmuj sie dodatkowymi zmianami w git status bo pracuje 28 agentow jednoczesnie, skup sie wylacznie na swoim zakresie

---

## Prompt 11 — TASK-006-24 (Permissions Matrix UI)
Zrealizuj **TASK-006-24**.
- Task: `_docs/_TASKS/TASK-006-24_Permissions_Matrix_UI.md`
- Referencje: `_docs/UI/admin_panel/24-permissions-matrix/code.html`, `_docs/UI/admin_panel/24-permissions-matrix/screen.png`
- Dodaj komponenty w `core/admin/ui/roles/` wg tasku.
- Dodaj testy renderu.
- Nie ruszaj AdminApp/Sidebar.
- Pracuj zgodnie z `AGENTS.md` (Clean Architecture, YAGNI/SOLID/DRY/KISS, code po angielsku).
- Wykonuj tylko UI (wizualnie), bez backend integracji.
- **Nie edytuj** `core/admin/app/AdminApp.tsx`, `core/admin/ui/navigation/sidebarConfig.ts`, `core/admin/ui/settings/SettingsSidebar.tsx`.
  Integracja routing/menu jest w osobnym TASK-006-42.
- Korzystaj z istniejących wzorców UI w repo i shadcn.
- Dodaj/aktualizuj testy renderu zgodnie z taskiem.
- Po zmianach uruchom: `bun --cwd core lint`, `bun --cwd core lint:types`, `bun test` (instalacja bun jesli cos nie dziala i trzeba uzyc sciezki pelnej - /Users/pciechanski/.bun/bin/bun)
- Jeśli musisz logicznie coś poprawić, odnotuj to w podsumowaniu.
- Nie przejmuj sie dodatkowymi zmianami w git status bo pracuje 28 agentow jednoczesnie, skup sie wylacznie na swoim zakresie

---

## Prompt 12 — TASK-006-25 (Plugin Details UI)
Zrealizuj **TASK-006-25**.
- Task: `_docs/_TASKS/TASK-006-25_Plugin_Details_UI.md`
- Referencje: `_docs/UI/admin_panel/25-plugin-details/code.html`, `_docs/UI/admin_panel/25-plugin-details/screen.png`
- Dodaj komponenty w `core/admin/ui/store/` wg tasku.
- Dodaj testy renderu.
- Nie ruszaj AdminApp/Sidebar.
- Pracuj zgodnie z `AGENTS.md` (Clean Architecture, YAGNI/SOLID/DRY/KISS, code po angielsku).
- Wykonuj tylko UI (wizualnie), bez backend integracji.
- **Nie edytuj** `core/admin/app/AdminApp.tsx`, `core/admin/ui/navigation/sidebarConfig.ts`, `core/admin/ui/settings/SettingsSidebar.tsx`.
  Integracja routing/menu jest w osobnym TASK-006-42.
- Korzystaj z istniejących wzorców UI w repo i shadcn.
- Dodaj/aktualizuj testy renderu zgodnie z taskiem.
- Po zmianach uruchom: `bun --cwd core lint`, `bun --cwd core lint:types`, `bun test` (instalacja bun jesli cos nie dziala i trzeba uzyc sciezki pelnej - /Users/pciechanski/.bun/bin/bun)
- Jeśli musisz logicznie coś poprawić, odnotuj to w podsumowaniu.
- Nie przejmuj sie dodatkowymi zmianami w git status bo pracuje 28 agentow jednoczesnie, skup sie wylacznie na swoim zakresie

---

## Prompt 13 — TASK-006-26 (SEO Manager UI)
Zrealizuj **TASK-006-26**.
- Task: `_docs/_TASKS/TASK-006-26_SEO_Manager_UI.md`
- Referencje: `_docs/UI/admin_panel/26-seo-manager/code.html`, `_docs/UI/admin_panel/26-seo-manager/screen.png`
- Dodaj komponenty w `core/admin/ui/seo/` wg tasku.
- Dodaj testy renderu.
- Nie ruszaj AdminApp/Sidebar.
- Pracuj zgodnie z `AGENTS.md` (Clean Architecture, YAGNI/SOLID/DRY/KISS, code po angielsku).
- Wykonuj tylko UI (wizualnie), bez backend integracji.
- **Nie edytuj** `core/admin/app/AdminApp.tsx`, `core/admin/ui/navigation/sidebarConfig.ts`, `core/admin/ui/settings/SettingsSidebar.tsx`.
  Integracja routing/menu jest w osobnym TASK-006-42.
- Korzystaj z istniejących wzorców UI w repo i shadcn.
- Dodaj/aktualizuj testy renderu zgodnie z taskiem.
- Po zmianach uruchom: `bun --cwd core lint`, `bun --cwd core lint:types`, `bun test` (instalacja bun jesli cos nie dziala i trzeba uzyc sciezki pelnej - /Users/pciechanski/.bun/bin/bun)
- Jeśli musisz logicznie coś poprawić, odnotuj to w podsumowaniu.
- Nie przejmuj sie dodatkowymi zmianami w git status bo pracuje 28 agentow jednoczesnie, skup sie wylacznie na swoim zakresie


---

## Prompt 14 — TASK-006-27 (Themes UI)
Zrealizuj **TASK-006-27**.
- Task: `_docs/_TASKS/TASK-006-27_Themes_UI.md`
- Referencje: `_docs/UI/admin_panel/27-themes/code.html`, `_docs/UI/admin_panel/27-themes/screen.png`
- Dodaj komponenty w `core/admin/ui/themes/` wg tasku.
- Dodaj testy renderu.
- Nie ruszaj AdminApp/Sidebar.
- Pracuj zgodnie z `AGENTS.md` (Clean Architecture, YAGNI/SOLID/DRY/KISS, code po angielsku).
- Wykonuj tylko UI (wizualnie), bez backend integracji.
- **Nie edytuj** `core/admin/app/AdminApp.tsx`, `core/admin/ui/navigation/sidebarConfig.ts`, `core/admin/ui/settings/SettingsSidebar.tsx`.
  Integracja routing/menu jest w osobnym TASK-006-42.
- Korzystaj z istniejących wzorców UI w repo i shadcn.
- Dodaj/aktualizuj testy renderu zgodnie z taskiem.
- Po zmianach uruchom: `bun --cwd core lint`, `bun --cwd core lint:types`, `bun test` (instalacja bun jesli cos nie dziala i trzeba uzyc sciezki pelnej - /Users/pciechanski/.bun/bin/bun)
- Jeśli musisz logicznie coś poprawić, odnotuj to w podsumowaniu.
- Nie przejmuj sie dodatkowymi zmianami w git status bo pracuje 28 agentow jednoczesnie, skup sie wylacznie na swoim zakresie

---

## Prompt 15 — TASK-006-28 (Theme Editor UI)
Zrealizuj **TASK-006-28**.
- Task: `_docs/_TASKS/TASK-006-28_Theme_Editor_UI.md`
- Referencje: `_docs/UI/admin_panel/28-themes-editor/code.html`, `_docs/UI/admin_panel/28-themes-editor/screen.png`
- Dodaj komponenty w `core/admin/ui/themes/` wg tasku.
- Dodaj testy renderu.
- Nie ruszaj AdminApp/Sidebar.
- Pracuj zgodnie z `AGENTS.md` (Clean Architecture, YAGNI/SOLID/DRY/KISS, code po angielsku).
- Wykonuj tylko UI (wizualnie), bez backend integracji.
- **Nie edytuj** `core/admin/app/AdminApp.tsx`, `core/admin/ui/navigation/sidebarConfig.ts`, `core/admin/ui/settings/SettingsSidebar.tsx`.
  Integracja routing/menu jest w osobnym TASK-006-42.
- Korzystaj z istniejących wzorców UI w repo i shadcn.
- Dodaj/aktualizuj testy renderu zgodnie z taskiem.
- Po zmianach uruchom: `bun --cwd core lint`, `bun --cwd core lint:types`, `bun test` (instalacja bun jesli cos nie dziala i trzeba uzyc sciezki pelnej - /Users/pciechanski/.bun/bin/bun)
- Jeśli musisz logicznie coś poprawić, odnotuj to w podsumowaniu.
- Nie przejmuj sie dodatkowymi zmianami w git status bo pracuje 28 agentow jednoczesnie, skup sie wylacznie na swoim zakresie

---

## Prompt 16 — TASK-006-29 (Widget Library UI)
Zrealizuj **TASK-006-29**.
- Task: `_docs/_TASKS/TASK-006-29_Widget_Library_UI.md`
- Referencje: `_docs/UI/admin_panel/29-widget-library/code.html`, `_docs/UI/admin_panel/29-widget-library/screen.png`
- Dodaj komponenty w `core/admin/ui/widgets/` wg tasku.
- Dodaj testy renderu.
- Nie ruszaj AdminApp/Sidebar.
- Pracuj zgodnie z `AGENTS.md` (Clean Architecture, YAGNI/SOLID/DRY/KISS, code po angielsku).
- Wykonuj tylko UI (wizualnie), bez backend integracji.
- **Nie edytuj** `core/admin/app/AdminApp.tsx`, `core/admin/ui/navigation/sidebarConfig.ts`, `core/admin/ui/settings/SettingsSidebar.tsx`.
  Integracja routing/menu jest w osobnym TASK-006-42.
- Korzystaj z istniejących wzorców UI w repo i shadcn.
- Dodaj/aktualizuj testy renderu zgodnie z taskiem.
- Po zmianach uruchom: `bun --cwd core lint`, `bun --cwd core lint:types`, `bun test` (instalacja bun jesli cos nie dziala i trzeba uzyc sciezki pelnej - /Users/pciechanski/.bun/bin/bun)
- Jeśli musisz logicznie coś poprawić, odnotuj to w podsumowaniu.
- Nie przejmuj sie dodatkowymi zmianami w git status bo pracuje 28 agentow jednoczesnie, skup sie wylacznie na swoim zakresie

---

## Prompt 17 — TASK-006-30 (Access Logs UI)
Zrealizuj **TASK-006-30**.
- Task: `_docs/_TASKS/TASK-006-30_Access_Logs_UI.md`
- Referencje: `_docs/UI/admin_panel/30-access-logs/code.html`, `_docs/UI/admin_panel/30-access-logs/screen.png`
- Dodaj komponenty w `core/admin/ui/security/` wg tasku.
- Dodaj testy renderu.
- Nie ruszaj AdminApp/Sidebar.
- Pracuj zgodnie z `AGENTS.md` (Clean Architecture, YAGNI/SOLID/DRY/KISS, code po angielsku).
- Wykonuj tylko UI (wizualnie), bez backend integracji.
- **Nie edytuj** `core/admin/app/AdminApp.tsx`, `core/admin/ui/navigation/sidebarConfig.ts`, `core/admin/ui/settings/SettingsSidebar.tsx`.
  Integracja routing/menu jest w osobnym TASK-006-42.
- Korzystaj z istniejących wzorców UI w repo i shadcn.
- Dodaj/aktualizuj testy renderu zgodnie z taskiem.
- Po zmianach uruchom: `bun --cwd core lint`, `bun --cwd core lint:types`, `bun test` (instalacja bun jesli cos nie dziala i trzeba uzyc sciezki pelnej - /Users/pciechanski/.bun/bin/bun)
- Jeśli musisz logicznie coś poprawić, odnotuj to w podsumowaniu.
- Nie przejmuj sie dodatkowymi zmianami w git status bo pracuje 28 agentow jednoczesnie, skup sie wylacznie na swoim zakresie

---

## Prompt 18 — TASK-006-31 (Email Settings UI)
Zrealizuj **TASK-006-31**.
- Task: `_docs/_TASKS/TASK-006-31_Email_Settings_UI.md`
- Referencje: `_docs/UI/admin_panel/31-email-settings/code.html`, `_docs/UI/admin_panel/31-email-settings/screen.png`
- Dodaj komponenty w `core/admin/ui/settings/` wg tasku.
- Dodaj testy renderu.
- Nie ruszaj SettingsSidebar.
- Pracuj zgodnie z `AGENTS.md` (Clean Architecture, YAGNI/SOLID/DRY/KISS, code po angielsku).
- Wykonuj tylko UI (wizualnie), bez backend integracji.
- **Nie edytuj** `core/admin/app/AdminApp.tsx`, `core/admin/ui/navigation/sidebarConfig.ts`, `core/admin/ui/settings/SettingsSidebar.tsx`.
  Integracja routing/menu jest w osobnym TASK-006-42.
- Korzystaj z istniejących wzorców UI w repo i shadcn.
- Dodaj/aktualizuj testy renderu zgodnie z taskiem.
- Po zmianach uruchom: `bun --cwd core lint`, `bun --cwd core lint:types`, `bun test` (instalacja bun jesli cos nie dziala i trzeba uzyc sciezki pelnej - /Users/pciechanski/.bun/bin/bun)
- Jeśli musisz logicznie coś poprawić, odnotuj to w podsumowaniu.
- Nie przejmuj sie dodatkowymi zmianami w git status bo pracuje 28 agentow jednoczesnie, skup sie wylacznie na swoim zakresie

---

## Prompt 19 — TASK-006-32 (Form Builder UI)
Zrealizuj **TASK-006-32**.
- Task: `_docs/_TASKS/TASK-006-32_Form_Builder_UI.md`
- Referencje: `_docs/UI/admin_panel/32-form-builder/code.html`, `_docs/UI/admin_panel/32-form-builder/screen.png`
- Dodaj komponenty w `core/admin/ui/forms/` wg tasku.
- Dodaj testy renderu.
- Nie ruszaj AdminApp/Sidebar.
- Pracuj zgodnie z `AGENTS.md` (Clean Architecture, YAGNI/SOLID/DRY/KISS, code po angielsku).
- Wykonuj tylko UI (wizualnie), bez backend integracji.
- **Nie edytuj** `core/admin/app/AdminApp.tsx`, `core/admin/ui/navigation/sidebarConfig.ts`, `core/admin/ui/settings/SettingsSidebar.tsx`.
  Integracja routing/menu jest w osobnym TASK-006-42.
- Korzystaj z istniejących wzorców UI w repo i shadcn.
- Dodaj/aktualizuj testy renderu zgodnie z taskiem.
- Po zmianach uruchom: `bun --cwd core lint`, `bun --cwd core lint:types`, `bun test` (instalacja bun jesli cos nie dziala i trzeba uzyc sciezki pelnej - /Users/pciechanski/.bun/bin/bun)
- Jeśli musisz logicznie coś poprawić, odnotuj to w podsumowaniu.
- Nie przejmuj sie dodatkowymi zmianami w git status bo pracuje 28 agentow jednoczesnie, skup sie wylacznie na swoim zakresie

---

## Prompt 20 — TASK-006-33 (General Settings UI)
Zrealizuj **TASK-006-33**.
- Task: `_docs/_TASKS/TASK-006-33_General_Settings_UI.md`
- Referencje: `_docs/UI/admin_panel/33-general-settings/code.html`, `_docs/UI/admin_panel/33-general-settings/screen.png`
- Dodaj komponenty w `core/admin/ui/settings/` wg tasku.
- Dodaj testy renderu.
- Nie ruszaj SettingsSidebar.
- Pracuj zgodnie z `AGENTS.md` (Clean Architecture, YAGNI/SOLID/DRY/KISS, code po angielsku).
- Wykonuj tylko UI (wizualnie), bez backend integracji.
- **Nie edytuj** `core/admin/app/AdminApp.tsx`, `core/admin/ui/navigation/sidebarConfig.ts`, `core/admin/ui/settings/SettingsSidebar.tsx`.
  Integracja routing/menu jest w osobnym TASK-006-42.
- Korzystaj z istniejących wzorców UI w repo i shadcn.
- Dodaj/aktualizuj testy renderu zgodnie z taskiem.
- Po zmianach uruchom: `bun --cwd core lint`, `bun --cwd core lint:types`, `bun test` (instalacja bun jesli cos nie dziala i trzeba uzyc sciezki pelnej - /Users/pciechanski/.bun/bin/bun)
- Jeśli musisz logicznie coś poprawić, odnotuj to w podsumowaniu.
- Nie przejmuj sie dodatkowymi zmianami w git status bo pracuje 28 agentow jednoczesnie, skup sie wylacznie na swoim zakresie

---

## Prompt 21 — TASK-006-34 (Integrations UI)
Zrealizuj **TASK-006-34**.
- Task: `_docs/_TASKS/TASK-006-34_Integrations_UI.md`
- Referencje: `_docs/UI/admin_panel/34-integrations/code.html`, `_docs/UI/admin_panel/34-integrations/screen.png`
- Dodaj komponenty w `core/admin/ui/settings/` wg tasku.
- Dodaj testy renderu.
- Nie ruszaj SettingsSidebar.
- Pracuj zgodnie z `AGENTS.md` (Clean Architecture, YAGNI/SOLID/DRY/KISS, code po angielsku).
- Wykonuj tylko UI (wizualnie), bez backend integracji.
- **Nie edytuj** `core/admin/app/AdminApp.tsx`, `core/admin/ui/navigation/sidebarConfig.ts`, `core/admin/ui/settings/SettingsSidebar.tsx`.
  Integracja routing/menu jest w osobnym TASK-006-42.
- Korzystaj z istniejących wzorców UI w repo i shadcn.
- Dodaj/aktualizuj testy renderu zgodnie z taskiem.
- Po zmianach uruchom: `bun --cwd core lint`, `bun --cwd core lint:types`, `bun test` (instalacja bun jesli cos nie dziala i trzeba uzyc sciezki pelnej - /Users/pciechanski/.bun/bin/bun)
- Jeśli musisz logicznie coś poprawić, odnotuj to w podsumowaniu.
- Nie przejmuj sie dodatkowymi zmianami w git status bo pracuje 28 agentow jednoczesnie, skup sie wylacznie na swoim zakresie

---

## Prompt 22 — TASK-006-35 (Invite Users UI)
Zrealizuj **TASK-006-35**.
- Task: `_docs/_TASKS/TASK-006-35_Invite_Users_UI.md`
- Referencje: `_docs/UI/admin_panel/35-invite-users/code.html`, `_docs/UI/admin_panel/35-invite-users/screen.png`
- Dodaj komponent w `core/admin/ui/users/` wg tasku.
- Dodaj test renderu.
- Nie ruszaj AdminApp/Sidebar.
- Pracuj zgodnie z `AGENTS.md` (Clean Architecture, YAGNI/SOLID/DRY/KISS, code po angielsku).
- Wykonuj tylko UI (wizualnie), bez backend integracji.
- **Nie edytuj** `core/admin/app/AdminApp.tsx`, `core/admin/ui/navigation/sidebarConfig.ts`, `core/admin/ui/settings/SettingsSidebar.tsx`.
  Integracja routing/menu jest w osobnym TASK-006-42.
- Korzystaj z istniejących wzorców UI w repo i shadcn.
- Dodaj/aktualizuj testy renderu zgodnie z taskiem.
- Po zmianach uruchom: `bun --cwd core lint`, `bun --cwd core lint:types`, `bun test` (instalacja bun jesli cos nie dziala i trzeba uzyc sciezki pelnej - /Users/pciechanski/.bun/bin/bun)
- Jeśli musisz logicznie coś poprawić, odnotuj to w podsumowaniu.
- Nie przejmuj sie dodatkowymi zmianami w git status bo pracuje 28 agentow jednoczesnie, skup sie wylacznie na swoim zakresie

---

## Prompt 23 — TASK-006-36 (IP Allowlist UI)
Zrealizuj **TASK-006-36**.
- Task: `_docs/_TASKS/TASK-006-36_IP_Allowlist_UI.md`
- Referencje: `_docs/UI/admin_panel/36-ip-allowlist/code.html`, `_docs/UI/admin_panel/36-ip-allowlist/screen.png`
- Dodaj komponenty w `core/admin/ui/settings/` wg tasku.
- Dodaj test renderu.
- Nie ruszaj SettingsSidebar.
- Pracuj zgodnie z `AGENTS.md` (Clean Architecture, YAGNI/SOLID/DRY/KISS, code po angielsku).
- Wykonuj tylko UI (wizualnie), bez backend integracji.
- **Nie edytuj** `core/admin/app/AdminApp.tsx`, `core/admin/ui/navigation/sidebarConfig.ts`, `core/admin/ui/settings/SettingsSidebar.tsx`.
  Integracja routing/menu jest w osobnym TASK-006-42.
- Korzystaj z istniejących wzorców UI w repo i shadcn.
- Dodaj/aktualizuj testy renderu zgodnie z taskiem.
- Po zmianach uruchom: `bun --cwd core lint`, `bun --cwd core lint:types`, `bun test` (instalacja bun jesli cos nie dziala i trzeba uzyc sciezki pelnej - /Users/pciechanski/.bun/bin/bun)
- Jeśli musisz logicznie coś poprawić, odnotuj to w podsumowaniu.
- Nie przejmuj sie dodatkowymi zmianami w git status bo pracuje 28 agentow jednoczesnie, skup sie wylacznie na swoim zakresie

---

## Prompt 24 — TASK-006-37 (Redirects UI)
Zrealizuj **TASK-006-37**.
- Task: `_docs/_TASKS/TASK-006-37_Redirects_UI.md`
- Referencje: `_docs/UI/admin_panel/37-redirects/code.html`, `_docs/UI/admin_panel/37-redirects/screen.png`
- Dodaj komponenty w `core/admin/ui/redirects/` wg tasku.
- Dodaj test renderu.
- Nie ruszaj AdminApp/Sidebar.
- Pracuj zgodnie z `AGENTS.md` (Clean Architecture, YAGNI/SOLID/DRY/KISS, code po angielsku).
- Wykonuj tylko UI (wizualnie), bez backend integracji.
- **Nie edytuj** `core/admin/app/AdminApp.tsx`, `core/admin/ui/navigation/sidebarConfig.ts`, `core/admin/ui/settings/SettingsSidebar.tsx`.
  Integracja routing/menu jest w osobnym TASK-006-42.
- Korzystaj z istniejących wzorców UI w repo i shadcn.
- Dodaj/aktualizuj testy renderu zgodnie z taskiem.
- Po zmianach uruchom: `bun --cwd core lint`, `bun --cwd core lint:types`, `bun test` (instalacja bun jesli cos nie dziala i trzeba uzyc sciezki pelnej - /Users/pciechanski/.bun/bin/bun)
- Jeśli musisz logicznie coś poprawić, odnotuj to w podsumowaniu.
- Nie przejmuj sie dodatkowymi zmianami w git status bo pracuje 28 agentow jednoczesnie, skup sie wylacznie na swoim zakresie

---

## Prompt 25 — TASK-006-38 (Security Sessions UI)
Zrealizuj **TASK-006-38**.
- Task: `_docs/_TASKS/TASK-006-38_Security_Sessions_UI.md`
- Referencje: `_docs/UI/admin_panel/38-security-sessions/code.html`, `_docs/UI/admin_panel/38-security-sessions/screen.png`
- Dodaj komponenty w `core/admin/ui/settings/` wg tasku.
- Dodaj test renderu.
- Nie ruszaj SettingsSidebar.
- Pracuj zgodnie z `AGENTS.md` (Clean Architecture, YAGNI/SOLID/DRY/KISS, code po angielsku).
- Wykonuj tylko UI (wizualnie), bez backend integracji.
- **Nie edytuj** `core/admin/app/AdminApp.tsx`, `core/admin/ui/navigation/sidebarConfig.ts`, `core/admin/ui/settings/SettingsSidebar.tsx`.
  Integracja routing/menu jest w osobnym TASK-006-42.
- Korzystaj z istniejących wzorców UI w repo i shadcn.
- Dodaj/aktualizuj testy renderu zgodnie z taskiem.
- Po zmianach uruchom: `bun --cwd core lint`, `bun --cwd core lint:types`, `bun test` (instalacja bun jesli cos nie dziala i trzeba uzyc sciezki pelnej - /Users/pciechanski/.bun/bin/bun)
- Jeśli musisz logicznie coś poprawić, odnotuj to w podsumowaniu.
- Nie przejmuj sie dodatkowymi zmianami w git status bo pracuje 28 agentow jednoczesnie, skup sie wylacznie na swoim zakresie

---

## Prompt 26 — TASK-006-39 (Storage Settings UI)
Zrealizuj **TASK-006-39**.
- Task: `_docs/_TASKS/TASK-006-39_Storage_Settings_UI.md`
- Referencje: `_docs/UI/admin_panel/39-storage-settings/code.html`, `_docs/UI/admin_panel/39-storage-settings/screen.png`
- Dodaj komponenty w `core/admin/ui/settings/` wg tasku.
- Dodaj test renderu.
- Nie ruszaj SettingsSidebar.
- Pracuj zgodnie z `AGENTS.md` (Clean Architecture, YAGNI/SOLID/DRY/KISS, code po angielsku).
- Wykonuj tylko UI (wizualnie), bez backend integracji.
- **Nie edytuj** `core/admin/app/AdminApp.tsx`, `core/admin/ui/navigation/sidebarConfig.ts`, `core/admin/ui/settings/SettingsSidebar.tsx`.
  Integracja routing/menu jest w osobnym TASK-006-42.
- Korzystaj z istniejących wzorców UI w repo i shadcn.
- Dodaj/aktualizuj testy renderu zgodnie z taskiem.
- Po zmianach uruchom: `bun --cwd core lint`, `bun --cwd core lint:types`, `bun test` (instalacja bun jesli cos nie dziala i trzeba uzyc sciezki pelnej - /Users/pciechanski/.bun/bin/bun)
- Jeśli musisz logicznie coś poprawić, odnotuj to w podsumowaniu.
- Nie przejmuj sie dodatkowymi zmianami w git status bo pracuje 28 agentow jednoczesnie, skup sie wylacznie na swoim zakresie

---

## Prompt 27 — TASK-006-40 (Import & Export UI)
Zrealizuj **TASK-006-40**.
- Task: `_docs/_TASKS/TASK-006-40_Import_Export_UI.md`
- Referencje: `_docs/UI/admin_panel/40-import-export/code.html`, `_docs/UI/admin_panel/40-import-export/screen.png`
- Dodaj komponenty w `core/admin/ui/import-export/` wg tasku.
- Dodaj test renderu.
- Nie ruszaj AdminApp/Sidebar.
- Pracuj zgodnie z `AGENTS.md` (Clean Architecture, YAGNI/SOLID/DRY/KISS, code po angielsku).
- Wykonuj tylko UI (wizualnie), bez backend integracji.
- **Nie edytuj** `core/admin/app/AdminApp.tsx`, `core/admin/ui/navigation/sidebarConfig.ts`, `core/admin/ui/settings/SettingsSidebar.tsx`.
  Integracja routing/menu jest w osobnym TASK-006-42.
- Korzystaj z istniejących wzorców UI w repo i shadcn.
- Dodaj/aktualizuj testy renderu zgodnie z taskiem.
- Po zmianach uruchom: `bun --cwd core lint`, `bun --cwd core lint:types`, `bun test` (instalacja bun jesli cos nie dziala i trzeba uzyc sciezki pelnej - /Users/pciechanski/.bun/bin/bun)
- Jeśli musisz logicznie coś poprawić, odnotuj to w podsumowaniu.
- Nie przejmuj sie dodatkowymi zmianami w git status bo pracuje 28 agentow jednoczesnie, skup sie wylacznie na swoim zakresie

---

## Prompt 28 — TASK-006-41 (Login Alerts UI)
Zrealizuj **TASK-006-41**.
- Task: `_docs/_TASKS/TASK-006-41_Login_Alerts_UI.md`
- Referencje: `_docs/UI/admin_panel/41-login-alerts/code.html`, `_docs/UI/admin_panel/41-login-alerts/screen.png`
- Dodaj komponenty w `core/admin/ui/settings/` wg tasku.
- Dodaj test renderu.
- Nie ruszaj SettingsSidebar.
- Pracuj zgodnie z `AGENTS.md` (Clean Architecture, YAGNI/SOLID/DRY/KISS, code po angielsku).
- Wykonuj tylko UI (wizualnie), bez backend integracji.
- **Nie edytuj** `core/admin/app/AdminApp.tsx`, `core/admin/ui/navigation/sidebarConfig.ts`, `core/admin/ui/settings/SettingsSidebar.tsx`.
  Integracja routing/menu jest w osobnym TASK-006-42.
- Korzystaj z istniejących wzorców UI w repo i shadcn.
- Dodaj/aktualizuj testy renderu zgodnie z taskiem.
- Po zmianach uruchom: `bun --cwd core lint`, `bun --cwd core lint:types`, `bun test` (instalacja bun jesli cos nie dziala i trzeba uzyc sciezki pelnej - /Users/pciechanski/.bun/bin/bun)
- Jeśli musisz logicznie coś poprawić, odnotuj to w podsumowaniu.
- Nie przejmuj sie dodatkowymi zmianami w git status bo pracuje 28 agentow jednoczesnie, skup sie wylacznie na swoim zakresie
- Nie przejmuj sie dodatkowymi zmianami w git status bo pracuje 28 agentow jednoczesnie, skup sie wylacznie na swoim zakresie

