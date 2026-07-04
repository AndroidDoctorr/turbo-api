const fs = require('fs')
const util = require('util')
const path = require('path')

const readFileAsync = util.promisify(fs.readFile)

const getConfigPath = () => {
    if (process.env.TURBO_CONFIG_PATH)
        return process.env.TURBO_CONFIG_PATH
    return path.join(process.cwd(), 'turbo-config.json')
}

const getConfig = async () => {
    return await readFileAsync(getConfigPath())
        .then(data => JSON.parse(data))
}

module.exports = {
    getConfig,
    getConfigPath,
}
