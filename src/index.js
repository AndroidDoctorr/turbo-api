const express = require('express')
const path = require('path')
const { getApps, initializeApp } = require('firebase-admin/app')

const ensureFirebaseAdmin = () => {
    if (getApps().length) return
    initializeApp({
        projectId: process.env.FIREBASE_PROJECT_ID || 'turbo-api-default',
    })
}

const registerOptionalAwsService = (registerService) => {
    try {
        require.resolve('@aws-sdk/lib-dynamodb')
        require.resolve('aws-jwt-verify')
        const DynamoDBService = require('./dataServices/awsDataService')
        const ConsoleLoggerService = require('./loggingServices/consoleLoggerService')
        const { createAuthenticationMiddleware: createAwsAuthenticationMiddleware } = require('./authServices/awsAuthService')
        registerService('aws', DynamoDBService, ConsoleLoggerService, createAwsAuthenticationMiddleware)
    } catch (_) {
        // AWS optional dependencies not installed; skip registration
    }
}

const registerOptionalPostgresService = (registerService) => {
    try {
        require.resolve('pg')
        const PostgresService = require('./dataServices/postgresDataService')
        const ConsoleLoggerService = require('./loggingServices/consoleLoggerService')
        const { createAuthenticationMiddleware: createPostgresAuthenticationMiddleware } = require('./authServices/postgresAuthService')
        registerService('postgres', PostgresService, ConsoleLoggerService, createPostgresAuthenticationMiddleware)
    } catch (_) {
        // pg optional dependency not installed; skip registration
    }
}

module.exports.buildApp = async () => {
    // Set up the Express app
    const app = express()

    // Load config
    const { getConfig } = require('./file')
    const config = await getConfig()

    // Firestore registration instantiates Admin SDK clients
    ensureFirebaseAdmin()

    // Load service middleware
    const { registerService, getAuthService, getDataService } = require('./serviceFactory')
    const { createAuthenticationMiddleware } = require('./authServices/firebaseAuthService')

    // Register Firebase as the default service
    const FirebaseService = require('./dataServices/firestoreDataService')
    const FirestoreLoggerService = require('./loggingServices/firestoreLoggerService')
    registerService('firestore', FirebaseService, FirestoreLoggerService, createAuthenticationMiddleware)
    registerOptionalAwsService(registerService)
    registerOptionalPostgresService(registerService)

    // Load the auth service from the config
    const authMiddleware = await getAuthService()
    const dataService = await getDataService()
    // Add service-specific middleware for authorization
    app.use(authMiddleware(dataService))

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