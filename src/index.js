const express = require('express')
const cors = require('cors')

module.exports.buildApp = () => {
    // Set up the Express app
    const app = express()
    app.use(cors({
        origin: '*',
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    }))

    // Load config
    const { getConfig } = require('./file')
    const config = getConfig()

    // Load service middleware
    const { registerService } = require('./serviceFactory')
    const { createAuthenticationMiddleware } = require('./authServices/firebaseAuthService')

    // Load and use controllers dynamically
    for (const [controllerName, controllerPath] of Object.entries(config.controllers)) {
        const controllerModule = require(`../controllers/${controllerName}`)
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