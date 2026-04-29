# Security Policy

Coderso is a modular web platform with public, admin, plugin, store, and runtime
surfaces. Security matters deeply because users may depend on Coderso to manage
websites, content, forms, media, business workflows, and private operational
data.

Good-faith security research is welcome and appreciated.

Please report suspected vulnerabilities privately so they can be understood,
fixed, and disclosed responsibly.

## Supported Versions

Until public release channels are formalized, security support targets the
current default branch and actively maintained release branches.

| Version                         | Supported                         |
| ------------------------------- | --------------------------------- |
| `main` / current default branch | Yes                               |
| Active release branches         | Yes, when declared by maintainers |
| Older tags or inactive branches | Best effort                       |

## Reporting a Vulnerability

Do not open a public issue for a suspected vulnerability.

Use GitHub Private Vulnerability Reporting as the primary reporting path for this
repository.

You can also email the maintainers at:

```text
security@coderso.dev
```

Replace this address with the official Coderso security contact before public
release.

If neither private vulnerability reporting nor email is available, contact the
maintainers through a private repository owner or maintainer channel before
sharing details publicly.

## What to Include

Please include as much of the following as you safely can:

- A concise description of the vulnerability.
- Affected area:
  - admin UI,
  - admin API,
  - public route,
  - runtime,
  - plugin system,
  - store/distribution system,
  - release automation,
  - dependency,
  - deployment configuration.
- Reproduction steps, proof of concept, or a failing test when safe to provide.
- Impact assessment, including whether authentication, RBAC, CSRF, rate limits,
  validation, secret handling, plugin trust, or tenant isolation is involved.
- Affected commit, branch, release, or deployment.
- Redacted logs or screenshots.
- Preferred contact details for coordinated follow-up.

Do not include real secrets, tokens, private keys, customer data, production
database URLs, or private infrastructure credentials.

## Handling Expectations

Maintainers will triage reports, request missing reproduction details when
needed, and coordinate a fix or mitigation.

Confirmed vulnerabilities should be fixed privately before public disclosure
whenever practical.

Security work can involve uncertainty, incomplete context, and careful tradeoffs.
Reports will be handled with respect, patience, and appreciation for good-faith
effort.

## Out of Scope

The following reports are usually out of scope unless they demonstrate concrete
impact against Coderso:

- Generic scanner output without exploitability or affected code paths.
- Vulnerabilities in unsupported branches or heavily modified forks.
- Denial-of-service reports that rely only on excessive traffic without a
  product-specific weakness.
- Social engineering, phishing, or physical attacks.
- Reports that require access to secrets, accounts, customer data, or
  infrastructure that the reporter is not authorized to use.
- Issues caused only by intentionally insecure local configuration.

## Safe Harbor

Good-faith security research is welcome when it avoids:

- privacy violations,
- service disruption,
- data destruction,
- persistence,
- lateral movement,
- public disclosure before a fix is coordinated.

Stop testing and report privately if you encounter sensitive data, privileged
access, secrets, private user information, or infrastructure access that was not
intended.

Researchers acting in good faith and following this policy should not be treated
as hostile.

## Security Values

Coderso security is guided by the same values as the project itself:

- protect users,
- reduce harm,
- communicate clearly,
- fix issues responsibly,
- treat people with respect.
