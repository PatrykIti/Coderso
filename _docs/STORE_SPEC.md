# Store Spec (v1)

Specyfikacja serwisu Store, procesu publikacji pluginow i kontroli
bezpieczenstwa. Dokument opisuje pipeline, wymagania, i metadane.

## Cele

- Bezpieczna dystrybucja pluginow (trust by curation).
- Staly kontrakt metadanych i weryfikacji po stronie core.
- Szybkie publisze i update bez rebuilda core.

## Nie-cele

- Sandboxing nieufnego kodu.
- Automatyczne buildowanie pluginow w store (domyslnie prebuilt).

---

## Artefakty publikacji

Wymagane:
- Paczka ZIP pluginu (prebuilt).
- `plugin.json` z poprawnym manifestem.
- Checksum SHA256 dla paczki.

Opcjonalne / rekomendowane:
- SBOM (CycloneDX JSON) dla zaleznosci.
- Zrodla (source tarball) do dodatkowej weryfikacji.

---

## Metadane wersji (przyklad)

`metadata.json`:

```json
{
  "name": "seo-boost",
  "version": "1.0.0",
  "apiVersion": "1",
  "coreVersion": ">=0.1.0 <0.2.0",
  "checksum": {
    "sha256": "..."
  },
  "files": {
    "download": "https://store.example.com/plugins/seo-boost/1.0.0/download"
  },
  "security": {
    "scanStatus": "passed",
    "scanAt": "2025-01-01T00:00:00Z"
  },
  "release": {
    "type": "normal",
    "channel": "stable"
  },
  "signature": {
    "keyId": "store-2025-01"
  }
}
```

Podpis:
- `metadata.json` jest podpisany kluczem store.
- podpis dostarczany jako `metadata.sig` (detached).

---

## Format metadanych i podpisu

Pliki wersji:
- `metadata.json`
- `metadata.sig` (detached, base64)
- paczka ZIP (download)

Canonicalization `metadata.json` (do podpisu):
- UTF-8
- klucze posortowane leksykograficznie
- bez dodatkowych bialych znakow (minified)

Podpis:
- algorytm ed25519
- podpis liczony na canonical `metadata.json`
- `metadata.sig` to base64 z surowego podpisu (64 bajty)
- core weryfikuje podpis kluczem `STORE_PUBLIC_KEY`

Checksum:
- `checksum.sha256` to hash surowych bajtow ZIP
- core weryfikuje checksum po pobraniu paczki

Opcjonalnie:
- `package.sig` (podpis paczki ZIP) jako dodatkowa warstwa.

---

## Pipeline publikacji

1. Upload paczki ZIP przez autora.
2. Walidacja manifestu (schema, apiVersion, coreVersion, entry).
3. Skanowanie bezpieczenstwa (SAST, CVE, secrets, licencje).
4. Zapis metadanych i artefaktow.
5. Podpisanie `metadata.json`.
6. Publikacja wersji.

---

## Skanowanie bezpieczenstwa (v1)

Minimalny zestaw:
- SAST (np. reguly Semgrep na ESM bundlach).
- CVE dla zaleznosci (na podstawie SBOM).
- Secrets scanning (klucze, tokeny, hasla).
- License scanning (whitelist licencji).

Dodatkowe reguly (heurystyki):
- Wykrywanie `eval`, `new Function`, dynamicznych importow z user input.
- Proby dostepu do `child_process` i `fs` (notyfikacja).
- Wykrywanie "beaconing" (nieznane endpointy).

Skutki:
- `scanStatus=failed` blokuje publikacje.
- `scanStatus=warning` wymaga akceptacji manualnej.

---

## CVE i SBOM

- Store wymaga SBOM (CycloneDX JSON) od wersji v2.
- Do v2: SBOM opcjonalny, ale zalecany.
- CVE skanowane przez baze (np. OSV/NVD).

---

## Polityka licencji

- Allowed: MIT, Apache-2.0, BSD-2-Clause, BSD-3-Clause, ISC.
- Restricted: GPL / AGPL (wymaga akceptacji).
- Nieznane licencje = warning lub blokada.

---

## Podpisy i klucze

- Algorytm: ed25519 (rekomendowany).
- Prywatny klucz w HSM lub usludze signing.
- Publiczny klucz w core (konfiguracja).
- Core weryfikuje podpis `metadata.json` + `checksum`.
- `metadata.json` moze zawierac `keyId` dla rotacji kluczy.

---

## Revocation i blokady

- `revocations.json` publikowane przez store.
- Core cyklicznie pobiera liste (np. co 1h).
- Revocation powoduje:
  - blokade instalacji
  - oznaczenie jako "disabled" w registry

---

## Versioning i kompatybilnosc

- Semver dla pluginow.
- Store blokuje publikacje, jesli `coreVersion` nie spelnia polityki.
- Store wymaga `apiVersion` zgodnego ze `SDK_SPEC.md`.
- Release type:
  - `normal` (domyslnie)
  - `security` (uzywane przez auto-security update)
- Release channel:
  - `stable` (domyslnie)
  - opcjonalnie `beta` / `alpha` w przyszlosci

---

## Autoryzacja publikacji

- Autorzy maja konta w store.
- Tokeny publikacji scoped per plugin.
- 2FA dla author/maintainer (rekomendowane).

---

## API Store (v1)

Public:
- `GET /plugins`
- `GET /plugins/:name`
- `GET /plugins/:name/versions/:version/metadata`
- `GET /plugins/:name/versions/:version/metadata.sig`
- `GET /plugins/:name/versions/:version/download`
- `GET /revocations.json`

Private:
- `POST /publish`
- `POST /plugins/:name/versions/:version/revoke`

---

## Rate limiting i CDN

- Downloady paczek przez CDN.
- Rate limit dla publikacji i listowania w adminie.

---

## Operacje manualne

- Manual review dla nowych pluginow.
- Manual review dla pluginow z ostrzezeniami security.
- Incident response: CVE -> revoke -> komunikat do core.
