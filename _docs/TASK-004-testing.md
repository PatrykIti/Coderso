Jak przetestować wiring z TASK‑004 (Auth):

  1. Uruchom core:
      - bun --cwd core dev
  2. Upewnij się, że admin jest zseedowany:
      - bun --cwd core db/seed.ts
        (korzysta z .env: ADMIN_EMAIL, ADMIN_PASSWORD)
  3. Test UI:
      - /admin/login → zaloguj się, powinno przekierować do /
        admin/.
      - /admin/reset → wpisz email, powinien pojawić się
        komunikat “Reset link sent”.
      - /admin/2fa → wpisz dowolny kod, powinien zwrócić błąd
        “MFA not enabled” (stub).
  4. Test API (curl):
      - curl -i -c cookies.txt -X POST http://localhost:3000/
        admin/api/auth/login -H 'Content-Type: application/json'
        -d '{"email":"...","password":"..."}'
      - curl -i -b cookies.txt http://localhost:3000/admin/api/
        auth/me
      - curl -i -b cookies.txt http://localhost:3000/admin/api/
        auth/csrf
      - curl -i -b cookies.txt -H "X-CSRF-Token: <token>" -X
        POST http://localhost:3000/admin/api/auth/logout