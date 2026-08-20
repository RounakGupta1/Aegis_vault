# Aegis Vault

Aegis Vault is a **zero-knowledge password manager** built as a production-style full-stack TypeScript application. Sensitive vault data is encrypted in the browser with AES-256-GCM before it ever reaches the API. The server stores ciphertext, authentication hashes, and wrap metadata — not master passwords and not plaintext credentials.

> **Educational software.** This project has not undergone a professional security audit. Do not store real high-value credentials unless you have independently reviewed the cryptography, deployment, and operational practices.

![Dashboard placeholder](docs/screenshots/dashboard.png)
![Vault placeholder](docs/screenshots/vault.png)
![Security Center placeholder](docs/screenshots/security.png)

Add PNG captures of the running app into `docs/screenshots/` when you showcase the project.

## Features

- Register, login, logout, email verification, forgot/reset password with recovery-key re-wrap
- Argon2id client KDF, AES-256-GCM vault encryption, recovery-key wrap
- Refresh-token rotation, httpOnly cookies, CSRF double-submit, rate limits, Helmet, CORS
- Encrypted logins, secure notes, cards, and identities
- Search (Ctrl/⌘ K), categories, tags, favorites, sort/filter
- Password generator with entropy estimate and passphrases
- Security Center: weak / reused / old passwords, missing URLs, overall score
- Auto-lock, unlock screen, clipboard auto-clear, hidden secrets
- Light, dark, and system themes; responsive layout

## Tech stack

| Layer | Stack |
| --- | --- |
| Frontend | React 19, TypeScript, Vite, Tailwind CSS, React Router, TanStack Query, React Hook Form, Zod, Lucide |
| Backend | Node.js, Express, TypeScript, Zod |
| Database | MongoDB, Mongoose |
| Crypto | Web Crypto AES-GCM, hash-wasm Argon2id (client), argon2 (server auth hashes) |

## Architecture

```
client (React)
  ├─ derive master key (Argon2id)
  ├─ auth verifier = SHA-256(masterKey || "aegis-auth-v1")
  ├─ unwrap vault key with AES-GCM
  └─ encrypt/decrypt items locally
server (Express)
  ├─ Argon2id(auth verifier) for login
  ├─ encrypted blobs in MongoDB
  └─ never receives item plaintext
mongo
```

Search, health scoring, and favorites all happen **after decrypt** in the browser so the API cannot read titles, usernames, or passwords.

## Security architecture

1. The user chooses a **master password**. It is never stored and never logged.
2. Argon2id (19 MiB, 3 iterations, parallelism 1) derives a 256-bit **master key** from the password and a random salt.
3. An **auth verifier** is derived from the master key and sent to the server as the login secret. The server stores an Argon2id hash of that verifier.
4. A random **vault key** encrypts every item with AES-256-GCM (unique 96-bit IV per item).
5. The vault key is wrapped with the master key and (optionally) a **recovery key**, then stored on the server.
6. Forgetting the master password without the recovery key makes the vault unrecoverable. That is intentional.

### Limitations

- This is not a substitute for Bitwarden/1Password. Browser XSS would still be catastrophic; keep dependencies updated and avoid injecting HTML from vault fields as markup.
- Clipboard clearing is best-effort.
- Email in development is printed to the server console unless SMTP is configured.
- Prelogin returns KDF parameters; fake salts are used for unknown emails to reduce enumeration, but timing attacks may still exist.
- Demo seed logs a recovery key to the console **only in development seed**.

## Installation

```bash
git clone <your-repo-url>
cd "Password Manager"
```

### Environment variables

Copy the example file and generate secrets (`openssl rand -base64 48`):

```bash
copy .env.example server\.env   # Windows
# cp .env.example server/.env  # macOS/Linux
```

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | MongoDB connection string |
| `JWT_ACCESS_SECRET` | Signs short-lived access tokens |
| `JWT_REFRESH_SECRET` | Signs refresh tokens (rotation) |
| `PRELOGIN_PEPPER` | HMAC pepper for fake KDF salts |
| `CLIENT_URL` | Allowed CORS origin |
| `SERVER_URL` | Public API URL for logs/links |
| `SMTP_*` | Optional mail delivery |

Never commit `.env`.

### Database

1. Install [MongoDB Community](https://www.mongodb.com/try/download/community) **or** run `docker compose up mongo -d`.
2. Create database `aegis` (Mongoose will create it on first write).
3. For production, use [MongoDB Atlas](https://www.mongodb.com/atlas) and put the `mongodb+srv://` URI in `DATABASE_URL`.

### Run locally

```bash
npm install
npm run install:all
```

Optional demo user (never run against production):

```bash
cd server
npx tsx src/seed/seed.ts
```

Start both apps:

```bash
npm run dev
```

Open `http://localhost:5173`. The Vite dev server proxies `/api` to `http://localhost:4000`.

Production-style local run (after `npm run build`):

```bash
npm start
```

The API listens on `0.0.0.0` and the port from `PORT` (default `4000`), and serves `client/dist` when that build exists.

### Demo credentials (fake)

| Field | Value |
| --- | --- |
| Email | `demo@aegis.local` |
| Master password | `DemoVault!2026` |

Demo vault items are clearly labeled **FAKE**. Do not use these values anywhere real. After seed, the server prints a development recovery key.

In development, new registrations are auto-marked email-verified so you can enter the vault immediately. Verification links still print to the API console.

## Tests

```bash
cd server && npm test
cd client && npm test
```

## API

All JSON envelopes look like:

```json
{ "success": true, "message": "...", "data": {} }
```

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| GET | `/api/health` | No | Liveness |
| POST | `/api/auth/prelogin` | No | KDF salt + params |
| POST | `/api/auth/register` | No | Create account + wrap metadata |
| POST | `/api/auth/login` | No | Set httpOnly session cookies |
| POST | `/api/auth/logout` | Yes + CSRF | Revoke session |
| POST | `/api/auth/refresh` | Refresh cookie | Rotate refresh token |
| GET | `/api/auth/me` | Yes | Profile + wrap metadata |
| PATCH | `/api/auth/me` | Yes + CSRF | Name / auto-lock / clipboard |
| POST | `/api/auth/verify-email` | No | Confirm email token |
| POST | `/api/auth/forgot-password` | No | Email reset token |
| POST | `/api/auth/reset-material` | Reset token | Recovery wrap blob |
| POST | `/api/auth/reset-password` | Reset token | New verifier + wraps |
| GET | `/api/vault` | Yes | Encrypted items |
| POST | `/api/vault` | Yes + CSRF | Store ciphertext |
| PUT | `/api/vault/:id` | Yes + CSRF | Update ciphertext |
| DELETE | `/api/vault/:id` | Yes + CSRF | Delete item |
| GET | `/api/security/health` | Yes | Points client to local scoring |
| POST | `/api/security/password-check` | Yes + CSRF | HIBP range API proxy (5-char prefix) |

Authenticated mutations must send header `X-CSRF-Token` matching the `aegis_csrf` cookie.

## Docker

```bash
copy .env.example server\.env
docker compose up --build
```

App: `http://localhost:8080` · API: `http://localhost:4000`

## Deployment

This repo is deployed as **one Node web service** that serves the Vite production build and the Express API from the same origin. That keeps httpOnly cookies, CSRF, and CORS simple. MongoDB must run on [MongoDB Atlas](https://www.mongodb.com/atlas) (do not run a permanent database inside the web dyno).

### Render (recommended)

1. Push this repository to GitHub.
2. Create a free MongoDB Atlas cluster. Add a database user, copy the `mongodb+srv://` connection string into `DATABASE_URL`, and in **Network Access** allow Render (`0.0.0.0/0` is acceptable for a student/demo cluster; tighten to Render outbound IPs if you have a paid plan).
3. In [Render](https://dashboard.render.com), create a **Blueprint** from `render.yaml`, or a **Web Service** from the GitHub repo:
   - **Runtime:** Node
   - **Build command:** `npm install --prefix server && npm install --prefix client && npm run build --prefix server && npm run build --prefix client`
   - **Start command:** `node server/dist/index.js`
   - **Health check:** `/api/health`
4. Set environment variables in the Render dashboard (see table below). Leave `PORT` unset so Render can inject it. After the first deploy, set `CLIENT_URL` and `SERVER_URL` to `https://<your-service>.onrender.com` (no trailing slash). If those two are omitted, the API falls back to Render’s `RENDER_EXTERNAL_URL`.
5. Deploy, then open the Render URL over HTTPS. Register a new account; do not use local demo secrets in production.

Do not put secrets in `render.yaml`. Values marked `sync: false` must be entered in the Render UI.

### Other hosts

- **Frontend-only hosts** (Vercel/Netlify) are optional. If you split the UI onto another origin, you must also change cookie `SameSite` and CORS. Prefer the single-origin Render setup.
- Set `NODE_ENV=production` so cookies are `Secure` + `SameSite=strict`.
- Do not hardcode deployment URLs. Use `CLIENT_URL` and `SERVER_URL`.

## Folder structure

```
Password Manager/
  client/                 Vite + React UI
    src/api/              Fetch wrappers
    src/components/       UI, vault, generator, search
    src/contexts/         Auth, vault, theme
    src/lib/              Crypto, generator, health
    src/pages/            Routes
    src/layouts/          Shell + guards
  server/
    src/config/           Env, DB, constants
    src/controllers/      HTTP adapters
    src/middlewares/      Auth, CSRF, validation, errors
    src/models/           Mongoose schemas
    src/routes/           REST routers
    src/security/         Cookies, tokens, hashing
    src/services/         Auth, vault, mail
    src/validators/       Zod
    src/seed/             Fake demo data
  docker-compose.yml
  README.md
```

## Future improvements

- Hardware key / WebAuthn unlock
- Encrypted searchable indexes
- Native apps and browser extension autofill
- Independent cryptography review
- Account activity log with device revocation UI

## License

MIT. See [LICENSE](LICENSE).
