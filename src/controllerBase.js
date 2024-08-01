const { AuthError, applyDefaults, validateData, filterObjectByProps, NotFoundError } = require('./validation')
const { objectToString, getDiffString } = require('./string')
const { getDataService, getLoggingService } = require('./serviceFactory')
const { handleRoute } = require('./http')
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

        this.router.get('/', (req, res) => handleRoute(req, res, async (req) => {
            const db = await getDataService()
            const { page = 0, limit = db.defaultLimit } = req.query
            return await this.getActiveDocuments(req.user, parseInt(limit), parseInt(page), options.isPublicGet)
        }))

        this.router.patch('/:id', (req, res) => handleRoute(req, res, async (req) =>
            await this.updateDocument(req.params.id, req.body, req.user)
        ))

        this.router.patch('/', (req, res) => handleRoute(req, res, async (req) =>
            await this.updateDocuments(req.body, req.user)
        ))

        this.router.delete('/:id', (req, res) => handleRoute(req, res, async (req) =>
            await this.deleteDocument(req.params.id, req.user)
        ))
    }

    fullCRUD(options = {}) {
        // Get options, if any are defined, and pass to basicCRUD
        this.options = options

        this.router.post('/', (req, res) => handleRoute(req, res, async (req) =>
            await this.createDocument(req.body, req.user)
        ))

        this.router.get('/', (req, res) => handleRoute(req, res, async (req) => {
            const db = await getDataService()
            const { page = 0, limit = db.defaultLimit } = req.query
            return await this.getActiveDocuments(req.user, parseInt(limit), parseInt(page), options.isPublicGet)
        }))

        if (!options.noMetaData) {
            this.router.get('/my', (req, res) => handleRoute(req, res, async (req) => {
                const db = await getDataService()
                const { page = 0, limit = db.defaultLimit } = req.query
                return await this.getMyDocuments(req.user, parseInt(limit), parseInt(page))
            }))

            this.router.get('/recent', (req, res) => handleRoute(req, res, async (req) => {
                const db = await getDataService()
                const { page = 0, limit = db.defaultLimit } = req.query
                return await this.getRecentDocuments(req.params.count, req.user, parseInt(limit), parseInt(page), options.isPublicGet)
            }))
        }

        this.router.get('/includeInactive', (req, res) => handleRoute(req, res, async (req) => {
            const db = await getDataService()
            const { page = 0, limit = db.defaultLimit } = req.query
            return await this.getAllDocuments(req.user, parseInt(limit), parseInt(page))
        }))

        this.router.get('/:id', (req, res) => handleRoute(req, res, async (req) =>
            await this.getDocumentById(req.params.id, req.user, options.isPublicGet)
        ))

        this.router.get('/:id/full', (req, res) => handleRoute(req, res, async (req) =>
            await this.getDocumentByIdFull(req.params.id, req.user, options.isPublicGet)
        ))

        this.router.patch('/:id', (req, res) => handleRoute(req, res, async (req) =>
            await this.updateDocument(req.params.id, req.body, req.user)
        ))

        this.router.patch('/', (req, res) => handleRoute(req, res, async (req) =>
            await this.updateDocuments(req.body, req.user)
        ))

        this.router.patch('/:id/archive', (req, res) => handleRoute(req, res, async (req) =>
            await this.archiveDocument(req.params.id, req.user)
        ))

        this.router.patch('/:id/dearchive', (req, res) => handleRoute(req, res, async (req) =>
            await this.dearchiveDocument(req.params.id, req.user)
        ))

        this.router.delete('/:id', (req, res) => handleRoute(req, res, async (req) =>
            await this.deleteDocument(req.params.id, req.user)
        ))
    }

    getRouter() { return this.router }
    // CREATE
    createDocument = async (data, user) => {
        // Get services
        const [db, logger] = await Promise.all([
            getDataService(),
            getLoggingService()
        ])
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
        try {
            await validateData(defaultedData, this.validationRules, db, this.collectionName)
            // Create document
            const newData = await db.createDocument(this.collectionName, defaultedData, userId, this.options.noMetaData)
            // Log and return if successful
            logger.info(`New item added to ${this.collectionName} with ID ${newData.id}:\n` +
                `${objectToString(defaultedData)} by ${userId}`)
            return newData
        } catch (error) {
            logger.error(`User ${userId} failed to create document in ${this.collectionName}:\n${error}\nData: ${objectToString(defaultedData)}`)
            throw error
        }
    }
    // GET BY ID
    getDocumentById = async (documentId, user, isPublic) => {
        // Get services
        const [db, logger] = await Promise.all([
            getDataService(),
            getLoggingService()
        ])
        // Validate authentication
        if (!!this.options.isAdminOnly && !this.isUserAdmin(user))
            throw new AuthError(`Cannot get ${documentId} - User is not authenticated`)
        if (!user && !isPublic)
            throw new AuthError(`Cannot get ${documentId} - You must be logged in to see this`)
        // Get document(s)
        const userId = !!user ? user.uid : 'anonymous'
        const data = await db.getDocumentById(this.collectionName, documentId, !!user && !!user.admin)
        logger.info(`${this.collectionName}: ${documentId} retrieved by ${userId}`)
        return data
    }
    // GET BY ID FULL
    getDocumentByIdFull = async (documentId, user, isPublic) => {
        // Get services
        let data
        try {
            data = await this.getDocumentById(documentId, user, isPublic)
        } catch (error) {
            throw new NotFoundError(`Cannot find ${this.collectionName}: ${documentId}`)
        }
        if (!this.validationRules) return data
        // Fetch objects linked by foreign keys
        const [db, logger] = await Promise.all([
            getDataService(),
            getLoggingService()
        ])
        const dataPromises = []
        for (const prop in this.validationRules) {
            const { reference } = this.validationRules[prop]
            if (!reference) continue
            const key = data[prop]
            if (!key) continue
            dataPromises.push(
                db.getDocumentById(reference, key, !!user && !!user.admin)
                    .then(result => {
                        data[prop] = result
                    }))
        }
        await Promise.all(dataPromises)
        const userId = !!user ? user.uid : 'anonymous'
        logger.info(`${this.collectionName}: ${documentId} retrieved by ${userId}`)
        return data
    }
    // GET ACTIVE
    getActiveDocuments = async (user, limit, startAtIndex, isPublic) => {
        // Get services
        const [db, logger] = await Promise.all([
            getDataService(),
            getLoggingService()
        ])
        // Validate authentication
        if (!!this.options.isAdminOnly && !this.isUserAdmin(user))
            throw new AuthError('User is not authenticated')
        if (!user && !isPublic)
            throw new AuthError('You must be logged in to see this')
        // Get document(s)
        const userId = !!user ? user.uid : 'anonymous'
        const documents = await db.getActiveDocuments(this.collectionName, limit, startAtIndex)
        // Log and return if successful
        logger.info(`Active ${this.collectionName} retrieved by ${userId}`)
        return documents
    }
    // GET ALL
    getAllDocuments = async (user, limit, startAtIndex) => {
        // Get services
        const [db, logger] = await Promise.all([
            getDataService(),
            getLoggingService()
        ])
        // Validate authentication
        if (!this.isUserAdmin(user))
            throw new AuthError('User is not authenticated')
        // Get document(s)
        const userId = !!user ? user.uid : 'anonymous'
        const documents = await db.getAllDocuments(this.collectionName, limit, startAtIndex)
        // Log and return if successful
        logger.info(`All ${this.collectionName} retrieved by user ${userId}`)
        return documents
    }
    // GET BY PROP
    getDocumentsByProp = async (prop, value, user, limit, startAtIndex, isPublic) => {
        // Get services
        const [db, logger] = await Promise.all([
            getDataService(),
            getLoggingService()
        ])
        // Validate authentication
        if (!!this.options.isAdminOnly && !this.isUserAdmin(user))
            throw new AuthError('User is not authenticated')
        if (!user && !isPublic)
            throw new AuthError('You must be logged in to see this')
        // Get document(s)
        const userId = !!user ? user.uid : 'anonymous'
        const documents = await db.getDocumentsByProp(this.collectionName, prop, value, limit, startAtIndex)
        // Log and return if successful
        logger.info(`${this.collectionName} where ${prop} = ${value} retrieved by ${userId}`)
        return documents
    }
    // GET BY PROPS
    getDocumentsByProps = async (props, user, limit, startAtIndex, isPublic) => {
        // Get services
        const [db, logger] = await Promise.all([
            getDataService(),
            getLoggingService()
        ])
        // Validate authentication
        if (!!this.options.isAdminOnly && !this.isUserAdmin(user))
            throw new AuthError('User is not authenticated')
        if (!user && !isPublic)
            throw new AuthError('You must be logged in to see this')
        // Get document(s)
        const userId = !!user ? user.uid : 'anonymous'
        const documents = await db.getDocumentsByProps(this.collectionName, props, limit, startAtIndex)
        // Log and return if successful
        logger.info(`${this.collectionName} where ${objectToString(props)}\n retrieved by ${userId}`)
        return documents
    }
    // QUERY DOCUMENTS BY PROP
    queryDocumentsByProp = async (prop, value, user, limit, startAtIndex, isPublic) => {
        // Get services
        const [db, logger] = await Promise.all([
            getDataService(),
            getLoggingService()
        ])
        // Validate authentication
        if (!!this.options.isAdminOnly && !this.isUserAdmin(user))
            throw new AuthError('User is not authenticated')
        if (!user && !isPublic)
            throw new AuthError('You must be logged in to see this')
        // Get document(s)
        const userId = !!user ? user.uid : 'anonymous'
        const documents = await db.queryDocumentsByProp(this.collectionName, prop, value, limit, startAtIndex)
        // Log and return if successful
        logger.info(`${this.collectionName} where ${prop} starts with ${value} retrieved by ${userId}`)
        return documents
    }
    // GET DOCUMENTS WHERE IN PROP
    getDocumentsWhereInProp = async (prop, values, user, limit, startAtIndex, isPublic) => {
        // Get services
        const [db, logger] = await Promise.all([
            getDataService(),
            getLoggingService()
        ])
        // Validate authentication
        if (!!this.options.isAdminOnly && !this.isUserAdmin(user))
            throw new AuthError('User is not authenticated')
        if (!user && !isPublic)
            throw new AuthError('You must be logged in to see this')
        // Get document(s)
        const userId = !!user ? user.uid : 'anonymous'
        const documents = await db.getDocumentsWhereInProp(this.collectionName, prop, values, limit, startAtIndex)
        // Log and return if successful
        logger.info(`${this.collectionName} where ${prop} in ${values.join(', ')} retrieved by ${userId}`)
        return documents
    }
    // GET RECENT
    getRecentDocuments = async (count, user, limit, startAtIndex, isPublic) => {
        // Get services
        const [db, logger] = await Promise.all([
            getDataService(),
            getLoggingService()
        ])
        // Validate authentication
        if (!!this.options.isAdminOnly && !this.isUserAdmin(user))
            throw new AuthError('User is not authenticated')
        if (!user && !isPublic)
            throw new AuthError('You must be logged in to see this')
        // Get document(s)
        const userId = !!user ? user.uid : 'anonymous'
        const documents = await db.getRecentDocuments(this.collectionName, count, limit, startAtIndex)
        // Log and return if successful
        logger.info(`Recent ${this.collectionName} retrieved by user ${userId}`)
        return documents
    }
    // GET MY
    getMyDocuments = async (user, limit, startAtIndex) => {
        // Get services
        const [db, logger] = await Promise.all([
            getDataService(),
            getLoggingService()
        ])
        // Validate authentication
        if (!user)
            throw new AuthError('User is not authenticated')
        if (!!this.options.isAdminOnly && !this.isUserAdmin(user))
            throw new AuthError('User is not authenticated')
        // Get document(s)
        const userId = !!user ? user.uid : 'anonymous'
        const documents = await db.getMyDocuments(this.collectionName, userId, limit, startAtIndex)
        // Log and return if successful
        logger.info(`Own ${this.collectionName} retrieved by user ${userId}`)
        return documents
    }
    // GET USER
    getUserDocuments = async (user, ownerId, limit, startAtIndex) => {
        // Get services
        const [db, logger] = await Promise.all([
            getDataService(),
            getLoggingService()
        ])
        // Validate authentication
        if (!this.isUserAdmin(user))
            throw new AuthError('User is not authenticated')
        // Get document(s)
        const userId = !!user ? user.uid : 'anonymous'
        const documents = await db.getUserDocuments(this.collectionName, ownerId, limit, startAtIndex)
        // Log and return if successful
        logger.info(`${this.collectionName} owned by user ${userId} retrieved by user ${userId}`)
        return documents
    }
    // UPDATE
    updateDocument = async (documentId, data, user) => {
        // Get services
        const [db, logger] = await Promise.all([
            getDataService(),
            getLoggingService()
        ])
        // User must be creator or admin
        const oldData = await db.getDocumentById(this.collectionName, documentId)
        const isAdmin = !!user.admin
        const isOwner = user.uid === oldData.createdBy
        const isAdminOrOwner = isAdmin || isOwner
        if (!user || !isAdminOrOwner)
            throw new AuthError('User is not authenticated')
        // Sanitize data
        const filteredData = filterObjectByProps({ ...oldData, ...data }, this.propNames)
        const defaultedData = applyDefaults(filteredData, this.validationRules)
        const userId = !!user ? user.uid : 'anonymous'
        try {
            await validateData(defaultedData, this.validationRules, db, this.collectionName)
            // Update document
            const newData = await db.updateDocument(this.collectionName, documentId, filteredData, userId, this.options.noMetaData)
            // Log and return if successful
            logger.info(`${this.collectionName}: ${documentId} updated by user ${userId}:` +
                `${getDiffString(oldData, newData)}`)
            return { id: documentId, ...newData }
        } catch (error) {
            logger.error(`User ${userId} failed to update document in ${this.collectionName}:\n${error}\nData: ${objectToString(data)}`)
            throw error
        }
    }
    updateDocuments = async (documents, user) => {
        // Get services
        const [db, logger] = await Promise.all([
            getDataService(),
            getLoggingService()
        ])
        // Validate authentication
        if (!user)
            throw new AuthError('User is not authenticated')
        // Update documents
        const userId = user.uid
        const promises = documents.map(async (document) => {
            const isAdmin = !!user.admin
            const isOwner = userId === document.createdBy
            const isAdminOrOwner = isAdmin || isOwner
            if (!isAdminOrOwner) {
                throw new AuthError(`User is not authorized to update document with ID ${document.id}`)
            }
            return db.updateDocument(this.collectionName, document.id, document, userId)
        })
        logger.info(`${documents.length} documents in ${this.collectionName} updated by user ${userId}`)
        return await Promise.all(promises)
    }
    // ARCHIVE
    archiveDocument = async (documentId, user) => {
        // Get services
        const [db, logger] = await Promise.all([
            getDataService(),
            getLoggingService()
        ])
        // User must be creator or admin
        const data = await db.getDocumentById(this.collectionName, documentId)
        if (!data)
            throw new NotFoundError(`Cannot find ${this.collectionName} document to delete: ${documentId}`)
        const isAdmin = !!user.admin
        const isOwner = user.uid === data.createdBy
        const isAdminOrOwner = isAdmin || isOwner
        if (!user || !isAdminOrOwner)
            throw new AuthError(`Cannot archive ${documentId} - user is not authenticated`)
        // Archive document
        const userId = !!user ? user.uid : 'anonymous'
        try {
            await db.archiveDocument(this.collectionName, documentId, userId, this.options.noMetaData)
            // Log and return if successful
            logger.info(`${this.collectionName}: ${documentId} archived by user ${userId}`)
            return { id: documentId }
        } catch (error) {
            logger.error(`User ${userId} failed to archive document in ${this.collectionName}:\n${error}`)
            throw error
        }

    }
    // DE-ARCHIVE
    dearchiveDocument = async (documentId, user) => {
        // Get services
        const [db, logger] = await Promise.all([
            getDataService(),
            getLoggingService()
        ])
        // ADMIN ONLY
        if (!this.isUserAdmin(user) && !this.options.noMetaData) throw new AuthError('User is not authenticated')
        // De-archive document
        const userId = !!user ? user.uid : 'anonymous'
        try {
            await db.dearchiveDocument(this.collectionName, documentId, userId, this.options.noMetaData)
            // Log and return if successful
            logger.warn(`${this.collectionName}: ${documentId} - DE-ARCHIVED by user ${userId}`)
            return { id: documentId }
        } catch (error) {
            logger.error(`User ${userId} failed to dearchive document in ${this.collectionName}:\n${error}`)
            throw error
        }
    }
    // DELETE
    deleteDocument = async (documentId, user) => {
        // Get services
        const [db, logger] = await Promise.all([
            getDataService(),
            getLoggingService()
        ])
        // Validate authentication
        const data = await db.getDocumentById(this.collectionName, documentId)
        if (!data)
            throw new NotFoundError(`Cannot find ${this.collectionName} document to delete: ${documentId}`)
        if (!user)
            throw new AuthError('User is not authenticated')
        const userDeleteAllowed = this.options.allowUserDelete && user.uid === data.createdBy
        if (!userDeleteAllowed && !this.isUserAdmin(user))
            throw new AuthError('User is not authenticated')
        // Delete document
        const userId = user.uid
        try {
            await db.deleteDocument(this.collectionName, documentId)
            // Log and return if successful
            logger.warn(`${this.collectionName}: ${documentId} - DELETED by user ${userId}`)
            return { id: documentId }
        } catch (error) {
            logger.error(`User ${userId} failed to delete document in ${this.collectionName}:\n${error}`)
            throw error
        }
    }

    isUserAdmin = (user) => !!user && !!user.admin
}

module.exports = ControllerBase