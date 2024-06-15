const express = require('express')
const path = require('path')

module.exports.buildApp = async () => {
    // Set up the Express app
    const app = express()

    // Load config
    const { getConfig } = require('./file')
    const config = await getConfig()

    // Load service middleware
    const { registerService, getAuthService, getDataService, getLoggingService } = require('./serviceFactory')
    const { createAuthenticationMiddleware } = require('./authServices/firebaseAuthService')

    // Register Firebase as the default service
    const FirebaseService = require('./dataServices/firestoreDataService')
    const FirestoreLoggerService = require('./loggingServices/firestoreLoggerService')
    registerService('firestore', FirebaseService, FirestoreLoggerService, createAuthenticationMiddleware)

    // Load the auth service from the config
    const { authMiddleware, dataService, logger } = await Promise.all([
        getAuthService(),
        getDataService(),
        getLoggingService()
    ])
    // Add service-specific middleware for authorization
    app.use(authMiddleware(logger, dataService))

    // Load and use controllers dynamically
    const controllersPath = path.join(process.cwd(), 'controllers')
    for (const [controllerName, controllerPath] of Object.entries(config.controllers)) {
        const controllerModule = require(path.join(controllersPath, `${controllerName}`))
        const ControllerClass = controllerModule.controller
        const controller = new ControllerClass()
        app.use(controllerPath, controller.getRouter())
    }

    return app
}
// Controller base class
module.exports.ControllerBase = require('./controllerBase')
// Validation module - error types and validation methods
module.exports.validation = require('./validation')
// String helpers
module.exports.stringHelpers = require('./string')
// HTTP methods
module.exports.httpHelpers = require('./http')
// Service factory
module.exports.serviceFactory = require('./serviceFactory')