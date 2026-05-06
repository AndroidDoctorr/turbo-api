# Getting started

## Prerequisites

- Node.js and npm
- A Firebase project (for the default Firestore + Auth stack)
- Firebase CLI (`npm install -g firebase-tools`) if you scaffold with `firebase init`

## Install

```bash
npm install turbo-api
```

Declared dependencies in this package include `express`, `cors`, `firebase-admin`, and `firebase-functions`. Your hosting app should initialize Firebase Admin before requests hit routes that use Firestore or Auth (typical for Firebase Functions).

## Recommended project layout

The library loads controllers from a **`controllers`** directory relative to **`process.cwd()`** and reads **`turbo-config.json`** from the same cwd (see [Configuration](configuration.md)).

A common Firebase Functions layout:

```text
your-project/
  turbo-config.json
  functions/
    package.json
    index.js
    controllers/
      bookController.js
```

Because `getConfig()` and controller loading use `process.cwd()`, the config file and `controllers` folder must live in whatever directory is the current working directory when your functions run. If your cwd is `functions/`, place `turbo-config.json` and `controllers/` under `functions/` (or adjust your deploy/runtime cwd to match where you put those files).

## Express JSON bodies

`buildApp()` does not currently register `express.json()`. If you use JSON request bodies with the stock `buildApp()` instance, ensure JSON parsing is applied (for example by merging middleware in your host entrypoint before or after calling `buildApp()`, depending on how you compose the app). Without a JSON body parser, `req.body` may be undefined on POST/PUT.

## Bootstrap the HTTP app

`buildApp` is **async** — await it when starting the server.

```javascript
const functions = require('firebase-functions')
const admin = require('firebase-admin')
const { buildApp } = require('turbo-api')

admin.initializeApp()

exports.api = functions.https.onRequest(async (req, res) => {
  const app = await buildApp()
  return app(req, res)
})
```

If you cache the Express app between invocations (to reduce cold-start work), keep the same pattern but store `await buildApp()` once in module scope.

## Next steps

- Define [configuration](configuration.md)
- Implement a [controller](controllers.md) extending `ControllerBase`
- Tune [validation](validation.md) and [auth](authentication.md) behavior
