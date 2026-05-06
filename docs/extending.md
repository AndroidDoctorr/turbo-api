# Extending Turbo-API

## Registering services

Use `serviceFactory.registerService` to bind a name to:

1. **Data service class** — instantiated with `new DataService()`
2. **Logging service class** — instantiated with `new LoggingService()`
3. **Auth middleware factory** — `(dataService) => expressMiddleware`

Names must match `dataService` and `loggingService` strings in `turbo-config.json`. **`getAuthService`** currently reads **`loggingService`** only; there is no separate `authService` key in config.

## AWS placeholders

The repository includes commented-out implementations:

- `src/dataServices/awsDataService.js` — DynamoDB-oriented CRUD sketch.
- `src/authServices/awsAuthService.js` — Lambda-style auth sketch.
- `src/loggingServices/winstonLoggingService.js` — Winston + CloudWatch sketch.

These are not loaded by `buildApp` today; they serve as examples for a future AWS-backed registration:

```javascript
const { registerService } = require('turbo-api').serviceFactory
// registerService('aws', AwsDataService, WinstonLogger, awsAuthFactory)
```

## CORS

The package lists **`cors`** as a dependency but **`buildApp` does not attach it**. Add `require('cors')()` in your host app if browsers will call the API cross-origin.

## Contributing

See the root [README](../README.md) for the repository URL.

Planned improvements and a maintainer or contributor backlog live in **[Roadmap & suggestions](roadmap-and-suggestions.md)**.
