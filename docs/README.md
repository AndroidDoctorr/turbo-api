# Turbo-API documentation

Turbo-API is an Express-based library for Firebase Functions (and similar hosts) that wires authentication, pluggable data/logging services, validation, and controller-driven CRUD with sensible metadata and soft-delete patterns.

## Purpose (why this exists)

The library targets the same **productivity niche as Entity Framework** in .NET: **describe your resource and rules once**, lean on **shared conventions** (metadata, ownership, soft-delete), and spend less time on repetitive API glue. It is **not** a full EF equivalent—there is no universal query language or migrations story in core—but it **is** “EF-flavored” in the sense of **convention-over-configuration for HTTP + persistence**.

**Firebase (Firestore + Auth) is the supported sweet spot today.** Broader backends (AWS, Azure, SQL, other document stores) fit the **adapter + `registerService`** idea sketched in the repo; that work is a deliberate next phase, not a prerequisite for using Turbo-API on Firebase projects.

For a candid backlog (fixes, DX, multi-backend strategy, types), see **[Roadmap & suggestions](roadmap-and-suggestions.md)**.

## Contents

- [Getting started](getting-started.md) — install, project layout, minimal Firebase wiring
- [Configuration](configuration.md) — `turbo-config.json`, `process.cwd()`, and service selection
- [Controllers & routes](controllers.md) — `ControllerBase`, `basicCRUD` / `fullCRUD`, permissions, document metadata
- [Validation](validation.md) — rule builders, conditional rules, errors, and exports from `validation`
- [Authentication](authentication.md) — Firebase ID tokens, `req.user`, and anonymous access
- [Data & logging services](data-layer.md) — Firestore data model, queries, logging, `registerService`
- [HTTP helpers & errors](http-errors.md) — `handleRoute`, status codes, and custom routes
- [Extending Turbo-API](extending.md) — adding backends, AWS stubs in the repo
- [Roadmap & suggestions](roadmap-and-suggestions.md) — suggested updates, sequencing, multi-backend notes

## Package entry points

From application code:

```javascript
const {
  buildApp,
  ControllerBase,
  validation,
  stringHelpers,
  httpHelpers,
  serviceFactory,
} = require('turbo-api')
```

- **`buildApp()`** — async factory that loads config, registers default services, attaches auth middleware, and mounts controllers.
- **`ControllerBase`** — base class for resource controllers (Express `Router` per controller).
- **`validation`** — rules, validators, and typed errors used across controllers and services.
- **`httpHelpers`** — `handleRoute` / `handleErrors` for consistent JSON responses.
- **`serviceFactory`** — `registerService`, `getDataService`, `getLoggingService`, `getAuthService`.

## Repository map

| Path | Role |
|------|------|
| `src/index.js` | `buildApp`, public exports |
| `src/controllerBase.js` | CRUD, archive/dearchive, query helpers |
| `src/validation.js` | Rules and validation pipeline |
| `src/http.js` | Route wrapper and error-to-status mapping |
| `src/serviceFactory.js` | Service registry keyed by config |
| `src/file.js` | Loads `turbo-config.json` |
| `src/dataServices/firestoreDataService.js` | Firestore implementation |
| `src/authServices/firebaseAuthService.js` | Bearer token → `req.user` |
| `src/loggingServices/firestoreLoggerService.js` | Firebase Functions logger adapter |

## License

Turbo-API uses the [ISC License](../README.md#license) (see root README).
