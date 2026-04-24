---
type: context
topic: security
status: draft
updated: 2026-04-24
---

## Assets

| Asset | Sensitivity | Notes |
|-------|-------------|-------|
| Catalog credentials (endpoint URLs, auth tokens) | High | Used to write/delete catalog records |
| Harvested metadata records | Medium | Public metadata, but integrity matters |
| Datasource configuration | Medium | Controls what is harvested |

---

## Authentication & Authorization

- Keycloak (OIDC/SAML) for user auth; roles: `admin`, `editor`, `viewer`.
- Catalog endpoint credentials stored in config files or environment variables; never in source control.

---

## Input Validation

- External API responses (CSW, WFS, etc.) must be parsed defensively; malformed responses must not crash the process.
- Config values from environment or files are trusted at startup but must be validated for required fields.

---

## Secrets Management

- Credentials must never appear in logs at any level (including DEBUG).
- Secrets must not be committed to source control — use environment variables or a secrets manager.

---

## Known Attack Surfaces

| Surface | Risk | Mitigation |
|---------|------|-----------|
| CSW-T endpoint URL | SSRF if user-controlled | Validate / allowlist endpoint URLs |
| XML responses from CSW server | XXE injection | Disable external entity processing in XML parser |

---

## Security Non-Goals

<!-- Fill in: what is explicitly out of scope for this system's security posture. -->
