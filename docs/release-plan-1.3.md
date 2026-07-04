# Turbo-API release plan — v1.3.0

This document is the **action checklist** for the next npm publish and for upgrading **ScenAIrio** (`scenairio-web/functions`, currently on `turbo-api@^1.2.2` with a local `buildApp.js` shim).

It merges:

- Work already on the **`big-update`** branch (local repo, `package.json` still says `1.1.32`)
- Fixes that exist only in **published `1.2.2`** (ScenAIrio’s installed copy under `node_modules`)
- Items from **[Roadmap & suggestions](roadmap-and-suggestions.md)** and the ScenAIrio hardening pass (2026)

**Recommended release version:** `1.3.0` (minor — new typings + behavior fixes; no intentional breaking API removals).

**Checklist status (2026-06-14):** Implementation complete on `big-update`. Ready for local test → `npm publish` → ScenAIrio bump (§4).

| Step | Status |
|------|--------|
| Port Firestore service from npm 1.2.2 | Done |
| Fix `validateUniquePropCombo` limit | Done |
| Merge `updateDocument` + `NotFoundError` | Done (was on `big-update`) |
| Auth `banned` claim | Done (was on `big-update`) |
| Export `validateDataPartial` | Done (was on `big-update`) |
| Fix `getAuthService()` + `configuration.md` | Done |
| Fix `/recent` route query wiring | Done |
| `TURBO_CONFIG_PATH` | Done |
| Update `index.d.ts` (`banned`, pagination) | Done |
| `npm run check-types` | Passes |
| Bump `package.json` to `1.3.0` | Done |
| `npm publish` | **You** — after local verification |

---

## 1. Package & publish

### 1.1 Version and branch strategy

| Item | Action |
|------|--------|
| **Merge lineages** | Before publish, merge **`big-update`** with whatever commit produced **npm `1.2.2`**. Local `big-update` has validation/auth/types work; **`1.2.2` has Firestore query fixes local does not have yet.** |
| **Bump version** | Set `package.json` `"version"` to **`1.3.0`**. | Done |
| **Tag** | Git tag `v1.3.0` after publish. | Pending publish |
| **npm** | `npm publish` from clean tree; confirm `"files"` / `.npmignore` include `index.d.ts`, `src/`, docs optional. | Pending |

### 1.2 Runtime dependencies (`package.json`)

Current `big-update` deps:

```json
"cors": "^2.8.5",
"express": "^4.19.2",
"firebase-admin": "^11.8.0",
"firebase-functions": "^4.3.1"
```

| Package | Recommendation | Notes |
|---------|----------------|-------|
| `express` | Keep `^4.19.2` (or bump patch) | ScenAIrio uses Express only indirectly via `buildApp`. |
| `firebase-admin` | Align with consumer apps (`^11.8.0` today) | ScenAIrio functions use `^11.8.0`. Avoid major bump without testing token verify + Firestore. |
| `firebase-functions` | Keep as **optional peer** long-term | Listed as dependency today but only logging adapter needs it. Document that host app provides Functions runtime. **Do not require a functions upgrade for 1.3.0.** |
| `cors` | Keep; still **not wired in `buildApp`** | ScenAIrio applies CORS in its own `functions/index.js`. Optional future: config-driven CORS (roadmap §2). |

**ScenAIrio bump after publish:**

```json
"turbo-api": "^1.3.0"
```

Then remove ScenAIrio’s `functions/buildApp.js` shim (see §4).

### 1.3 Dev dependencies (TypeScript)

Already on `big-update`:

```json
"devDependencies": {
  "@types/express": "^4.17.21",
  "typescript": "~5.6.3"
}
```

| Script | Purpose |
|--------|---------|
| `npm run check-types` | Runs `tsc -p tsconfig.types.json` against `scripts/types-smoke.ts` |

**Pre-publish:** run `npm run check-types` — must pass. **Passed 2026-06-14.**

### 1.4 What **not** to do in 1.3.0

Defer to later minors unless you explicitly want scope creep:

- ESM dual publish
- `@turbo-api/firestore` package split
- Built-in rate limiting (ScenAIrio uses `express-rate-limit` in the host)
- Emulator integration test suite (high value, but separate PR)
- SQL / second backend adapter

---

## 2. TypeScript compatibility

### 2.1 Status — mostly done on `big-update`

| Deliverable | Status | Location |
|-------------|--------|----------|
| Public **`index.d.ts`** | Done | Repo root; `"types": "index.d.ts"` in `package.json` |
| **`TurboApiUser`** | Done | Includes `uid`, optional `admin`, `banned`, `disabled`, index signature for custom claims |
| **`TurboDataService`** | Done | Documents methods controllers call |
| **`validation.validateDataPartial`** | Declared | Matches runtime export on `big-update` |
| **`Express.Request.user`** | Augmented | Global namespace merge in `index.d.ts` |
| **Smoke compile** | Done | `scripts/types-smoke.ts` + `tsconfig.types.json` |

### 2.2 Gaps to close before 1.3.0 — closed

| Gap | Fix | Status |
|-----|-----|--------|
| **`TurboApiUser.banned`** | Add `banned?: boolean` to `index.d.ts`. | Done |
| **`getDocumentsByProp` / pagination** | Add `startAtIndex` to `TurboDataService` typings to match Firestore service. | Done |
| **`ControllerCrudOptions`** | ScenAIrio org options stay in app layer; no turbo-api change required. | N/A |
| **Consumer `@types/express`** | Documented in README. | Done |

### 2.3 TypeScript strategy (unchanged)

- **Runtime stays JavaScript** — no compile step required to publish or consume.
- **Declarations only** — matches roadmap §5 (“`.d.ts` first; migrate `src/` later”).
- **Breaking typing changes:** treat as patch/minor only if runtime unchanged; use changelog note if narrowing a type.

---

## 3. Runtime / API changes required in turbo-api

Priority order for implementation **before** `1.3.0` publish.

### 3.1 Critical — must ship (ScenAIrio blocked or wrong without these)

#### A. Firestore query builder (`src/dataServices/firestoreDataService.js`)

**Local `big-update` still has broken queries** (discarded `.where()` / `.limit()` chains, `const` reassignment bug in `getDocumentsByProps`).

**Published `1.2.2` fixed this.** Port the entire Firestore data service from npm `1.2.2` into local source, including:

- `let query = …` and **assign** each chained `.where()` / `.orderBy()` / `.limit()`
- `getDocumentsByProps` multi-prop loop with `undefined` → `null` handling
- Pagination params: `startAtIndex`, `offset().limit()` on list methods
- `getDocumentsByProp`, `queryDocumentsByProp`, `getDocumentsWhereInProp`, `getAllDocuments`, `getActiveDocuments`, `getMyDocuments`, `getUserDocuments`

**Impact on ScenAIrio:** user progress scoping, feature flags, uniqueness checks, org membership queries — all depend on `getDocumentsByProps`.

#### B. `validateUniquePropCombo` limit argument (`src/validation.js`)

Current code:

```javascript
await dbService.getDocumentsByProps(collectionName, propData, false)
```

`false` is interpreted as **`limit = 0`** → always empty → **uniqueness never enforced**.

**Fix:** omit limit or pass `undefined` / `dbService.defaultLimit`. Optionally add explicit `includeInactive` parameter if you extend the data service API.

**ScenAIrio affected collections:** `scenarioCharacter`, `scorecardMetric`, `message` (`uniquePropCombination` in controllers).

#### C. `ControllerBase.updateDocument` — merged validation (`src/controllerBase.js`)

**Status on `big-update`:** fixed — merges `{ ...oldData, ...filteredData }` before `validateData`.

**Published `1.2.2`:** still validates **body only** → sparse PUT fails (missing required fields).

**Action:** keep `big-update` behavior; verify after Firestore port. Document in changelog.

**ScenAIrio note:** `orgControllerBase.js` also merges locally — after 1.3.0, org layer can keep its override or delegate; either is fine.

#### D. Auth — `banned` custom claim (`src/authServices/firebaseAuthService.js`)

**Status on `big-update`:** implemented — `req.user.banned === true` → `403` `{ error: 'Account is banned' }`.

**Published `1.2.2`:** not present.

**Action:** keep; document in [authentication.md](authentication.md) (partially done).

**ScenAIrio:** delete `functions/buildApp.js` and use stock `buildApp()` after upgrade.

#### E. Export `validateDataPartial` (`src/validation.js` + `index.d.ts`)

**Status on `big-update`:** implemented and exported.

**Published `1.2.2`:** **not exported** (missing from `module.exports`).

**Action:** keep export; document PATCH semantics in [validation.md](validation.md) (done).

---

### 3.2 High — should ship in 1.3.0

#### F. `getAuthService()` config key (`src/serviceFactory.js`)

**Today:** uses `config.loggingService` to pick auth middleware.

**Fix:**

```javascript
const serviceName = config.authService || config.dataService || config.loggingService || 'firestore'
```

Update [configuration.md](configuration.md) with optional `"authService"` field.

**Backward compatible** if fallback order preserved.

#### G. `fullCRUD` `/recent` route (`src/controllerBase.js`)

**Bug:** route registered as `GET /recent` but handler calls:

```javascript
this.getRecentDocuments(req.params.count, req.user, options.isPublicGet)
```

`req.params.count` is **always undefined** on `/recent`.

**Fix (pick one):**

1. `GET /recent/:count` and document it, or  
2. `GET /recent?count=10&limit=50` reading from `req.query`

Align `ControllerBase.getRecentDocuments` signature with `TurboDataService.getRecentDocuments(collectionName, limit)`.

**ScenAIrio:** not heavily used (`orgControllerBase` overrides many routes); low urgency but easy fix.

#### H. `ControllerBase.updateDocument` — `NotFoundError` when missing doc

**Status on `big-update`:** throws `NotFoundError` if `oldData` is null.

Verify still true after any merge from 1.2.2.

---

### 3.3 Medium — 1.3.0 nice-to-have or 1.3.1

| Item | File | Notes |
|------|------|-------|
| **`TURBO_CONFIG_PATH`** | `src/file.js` | `process.env.TURBO_CONFIG_PATH \|\| path.join(process.cwd(), 'turbo-config.json')` — helps Firebase `functions/` cwd. | **Shipped in 1.3.0** |
| **`express.json()` in `buildApp`** | `src/index.js` | Optional `{ "bodyParser": true }` in config; default **off** for Firebase (body pre-parsed). Document clearly. |
| **Optional CORS in `buildApp`** | `src/index.js` | Config `cors: { origins: [...] }` — ScenAIrio already handles externally. |
| **Structured log fields** | controllers / data service | Roadmap §6 — defer. |
| **Hooks (`beforeCreate`, etc.)** | `ControllerBase` | Roadmap §7 — defer. |

---

### 3.4 No new HTTP endpoints in turbo-api

Turbo-api **does not** add ScenAIrio-specific routes. ScenAIrio-only endpoints stay in app controllers:

| Endpoint | Owner |
|----------|--------|
| `POST /admin/migrateUserProgress` | ScenAIrio `adminController` |
| `POST /userProgress/onboarding/*` | ScenAIrio `userProgressController` |
| Org-scoped CRUD extensions | ScenAIrio `orgControllerBase` |

1.3.0 only changes **library behavior** those controllers rely on.

---

## 4. ScenAIrio integration checklist (after `1.3.0` publish)

Run in `scenairio-web/functions` after bumping dependency.

### 4.1 Replace custom bootstrap

| Step | Action |
|------|--------|
| 1 | Change `functions/index.js` to `const { buildApp } = require('turbo-api')` (remove `./buildApp`). |
| 2 | **Delete** `functions/buildApp.js` (ban shim — now in turbo-api). |
| 3 | Remove deep imports of `turbo-api/src/*` anywhere they remain (host should use public exports only). |

### 4.2 Verify app-layer code still needed

| ScenAIrio file | Keep after 1.3.0? |
|----------------|-------------------|
| `orgControllerBase.js` merge on `updateDocument` | **Yes** — org layer still extends turbo-api with different auth semantics. Merge validation aligns with turbo-api; keep org-specific auth/joins. |
| Direct `db.updateDocument` in `userProgressService` | **Yes** — intentional bypass for server-only XP fields until org layer uses `validateDataPartial` for those paths. |
| `tools/allowedOrigins.js` | **Yes** — app policy, not turbo-api. |
| Rate limiters in `index.js` | **Yes** — host concern. |

### 4.3 Regression test matrix (ScenAIrio)

| Area | Test |
|------|------|
| Auth | Login; banned user gets 403 on API |
| Sparse PUT | Settings intake `PUT /userProgress/my` with `{ hasCompletedIntake: true }` only |
| Uniqueness | Create duplicate scenario-character join → 403 |
| Multi-prop query | `GET /userProgress/my?useCaseId=…` returns scoped doc |
| Tutorial | Skip Joyride → no stage-2 XP; finish → +800 once |
| Admin | `POST /admin/migrateUserProgress` idempotent |
| GPT | Org chat membership check still works |
| Subscriptions | Stripe `baseUrl` allowlist unchanged |

---

## 5. Implementation sequence (turbo-api repo)

Suggested order for a single release PR on `big-update`:

```
1. Port firestoreDataService.js from npm 1.2.2 → local src   [CRITICAL]  ✓
2. Fix validateUniquePropCombo limit                         [CRITICAL]  ✓
3. Confirm controllerBase updateDocument merge + NotFoundError           ✓
4. Confirm auth banned claim + update index.d.ts (banned?: boolean)      ✓
5. Fix getAuthService config key + configuration.md                      ✓
6. Fix /recent route + controllerBase.getRecentDocuments wiring          ✓
7. Update index.d.ts pagination signatures to match Firestore service    ✓
8. npm run check-types                                                   ✓
9. Bump version 1.3.0, update CHANGELOG / release-plan status          ✓
10. npm publish                                                          ← next
```

---

## 6. Changelog summary (proposed `1.3.0`)

### Added

- TypeScript declarations (`index.d.ts`) and `npm run check-types`
- `validation.validateDataPartial` for sparse PATCH payloads
- Auth middleware rejects Firebase tokens with custom claim **`banned: true`**
- Optional config key **`authService`** (fallback to `dataService` / `loggingService`)
- **`TURBO_CONFIG_PATH`** environment variable for config file location

### Fixed

- **Firestore queries:** inactive filters, multi-prop queries, pagination (from 1.2.2 lineage)
- **`ControllerBase.updateDocument`:** validate merged document, not body alone
- **`validateUniquePropCombo`:** no longer passes invalid `limit: 0`
- **`/recent` route:** reads `?limit=` and `?startAtIndex=` from query string (was always default limit)
- Various `NotFoundError` / `defaultedData` fixes documented in roadmap §3

### Unchanged (by design)

- No new CRUD routes; no SQL/AWS adapters
- `buildApp` still does not enable CORS or rate limits by default
- JavaScript source remains CommonJS `require('turbo-api')`

---

## 7. Known divergence: local vs npm today

| Feature | npm `1.2.2` (ScenAIrio installed) | Local `big-update` (`1.1.32`) |
|---------|-------------------------------------|-------------------------------|
| Firestore query chaining | Fixed | **Broken** — must port from 1.2.2 |
| Pagination / offset | Yes | No |
| `validateDataPartial` | No | Yes |
| Merge `updateDocument` validation | No | Yes |
| `banned` claim | No | Yes |
| `index.d.ts` | No | Yes |
| `validateUniquePropCombo` | Broken (`false` limit) | Broken — same bug |

**1.3.0 = union of both columns, with §3.2 fixes applied.**

---

## 8. References

- [Roadmap & suggestions](roadmap-and-suggestions.md) — long-term backlog
- [Validation](validation.md) — `validateData` vs `validateDataPartial`
- [Authentication](authentication.md) — Bearer flow, `disabled`, `banned`
- [Configuration](configuration.md) — `turbo-config.json`, service registry
- ScenAIrio: `functions/buildApp.js` (remove after 1.3.0), `functions/orgControllerBase.js`

---

## 9. Post-release (turbo-api 1.4+ ideas)

From roadmap, not blocking ScenAIrio:

- Firebase emulator test harness
- `TURBO_CONFIG_PATH` + body parser defaults
- Lifecycle hooks on `ControllerBase`
- Second document-store adapter spike
- Export `createAuthenticationMiddleware` from package root for advanced hosts (optional; today ScenAIrio deep-imports for shim only)
