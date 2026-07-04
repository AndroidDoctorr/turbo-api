# Implementing turbo-api in your app

Step-by-step guide to add turbo-api to a **new or existing Node.js project**. No Firebase Functions required — Express works fine.

**For LLM agents:** start with **[AGENTS.md](../AGENTS.md)** in the repo root.

## Before you start

| You need | Firestore | Postgres | AWS |
|----------|-----------|----------|-----|
| Node 18+ | ✓ | ✓ | ✓ |
| `turbo-config.json` | ✓ | ✓ | ✓ |
| `controllers/*.js` | ✓ | ✓ | ✓ |
| `express.json()` in host | ✓ | ✓ | ✓ |
| Firebase project + Admin creds | ✓ | only if `authService: firestore` | — |
| `DATABASE_URL` | — | ✓ | — |
| Cognito env vars | — | optional | ✓ |

## Step 1 — Install

```bash
npm install turbo-api express dotenv
```

**Firebase stack (typical):**

```bash
npm install firebase-admin
npm install firebase-functions   # optional; Cloud Logging in Functions runtime
```

**Postgres:** `pg` is included with turbo-api. Set `DATABASE_URL` in your environment.

## Step 2 — Choose where `cwd` lives

turbo-api loads **`turbo-config.json`** and **`controllers/`** from **`process.cwd()`** at runtime (unless `TURBO_CONFIG_PATH` is set).

Pick **one folder** and run your server from there:

```text
my-app/
  turbo-config.json
  controllers/
  src/
    server.js
  package.json
```

If you use Firebase Functions with cwd = `functions/`, put config and controllers **inside `functions/`**.

## Step 3 — Configuration

Copy **[turbo-config.example.json](../turbo-config.example.json)** to `turbo-config.json`.

**Firestore (default production stack):**

```json
{
  "dataService": "firestore",
  "loggingService": "firestore",
  "authService": "firestore",
  "controllers": {
    "bookController": "/books"
  }
}
```

**Postgres + Firebase Auth (common hybrid):**

```json
{
  "dataService": "postgres",
  "loggingService": "postgres",
  "authService": "firestore",
  "controllers": {
    "bookController": "/books"
  }
}
```

```bash
DATABASE_URL=postgresql://user:pass@localhost:5432/myapp
GOOGLE_APPLICATION_CREDENTIALS=./serviceAccountKey.json
```

See [Configuration](configuration.md) and [PostgreSQL](postgresql.md).

## Step 4 — Host server

`buildApp()` returns an Express **sub-app** (router stack). Your host must add JSON parsing.

```javascript
require('dotenv').config()
const express = require('express')
const admin = require('firebase-admin')
const { buildApp } = require('turbo-api')

if (!admin.apps?.length) {
  admin.initializeApp() // use ADC or GOOGLE_APPLICATION_CREDENTIALS
}

let app
async function getApp() {
  if (!app) {
    const turbo = await buildApp()
    app = express()
    app.use(express.json())
    app.use(turbo)
  }
  return app
}

module.exports = { getApp }
```

**Firebase Functions:**

```javascript
const functions = require('firebase-functions')
const { getApp } = require('./server')

exports.api = functions.https.onRequest(async (req, res) => {
  const app = await getApp()
  return app(req, res)
})
```

**Local Express:**

```javascript
const { getApp } = require('./server')
getApp().then((app) => app.listen(3000, () => console.log('http://localhost:3000')))
```

## Step 5 — First controller

Create `controllers/bookController.js` — key **`bookController`** must match config (no `.js`).

See [Controllers & routes](controllers.md) for `basicCRUD` / `fullCRUD` options.

Export shape:

```javascript
module.exports = { controller: BookController }
```

## Step 6 — Verify

```bash
curl http://localhost:3000/books
curl -X POST http://localhost:3000/books \
  -H "Content-Type: application/json" \
  -d '{"title":"Test","year":2024}'
```

With auth enabled, send:

```http
Authorization: Bearer <firebase-id-token>
```

## Step 7 — Ship checklist

- [ ] `turbo-config.json` and `controllers/` deployed to the same cwd as runtime
- [ ] Secrets in env (`DATABASE_URL`, service account), not committed
- [ ] `express.json()` enabled
- [ ] `firebase-admin` major aligned with turbo-api (^14) if using Firestore
- [ ] Firestore indexes created for any composite queries you add
- [ ] Integration smoke test on staging

## Example project

The **turbo-api-test** harness (maintainer sibling repo) demonstrates Postgres + Express + automated tests. Clone or copy its layout for a minimal working app.

## Next reads

- [Quick reference](quick-reference.md)
- [Upgrading from 1.2.x](upgrading.md)
- [Validation](validation.md)
- [Authentication](authentication.md)
