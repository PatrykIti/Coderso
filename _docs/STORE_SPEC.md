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
  }
}
```

Podpis:
- `metadata.json` jest podpisany kluczem store.
- podpis dostarczany jako `metadata.sig` (detached).

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
- Próby dostepu do `child_process` i `fs` (notyfikacja).
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
