# Configuration

## `turbo-config.json`

Configuration is loaded asynchronously from:

`process.env.TURBO_CONFIG_PATH` if set, otherwise `path.join(process.cwd(), 'turbo-config.json')`

Implementation reference: `src/file.js` (`getConfig`, `getConfigPath`).

### Shape

```json
{
  "dataService": "firestore",
  "loggingService": "firestore",
  "authService": "firestore",
  "controllers": {
    "bookController": "/books",
    "authorController": "/authors"
  }
}
```

| Field | Purpose |
|-------|---------|
| `dataService` | Key into the service registry for persistence. Defaults to **`firestore`** if omitted. |
| `loggingService` | Key for the logging implementation. Defaults to **`firestore`** if omitted. |
| `authService` | Key for the auth middleware. Defaults to **`dataService`**, then **`loggingService`**, then **`firestore`**. |
| `controllers` | Map of **module file names** (without `.js`) under `./controllers` to **Express mount paths**. |

Controller modules are required as:

`require(path.join(process.cwd(), 'controllers', `${controllerName}`))`

so each key must match a file like `controllers/bookController.js` exporting a `controller` class.

## Auth middleware selection

In `src/serviceFactory.js`, `getAuthService()` resolves the auth middleware using:

```javascript
const serviceName = config.authService || config.dataService || config.loggingService || 'firestore'
```

You may set **`authService`** explicitly when auth is registered under a different registry key than logging. If omitted, auth follows **`dataService`**, then **`loggingService`** (backward compatible with older configs that only set `loggingService`).

The default registration in `src/index.js` bundles Firestore data, Firestore logging, and Firebase Auth middleware under the name **`firestore`**.

## Defaults

- Missing `dataService` → `'firestore'`
- Missing `loggingService` → `'firestore'`

If a service name is not found in the registry, `getDataService` / `getLoggingService` / `getAuthService` may return `undefined`; ensure `registerService` was called for the names you reference before requests run.

## PostgreSQL connection

When `"dataService": "postgres"`, the database URL is resolved in this order:

1. **`DATABASE_URL`** environment variable *(recommended)*
2. **`TURBO_DATABASE_URL`** environment variable
3. **`postgres.connectionString`** in `turbo-config.json`
4. Root **`databaseUrl`** in `turbo-config.json`
5. **`postgres.host` / `user` / `password` / `database` / `port`** or standard **`PG*`** env vars

**Do not commit production credentials** in `turbo-config.json`; use env vars or your host’s secret store.

Full walkthrough: **[PostgreSQL](postgresql.md)**.

### Example — Postgres data + Firebase auth

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

```bash
DATABASE_URL=postgresql://user:pass@localhost:5432/myapp
```
