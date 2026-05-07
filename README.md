# Turbo-API

## Purpose

Turbo-API is a **productivity layer for Node.js HTTP APIs**: you describe a resource (what it is stored as, which fields are allowed, and how they are validated), and you get **consistent CRUD routes**, **Firebase Auth-aware access**, and **pluggable persistence** with less boilerplate than wiring Express and the Admin SDK by hand.

The mental model is intentionally similar to what **Entity Framework** gives .NET developers for app data—not a line-for-line ORM with migrations, change tracking, and LINQ, but the same *goals*: **conventions** (metadata, soft-delete via `isActive`, owner and admin rules), a **single place** for validation rules, and a **repository-shaped data layer** you can swap when the backend changes.

**Today:** the implementation is **Firebase-first** (Firebase Functions + Firestore + ID token verification). That is where the library is battle-tested and where it saves the most time.

**Originally envisioned:** the same controller and validation surface talking to **other clouds** (AWS, Azure) and **SQL or NoSQL** through extra adapters. That remains a good direction; progress there has been slow because each vendor differs, and Firebase alone already solved the maintainer’s immediate needs for several apps.

If Turbo-API clicks for your Firebase backends, you are using it the way it is strongest right now.

**Current version:** see `package.json` (for example 1.1.x).

### TypeScript

The package ships **[index.d.ts](index.d.ts)** (see the `"types"` field in `package.json`). Consumption is unchanged: `require('turbo-api')` or `import ... from 'turbo-api'`. The declarations add typings for `buildApp`, `ControllerBase`, `validation`, `httpHelpers`, `serviceFactory`, and `stringHelpers`, plus shared types such as `TurboDataService` and `TurboApiUser`. `Express.Request` is augmented with optional `user` when auth middleware runs.

turbo-api does not list `express`’s own types as a runtime dependency; if your editor or `tsc` cannot resolve `express` imports inside `index.d.ts`, install **`@types/express`** in your app (or rely on a stack that already provides it). In this repo, run **`npm run check-types`** to typecheck **`index.d.ts`** against a small smoke file.

## Documentation

Full documentation lives in the **[docs](docs/README.md)** folder:

| Doc | Description |
|-----|-------------|
| [docs/README.md](docs/README.md) | Documentation index and package map |
| [Getting started](docs/getting-started.md) | Install, layout, `buildApp`, Firebase wiring |
| [Configuration](docs/configuration.md) | `turbo-config.json`, service names, cwd |
| [Controllers & routes](docs/controllers.md) | `ControllerBase`, CRUD routes, permissions |
| [Validation](docs/validation.md) | Rules, errors, `validateData` |
| [Authentication](docs/authentication.md) | Firebase Bearer tokens, `req.user` |
| [Data & logging](docs/data-layer.md) | Firestore service, registry, stubs |
| [HTTP & errors](docs/http-errors.md) | `handleRoute`, status codes |
| [Extending](docs/extending.md) | `registerService`, AWS sketches |
| [Roadmap & suggestions](docs/roadmap-and-suggestions.md) | Future direction, improvements, backlog ideas |

## Features (high level)

- **Rapid API development** — minimal wiring; focus on controllers and rules.
- **Customizable** — add routes, swap services, extend validation.
- **Validation** — typed rules, FK checks, uniqueness, conditional requirements.
- **Service agnostic** — default Firestore; register other backends via `serviceFactory`.
- **Auth** — Firebase ID token middleware; optional public routes via controller options.

## Quick start

```bash
npm install turbo-api
```

Create `turbo-config.json` (in the directory that will be `process.cwd()` at runtime), a `controllers/` folder, and export `buildApp` from your host (see [Getting started](docs/getting-started.md)).

### Minimal config example

```json
{
  "dataService": "firestore",
  "loggingService": "firestore",
  "controllers": {
    "bookController": "/books",
    "authorController": "/authors"
  }
}
```

### Minimal functions entry (pattern)

```javascript
const admin = require('firebase-admin')
const { buildApp } = require('turbo-api')

admin.initializeApp()

exports.api = require('firebase-functions').https.onRequest(async (req, res) => {
  const app = await buildApp()
  return app(req, res)
})
```

For JSON POST/PUT bodies you typically need `express.json()` in front of your routes; see [Getting started](docs/getting-started.md).

## Example controller (sketch)

```javascript
const { ControllerBase, validation, httpHelpers, serviceFactory } = require('turbo-api')
const { handleRoute } = httpHelpers
const { stringRule, numberRule, validateData } = validation
const { getDataService } = serviceFactory

const COLLECTION = 'Books'
const PROPS = ['title', 'year']
const RULES = {
  title: stringRule(1, 200, true),
  year: numberRule(0, new Date().getFullYear(), true),
}

class BookController extends ControllerBase {
  constructor() {
    super(COLLECTION, RULES, PROPS)
  }
  configureRoutes() {
    this.basicCRUD({ isPublicGet: true, isPublicPost: false })
    // custom route example:
    this.router.post('/batch', (req, res) =>
      handleRoute(req, res, async (req) => {
        const db = await getDataService()
        await validateData(req.body, RULES, db, COLLECTION)
        const created = await db.createDocument(COLLECTION, req.body, req.user.uid)
        return created
      })
    )
  }
}

module.exports = { controller: BookController }
```

## Repository

- **Issues & PRs:** [github.com/AndroidDoctorr/turbo-api](https://github.com/AndroidDoctorr/turbo-api)

## Future work

See **[Roadmap & suggestions](docs/roadmap-and-suggestions.md)** for a fuller list (Firebase hardening, multi-backend strategy, config and DX, validation, types, and codebase fixes). **Contributions welcome.**

## License

ISC — see `package.json`.
