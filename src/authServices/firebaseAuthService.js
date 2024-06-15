const admin = require('firebase-admin')

const createAuthenticationMiddleware = (logger, dataService) => {
    return async (req, res, next) => {
        const authorizationHeader = req.headers.authorization
        if (logger) logger.log('Authorization header:', authorizationHeader)
        const handleInvalidHeader = () => {
            return res.status(400).json({ error: 'Invalid Authorization Header' })
        }
        // Continue with anonymous requests if no user object
        if (!authorizationHeader)
            return next()

        const tokenParts = authorizationHeader.split(' ')
        if (tokenParts.length !== 2 || tokenParts[0] !== 'Bearer')
            return handleInvalidHeader()

        const idToken = tokenParts[1]
        if (!idToken)
            return handleInvalidHeader()

        try {
            const decodedToken = await admin.auth().verifyIdToken(idToken)
            req.user = decodedToken
            if (req.user.disabled === true)
                return res.status(403).json({ error: 'Account is suspended' })
            next()
        } catch (error) {
            return res.status(403).json({ error: 'Invalid Token' })
        }
    }
}


module.exports = {
    createAuthenticationMiddleware
}