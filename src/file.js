const fs = require('fs')
const util = require('util')
const path = require('path')

const readFileAsync = util.promisify(fs.readFile)

const getConfig = async () => {
    return await readFileAsync(path.join(process.cwd(), 'turbo-config.json'))
        .then(data => JSON.parse(data))
}

module.exports = {
    getConfig,
}