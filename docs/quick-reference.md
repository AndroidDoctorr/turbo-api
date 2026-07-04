# Quick reference

One-page cheat sheet for turbo-api implementers.

## Install & boot

```bash
npm install turbo-api express dotenv
```

```javascript
require('dotenv').config()
const express = require('express')
const { buildApp } = require('turbo-api')

const turbo = await buildApp()
const app = express()
app.use(express.json())  // required
app.use(turbo)
```

## Config (`turbo-config.json`)

```json
{
  "dataService": "firestore | postgres | aws",
  "loggingService": "firestore | postgres | aws",
  "authService": "firestore | postgres | aws",
  "controllers": {
    "myController": "/my-route"
  }
}
```

| Key | Default if omitted |
|-----|-------------------|
| `dataService` | `firestore` |
| `loggingService` | `firestore` |
| `authService` | `dataService` → `loggingService` → `firestore` |

Config path: `TURBO_CONFIG_PATH` env or `./turbo-config.json` in **cwd**.

## Backends & env

| Service | dataService | Required env |
|---------|-------------|--------------|
| Firestore | `firestore` | Firebase Admin credentials |
| PostgreSQL | `postgres` | **`DATABASE_URL`** |
| DynamoDB | `aws` | AWS credentials; Cognito for auth |

## Controller template

```javascript
const { ControllerBase, validation } = require('turbo-api')

class XController extends ControllerBase {
  constructor() {
    super('CollectionName', rules, ['prop1', 'prop2'])
  }
  configureRoutes() {
    this.basicCRUD({ isPublicGet: false })
    // or this.fullCRUD({ allowUserDelete: true })
  }
}
module.exports = { controller: XController }
```

## Validation rules

```javascript
const { stringRule, numberRule, boolRule, enumRule, fKeyRule, colorRule,
        validateData, validateDataPartial } = require('turbo-api').validation
```

| Helper | Purpose |
|--------|---------|
| `stringRule(min, max, required?, unique?)` | String length |
| `numberRule(min, max, required?)` | Number range |
| `enumRule(values, required?)` | Allowed values |
| `fKeyRule(collection, required?)` | FK must exist |
| `validateDataPartial` | PATCH — only keys in body |

## CRUD routes (`basicCRUD`)

| Method | Path | Auth notes |
|--------|------|------------|
| POST | `/` | User unless `isPublicPost` + `noMetaData` |
| GET | `/` | Active docs; public if `isPublicGet` |
| GET | `/:id` | Same |
| PUT | `/:id` | Owner or admin |
| DELETE | `/:id` | Admin or owner if `allowUserDelete` |

`fullCRUD` adds: `/my`, `/recent`, `/includeInactive`, `/:id/full`, archive/dearchive.

## HTTP errors → status

| Error | Status |
|-------|--------|
| `ValidationError` | 400 |
| `AuthError` | 401 |
| `ForbiddenError` | 403 |
| `NotFoundError` | 404 |

## Custom route

```javascript
const { handleRoute } = require('turbo-api').httpHelpers
this.router.get('/custom', (req, res) =>
  handleRoute(req, res, async (req) => ({ ok: true }))
)
```

## Common fixes

- **404 routes** → fix cwd or `TURBO_CONFIG_PATH`
- **Empty body** → `express.json()`
- **401** → send Bearer token or enable public options
- **Postgres** → `DATABASE_URL`

## Public exports only

```javascript
require('turbo-api')  // ✓
require('turbo-api/src/...')  // ✗
```
