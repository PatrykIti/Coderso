# ORM Spec (v1)

Wybrany ORM: Drizzle ORM + PostgreSQL (driver: `postgres`).

## Dlaczego Drizzle

- Lekki, typowany, bez magii.
- Dziala dobrze z Bun.
- Latwe migracje i schema w kodzie.

## Driver

- `postgres` (postgres.js) jako driver do Postgres.
- Polaczenie przez `DATABASE_URL`.

## Struktura modulu DB

Docelowa lokalizacja:
- `/core/db/client.ts` (init polaczenia)
- `/core/db/schema.ts` (tabele)
- `/core/db/migrations/` (sql lub drizzle-kit)

## Migracje

- Uzywamy `drizzle-kit` do generowania migracji.
- Migracje wersjonowane w repo.
- Kazdy change w schema -> nowa migracja.

## Konwencje

- snake_case w DB, camelCase w TS.
- UUID jako primary key tam, gdzie to ma sens.
- JSONB dla danych blokowych i konfigurowalnych.
- Indexy na slug, status, foreign keys.
