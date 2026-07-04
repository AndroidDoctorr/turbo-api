# Publishing turbo-api

Maintainer checklist before **`npm publish`**. Consumer adoption steps are in **[Upgrading](upgrading.md)** and **[Implementing in your app](implementing-in-your-app.md)**.

## Current target version

**`1.5.0`** — Firestore fixes, TypeScript, Postgres, AWS DynamoDB, firebase-admin 14.

---

## 1. Pre-publish (turbo-api repo)

```bash
cd turbo-api
npm install
npm run check-types
```

### Integration tests (turbo-api-test)

```bash
cd ../turbo-api-test
npm install
npm run test:integration   # requires Docker Desktop + Postgres container
```

### Manual smoke (pick your backend)

- [ ] `buildApp()` mounts controllers (no 404 on `/books` or your route)
- [ ] POST with JSON body works (`express.json()` in host)
- [ ] GET list / GET by id
- [ ] PUT sparse body (partial update)
- [ ] Auth: valid Firebase token sets `req.user`
- [ ] Auth: `banned: true` custom claim → 403
- [ ] `uniquePropCombination` rejects duplicates (403)
- [ ] Postgres: `DATABASE_URL` + auto schema
- [ ] (Optional) AWS: DynamoDB table with `id` partition key

### Documentation

- [ ] [README.md](../README.md) version accurate
- [ ] [CHANGELOG.md](../CHANGELOG.md) complete for this version
- [ ] [AGENTS.md](../AGENTS.md) matches current API

### Git & npm

```bash
git status                    # clean or intentional
git tag v1.5.0
npm publish
git push && git push --tags
```

Published files (default npm pack): `src/`, `index.d.ts`, `docs/`, `README.md`, `AGENTS.md`, `CHANGELOG.md`, `turbo-config.example.json`.

Optional: add `"files"` array in `package.json` to pin the list explicitly.

---

## 2. After publish — adopt in a real app

Example: ScenAIrio or any Firebase Functions consumer.

### Bump dependency

```bash
npm install turbo-api@^1.5.0 firebase-admin@^14
npm install firebase-functions   # if you want Functions Cloud Logging
```

### Config

```json
{
  "dataService": "firestore",
  "loggingService": "firestore",
  "authService": "firestore",
  "controllers": { ... }
}
```

Set **`TURBO_CONFIG_PATH`** if config is not in runtime cwd.

### Remove legacy shims

- Delete custom `buildApp.js` wrappers that only added ban middleware (now in turbo-api)
- Use `const { buildApp } = require('turbo-api')` only
- Remove deep imports from `turbo-api/src/*`

### Host checklist

- [ ] `admin.initializeApp()` with production credentials
- [ ] `express.json()` before turbo routes
- [ ] `turbo-config.json` + `controllers/` deployed to runtime cwd
- [ ] Firestore composite indexes for your query shapes

### Regression matrix (Firestore apps)

| Area | Test |
|------|------|
| Auth | Login; banned user → 403 |
| Sparse PUT | Partial body only on PUT |
| Uniqueness | Duplicate `uniquePropCombination` → 403 |
| Multi-prop query | `getDocumentsByProps` returns expected rows |
| CRUD | Create, read, update, delete as applicable |

Full ScenAIrio list: [release-plan-1.3.md](release-plan-1.3.md) §4.3.

### Postgres adoption (optional)

```json
"dataService": "postgres",
"authService": "firestore"
```

```bash
DATABASE_URL=postgresql://...
```

No manual schema for dev — table auto-created on first request.

---

## 3. Dependency notes (1.5.0)

| Package | Role |
|---------|------|
| `firebase-admin@14` | Firestore + Firebase Auth |
| `firebase-functions` | **Host installs** for Cloud Logging adapter |
| `pg` | Bundled with turbo-api (Postgres) |
| `@aws-sdk/*`, `aws-jwt-verify` | Optional; enables `aws` service |

Align **`firebase-admin` major** in host apps with turbo-api when using Firestore.

---

## 4. Version history pointer

| Version | Highlights |
|---------|------------|
| 1.5.0 | PostgreSQL, firebase-admin 14 modular, Admin auto-init |
| 1.4.0 | AWS DynamoDB, dependency bumps |
| 1.3.0 | TS types, validation/Firestore fixes, `authService`, `banned` |
| 1.2.2 | Firestore query fixes (ScenAIrio production) |

See [CHANGELOG.md](../CHANGELOG.md).
