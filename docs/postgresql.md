# PostgreSQL backend

Turbo-API can use **PostgreSQL** as a data service when the optional **`pg`** package is installed. Implementation: [`src/dataServices/postgresDataService.js`](../src/dataServices/postgresDataService.js). Registers as service name **`postgres`** in `buildApp()`.

## Easiest setup (recommended)

**1. Set one environment variable** (works everywhere: local Docker, Railway, Neon, Supabase, Render, etc.):

```bash
DATABASE_URL=postgresql://user:password@localhost:5432/myapp
```

**2. Point config at Postgres:**

```json
{
  "dataService": "postgres",
  "loggingService": "postgres",
  "authService": "firestore",
  "controllers": {
    "bookController": "/books"
  }
}
```

**3. Start the app.** On first request, turbo-api **creates the schema automatically** (single table `turbo_api_documents` — no manual migration required for getting started).

That’s it for local/dev. Use **`.env`** in your host app (with `dotenv`) or your platform’s secret manager for `DATABASE_URL` in production.

### Still using Firebase Auth?

Very common: **Postgres for data, Firebase for auth**. Keep:

```json
"dataService": "postgres",
"authService": "firestore"
```

You still run `admin.initializeApp()` in your host; only persistence moves to Postgres.

---

## Where the connection string lives

Resolution order (**first match wins**):

| Priority | Source | Example |
|----------|--------|---------|
| 1 | **`DATABASE_URL`** env | `postgresql://user:pass@host:5432/db` |
| 2 | **`TURBO_DATABASE_URL`** env | Same format; overrides nothing unless `DATABASE_URL` is unset |
| 3 | **`turbo-config.json`** → `postgres.connectionString` | See below |
| 4 | **`turbo-config.json`** → root **`databaseUrl`** | Shorthand |
| 5 | **`turbo-config.json`** → `postgres.host` / `user` / `password` / `database` / `port` | Or **`PGHOST`**, **`PGUSER`**, etc. |

**Recommendation:** use **`DATABASE_URL`** only. Don’t put passwords in `turbo-config.json` if the file is committed to git — env vars or platform secrets are safer.

### Optional config file (local dev)

```json
{
  "dataService": "postgres",
  "loggingService": "postgres",
  "authService": "firestore",
  "databaseUrl": "postgresql://postgres:postgres@localhost:5432/turbo_dev",
  "controllers": {
    "bookController": "/books"
  }
}
```

Or nested:

```json
"postgres": {
  "connectionString": "postgresql://postgres:postgres@localhost:5432/turbo_dev"
}
```

### Docker Compose example

```yaml
services:
  db:
    image: postgres:16
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: turbo_dev
    ports:
      - "5432:5432"
```

Host `.env`:

```bash
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/turbo_dev
```

---

## Install `pg`

Listed as an **optionalDependency** on `turbo-api`. If needed explicitly:

```bash
npm install pg
```

---

## Schema (auto-created)

One shared table for all collections:

```sql
turbo_api_documents (
  collection TEXT NOT NULL,
  id         TEXT NOT NULL,
  document   JSONB NOT NULL,
  PRIMARY KEY (collection, id)
)
```

- **`collection`** = your controller’s collection name (e.g. `Books`)
- **`document`** = full record JSON (`isActive`, `created`, `createdBy`, user fields, etc.)
- **`id`** = UUID generated on create

Metadata matches Firestore conventions (`isActive`, `created` / `modified` as **epoch ms numbers**).

---

## Auth

The **`postgres`** auth middleware is **pass-through** (does not verify JWTs). For real auth:

| Approach | Config |
|----------|--------|
| Firebase Auth + Postgres data | `"authService": "firestore"` |
| Cognito + Postgres data | `"authService": "aws"` (with Cognito env vars) |
| Custom | Register your own middleware via `registerService` |

---

## Query notes

- List/filter uses **JSONB** (`document->>'field'`) with **SQL `LIMIT`/`OFFSET`** pagination.
- Prefix search (`queryDocumentsByProp`) uses **`ILIKE`** on lowercase values.
- Heavy filters on large tables may need **GIN indexes** on hot JSON paths (advanced).

---

## Quick local checklist

- [ ] Postgres running
- [ ] `DATABASE_URL` set (or `databaseUrl` in config for dev only)
- [ ] `"dataService": "postgres"` in `turbo-config.json`
- [ ] `"authService": "firestore"` if using Firebase login
- [ ] `npm install pg` if optional install skipped
- [ ] Hit any CRUD route — table is created on first use

See also [Configuration](configuration.md) and [Extending Turbo-API](extending.md).
