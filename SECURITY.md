# Security Policy

## Disclaimer

Aegis Vault is an educational / portfolio project. It has **not** received a professional security audit. Do not store real production credentials in a self-hosted instance unless you have independently reviewed and hardened it.

## Supported versions

Only the latest `main` branch is maintained.

## Reporting a vulnerability

Please **do not** open a public GitHub issue for security vulnerabilities.

Email the maintainer privately with:

- A description of the issue
- Steps to reproduce
- Impact (confidentiality / integrity / availability)
- Any suggested fix

Do not include real user secrets in the report.

## Security model (summary)

- The server stores Argon2id hashes of an authentication verifier, never the master password.
- Vault items are encrypted in the browser with AES-256-GCM before upload.
- Access and refresh tokens are httpOnly cookies with refresh-token rotation.
- CSRF is mitigated with SameSite cookies plus a double-submit CSRF cookie/header on authenticated mutations.
