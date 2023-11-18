const { CognitoIdentityServiceProvider } = require('aws-sdk')

const createAuthenticationMiddleware = () => {
    const cognito = new CognitoIdentityServiceProvider()

    return async (req, res, next) => {
        const authorizationHeader = req.headers.authorization
        const handleInvalidHeader = () => {
            return res.status(400).json({ error: 'Invalid Authorization Header' })
        }

        if (!authorizationHeader) return next()

        const tokenParts = authorizationHeader.split(' ')

        if (tokenParts.length !== 2 || tokenParts[0] !== 'Bearer') {
            return handleInvalidHeader()
        }

        const accessToken = tokenParts[1]

        try {
            // Validate the access token using Cognito
            const user = await cognito.getUser({ AccessToken: accessToken }).promise()

            req.user = {
                userId: user.Username,
                email: user.UserAttributes.find(attr => attr.Name === 'email').Value,
                // Add any other relevant user information
            }

            next()
        } catch (error) {
            return res.status(403).json({ error: 'Invalid Token' })
        }
    }
}

module.exports = {
    createAuthenticationMiddleware,
}
