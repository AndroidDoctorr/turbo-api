# Agent guide — implementing turbo-api

This file is for **LLM coding agents** and maintainers wiring turbo-api into a JavaScript/Node project. Read this before generating app code.

Human-oriented walkthrough: **[docs/implementing-in-your-app.md](docs/implementing-in-your-app.md)**  
Cheat sheet: **[docs/quick-reference.md](docs/quick-reference.md)**

## What turbo-api is

- Express-based **library** (not a standalone server).
- You add **`turbo-config.json`**, **`controllers/`**, and call **`buildApp()`** from your host (Functions, Express, etc.).
- Each controller = one resource (collection/table) + validation rules + CRUD routes.
- **Data backend** is selected in config: `firestore` (default), `postgres`, or `aws`.

## Non-negotiable rules

1. **`process.cwd()` must contain `turbo-config.json` and `controllers/`** when `buildApp()` runs — or set env **`TURBO_CONFIG_PATH`** to the config file path.
2. **Always wrap `buildApp()` with `express.json()`** in the host app. turbo-api does **not** parse JSON bodies.
3. **Always `await buildApp()`** — it is async.
4. **Import only the public package** — `require('turbo-api')`. Do **not** deep-import `turbo-api/src/...` in consumer apps.
5. **Controller files must export `{ controller: YourClass }`** — config keys map to filenames **without `.js`** under `controllers/`.
6. **Set `authService` explicitly** when data and auth backends differ (e.g. Postgres data + Firebase auth).

## Minimal implementation recipe

### 1. Install

```bash
npm install turbo-api express dotenv
# If Firebase Functions host and you want Cloud Logging:
npm install firebase-admin firebase-functions
# Postgres backend only needs DATABASE_URL; pg is bundled with turbo-api
```

### 2. Project layout (pick one cwd strategy)

**Option A — everything under `functions/` (Firebase Functions):**

```text
functions/
  package.json
  index.js
  turbo-config.json
  controllers/
    bookController.js
```

**Option B — Express app at repo root:**

```text
  package.json
  index.js
  turbo-config.json
  controllers/
    bookController.js
```

Run the process with **cwd = folder that contains `turbo-config.json`**.

### 3. `turbo-config.json`

Copy from **[turbo-config.example.json](turbo-config.example.json)**. Examples:

| Stack | dataService | authService |
|-------|-------------|-------------|
| Firebase (production default) | `firestore` | `firestore` |
| Postgres + Firebase login | `postgres` | `firestore` |
| Postgres only (dev/tests) | `postgres` | `postgres` |
| AWS DynamoDB + Cognito | `aws` | `aws` |

### 4. Host entry (`index.js`)

```javascript
require('dotenv').config()
const express = require('express')
const { buildApp } = require('turbo-api')

let appPromise
async function getApp() {
  if (!appPromise) {
    const turbo = await buildApp()
    const app = express()
    app.use(express.json())
    app.use(turbo)
    appPromise = app
  }
  return appPromise
}

// Express local:
getApp().then((app) => app.listen(process.env.PORT || 3000))

// Firebase Functions:
// exports.api = require('firebase-functions').https.onRequest(async (req, res) => {
//   const app = await getApp()
//   return app(req, res)
// })
```

`buildApp()` initializes Firebase Admin with a default project id if needed (Firestore service registration). For **real Firestore/Auth**, the host should still call `admin.initializeApp()` with credentials when deploying.

### 5. One controller

```javascript
const { ControllerBase, validation } = require('turbo-api')
const { stringRule, numberRule } = validation

const COLLECTION = 'Books'
const PROPS = ['title', 'year']
const RULES = {
  title: stringRule(1, 200, true),
  year: numberRule(1900, new Date().getFullYear() + 1, true),
}

class BookController extends ControllerBase {
  constructor() {
    super(COLLECTION, RULES, PROPS)
  }
  configureRoutes() {
    this.basicCRUD({ isPublicGet: false, isPublicPost: false })
  }
}

module.exports = { controller: BookController }
```

### 6. Environment variables (by backend)

| Variable | When |
|----------|------|
| `GOOGLE_APPLICATION_CREDENTIALS` | Firestore in production (service account JSON path) |
| `FIREBASE_PROJECT_ID` | Optional; default project id if Admin not otherwise configured |
| `DATABASE_URL` | **Postgres** (recommended) |
| `TURBO_CONFIG_PATH` | Config file not in cwd |
| `COGNITO_USER_POOL_ID`, `COGNITO_CLIENT_ID` | AWS auth |
| AWS credential chain | AWS DynamoDB (standard SDK env/instance role) |

## Public API surface

```javascript
const {
  buildApp,
  ControllerBase,
  validation,      // rules, validateData, validateDataPartial, errors
  httpHelpers,     // handleRoute, handleErrors
  serviceFactory,  // registerService, getDataService, ...
  stringHelpers,
} = require('turbo-api')
```

## Custom routes

Use `httpHelpers.handleRoute` inside `configureRoutes()`:

```javascript
const { handleRoute } = require('turbo-api').httpHelpers

this.router.get('/mine', (req, res) =>
  handleRoute(req, res, async (req) => {
    if (!req.user) throw new validation.AuthError('Login required')
    return this.getMyDocuments(req.user)
  })
)
```

## Common agent mistakes

| Mistake | Fix |
|---------|-----|
| 404 on all routes | Wrong cwd — move config/controllers or set `TURBO_CONFIG_PATH` |
| `req.body` undefined on POST | Add `app.use(express.json())` before turbo routes |
| Auth always 401 on POST | User required unless `isPublicPost` + `noMetaData`; send `Authorization: Bearer <token>` |
| Postgres connection error | Set `DATABASE_URL`; start Postgres |
| `authMiddleware is not a function` | Typo in `authService` / `dataService` name; service not registered |
| Sparse PUT fails validation | turbo-api validates **merged** document on update (1.3+); send partial body is OK |
| Import from `turbo-api/src/...` | Use public exports only |

## Reference implementation

Sibling repo **`turbo-api-test`** (if present): Express + Postgres + integration tests. Use as a template.

## Docs index

- [docs/README.md](docs/README.md) — full documentation map
- [docs/implementing-in-your-app.md](docs/implementing-in-your-app.md) — step-by-step for humans
- [docs/configuration.md](docs/configuration.md) — config keys
- [docs/controllers.md](docs/controllers.md) — CRUD options
- [docs/validation.md](docs/validation.md) — rules
- [docs/postgresql.md](docs/postgresql.md) — Postgres setup
- [docs/upgrading.md](docs/upgrading.md) — from npm 1.2.x → 1.5.x
