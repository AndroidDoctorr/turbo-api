const { getConfig } = require('./file')

// Registry to store registered services
const serviceRegistry = {}

const registerService = (serviceName, DataService, LoggingService, authMiddleware) => {
    const dataService = new DataService()
    const loggingService = new LoggingService()
    serviceRegistry[serviceName] = { dataService, loggingService, authMiddleware }
}

const getDataService = () => {
    const config = getConfig()
    // Default to Firestore if not specified
    const serviceName = config.dataService || 'firestore'

    if (serviceRegistry[serviceName]) {
        return serviceRegistry[serviceName].dataService
    }
}

const getLoggingService = () => {
    const config = getConfig()
    // Default to Firestore if not specified
    const serviceName = config.loggingService || 'firestore'

    if (serviceRegistry[serviceName]) {
        return serviceRegistry[serviceName].loggingService
    }
}

const getAuthService = (serviceName) => {
    if (serviceRegistry[serviceName])
        return serviceRegistry[serviceName].authMiddleware
}

module.exports = {
    registerService,
    getDataService,
    getLoggingService,
    getAuthService,
}