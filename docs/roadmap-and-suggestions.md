# Roadmap and suggestions

This document is a **living backlog**: ideas that would make Turbo-API closer to its EF-for-JS *intent*, safer in production, and easier to extend to non-Firebase backends. Nothing here is a promise—priorities depend on maintainer time and real projects using the library.

## How to use this doc

- Treat sections as **themes**; tackle **correctness and tests** before large new surface area.
- If you want to contribute, pick an item and open an issue or PR referencing this file.

---

## 1. Clarify the core promise (documentation and API boundaries)

Turbo-API sits between “thin Express wrapper” and “full ORM.” Helping users *feel* that boundary would reduce wrong expectations.

| Suggestion | Why |
|------------|-----|
| Publish a short **“What Turbo-API is / isn’t”** table (EF analogy, no migrations in core, no universal query DSL). | Sets mental model; you already ship convention-based CRUD, not EF’s IQueryable. |
| Document a **minimal `IDataService` contract** (method list controllers actually call) as the official adapter surface. | Anyone implementing DynamoDB, Postgres, or Cosmos DB knows exactly what to satisfy. |
| Separate **HTTP layer** vs **persistence layer** in docs (controllers vs services). | Makes future splits (monorepo packages) easier to explain. |

---

## 2. Firebase path: harden what you already rely on

Your current usage on Firebase projects is the **highest ROI** work.

| Suggestion | Why |
|------------|-----|
| **`express.json()`** (and optional `express.urlencoded`) inside `buildApp`, or clearly documented one-liner wrapper. | Today JSON bodies are easy to forget; that hurts newcomers most. |
| **Config path**: support `TURBO_CONFIG_PATH` or `turboConfigPath` so cwd quirks between repo root and `functions/` stop mattering. | Matches how Firebase deploy actually sets cwd. |
| **Fix `getAuthService`** to use an explicit `authService` key (fallback: `dataService` or `loggingService` for backward compatibility). | Current coupling to `loggingService` is surprising and fragile. |
| **Firestore query builders**: several methods build queries with `const` reassignment and chained `where` that may not apply as intended; audit against Firestore’s query rules (composite indexes, inequality + `in`, etc.). | Correctness beats new features. |
| **`fullCRUD` `/recent` route**: wire `count` from query string or path param consistently. | Avoid silent “always default limit” behavior. |
| **Emulator-driven integration tests** (Firestore + Auth emulator). | Lets you refactor services without fear. |

---

## 3. Correctness and consistency in validation and controllers

The following were addressed in code:

- **`validateData`** validates all field rules, then `uniquePropCombination` when defined.
- **`ControllerBase.updateDocument`** uses a merged document (`oldData` + filtered body) with `applyDefaults` for validation, fixes the undefined `defaultedData` reference, and returns **`NotFoundError`** when the document is missing.
- **`validation.js`** uses `objectToString` from `string.js` for unique-combination error messages.
- **`validateDataPartial`** was added for PATCH-style payloads (validates only keys present on `data`; does not run `uniquePropCombination`).

---

## 4. Multi-backend strategy (AWS, Azure, SQL, NoSQL)

You stalled here for good reasons: **one interface, many semantically different stores.** A phased approach keeps scope sane.

| Phase | Focus | Outcome |
|-------|--------|---------|
| A | **Second document store** (for example DynamoDB or Cosmos DB NoSQL API) with the *existing* method names. | Proves adapter pattern without SQL joins. |
| B | **SQL via a thin layer** (for example Knex or Prisma) implementing the same interface for simple CRUD; document **what is not supported** (ad-hoc filters, `queryDocumentsByProp` mapping). | Unlocks relational apps without pretending every Firestore query maps 1:1. |
| C | Optional **query object** or **strategy interface** for list and search operations that are inherently provider-specific. | Stops forcing Firestore-isms onto SQL. |

Cross-cutting ideas:

| Suggestion | Why |
|------------|-----|
| **Provider packages**: `@turbo-api/firestore`, `@turbo-api/pg` (even if thin re-exports at first). | Keeps core small; optional deps per backend. |
| **Connection / client lifecycle** in config (pool size, timeouts), not only a service name string. | Production databases need tuning. |
| **Transactions**: optional `runTransaction(fn)` on the data service for backends that support it. | EF users expect consistency for multi-document or multi-row writes. |

---

## 5. Developer experience

| Suggestion | Why |
|------------|-----|
| **TypeScript**: `.d.ts` for public exports first; migrate `src/` later if desired. | Improves editor support without blocking JS consumers. |
| **ESM + CJS**: dual publish or document CJS-only explicitly. | Reduces friction in modern tooling. |
| **Example repo** (“functions + turbo-api + emulator + one controller”) linked from README. | Fastest path from zero to working. |
| **Optional `cors` in `buildApp`** via config flag. | Browser clients are common; zero-config CORS helps demos. |
| **Correlation id** (`x-request-id`) in logs and error payload (optional). | Makes production debugging saner. |

---

## 6. Security and operations

| Suggestion | Why |
|------------|-----|
| Document **payload size limits** and recommend Express / host limits. | Firestore doc size and HTTP abuse are real. |
| **Rate limiting** guidance (API Gateway, Cloud Armor, Firebase App Check) rather than baking rate limits into core—unless you want a tiny optional middleware. | Security context differs per host. |
| **Structured logging** fields (`collection`, `userId`, `operation`) in addition to free-text messages. | Easier to query in Cloud Logging or similar. |

---

## 7. “EF-flavored” features that fit this library

These would deepen the analogy without becoming a giant ORM.

| Suggestion | Why |
|------------|-----|
| **Hooks / lifecycle events** (`beforeCreate`, `afterUpdate`) on `ControllerBase` or on rule objects. | EF has SaveChanges interception; hooks cover cross-cutting rules. |
| **Simple migration or schema version** field per collection (optional convention). | Helps evolve documents without a full migration framework. |
| **Reference expansion policy** (`:id/full` is a start): declarative “expand these FKs on read.” | Reduces N+1 in hand-rolled controllers. |
| **Bulk operations** (guarded, admin-only) for backfills. | Operations workflows often need batch. |

---

## 8. Project maintenance

| Suggestion | Why |
|------------|-----|
| **CI** with tests and lint on PRs. | Protects momentum when you return after a break. |
| **Semantic versioning** notes when breaking adapter or config shape (especially if you add `authService`). | Builds trust for downstream apps. |

---

## Suggested sequencing (if you pick the project back up)

1. Tests + Firebase emulator + validation/update fixes (trust).
2. `buildApp` ergonomics (JSON body, config path, auth service key).
3. Firestore adapter audit (queries, limits, indexes documented).
4. Type definitions + example repo (adoption).
5. Second backend spike (one document DB or one SQL dialect) to stress the interface.
6. Package split and optional advanced query API (scale).

---

## Closing

Stalling multi-backend work after Firebase “clicked” is a **rational** tradeoff: the library already pays rent on real apps. The suggestions above are meant to **protect that win** (correctness, DX, clarity) while giving you a **credible path** toward AWS/Azure/SQL when those projects need it again.

If you treat Turbo-API as **“EF’s conventions plus a repository boundary for Node HTTP APIs,”** the next increments are mostly: **tighten the default path**, **document the adapter contract**, then **grow backends one at a time**.
