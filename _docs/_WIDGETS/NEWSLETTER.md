# Newsletter Widget (v1)

## Purpose

Zbieranie leadow przez prosty formularz zapisu.

## Widget ID

`newsletter`

## Variants (v1)

- inline (input + button w jednej linii)
- stacked (input nad buttonem)
- minimal (tytul + input + button)

## Wizard flow (v1)

- Pytanie 1: Styl (inline / stacked / minimal)
- Pytanie 2: Tytul i opis
- Pytanie 3: Tekst przycisku
- Pytanie 4: Zgoda (checkbox tak/nie)

## Visual mode

- Podglad wariantow z miniaturami.
- Pokazuje tylko pola dla wybranego wariantu.

## Advanced options (v1)

- content: title, description, placeholder
- consent: label, required
- submit: buttonLabel, successMessage
- integration: actionUrl lub webhookId
- style: spacing, alignment, background

## Data model (summary)

```json
{
  "variant": "inline",
  "title": "string",
  "description": "string",
  "placeholder": "string",
  "consent": { "enabled": true, "label": "string" },
  "submit": { "label": "string", "successMessage": "string" },
  "integration": { "actionUrl": "string" }
}
```
