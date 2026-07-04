module.exports = class ConsoleLoggerService {
    log(message) {
        console.log(message)
    }

    info(message) {
        console.info(message)
    }

    warn(message) {
        console.warn(message)
    }

    error(message) {
        console.error(message)
    }
}
