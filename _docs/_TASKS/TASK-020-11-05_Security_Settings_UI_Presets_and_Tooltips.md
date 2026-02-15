# TASK-020-11-05: Security Settings UI + Presets
# FileName: TASK-020-11-05_Security_Settings_UI_Presets_and_Tooltips.md

**Priority:** High  
**Category:** Admin/UI  
**Estimated Effort:** Large  
**Dependencies:** TASK-020-11-04  
**Status:** To Do  

---

## Overview

Redesign Settings → Security into user-friendly sections with presets and tooltips. Provide “WordPress-like” defaults for non-technical users.


## Sections (match Site Settings layout)

Left sidebar cards (icon + title + description), with right panel cards per section:
- Auth protection
- Rate limits
- CSRF
- CORS
- Security headers
- Sessions
- IP allowlist


---


## Sidebar Cards (Labels + Icons)

Use Lucide icons (same visual weight as Site Settings):
- Auth protection — `ShieldCheck`
- Rate limits — `Gauge`
- CSRF — `BadgeCheck`
- CORS — `Globe`
- Security headers — `Shield`
- Sessions — `KeyRound`
- IP allowlist — `Network`

Each sidebar card shows: title + 1‑line description (non‑technical).

---

## Goals

1. Use vertical tabs layout (same as Settings → Site).
2. Split settings into clear sections/tabs.
3. Add longer, non-technical descriptions and tooltips (WordPress-like).
4. Provide presets: `WordPress-like`, `Strict`, `Relaxed`, plus `Custom` after edits.
5. Preserve advanced control for power users.
6. Add a reCAPTCHA v3 section with thresholds per action (disabled by default until keys are provided).

---

## Pseudocode

```ts
const PRESETS = {
  wordpress: { rateLimit: { ... }, csrf: { enabled: true }, cors: {...} },
  strict: { rateLimit: { ... }, botProtection: { enabled: true } },
  relaxed: { rateLimit: { enabled: false } }
};

function applyPreset(name) {
  setForm(PRESETS[name]);
}
```

---

## Implementation Checklist

| File | Action |
| --- | --- |
| `core/admin/ui/settings/SecuritySettingsPage.tsx` | Use SettingsShell + vertical tabs; add sections, tooltips, presets UI |
| `core/admin/ui/settings/*` | Reusable helper components for sections |
| `tests/unit/ui/security-settings.test.tsx` | Preset apply + sections render |

---

## Open Questions

- None (copy and layout defined below).

---

## Documentation Updates Required

- `_docs/SETTINGS.md`



## Section Cards (User-Friendly Copy + Defaults + Microcopy)

### Auth protection
- **Card: Sign‑in protection**
  - Description: “Protect the login screen from bots and abuse.”
  - Fields:
    - reCAPTCHA v3 toggle (default: Off)
      - Helper: “Turn on after adding your Google keys.”
    - Site key / Secret key
      - Helper: “Create keys in Google reCAPTCHA v3. These are required only when enabled.”
    - Score thresholds
      - Login (default: 0.5)
      - Password reset (default: 0.6)
      - Helper: “Lower scores = more lenient. 0.5–0.6 is a safe starting point.”
  - Tooltip: “reCAPTCHA checks if a request looks human. Higher scores are stricter.”

- **Card: Login throttle**
  - Description: “Slow down repeated sign‑in attempts.”
  - Fields:
    - Attempts per minute (default: 10)
      - Helper: “Blocks rapid brute‑force attempts.”
    - Window seconds (default: 60)
      - Helper: “How long we count attempts before resetting.”
  - Tooltip: “Prevents brute‑force attacks without blocking normal users.”

- **Card: Password safety**
  - Description: “Extra protection for stored passwords.”
  - Fields:
    - Pepper enabled (read‑only indicator from ENV)
      - Helper: “Set `AUTH_PASSWORD_PEPPER` in ENV to enable.”
  - Tooltip: “Pepper is a server‑side secret that strengthens password hashing.”

### Rate limits
- **Card: Smart presets**
  - Description: “Pick a ready‑made safety level.”
  - Fields:
    - Preset selector: WordPress‑like / Strict / Relaxed / Custom
      - Helper: “WordPress‑like is recommended for most sites.”
  - Tooltip: “Presets apply a recommended bundle of limits.”

- **Card: Admin usage**
  - Description: “Limits for the admin panel (read/write).”
  - Fields:
    - Admin read (default: 600 / minute)
    - Admin write (default: 120 / minute)
      - Helper: “Only applies to anonymous access; logged‑in admins are not throttled.”
  - Tooltip: “Keeps admin endpoints safe without blocking real work.”

- **Card: Public site usage**
  - Description: “Limits for public visitors.”
  - Fields:
    - Public read (default: 300 / minute)
    - Public write (default: 30 / minute)
      - Helper: “Public write affects form submissions.”
  - Tooltip: “Keeps the site responsive under heavy traffic.”

- **Card: Assistant usage**
  - Description: “Limits for the built‑in assistant.”
  - Fields:
    - Assistant requests (default: 30 / minute)
  - Tooltip: “Prevents abuse of assistant endpoints.”

### CSRF
- **Card: Form safety**
  - Description: “Stops cross‑site request forgery in the admin panel.”
  - Fields:
    - Enable CSRF (default: On)
    - Token lifetime (minutes, default: 30)
      - Helper: “Shorter lifetimes are safer.”
  - Tooltip: “Required for secure admin actions.”

### CORS
- **Card: Trusted origins**
  - Description: “Which domains can call the admin API.”
  - Fields:
    - Allowed origins list (default: empty)
      - Helper: “Empty means same‑origin only.”
    - Allow credentials (default: On)
  - Tooltip: “Only list domains you fully trust (e.g., your admin domain).”

- **Card: Allowed methods**
  - Description: “HTTP methods allowed for the admin API.”
  - Fields:
    - Methods (default: GET, POST, PUT, PATCH, DELETE, OPTIONS)
    - Allowed headers (default: content-type, x-csrf-token)
    - Max age seconds (default: 600)
      - Helper: “Controls how long browsers cache CORS permissions.”
  - Tooltip: “Keep defaults unless you have a specific need.”

### Security headers
- **Card: Browser protection**
  - Description: “Extra safety headers for modern browsers.”
  - Fields:
    - Frame options (default: DENY)
    - Referrer policy (default: no-referrer)
    - Content‑type options (default: On)
  - Tooltip: “Prevents click‑jacking and reduces data leaks.”

- **Card: Advanced headers**
  - Description: “Optional strict policies (for advanced setups).”
  - Fields:
    - Content‑Security‑Policy (default: empty)
    - HSTS (default: empty)
      - Helper: “Only enable when you are confident about your policy.”
  - Tooltip: “Strict headers can break integrations if misconfigured.”

### Sessions
- **Card: Session lifetime**
  - Description: “How long users stay signed in.”
  - Fields:
    - Session TTL (days, default: 7)
  - Tooltip: “Shorter sessions improve security, longer sessions improve convenience.”

- **Card: Concurrent sessions**
  - Description: “Control how many devices can be signed in.”
  - Fields:
    - Max sessions per user (default: 3)
    - Single session mode (default: Off)
  - Tooltip: “Single session is safer; multi‑session is more convenient.”

- **Card: Login alerts**
  - Description: “Notify when a new device signs in.”
  - Fields:
    - Enable alerts (default: On)
    - New device notifications (default: On)
    - New location notifications (default: On)
  - Tooltip: “Gives early warning if an account is accessed unexpectedly.”

### IP allowlist
- **Card: Access restrictions**
  - Description: “Allow admin access only from trusted networks.”
  - Fields:
    - Enable allowlist (default: Off)
    - CIDR list (default: empty)
      - Helper: “Leave empty to allow access from anywhere.”
  - Tooltip: “Best for teams with fixed office or VPN IPs.”


### UI Microcopy Additions (Placeholders + Recommended + Validation Copy)

Apply across Security Settings inputs:

- **Placeholders** (examples)
  - Allowed origins: `https://admin.example.com`
  - CIDR list: `203.0.113.0/24, 198.51.100.0/24`
  - CSP: `default-src 'self'; img-src 'self' https:`
  - HSTS: `max-age=31536000; includeSubDomains; preload`
  - Allowed headers: `content-type, x-csrf-token`

- **Recommended badges**
  - Add a subtle "Recommended" badge next to defaults (e.g., WordPress‑like preset, CSRF enabled, Frame options = DENY).

- **Validation copy (user-friendly)**
  - Origins: “Please enter full URLs (with https://).”
  - CSRF TTL: “Enter a number of minutes (e.g., 30).”
  - Rate limits: “Enter a number per minute.”
  - CIDR: “Use valid CIDR blocks (e.g., 203.0.113.0/24).”
  - CSP/HSTS: “This is an advanced setting. Invalid values can break your site.”

