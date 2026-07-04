# Upgrading turbo-api

Guide for apps on **npm 1.2.x** (or older local builds) moving to **1.5.x**.

## What changed (high level)

| Area | 1.2.x | 1.5.x |
|------|-------|-------|
| TypeScript | None | `index.d.ts` + `TurboDataService` types |
| Validation | Partial update bugs | Merged validation on PUT; `validateDataPartial` |
| Firestore queries | Fixed in 1.2.2 | Pagination + multi-prop queries retained |
| Auth | `disabled` claim | + `banned` claim → 403 |
| Config | `loggingService` drove auth | **`authService`** key (with fallbacks) |
| Config path | cwd only | **`TURBO_CONFIG_PATH`** |
| firebase-admin | v11 typical | **v14** (modular SDK internally) |
| firebase-functions | turbo-api dependency | **Host installs** if you want Functions logger |
| Backends | Firestore | + **postgres**, + **aws** (DynamoDB) |
| Admin init | Host only | `buildApp()` ensures default app exists |

## Upgrade steps

### 1. Bump dependency

```bash
npm install turbo-api@^1.5.0
npm install firebase-admin@^14   # if using Firestore/Auth
```

### 2. Update `turbo-config.json`

Add explicit auth (recommended):

```json
"authService": "firestore"
```

Was implicit via `loggingService` before.

### 3. Remove shims

If you copied **`buildApp.js`** from ScenAIrio (ban middleware shim), delete it and use:

```javascript
const { buildApp } = require('turbo-api')
```

Ban handling is in turbo-api auth middleware since 1.3+.

### 4. Verify host app

- [ ] `express.json()` present
- [ ] `admin.initializeApp()` with real credentials in production
- [ ] Optional: `npm install firebase-functions` in Functions project for logging
- [ ] Controllers still export `{ controller: Class }`

### 5. Regression smoke

- [ ] POST create with auth
- [ ] Sparse PUT (partial body only)
- [ ] `uniquePropCombination` still enforced
- [ ] Multi-prop queries (`getDocumentsByProps`)
- [ ] Banned user → 403

See [release-plan-1.3.md](release-plan-1.3.md) §4.3 for ScenAIrio-specific matrix.

### 6. TypeScript consumers

Add to app (if not present):

```bash
npm install -D @types/express
```

Import types from `'turbo-api'`.

## Breaking / behavior changes to watch

- **firebase-admin 14** — align host app major version; test token verification.
- **Uniqueness checks** — fixed bug where `uniquePropCombination` could be skipped; duplicates may now correctly 403.
- **Update validation** — PUT validates merged document; stricter but correct.

## Postgres or AWS (new)

No change required for existing Firestore apps. To switch backends, change `dataService` / `authService` and env vars — see [PostgreSQL](postgresql.md) or [AWS DynamoDB](aws-dynamo.md).
