# Contact Widget (v1)

## Purpose

Sekcja kontaktu z formularzem i danymi firmy.

## Variants (v1)

- form-left (formularz po lewej, dane po prawej)
- form-right (formularz po prawej)
- minimal (tylko dane kontaktowe)

## Wizard flow (v1)

- Pytanie 1: Uklad (form-left / form-right / minimal)
- Pytanie 2: Jakie pola w formularzu (name, email, phone, message)
- Pytanie 3: Dane kontaktowe (telefon, email, adres)

## Visual mode

- Podglad wariantow z formularzem i danymi.

## Advanced options (v1)

- form: fields, required, submitLabel
- contact: phone, email, address, hours
- map: enabled, embedUrl
- style: spacing, background, columns

## Data model (summary)

```json
{
  "variant": "form-left",
  "form": {
    "fields": ["name", "email", "message"],
    "submitLabel": "string"
  },
  "contact": {
    "phone": "string",
    "email": "string",
    "address": "string"
  },
  "map": { "enabled": false, "embedUrl": "string" }
}
```
