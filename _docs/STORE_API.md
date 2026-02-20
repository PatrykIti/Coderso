# Store API

Public and publisher-facing API surface for plugin distribution.

## Public Read Endpoints

- `GET /plugins`
- `GET /plugins/:name`
- `GET /plugins/:name/versions/:version/metadata`
- `GET /plugins/:name/versions/:version/metadata.sig`
- `GET /plugins/:name/versions/:version/download`
- `GET /revocations.json`

## Metadata Contract (summary)

```json
{
  "name": "seo-boost",
  "version": "1.0.0",
  "apiVersion": "1",
  "coreVersion": ">=0.1.0 <0.2.0",
  "checksum": { "sha256": "..." },
  "files": { "download": "https://store.example.com/..." },
  "release": { "type": "normal", "channel": "stable" },
  "signature": { "keyId": "store-2026-01" }
}
```

Core verification path:
1. verify detached signature (`metadata.sig`),
2. verify package checksum,
3. validate `plugin.json` manifest contract,
4. enforce compatibility/dependencies,
5. install + runtime load.

## Publisher/Private Endpoints (pipeline)

- `POST /publish`
- `POST /plugins/:name/versions/:version/revoke`

Pipeline gate requirements:
- manifest validation (`plugin.json`),
- SAST/CVE/secrets/license checks,
- metadata signing before publish.

## Manifest Validation Notes

Store should validate plugin package manifest against `CODERSO_PLUGIN_CONTRACT.md`.

Required guarantees before publish:
- manifest is structurally valid,
- declared `targetApiVersion`/`targetCoreVersion` (or legacy aliases) are present,
- contribution ids and route declarations are valid,
- declared permissions cover write routes.

## Related Docs

- `_docs/STORE_SPEC.md`
- `_docs/CODERSO_PLUGIN_CONTRACT.md`
- `_docs/SDK_SPEC.md`
