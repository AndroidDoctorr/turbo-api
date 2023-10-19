const logger = require('firebase-functions/logger')

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