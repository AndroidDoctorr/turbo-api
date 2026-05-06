# Configuration

## `turbo-config.json`

Configuration is loaded asynchronously from:

`path.join(process.cwd(), 'turbo-config.json')`

Implementation reference: `src/file.js` (`getConfig`).

### Shape

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

| Field | Purpose |
|-------|---------|
| `dataService` | Key into the service registry for persistence. Defaults to **`firestore`** if omitted. |
| `loggingService` | Key for the logging implementation. Defaults to **`firestore`** if omitted. |
| `controllers` | Map of **module file names** (without `.js`) under `./controllers` to **Express mount paths**. |

Controller modules are required as:

`require(path.join(process.cwd(), 'controllers', `${controllerName}`))`

so each key must match a file like `controllers/bookController.js` exporting a `controller` class.

## Auth middleware selection

In `src/serviceFactory.js`, `getAuthService()` resolves the auth middleware using **`config.loggingService`**, not a separate `authService` field:

```javascript
const serviceName = config.loggingService || 'firestore'
```

So today the authentication middleware travels with whichever service name you set for `loggingService`. The default registration in `src/index.js` bundles Firestore data, Firestore logging, and Firebase Auth middleware under the name **`firestore`**.

If you register additional backends with `registerService`, keep `dataService` / `loggingService` aligned with how you packaged auth + data + logging for that name.

## Defaults

- Missing `dataService` → `'firestore'`
- Missing `loggingService` → `'firestore'`

If a service name is not found in the registry, `getDataService` / `getLoggingService` / `getAuthService` may return `undefined`; ensure `registerService` was called for the names you reference before requests run.
