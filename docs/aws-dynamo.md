# AWS DynamoDB backend

Turbo-API can use **Amazon DynamoDB** as a data service when the optional AWS packages are installed. The implementation lives in [`src/dataServices/awsDataService.js`](../src/dataServices/awsDataService.js) and registers under the service name **`aws`** when `buildApp()` starts.

## Install optional AWS packages

These are listed as **`optionalDependencies`** in `turbo-api` and install automatically in most cases. If you use a minimal install, add them explicitly:

```bash
npm install @aws-sdk/client-dynamodb @aws-sdk/lib-dynamodb aws-jwt-verify
```

## Configuration

`turbo-config.json`:

```json
{
  "dataService": "aws",
  "loggingService": "aws",
  "authService": "aws",
  "controllers": {
    "bookController": "/books"
  }
}
```

Use **`authService`** (recommended) so auth middleware matches your data backend. Fallback order: `authService` → `dataService` → `loggingService` → `firestore`.

## Environment variables

| Variable | Purpose |
|----------|---------|
| `AWS_REGION` or `AWS_DEFAULT_REGION` | DynamoDB region (default `us-east-1`) |
| `TURBO_AWS_TABLE_PREFIX` | Optional prefix for table names (e.g. `prod-`) |
| `COGNITO_USER_POOL_ID` | Cognito User Pool for Bearer token verification |
| `COGNITO_CLIENT_ID` | Cognito app client id |

Standard AWS credential chain applies (env keys, shared config, IAM role on Lambda/ECS, etc.).

## Table schema

Each **collection name** in your controllers maps to a DynamoDB **table name** (with optional prefix).

Every table must have:

| Attribute | Type | Role |
|-----------|------|------|
| `id` | String | **Partition key** |

Turbo-API writes the same metadata conventions as Firestore where applicable:

- `isActive` (boolean, default `true`)
- `created`, `modified` (epoch ms numbers)
- `createdBy`, `modifiedBy` (strings)

Example AWS CLI table create:

```bash
aws dynamodb create-table \
  --table-name Books \
  --attribute-definitions AttributeName=id,AttributeType=S \
  --key-schema AttributeName=id,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST
```

## Auth (Cognito)

[`src/authServices/awsAuthService.js`](../src/authServices/awsAuthService.js) verifies **Cognito ID tokens** (`Bearer` header), same flow as Firebase auth:

- Missing header → anonymous (`req.user` unset)
- Invalid token → 403
- Custom claims mapped to `req.user.admin`, `req.user.banned`, `req.user.disabled` (string `'true'` or boolean)
- `req.user.uid` = Cognito `sub`

## Logging

The AWS stack uses [`awsConsoleLoggerService.js`](../src/loggingServices/awsConsoleLoggerService.js) (`console.info` / `warn` / `error`). CloudWatch Winston integration remains a future enhancement.

## Query behavior and limits

The DynamoDB adapter implements the full **`TurboDataService`** surface but uses **table scans with in-memory filter/sort/pagination** for list and search operations. This matches the old stub’s approach and is suitable for **small tables and prototypes**.

| Method | DynamoDB strategy |
|--------|-------------------|
| `getDocumentById` | `GetItem` on `id` |
| `createDocument` / `updateDocument` / `deleteDocument` | `PutItem` / `DeleteItem` |
| List/search methods | `Scan` + filter + sort + slice |

**Not recommended for large production tables** without GSIs. For production AWS workloads, add GSIs or a provider-specific query layer (roadmap §4 Phase C).

Prefix search (`queryDocumentsByProp`) is **case-insensitive** on the client side; store searchable strings lowercase if you rely on consistent matching.

## Manual registration

If you bootstrap outside `buildApp()`:

```javascript
const { serviceFactory } = require('turbo-api')
const DynamoDBService = require('turbo-api/src/dataServices/awsDataService')
const AwsConsoleLoggerService = require('turbo-api/src/loggingServices/awsConsoleLoggerService')
const { createAuthenticationMiddleware } = require('turbo-api/src/authServices/awsAuthService')

serviceFactory.registerService('aws', DynamoDBService, AwsConsoleLoggerService, createAuthenticationMiddleware)
```

Prefer the public **`buildApp()`** path when possible; it registers **`aws`** automatically when optional deps resolve.

## Firebase vs AWS

| | Firestore (`firestore`) | DynamoDB (`aws`) |
|--|-------------------------|------------------|
| Default in `buildApp` | Yes | Yes, if optional deps installed |
| Auth | Firebase ID token | Cognito ID token |
| Timestamps | Firestore `Timestamp` | Epoch ms (`number`) |
| Queries | Native Firestore indexes | Scan-based (MVP) |

You can register **both** names and switch via `turbo-config.json` without changing controller code.
