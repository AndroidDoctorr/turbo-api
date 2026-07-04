# Extending Turbo-API

## Registering services

Use `serviceFactory.registerService` to bind a name to:

1. **Data service class** — instantiated with `new DataService()`
2. **Logging service class** — instantiated with `new LoggingService()`
3. **Auth middleware factory** — `(dataService) => expressMiddleware`

Names must match `dataService`, `loggingService`, and optionally **`authService`** in `turbo-config.json`. **`getAuthService`** resolves: `authService` → `dataService` → `loggingService` → `firestore`.

## Built-in backends

| Service name | Data | Auth | Logging | Registered by |
|--------------|------|------|---------|---------------|
| `firestore` | Firestore | Firebase ID token | Firebase Functions logger (or console) | Always |
| `aws` | DynamoDB | Cognito ID token | Console | When optional AWS deps install |
| `postgres` | PostgreSQL | Pass-through *(use `authService: firestore` for Firebase)* | Console | When optional `pg` installs |

See **[PostgreSQL](postgresql.md)** for connection string setup (`DATABASE_URL` recommended).
See **[AWS DynamoDB](aws-dynamo.md)** for table schema, env vars, and query limits.

## Manual registration (custom backend)

```javascript
const { serviceFactory } = require('turbo-api').serviceFactory
const MyDataService = require('./myDataService')
const MyLogger = require('./myLogger')
const myAuthFactory = require('./myAuth')

serviceFactory.registerService('mybackend', MyDataService, MyLogger, myAuthFactory)
```

Set `"dataService": "mybackend"` and matching `loggingService` / `authService` in config.

## CORS

The package lists **`cors`** as a dependency but **`buildApp` does not attach it**. Add `require('cors')()` in your host app if browsers will call the API cross-origin.

## Contributing

See the root [README](../README.md) for the repository URL.

Planned improvements and a maintainer or contributor backlog live in **[Roadmap & suggestions](roadmap-and-suggestions.md)**.
