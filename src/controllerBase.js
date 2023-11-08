const { AuthError, NotFoundError, applyDefaults, validateData, filterObjectByProps } = require('./validation')
const { objectToString, getDiffString } = require('./string')
const { getDataService, getLoggingService } = require('./serviceFactory')
const express = require('express')

class ControllerBase {
    constructor(collectionName, validationRules, propNames) {
        this.collectionName = collectionName
        this.validationRules = validationRules
        this.propNames = propNames
        this.router = express.Router()

        this.configureRoutes()
    }
    configureRoutes() { }

    basicCRUD(options = {}) {
        // Get options, if any are defined
        const { isPublicGet, isPublicPost, noMetaData, allowUserDelete } = options || {}

        this.router.post('/', (req, res) => handleRoute(req, res, async (req) =>
            await this.createDocument(req.body, req.user, isPublicPost, noMetaData)
        ))

        this.router.get('/:id', (req, res) => handleRoute(req, res, async (req) =>
            await this.getDocumentById(req.params.id, req.user, isPublicGet)
        ))

        this.router.get('/', (req, res) => handleRoute(req, res, async (req) =>
            await this.getActiveDocuments(req.user, isPublicGet)
        ))

        this.router.put('/:id', (req, res) => handleRoute(req, res, async (req) =>
            await this.updateDocument(req.params.id, req.body, req.user, noMetaData)
        ))

        this.router.delete('/:id', (req, res) => handleRoute(req, res, async (req) =>
            await this.deleteDocument(req.params.id, req.user, allowUserDelete)
        ))
    }

    fullCRUD(options = {}) {
        // Get options, if any are defined, and pass to basicCRUD
        const { noMetaData } = options || {}
        this.basicCRUD(options)

        if (!noMetaData) {
            this.router.get('/my', (req, res) => handleRoute(req, res, async (req) =>
                await this.getMyDocuments(req.user)
            ))
        }

        this.router.get('/includeInactive', (req, res) => handleRoute(req, res, async (req) =>
            await this.getAllDocuments(req.user)
        ))

        this.router.delete('/:id/archive', (req, res) => handleRoute(req, res, async (req) =>
            await this.archiveDocument(req.params.id, req.user, noMetaData)
        ))

        this.router.put('/:id/dearchive', (req, res) => handleRoute(req, res, async (req) =>
            await this.dearchiveDocument(req.params.id, req.user, noMetaData)
        ))
    }

    getRouter() { return this.router }
    // CREATE
    createDocument = async (data, user, isPublic, noMetaData) => {
        const db = await getDataService()
        const logger = await getLoggingService()
        if (!user && !(isPublic && noMetaData))
            throw new AuthError('User is not authenticated')
        const userId = !!user ? user.uid : 'anonymous'
        const filteredData = filterObjectByProps(data, this.propNames)
        const defaultedData = applyDefaults(filteredData, this.validationRules)
        validateData(defaultedData, this.validationRules, db, this.collectionName)
        const newData = await db.createDocument(this.collectionName, defaultedData, userId, noMetaData)
        logger.info(`New item added to ${this.collectionName} with ID ${newData.id}:\n` +
            `${objectToString(defaultedData)} by ${userId}`)
        return newData
    }
    // GET BY ID
    getDocumentById = async (documentId, user, isPublic) => {
        const db = await getDataService()
        const logger = await getLoggingService()
        if (!user && !isPublic) throw new AuthError('You must be logged in to see this')
        const userId = !!user ? user.uid : 'anonymous'
        const data = await db.getDocumentById(this.collectionName, documentId, !!user && !!user.admin)
        logger.info(`${this.collectionName}: ${documentId} retrieved by ${userId}`)
        return data
    }
    // GET ACTIVE
    getActiveDocuments = async (user, isPublic) => {
        const db = await getDataService()
        const logger = await getLoggingService()
        if (!user && !isPublic)
            throw new AuthError('You must be logged in to see this')
        const userId = !!user ? user.uid : 'anonymous'
        const documents = await db.getActiveDocuments(this.collectionName)
        logger.info(`Active ${this.collectionName} retrieved by ${userId}`)
        return documents
    }
    // GET ALL
    getAllDocuments = async (user) => {
        const db = await getDataService()
        const logger = await getLoggingService()
        // ADMIN ONLY
        if (!user || !user.admin)
            throw new AuthError('User is not authenticated')
        const userId = !!user ? user.uid : 'anonymous'
        const documents = await db.getAllDocuments(this.collectionName)
        logger.info(`All ${this.collectionName} retrieved by user ${userId}`)
        return documents
    }
    // GET BY PROP
    getDocumentsByProp = async (prop, value, user, isPublic) => {
        const db = await getDataService()
        const logger = await getLoggingService()
        if (!user && !isPublic)
            throw new AuthError('You must be logged in to see this')
        const userId = !!user ? user.uid : 'anonymous'
        const documents = await db.getDocumentsByProp(this.collectionName, prop, value)
        logger.info(`${this.collectionName} where ${prop} = ${value} retrieved by ${userId}`)
        return documents
    }
    // GET BY PROPS
    getDocumentsByProps = async (props, user, isPublic) => {
        const db = await getDataService()
        const logger = await getLoggingService()
        if (!user && !isPublic)
            throw new AuthError('You must be logged in to see this')
        const userId = !!user ? user.uid : 'anonymous'
        const documents = await db.getDocumentsByProps(this.collectionName, props)
        logger.info(`${this.collectionName} where ${objectToString(props)}\n retrieved by ${userId}`)
        return documents
    }
    // GET MY
    getMyDocuments = async (user) => {
        const db = await getDataService()
        const logger = await getLoggingService()
        if (!user)
            throw new AuthError('User is not authenticated')
        const userId = !!user ? user.uid : 'anonymous'
        const documents = await db.getMyDocuments(this.collectionName, userId)
        logger.info(`Own ${this.collectionName} retrieved by user ${userId}`)
        return documents
    }
    // GET USER
    getUserDocuments = async (user, ownerId) => {
        const db = await getDataService()
        const logger = await getLoggingService()
        // ADMIN ONLY
        if (!user || !user.admin)
            throw new AuthError('User is not authenticated')
        const userId = !!user ? user.uid : 'anonymous'
        const documents = await db.getUserDocuments(this.collectionName, ownerId)
        logger.info(`${this.collectionName} owned by user ${userId} retrieved by user ${userId}`)
        return documents
    }

    // TODO: GET TRENDING
    // TODO: GET RECENT
    // TODO: GET POPULAR

    // UPDATE
    updateDocument = async (documentId, data, user, noMetaData) => {
        const db = await getDataService()
        const logger = await getLoggingService()
        const oldData = db.getDocumentById(this.collectionName, documentId)
        if (!oldData)
            throw new NotFoundError(`ID ${documentId} not found in ${this.collectionName}`)
        // User must be creator or admin
        if (!user && !(user.admin || user.uid === oldData.createdBy))
            throw new AuthError('User is not authenticated')
        const userId = !!user ? user.uid : 'anonymous'
        const filteredData = filterObjectByProps(data, this.propNames)
        validateData(filteredData, this.validationRules, db, this.collectionName)
        const newData = await db.updateDocument(this.collectionName, documentId, filteredData, userId, noMetaData)
        logger.info(`${this.collectionName}: ${documentId} updated by user ${userId}:` +
            `${getDiffString(oldData, newData)}`)
        return { id: documentId, ...newData }
    }
    // ARCHIVE
    archiveDocument = async (documentId, user, noMetaData) => {
        const db = await getDataService()
        const logger = await getLoggingService()
        // User must be creator or admin
        if (!user || !(user.admin || user.uid === data.createdBy))
            throw new AuthError('User is not authenticated')
        const userId = !!user ? user.uid : 'anonymous'
        await db.archiveDocument(this.collectionName, documentId, userId, noMetaData)
        logger.info(`${this.collectionName}: ${documentId} archived by user ${userId}`)
        return { id: documentId }
    }
    // DE-ARCHIVE
    dearchiveDocument = async (documentId, user, noMetaData) => {
        const db = await getDataService()
        const logger = await getLoggingService()
        // ADMIN ONLY
        if (!user || !user.admin) throw new AuthError('User is not authenticated')
        const userId = !!user ? user.uid : 'anonymous'
        await db.dearchiveDocument(this.collectionName, documentId, userId, noMetaData)
        logger.warn(`${this.collectionName}: ${documentId} - DE-ARCHIVED by user ${userId}`)
        return { id: documentId }
    }
    // DELETE
    deleteDocument = async (documentId, user, allowUserDelete) => {
        const db = await getDataService()
        const logger = await getLoggingService()
        // ADMIN ONLY
        if (!user || (!user.admin && !allowUserDelete))
            throw new AuthError('User is not authenticated')
        const userId = user.uid
        await db.deleteDocument(this.collectionName, documentId)
        logger.warn(`${this.collectionName}: ${documentId} - DELETED by user ${userId}`)
        return { id: documentId }
    }
}

module.exports = ControllerBase