/*
const createAuthenticationMiddleware = (dataService) => {
    return async (event, context) => {
        const token = event.headers.Authorization || event.headers.authorization
        if (!token) { return }
        try {
            const user = await verifyTokenAndGetUser(token, dataService)
            if (!user) {
                return {
                    statusCode: 403,
                    body: JSON.stringify({ error: 'Unauthorized' }),
                }
            }
            event.user = user
            return event
        } catch (error) {
            return {
                statusCode: 403,
                body: JSON.stringify({ error: 'Unauthorized' }),
            }
        }
    }
}

async function verifyTokenAndGetUser(token, dataService) {
    return await dataService.validateToken(token)
}
*/