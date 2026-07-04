/**
 * Pass-through auth for PostgreSQL-only deployments.
 * Does not verify tokens — set authService to "firestore" or register custom auth
 * when you need Firebase/Cognito/JWT verification with a Postgres data backend.
 */
const createAuthenticationMiddleware = (_dataService) => {
    return async (req, res, next) => {
        const authorizationHeader = req.headers.authorization
        if (!authorizationHeader)
            return next()

        const tokenParts = authorizationHeader.split(' ')
        if (tokenParts.length !== 2 || tokenParts[0] !== 'Bearer')
            return res.status(400).json({ error: 'Invalid Authorization Header' })

        if (!tokenParts[1])
            return res.status(400).json({ error: 'Invalid Authorization Header' })

        // Token present but postgres auth does not verify it — use authService: "firestore" etc.
        return next()
    }
}

module.exports = {
    createAuthenticationMiddleware,
}
