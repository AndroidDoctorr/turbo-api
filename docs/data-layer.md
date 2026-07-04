# Data and logging services

## Service registry

File: `src/serviceFactory.js`.

```javascript
registerService(serviceName, DataServiceClass, LoggingServiceClass, authMiddlewareFactory)
```

Each registration constructs **one** data service instance and **one** logging service instance and stores:

- `dataService`
- `loggingService`
- `authMiddleware` (factory that accepts `dataService` — see Firebase auth)

`buildApp` calls:

```javascript
registerService('firestore', FirebaseService, FirestoreLoggerService, createAuthenticationMiddleware)
```

Consumers can call `registerService` **before** awaiting `buildApp()` if they load a custom entry module that requires `serviceFactory` first and registers extra names. The stock `buildApp` only registers `firestore` internally.

## Firestore data service

File: `src/dataServices/firestoreDataService.js`. Uses `admin.firestore()`.

### Metadata and soft delete

- New documents get **`isActive: true`**.
- **`createDocument`**, **`updateDocument`**, **`archiveDocument`**, **`dearchiveDocument`** honor **`noMetaData`**: when falsy, they set audit fields (`created`, `createdBy`, `modified`, `modifiedBy`) using `Timestamp.now()`.

### Queries and limits

- **`defaultLimit`** is **50** when a numeric limit is not passed.
- **`getDocumentById`** returns **`null`** if missing, or if **`isActive`** is false and **`includeInactive`** is false (second argument).

### Array note in source

Several query methods **reassign** a `const docRef` or chain `.where` after assigning `docRef` without re-binding; when extending or debugging Firestore queries, review those methods carefully — the intended pattern is usually `let query = collection.where(...).where(...)`.

## Firestore logging

File: `src/loggingServices/firestoreLoggerService.js`. Uses `firebase-functions/logger` when the host app provides it; otherwise falls back to **console**.

## AWS DynamoDB

File: `src/dataServices/awsDataService.js`. Uses AWS SDK v3 Document Client.

- Registers as service name **`aws`** when optional dependencies are installed (see [AWS DynamoDB](aws-dynamo.md)).
- Table per collection; partition key **`id`** (String).
- Metadata uses epoch ms for `created` / `modified` (Firestore uses `Timestamp`).
- List/search methods use **scan + in-memory filter** — document limits before production scale.

Auth: Cognito ID tokens via `src/authServices/awsAuthService.js`.  
Logging: `src/loggingServices/consoleLoggerService.js`.

## PostgreSQL

File: `src/dataServices/postgresDataService.js`. Uses **`pg`** connection pool.

- Registers as service name **`postgres`** when optional **`pg`** is installed.
- **Connection:** `DATABASE_URL` env var first — see [PostgreSQL](postgresql.md).
- **Schema:** auto-creates `turbo_api_documents` (collection + id + JSONB `document`).
- Metadata uses epoch ms for `created` / `modified`.

Auth: pass-through in `src/authServices/postgresAuthService.js` — set **`authService": "firestore"`** for Firebase Auth with Postgres data.

## Using a different backend

1. Implement a class with the same method names as `FirebaseService` that your controllers call.
2. Implement a logger with `log`, `info`, `warn`, `error`.
3. Provide an auth middleware factory compatible with Express: `(dataService) => (req, res, next) => void`.
4. Call **`registerService('mybackend', MyData, MyLogger, myAuth)`** before building the app.
5. Set `"dataService"`, `"loggingService"`, and `"authService"` in `turbo-config.json`.
