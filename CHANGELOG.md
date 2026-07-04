# Changelog

All notable changes to turbo-api are documented here.

## [1.5.0] — 2026-07-04

### Added

- **PostgreSQL data service** (`src/dataServices/postgresDataService.js`) — service name **`postgres`**
- **Connection resolution** (`src/postgresConfig.js`): **`DATABASE_URL`** first, then `TURBO_DATABASE_URL`, then `turbo-config.json`
- **Auto schema** — creates `turbo_api_documents` on first connect (no manual migration for dev)
- **Pass-through Postgres auth** — use `"authService": "firestore"` for Firebase Auth + Postgres data
- Documentation: [`docs/postgresql.md`](docs/postgresql.md)
- Dependency: **`pg`** (Postgres adapter)
- Shared **`consoleLoggerService`** for AWS/Postgres logging

### Fixed

- **firebase-admin v14**: modular Firestore/Auth imports; `buildApp()` default Admin init

- **Easiest setup:** set `DATABASE_URL` + `"dataService": "postgres"` in config.
- Do not store production DB passwords in committed `turbo-config.json`; use env vars.

---

## [1.4.0] — 2026-07-04

### Added

- **AWS DynamoDB data service** (`src/dataServices/awsDataService.js`) implementing `TurboDataService`
- **AWS Cognito auth middleware** (`src/authServices/awsAuthService.js`) with `admin` / `banned` / `disabled` custom claims
- **AWS console logger** (`src/loggingServices/awsConsoleLoggerService.js`)
- Automatic registration of service name **`aws`** in `buildApp()` when optional AWS packages resolve
- Documentation: [`docs/aws-dynamo.md`](docs/aws-dynamo.md)
- Optional dependencies: `@aws-sdk/client-dynamodb`, `@aws-sdk/lib-dynamodb`, `aws-jwt-verify`

### Changed

- **Dependencies:** `express` ^4.22.2, `cors` ^2.8.6, `firebase-admin` ^14.1.0
- **`firebase-functions`** is **not** a turbo-api dependency. The Firestore logger uses `firebase-functions/logger` when your host app installs it; otherwise logs go to **console**. Add `firebase-functions` in your Firebase Functions project.
- Version bumped from 1.3.0 release-candidate work to **1.4.0** (includes AWS adapter)

### Notes

- **firebase-admin@14** resolves most npm audit findings from v11; verify Firebase Auth + Firestore in your host app before upgrading consumers. Install **`firebase-functions`** in your Functions project for Cloud Logging integration (optional for the library).
- DynamoDB list/search uses **scan + in-memory filter** — suitable for small tables; use GSIs for large production workloads.
- Azure and PostgreSQL adapters remain on the roadmap.

---

## [1.3.0] — (included in 1.4.0 publish)

### Added

- TypeScript declarations (`index.d.ts`) and `npm run check-types`
- `validation.validateDataPartial` for sparse PATCH payloads
- Firebase auth rejects tokens with custom claim **`banned: true`**
- Optional config key **`authService`** (fallback: `dataService` → `loggingService` → `firestore`)
- **`TURBO_CONFIG_PATH`** environment variable for config file location
- Expanded documentation under `docs/`

### Fixed

- Firestore query chaining, pagination (`startAtIndex`, `offset`), multi-prop queries
- `ControllerBase.updateDocument`: validates merged document, `NotFoundError` when missing
- `validateData`: validates all rule keys; `uniquePropCombination` runs last
- `validateUniquePropCombo`: no longer passes invalid limit
- `/recent` route: reads `?limit=` and `?startAtIndex=` from query string
- `getAuthService()` uses `authService` config key

---

## [1.2.2] — npm (historical)

- Firestore query builder fixes used by ScenAIrio before local `big-update` merge

## [1.1.x] — npm (historical)

- Initial Firebase-first CRUD, validation, controller base
