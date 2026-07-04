const consoleLogger = {
    log: (message) => console.log(message),
    info: (message) => console.info(message),
    warn: (message) => console.warn(message),
    error: (message) => console.error(message),
}

let logger = consoleLogger
try {
    logger = require('firebase-functions/logger')
} catch (_) {
    // firebase-functions optional — use console when not on Firebase Functions runtime
}

module.exports = class FirestoreLoggerService {
    log(message) {
        logger.log(message)
    }

    info(message) {
        logger.info(message)
    }

    warn(message) {
        logger.warn(message)
    }

    error(message) {
        logger.error(message)
    }
}
