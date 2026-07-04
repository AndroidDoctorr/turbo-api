# Turbo-API documentation

Turbo-API is an Express library for building validated, authenticated HTTP APIs with pluggable persistence (Firestore, PostgreSQL, AWS DynamoDB).

## Start here

| I want to… | Read |
|------------|------|
| Add turbo-api to my project | **[Implementing in your app](implementing-in-your-app.md)** |
| Copy-paste config & patterns | **[Quick reference](quick-reference.md)** |
| Upgrade from npm 1.2.x | **[Upgrading](upgrading.md)** |
| Wire an LLM agent | **[AGENTS.md](../AGENTS.md)** (repo root) |

## Guides

- [Getting started](getting-started.md) — install, cwd layout, Express vs Functions
- [Configuration](configuration.md) — `turbo-config.json`, env vars, backends
- [Controllers & routes](controllers.md) — `ControllerBase`, CRUD, permissions
- [Validation](validation.md) — rules, errors, `validateDataPartial`
- [Authentication](authentication.md) — Firebase, Cognito, anonymous access
- [Data & logging services](data-layer.md) — service registry, Firestore, adapters
- [HTTP helpers & errors](http-errors.md) — `handleRoute`, status codes

## Backends

- [PostgreSQL](postgresql.md) — **`DATABASE_URL`**, auto schema
- [AWS DynamoDB](aws-dynamo.md) — tables, Cognito
- [Extending](extending.md) — custom `registerService`

## Project meta

- [Roadmap & suggestions](roadmap-and-suggestions.md)
- [Publishing](PUBLISH.md) — maintainer release checklist
- [Release plan 1.3.0](release-plan-1.3.md) — historical ScenAIrio release notes

## Package exports

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

TypeScript: [`index.d.ts`](../index.d.ts) — run `npm run check-types` in this repo to verify.

## What turbo-api is / isn't

| Is | Isn't |
|----|-------|
| Controller + validation + CRUD conventions | Full ORM with migrations |
| Pluggable data service (`TurboDataService`) | Universal query language |
| Express sub-app via `buildApp()` | Standalone server binary |
| Firebase-first, Postgres/AWS optional | Azure adapter (yet) |

Example project: **turbo-api-test** (maintainer harness — Express, Postgres, tests).
