# Turbo-API

**Convention-driven HTTP APIs for Node.js** — describe a resource once (validation rules + collection name), get CRUD routes, auth-aware handlers, and swappable backends (Firestore, PostgreSQL, AWS DynamoDB).

Think **Entity Framework–style productivity** for JavaScript: shared metadata, soft-delete, owner/admin rules — without a full ORM.

**Version:** `1.5.x` — see [CHANGELOG](CHANGELOG.md)

---

## New here?

| Audience | Start here |
|----------|------------|
| **Developers** | [Implementing in your app](docs/implementing-in-your-app.md) → [Quick reference](docs/quick-reference.md) |
| **LLM / coding agents** | **[AGENTS.md](AGENTS.md)** |
| **Upgrading from 1.2.x** | [Upgrading guide](docs/upgrading.md) |
| **All docs** | [docs/README.md](docs/README.md) |

**Example harness:** the **turbo-api-test** project (Express + Postgres + integration tests) — use as a template when available alongside this repo.

---

## 5-minute setup

```bash
npm install turbo-api express dotenv
```

**1.** `turbo-config.json` in your runtime **cwd** (copy [turbo-config.example.json](turbo-config.example.json)):

```json
{
  "dataService": "firestore",
  "loggingService": "firestore",
  "authService": "firestore",
  "controllers": { "bookController": "/books" }
}
```

**2.** `controllers/bookController.js` — export `{ controller: BookController }` extending `ControllerBase`.

**3.** Host app — **must** include `express.json()`:

```javascript
require('dotenv').config()
const express = require('express')
const { buildApp } = require('turbo-api')

const turbo = await buildApp()
const app = express()
app.use(express.json())
app.use(turbo)
app.listen(3000)
```

**Backend env:**

- **Firestore:** `GOOGLE_APPLICATION_CREDENTIALS` or Firebase default credentials
- **Postgres:** `DATABASE_URL=postgresql://...`
- **AWS:** standard AWS creds + Cognito env vars — see [docs/aws-dynamo.md](docs/aws-dynamo.md)

---

## Features

- **Controllers + validation** — `basicCRUD` / `fullCRUD`, custom routes via `handleRoute`
- **Backends** — `firestore` (default), `postgres`, `aws` (DynamoDB)
- **Auth** — Firebase ID tokens (default); Cognito for AWS; mix Postgres data + Firebase auth
- **TypeScript** — [index.d.ts](index.d.ts), no compile step required to consume

---

## Documentation

| Doc | Description |
|-----|-------------|
| [Implementing in your app](docs/implementing-in-your-app.md) | Full setup walkthrough |
| [AGENTS.md](AGENTS.md) | Rules for LLM agents |
| [Quick reference](docs/quick-reference.md) | One-page cheat sheet |
| [Configuration](docs/configuration.md) | `turbo-config.json`, env vars |
| [Controllers](docs/controllers.md) | CRUD routes & permissions |
| [Validation](docs/validation.md) | Rules & errors |
| [Authentication](docs/authentication.md) | Bearer tokens, claims |
| [PostgreSQL](docs/postgresql.md) | `DATABASE_URL` setup |
| [AWS DynamoDB](docs/aws-dynamo.md) | DynamoDB + Cognito |
| [Upgrading](docs/upgrading.md) | 1.2.x → 1.5.x |
| [Publishing](docs/PUBLISH.md) | Maintainer release checklist |

---

## Before you publish (maintainers)

See **[docs/PUBLISH.md](docs/PUBLISH.md)**. Short version:

1. `npm run check-types` in turbo-api  
2. Integration tests in **turbo-api-test** (`npm run test:integration`)  
3. Update [CHANGELOG](CHANGELOG.md), tag `v1.5.0`, `npm publish`  
4. In consumer apps: [Upgrading](docs/upgrading.md) + smoke CRUD/auth  

---

## Repository

[github.com/AndroidDoctorr/turbo-api](https://github.com/AndroidDoctorr/turbo-api) — contributions welcome.

## License

ISC
