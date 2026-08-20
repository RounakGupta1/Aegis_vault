# Contributing to Aegis Vault

Thank you for helping improve this educational password manager.

## Development

1. Fork and clone the repository.
2. Copy `.env.example` to `server/.env` and generate unique secrets.
3. Start MongoDB locally or with Docker.
4. Run `npm install` in `server/` and `client/`.
5. Run `npm run dev` in both apps.

## Rules

- Never log master passwords, vault keys, tokens, or recovered secrets.
- Keep vault payloads encrypted on the client with Web Crypto AES-GCM.
- Add tests for authentication, authorization, and generator behavior.
- Do not commit `.env`, certificates, or personal vault exports.
- Prefer small, reviewable pull requests.

## Pull requests

Describe the security impact of the change. If cryptography is involved, explain why a standard construction is used instead of a custom algorithm.
