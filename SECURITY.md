# Security Policy

Coderso is designed as a modular web platform with public, admin, plugin, and
runtime surfaces. Security reports should be handled privately and with enough
detail to reproduce the issue safely.

## Supported Versions

Until public release channels are formalized, security support targets the
current default branch and actively maintained release branches.

| Version | Supported |
| --- | --- |
| `main` / current default branch | Yes |
| Active release branches | Yes, when declared by maintainers |
| Older tags or inactive branches | Best effort |

## Reporting A Vulnerability

Do not open a public issue for a suspected vulnerability.

Use GitHub Private Vulnerability Reporting as the primary reporting path for this
repository. You can also email the maintainers at `security@paktryiti.pl`.

If neither private vulnerability reporting nor email is available, contact the
maintainers through a private repository owner or maintainer channel before
sharing details publicly.

## What To Include

- A concise description of the vulnerability.
- Affected area: admin UI, admin API, public route, runtime, plugin system,
  release automation, dependency, or deployment configuration.
- Reproduction steps, proof of concept, or a failing test when safe to provide.
- Impact assessment, including whether authentication, RBAC, CSRF, rate limits,
  validation, secret handling, or tenant isolation is involved.
- Affected commit, branch, release, or deployment.
- Redacted logs or screenshots. Do not include real secrets, tokens, private
  keys, customer data, or production database URLs.
- Preferred contact details for coordinated follow-up.

## Handling Expectations

Maintainers will triage reports, request missing reproduction details when
needed, and coordinate a fix or mitigation. Confirmed vulnerabilities should be
fixed privately before public disclosure whenever practical.

## Out Of Scope

The following reports are usually out of scope unless they demonstrate concrete
impact against Coderso:

- Generic scanner output without exploitability or affected code paths.
- Vulnerabilities in unsupported branches or heavily modified forks.
- Denial-of-service reports that rely only on excessive traffic without a
  product-specific weakness.
- Social engineering, phishing, or physical attacks.
- Reports that require access to secrets, accounts, or infrastructure that the
  reporter is not authorized to use.

## Safe Harbor

Good-faith security research is welcome when it avoids privacy violations,
service disruption, data destruction, persistence, and public disclosure before a
fix is coordinated. Stop testing and report privately if you encounter sensitive
data or privileged access.
