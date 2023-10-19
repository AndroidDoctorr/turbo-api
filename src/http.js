const {
    ValidationError,
    AuthError,
    ForbiddenError,
    NotFoundError,
    LogicError,
    DependencyError,
    ServiceError,
    InternalError,
    NoContentError,
} = require('./validation')

// Common route handler function
const handleRoute = async (req, res, action) => {
    try {
        const result = await action(req)
        return res.status(req.method === 'POST' ? 201 : 200).json(result)
    } catch (error) {
        return handleErrors(res, error)
    }
}
// Return the appropriate HTTP response depending on the type of request error
const handleErrors = (res, error) => {
    // Not really an error
    if (error instanceof NoContentError)
        return res.status(204).json({})
    // Your fault
    if (error instanceof ValidationError)
        return res.status(400).json({ error: error.message || 'Bad request' })
    if (error instanceof AuthError)
        return res.status(401).json({ error: error.message || 'Not authorized' })
    if (error instanceof ForbiddenError)
        return res.status(403).json({ error: error.message || 'Action forbidden' })
    if (error instanceof NotFoundError)
        return res.status(404).json({ error: error.message || 'Not found' })
    if (error instanceof LogicError)
        return res.status(418).json({ error: error.message || 'I\'m a teapot' })
    if (error instanceof DependencyError)
        return res.status(424).json({ error: error.message || 'Failed dependency' })
    // Our fault
    if (error instanceof ServiceError)
        return res.status(503).json({ error: error.message || 'Service unavailable' })
    if (error instanceof InternalError)
        return res.status(500).json({ error: error.message || 'Internal server error' })
    return res.status(500).json({ error: error.message || 'Unknown internal error' })
}

module.exports = { handleRoute, handleErrors }