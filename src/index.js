const express = require('express')
const path = require('path')

module.exports.buildApp = () => {
    // Set up the Express app
    const app = express()

    // Load config
    const { getConfig } = require('./file')
    const config = getConfig()

    // Load service middleware
    const { registerService } = require('./serviceFactory')
    const { createAuthenticationMiddleware } = require('./authServices/firebaseAuthService')

    // Load and use controllers dynamically
    const controllersPath = path.join(__dirname, '..', 'controllers')
    for (const [controllerName, controllerPath] of Object.entries(config.controllers)) {
        const controllerModule = require(`${controllersPath}/${controllerName}`)
        const ControllerClass = controllerModule.controller
        const controller = new ControllerClass()
        app.use(controllerPath, controller.getRouter())
    }

    // Register Firebase as the default service
    const FirebaseService = require('./dataServices/firestoreDataService')
    const FirestoreLoggerService = require('./loggingServices/firestoreLoggerService')
    registerService('firestore', FirebaseService, FirestoreLoggerService, createAuthenticationMiddleware)

    // Load the service from the config
    const authServiceName = config.authService || 'firebase'
    const authMiddleware = require(`./authServices/${authServiceName}AuthService.js`)

    // Add service-specific middleware for authorization
    app.use(authMiddleware.createAuthenticationMiddleware)

    return app
}
// Controller base class
module.exports.controllerBase = require('./controllerBase')
// Validation module - error types and validation methods
module.exports.validation = require('./validation')
// String helpers
module.exports.stringHelpers = require('./string')
// HTTP methods
module.exports.httpHelpers = require('./http')
// Service factory
module.exports.serviceFactory = require('./serviceFactory')