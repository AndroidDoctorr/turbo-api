const admin = require('firebase-admin')

const createAuthenticationMiddleware = (dataService) => {
    return async (req, res, next) => {
        const idToken = req.headers.authorization
        // Continue with anonymous requests, if available (no user object)
        if (!idToken) return
        try {
            const decodedToken = await admin.auth().verifyIdToken(idToken)
            req.user = decodedToken
            next()
        } catch (error) {
            return res.status(403).json({ error: 'Invalid Token' })
        }
    }
}

module.exports = {
    createAuthenticationMiddleware
}