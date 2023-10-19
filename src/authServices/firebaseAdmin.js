const admin = require('firebase-admin')
const { apps, initializeApp, credential: _credential } = admin
const { getConfig } = require('../file')
const { adminService } = getConfig

if (apps.length === 0) {
    initializeApp({
        credential: _credential.cert(adminService),
    })
}

module.exports = admin