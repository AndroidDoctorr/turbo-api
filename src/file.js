const path = require('path')
const fs = require('fs')

const getConfig = () => {
    return readFile(path.join(process.cwd(), 'turbo-config.json'))
}

const readFile = (path) => {
    fs.readFile(path, 'utf8', (err, data) => {
        if (err)
            console.error('Error reading file:', err)
        else
            return JSON.parse(data)
    })
}

module.exports = {
    getConfig,
    readFile,
}