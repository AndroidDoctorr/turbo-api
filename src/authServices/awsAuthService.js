const { CognitoJwtVerifier } = require('aws-jwt-verify')

let verifier

const getVerifier = () => {
    if (verifier) return verifier
    const userPoolId = process.env.COGNITO_USER_POOL_ID
    const clientId = process.env.COGNITO_CLIENT_ID
    if (!userPoolId || !clientId)
        throw new Error('COGNITO_USER_POOL_ID and COGNITO_CLIENT_ID must be set for AWS auth')
    verifier = CognitoJwtVerifier.create({
        userPoolId,
        tokenUse: 'id',
        clientId,
    })
    return verifier
}

const createAuthenticationMiddleware = (_dataService) => {
    return async (req, res, next) => {
        const authorizationHeader = req.headers.authorization
        const handleInvalidHeader = () =>
            res.status(400).json({ error: 'Invalid Authorization Header' })

        if (!authorizationHeader)
            return next()

        const tokenParts = authorizationHeader.split(' ')
        if (tokenParts.length !== 2 || tokenParts[0] !== 'Bearer')
            return handleInvalidHeader()

        const idToken = tokenParts[1]
        if (!idToken)
            return handleInvalidHeader()

        try {
            const payload = await getVerifier().verify(idToken)
            req.user = {
                ...payload,
                uid: payload.sub,
                admin: payload['custom:admin'] === 'true' || payload['custom:admin'] === true,
                banned: payload['custom:banned'] === 'true' || payload['custom:banned'] === true,
                disabled: payload['custom:disabled'] === 'true' || payload['custom:disabled'] === true,
            }
            if (req.user.disabled === true)
                return res.status(403).json({ error: 'Account is suspended' })
            if (req.user.banned === true)
                return res.status(403).json({ error: 'Account is banned' })
            next()
        } catch (error) {
            return res.status(403).json({ error: 'Invalid Token' })
        }
    }
}

module.exports = {
    createAuthenticationMiddleware,
}
