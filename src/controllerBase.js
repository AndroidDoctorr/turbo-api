const { AuthError, NotFoundError, applyDefaults, validateData, filterObjectByProps, ValidationError } = require('./validation')
const { objectToString, getDiffString } = require('./string')
const { getDataService, getLoggingService } = require('./serviceFactory')
const express = require('express')

class ControllerBase {
    constructor(collectionName, validationRules, propNames) {
        this.collectionName = collectionName
        this.validationRules = validationRules
        this.propNames = propNames
        this.router = express.Router()
        this.options = {}

        this.configureRoutes()
    }
    configureRoutes() { }

    basicCRUD(options = {}) {
        // Get options, if any are defined
        this.options = options

        this.router.post('/', (req, res) => handleRoute(req, res, async (req) =>
            await this.createDocument(req.body, req.user)
        ))

        this.router.get('/:id', (req, res) => handleRoute(req, res, async (req) =>
            await this.getDocumentById(req.params.id, req.user, options.isPublicGet)
        ))

        this.router.get('/', (req, res) => handleRoute(req, res, async (req) =>
            await this.getActiveDocuments(req.user, options.isPublicGet)
        ))

        this.router.put('/:id', (req, res) => handleRoute(req, res, async (req) =>
            await this.updateDocument(req.params.id, req.body, req.user)
        ))

        this.router.delete('/:id', (req, res) => handleRoute(req, res, async (req) =>
            await this.deleteDocument(req.params.id, req.user)
        ))
    }

    fullCRUD(options = {}) {
        // Get options, if any are defined, and pass to basicCRUD
        this.options = options
        this.basicCRUD(options)

        if (!options.noMetaData) {
            this.router.get('/my', (req, res) => handleRoute(req, res, async (req) =>
                await this.getMyDocuments(req.user)
            ))
        }

        this.router.get('/includeInactive', (req, res) => handleRoute(req, res, async (req) =>
            await this.getAllDocuments(req.user)
        ))

        this.router.delete('/:id/archive', (req, res) => handleRoute(req, res, async (req) =>
            await this.archiveDocument(req.params.id, req.user)
        ))

        this.router.put('/:id/dearchive', (req, res) => handleRoute(req, res, async (req) =>
            await this.dearchiveDocument(req.params.id, req.user)
        ))
    }

    getRouter() { return this.router }
    // CREATE
    createDocument = async (data, user) => {
        // Get services
        const db = await getDataService()
        const logger = await getLoggingService()
        // Validate authentication
        if (!!this.options.isAdminOnly && !this.isUserAdmin(user))
            throw new AuthError('User is not authenticated')
        const isPublicPostAllowed = !!this.options.isPublicPost && !!this.options.noMetaData
        if (!user && !isPublicPostAllowed)
            throw new AuthError('You must be logged in to perform this action')
        // Sanitize data
        const userId = !!user ? user.uid : 'anonymous'
        const filteredData = filterObjectByProps(data, this.propNames)
        const defaultedData = applyDefaults(filteredData, this.validationRules)
        validateData(defaultedData, this.validationRules, db, this.collectionName)
        // Create document
        const newData = await db.createDocument(this.collectionName, defaultedData, userId, this.options.noMetaData)
        // Log and return if successful
        logger.info(`New item added to ${this.collectionName} with ID ${newData.id}:\n` +
            `${objectToString(defaultedData)} by ${userId}`)
        return newData
    }
    // GET BY ID
    getDocumentById = async (documentId, user, isPublic) => {
        // Get services
        const db = await getDataService()
        const logger = await getLoggingService()
        // Validate authentication
        if (!!this.options.isAdminOnly && !this.isUserAdmin(user))
            throw new AuthError('User is not authenticated')
        if (!user && !isPublic)
            throw new AuthError('You must be logged in to see this')
        // Get document(s)
        const userId = !!user ? user.uid : 'anonymous'
        const data = await db.getDocumentById(this.collectionName, documentId, !!user && !!user.admin)
        logger.info(`${this.collectionName}: ${documentId} retrieved by ${userId}`)
        return data
    }
    // GET ACTIVE
    getActiveDocuments = async (user, isPublic) => {
        // Get services
        const db = await getDataService()
        const logger = await getLoggingService()
        // Validate authentication
        if (!!this.options.isAdminOnly && !this.isUserAdmin(user))
            throw new AuthError('User is not authenticated')
        if (!user && !isPublic)
            throw new AuthError('You must be logged in to see this')
        // Get document(s)
        const userId = !!user ? user.uid : 'anonymous'
        const documents = await db.getActiveDocuments(this.collectionName)
        // Log and return if successful
        logger.info(`Active ${this.collectionName} retrieved by ${userId}`)
        return documents
    }
    // GET ALL
    getAllDocuments = async (user) => {
        // Get services
        const db = await getDataService()
        const logger = await getLoggingService()
        // Validate authentication
        if (!this.isUserAdmin(user))
            throw new AuthError('User is not authenticated')
        // Get document(s)
        const userId = !!user ? user.uid : 'anonymous'
        const documents = await db.getAllDocuments(this.collectionName)
        // Log and return if successful
        logger.info(`All ${this.collectionName} retrieved by user ${userId}`)
        return documents
    }
    // GET BY PROP
    getDocumentsByProp = async (prop, value, user, isPublic) => {
        // Get services
        const db = await getDataService()
        const logger = await getLoggingService()
        // Validate authentication
        if (!!this.options.isAdminOnly && !this.isUserAdmin(user))
            throw new AuthError('User is not authenticated')
        if (!user && !isPublic)
            throw new AuthError('You must be logged in to see this')
        // Get document(s)
        const userId = !!user ? user.uid : 'anonymous'
        const documents = await db.getDocumentsByProp(this.collectionName, prop, value)
        // Log and return if successful
        logger.info(`${this.collectionName} where ${prop} = ${value} retrieved by ${userId}`)
        return documents
    }
    // GET BY PROPS
    getDocumentsByProps = async (props, user, isPublic) => {
        // Get services
        const db = await getDataService()
        const logger = await getLoggingService()
        // Validate authentication
        if (!!this.options.isAdminOnly && !this.isUserAdmin(user))
            throw new AuthError('User is not authenticated')
        if (!user && !isPublic)
            throw new AuthError('You must be logged in to see this')
        // Get document(s)
        const userId = !!user ? user.uid : 'anonymous'
        const documents = await db.getDocumentsByProps(this.collectionName, props)
        // Log and return if successful
        logger.info(`${this.collectionName} where ${objectToString(props)}\n retrieved by ${userId}`)
        return documents
    }
    // GET MY
    getMyDocuments = async (user) => {
        // Get services
        const db = await getDataService()
        const logger = await getLoggingService()
        // Validate authentication
        if (!user)
            throw new AuthError('User is not authenticated')
        if (!!this.options.isAdminOnly && !this.isUserAdmin(user))
            throw new AuthError('User is not authenticated')
        // Get document(s)
        const userId = !!user ? user.uid : 'anonymous'
        const documents = await db.getMyDocuments(this.collectionName, userId)
        // Log and return if successful
        logger.info(`Own ${this.collectionName} retrieved by user ${userId}`)
        return documents
    }
    // GET USER
    getUserDocuments = async (user, ownerId) => {
        // Get services
        const db = await getDataService()
        const logger = await getLoggingService()
        // Validate authentication
        if (!this.isUserAdmin(user))
            throw new AuthError('User is not authenticated')
        // Get document(s)
        const userId = !!user ? user.uid : 'anonymous'
        const documents = await db.getUserDocuments(this.collectionName, ownerId)
        // Log and return if successful
        logger.info(`${this.collectionName} owned by user ${userId} retrieved by user ${userId}`)
        return documents
    }

    // TODO: GET TRENDING
    // TODO: GET RECENT
    // TODO: GET POPULAR

    // UPDATE
    updateDocument = async (documentId, data, user) => {
        // Get services
        const db = await getDataService()
        const logger = await getLoggingService()
        // User must be creator or admin
        if (!user && !(user.admin || user.uid === oldData.createdBy))
            throw new AuthError('User is not authenticated')
        if (!this.isUserAdmin(user))
            throw new AuthError('User is not authenticated')
        // Make sure document exists
        const oldData = db.getDocumentById(this.collectionName, documentId)
        if (!oldData)
            throw new NotFoundError(`ID ${documentId} not found in ${this.collectionName}`)
        // Sanitize data
        const filteredData = filterObjectByProps(data, this.propNames)
        validateData(filteredData, this.validationRules, db, this.collectionName)
        // Update document
        const userId = !!user ? user.uid : 'anonymous'
        const newData = await db.updateDocument(this.collectionName, documentId, filteredData, userId, this.options.noMetaData)
        // Log and return if successful
        logger.info(`${this.collectionName}: ${documentId} updated by user ${userId}:` +
            `${getDiffString(oldData, newData)}`)
        return { id: documentId, ...newData }
    }
    // ARCHIVE
    archiveDocument = async (documentId, user) => {
        // Get services
        const db = await getDataService()
        const logger = await getLoggingService()
        // User must be creator or admin
        if (!user || !(user.admin || user.uid === data.createdBy))
            throw new AuthError('User is not authenticated')
        const doc = db.getDocumentById(this.collectionName, documentId, false)
        if (!doc) throw new ValidationError('Document does not exist')
        // Archive document
        const userId = !!user ? user.uid : 'anonymous'
        await db.archiveDocument(this.collectionName, documentId, userId, this.options.noMetaData)
        // Log and return if successful
        logger.info(`${this.collectionName}: ${documentId} archived by user ${userId}`)
        return { id: documentId }
    }
    // DE-ARCHIVE
    dearchiveDocument = async (documentId, user) => {
        // Get services
        const db = await getDataService()
        const logger = await getLoggingService()
        // ADMIN ONLY
        if (this.isUserAdmin(user)) throw new AuthError('User is not authenticated')
        // Make sure document exists
        const doc = db.getDocumentById(this.collectionName, documentId, true)
        if (!doc) throw new ValidationError('Document does not exist')
        // De-archive document
        const userId = !!user ? user.uid : 'anonymous'
        await db.dearchiveDocument(this.collectionName, documentId, userId, this.options.noMetaData)
        // Log and return if successful
        logger.warn(`${this.collectionName}: ${documentId} - DE-ARCHIVED by user ${userId}`)
        return { id: documentId }
    }
    // DELETE
    deleteDocument = async (documentId, user) => {
        // Get services
        const db = await getDataService()
        const logger = await getLoggingService()
        // Validate authentication
        if (!user || !this.isUserAdmin(user) || (!!this.options.allowUserDelete && !user))
            throw new AuthError('User is not authenticated')
        // Make sure document exists
        const doc = db.getDocumentById(this.collectionName, documentId, true)
        if (!doc) throw new ValidationError('Document does not exist')
        // Delete document
        const userId = user.uid
        await db.deleteDocument(this.collectionName, documentId)
        // Log and return if successful
        logger.warn(`${this.collectionName}: ${documentId} - DELETED by user ${userId}`)
        return { id: documentId }
    }

    isUserAdmin = (user) => !!user && !!user.admin
}

module.exports = ControllerBase