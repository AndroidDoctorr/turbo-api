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

File: `src/loggingServices/firestoreLoggerService.js`. Delegates to `firebase-functions/logger` (`log`, `info`, `warn`, `error`).

## Winston / AWS (stub)

`src/loggingServices/winstonLoggingService.js` is commented out: example Winston + CloudWatch setup.

`src/dataServices/awsDataService.js` is a large commented-out DynamoDB sketch (`DynamoDB` AWS SDK v2 style).

## Using a different backend

1. Implement a class with the same method names as `FirebaseService` that your controllers call.
2. Implement a logger with `log`, `info`, `warn`, `error`.
3. Provide an auth middleware factory compatible with Express: `(dataService) => (req, res, next) => void`.
4. Call **`registerService('mybackend', MyData, MyLogger, myAuth)`** before building the app.
5. Set `"dataService": "mybackend"` and `"loggingService": "mybackend"` in `turbo-config.json` (remember **`getAuthService`** currently keys off `loggingService`).
