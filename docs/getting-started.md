# Getting started

## Prerequisites

- **Node.js 18+**
- A **backend** chosen in config:
  - **Firestore** — Firebase project + Admin credentials (default)
  - **PostgreSQL** — running Postgres + `DATABASE_URL`
  - **AWS** — DynamoDB tables + optional Cognito (see [AWS DynamoDB](aws-dynamo.md))

Firebase Functions are **optional** — Express works fine for local dev and many deployments.

## Install

```bash
npm install turbo-api express dotenv
```

Host apps using Firestore should also install **`firebase-admin@^14`**. For Firebase Functions Cloud Logging, install **`firebase-functions`** in the **host** project (not required by turbo-api itself).

## Recommended project layout

turbo-api loads from **`process.cwd()`**:

- `turbo-config.json` (or `TURBO_CONFIG_PATH` env)
- `controllers/<name>.js` for each key in config

```text
my-app/
  turbo-config.json          ← copy from turbo-config.example.json
  controllers/
    bookController.js
  src/
    server.js
  package.json
```

**Firebase Functions:** if runtime cwd is `functions/`, put config and controllers **inside `functions/`**.

See **[Implementing in your app](implementing-in-your-app.md)** for full steps.

## Express host (recommended for learning)

```javascript
require('dotenv').config()
const express = require('express')
const admin = require('firebase-admin')
const { buildApp } = require('turbo-api')

admin.initializeApp() // Firestore/Auth; uses GOOGLE_APPLICATION_CREDENTIALS

let app
async function getApp() {
  if (!app) {
    const turbo = await buildApp()
    app = express()
    app.use(express.json()) // required — turbo-api does not add this
    app.use(turbo)
  }
  return app
}

getApp().then((a) => a.listen(3000))
```

## Firebase Functions host

```javascript
const functions = require('firebase-functions')
const admin = require('firebase-admin')
const { getApp } = require('./server') // pattern above

admin.initializeApp()

let app
exports.api = functions.https.onRequest(async (req, res) => {
  if (!app) app = await getApp()
  return app(req, res)
})
```

Cache `await getApp()` in module scope to reduce cold-start work.

## Choose a backend

| Config `dataService` | Setup |
|----------------------|--------|
| `firestore` | Firebase Admin credentials |
| `postgres` | Set **`DATABASE_URL`** — [PostgreSQL guide](postgresql.md) |
| `aws` | AWS SDK credentials + DynamoDB tables — [AWS guide](aws-dynamo.md) |

Mix backends: e.g. `"dataService": "postgres"`, `"authService": "firestore"`.

## Next steps

- [Configuration](configuration.md)
- [Controllers](controllers.md)
- [Validation](validation.md)
- [Quick reference](quick-reference.md)
- [AGENTS.md](../AGENTS.md) for automated implementation
