# Admin Settings - raport klikany (31-05-2026)

## Zakres i źródła

Trasy: `/admin/settings`, `/admin/settings/general`,
`/admin/settings/assistant`, `/admin/settings/site`,
`/admin/settings/security`, `/admin/settings/security/sessions`,
`/admin/settings/security/login-alerts`,
`/admin/settings/security/ip-allowlist`, `/admin/settings/api-keys`,
`/admin/settings/webhooks`, `/admin/settings/email`,
`/admin/settings/storage`, `/admin/settings/integrations`.

Główne źródła: `core/admin/ui/settings/**`, `core/admin/ui/site/**`,
`core/admin/ui/security/**`, `core/admin/ui/shared/ExportDialog.tsx`.

## Co faktycznie kliknięto

- Przejście przez wszystkie Settings subpages z sidebaru.
- `Security -> Sessions`: ustawiono `Max sessions per user` na **30** i
  zapisano. UI potwierdził zapis toastem/stanem saved.
- `Security`: klikane sekcje Auth protection, Rate limits, CSRF, CORS,
  Security headers, Sessions, IP allowlist bez ryzykownych zapisów.
- `Sessions`: otwarto stronę i sprawdzono tabelę; revoke nie klikano.
- `Login Alerts`: przejście przez taby i kontrolki lokalne bez finalnego zapisu
  poza bezpiecznym odczytem.
- `IP Allowlist`: otwarcie add drawer i walidacja pustego CIDR; bez dodawania.
- `API Keys`: otwarcie create dialog i menu akcji; bez create/rotate/revoke.
- `Webhooks`: otwarcie create/edit drawer; bez test connection i delete.
- `Email`: wypełnienie pól testowych bez zapisu, otwarcie delivery logs; bez
  wysłania maila.
- `Storage`: przełączanie provider cards i wypełnienie pól bez zapisu;
  `Test Connection` kliknięte jako bezpieczny UI-only check.
- `Integrations`: search/category chips, request dialog, connect/config drawer;
  bez zapisu sekretów.

## Co działało

- Routing Settings i SettingsSidebar działały dla wszystkich subpages.
- Security settings realnie zapisują `session.maxPerUser`.
- Dashboard poprawnie ostrzegł po ustawieniu 30 sesji/user: to oczekiwany
  security signal, nie bug.
- API Keys create dialog i one-time secret dialog mają poprawny DialogTitle i
  DialogDescription.
- Integration request dialog ma poprawny DialogTitle/DialogDescription.
- Webhook drawer waliduje brak nazwy/URL/eventów przed save.
- Email test wymaga recipienta przed wysłaniem.
- Storage pokazuje ostrzeżenie, że zmiana drivera nie migruje istniejących
  plików.

## Co nie działało / co jest ryzykowne

| Obszar | Problem | Dlaczego |
| --- | --- | --- |
| General | Logo upload, favicon upload/remove wyglądają aktywnie, ale nie mają file input/handlera | `LogoUploadCard.tsx` renderuje buttony bez akcji |
| Assistant | `Run reindex` jest realną mutacją indeksu dokumentów | działa, ale wymaga osobnego potwierdzenia/dry-run w QA |
| Site | Admin path/base URL/homepage/cache zmieniają zachowanie całej instancji | poprawnie walidowane, ale wysokie ryzyko lockoutu/routingu |
| Security | `Clear stored secret` dla bot protection nie ma confirm | można wyczyścić sekret zbyt łatwo |
| Sessions | `Revoke` i `Revoke All Other Sessions` wołają API bez confirm | wysokie ryzyko odcięcia aktywnych sesji |
| Login Alerts | dolny sticky `Discard`/`Save Changes` i część channel switches są lokalne/statyczne | tylko topbar save zapisuje trzy pola `loginAlerts` |
| IP Allowlist | Add drawer nie ma semantycznego `SheetTitle`; remove entry nie ma confirm | a11y + ryzyko lockoutu |
| API Keys | Rotate/Revoke wykonują mutacje bez confirm | utrata/rotacja sekretu jest nieodwracalna dla integracji |
| Webhooks | Delete i Test Connection są bez dodatkowego potwierdzenia | delete jest destrukcyjny, test może wysłać zewnętrzny request |
| Webhooks/Email/Integrations | Sheet drawers mają title wizualny, ale brakuje `SheetDescription`/`aria-describedby` | warningi Radix w konsoli |
| Email | `Send Test Email` jest realną akcją zewnętrzną, a `Export Logs` jest UI-only | jedno jest side effectem, drugie tylko wygląda jak export |
| Storage | `Test Connection` jest UI-only | button nie ma `onClick`, więc nie testuje providerów |
| Integrations | Secret fields są dobrze maskowane, ale save sekretów wymaga ostrożnego confirm/audit | to realne credentiale, nie powinny trafiać do cache/logów |

## Dlaczego

Settings jest mieszanką produkcyjnych kontraktów i placeholderów. Część kart ma
realne API (`SecuritySettingsPage`, `EmailSettingsPage`, `StorageSettingsPage`,
`ApiKeysPage`), a część tylko wizualny shell (`LogoUploadCard`, część drawers,
shared `ExportDialog`). UI nie rozróżnia tego wystarczająco wyraźnie.

## Jak naprawić

- General: dodać realny media/file picker dla logo/favicon albo disable buttony.
- Security/Sessions/API Keys/Webhooks/IP Allowlist: confirm modal dla każdej
  destrukcyjnej lub lockout-prone akcji; test cancel/confirm.
- Login Alerts: usunąć dolny sticky action bar albo podłączyć go do tych samych
  handlerów co topbar; channel switches zapisywać albo oznaczyć jako preview.
- Drawers: dodać `SheetTitle`/`SheetDescription`; dla niewidocznych opisów użyć
  `VisuallyHidden`.
- Storage: podłączyć `Test Connection` do backendu albo ukryć. Wynik musi mieć
  success/error toast.
- Email: `Export Logs` podłączyć do API albo disable; `Send Test Email` powinien
  mieć jasny recipient preview i najlepiej confirm w środowisku produkcyjnym.
- Assistant reindex: dodać dry-run/review mode albo confirm z liczbą docs/chunks.
- Po tym audycie przywrócić `Max sessions per user` z 30 do wartości docelowej,
  jeżeli 30 było wyłącznie ustawieniem QA.
