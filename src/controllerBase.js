const { AuthError, NotFoundError, applyDefaults, validateData, filterObjectByProps } = require('./validation')
const { ObjectToString, getDiffString } = require('./string')
const { getDataService, getLoggingService } = require('./serviceFactory')
const express = require('express')

class ControllerBase {
    constructor(collectionName, validationRules, propNames) {
        this.collectionName = collectionName
        this.validationRules = validationRules
        this.propNames = propNames
        this.logger = getLoggingService()
        this.router = express.Router()

        this.configureRoutes()
    }
    configureRoutes() { }
    getRouter() { return this.router }
    // CREATE
    createDocument = async (data, user) => {
        const db = await getDataService()
        if (!user) throw new AuthError('User is not authenticated')
        const userId = !!user ? user.uid : 'anonymous'
        const filteredData = filterObjectByProps(data, this.propNames)
        const defaultedData = applyDefaults(filteredData, this.validationRules)
        validateData(defaultedData, this.validationRules, db, this.collectionName)
        const newData = await db.createDocument(this.collectionName, defaultedData, userId)
        this.logger.info(`New item added to ${this.collectionName} with ID ${newData.id}:\n` +
            `${ObjectToString(newData)} by ${userId}`)
        return newData
    }
    // GET BY ID
    getDocumentById = async (documentId, user, isPublic) => {
        const db = await getDataService()
        if (!user && !isPublic) throw new AuthError('You must be logged in to see this')
        const userId = !!user ? user.uid : 'anonymous'
        const data = await db.getDocumentById(this.collectionName, documentId)
        this.logger.info(`${this.collectionName}: ${documentId} retrieved by ${userId}`)
        return data
    }
    // GET ACTIVE
    getActiveDocuments = async (user, isPublic) => {
        const db = await getDataService()
        if (!user && !isPublic)
            throw new AuthError('You must be logged in to see this')
        const userId = !!user ? user.uid : 'anonymous'
        const documents = await db.getActiveDocuments(this.collectionName)
        this.logger.info(`Active ${this.collectionName} retrieved by ${userId}`)
        return documents
    }
    // GET ALL
    getAllDocuments = async (user) => {
        const db = await getDataService()
        // ADMIN ONLY
        if (!user || !user.admin)
            throw new AuthError('User is not authenticated')
        const userId = !!user ? user.uid : 'anonymous'
        const documents = await db.getAllDocuments(this.collectionName)
        this.logger.info(`All ${this.collectionName} retrieved by user ${userId}`)
        return documents
    }
    // GET BY PROP
    getDocumentsByProp = async (prop, value, user, isPublic) => {
        const db = await getDataService()
        if (!user && !isPublic)
            throw new AuthError('You must be logged in to see this')
        const userId = !!user ? user.uid : 'anonymous'
        const documents = await db.getDocumentsByProp(this.collectionName, prop, value)
        this.logger.info(`${this.collectionName} where ${prop} = ${value} retrieved by ${userId}`)
        return documents
    }
    // GET BY PROPS
    getDocumentsByProps = async (props, user, isPublic) => {
        const db = await getDataService()
        if (!user && !isPublic)
            throw new AuthError('You must be logged in to see this')
        const userId = !!user ? user.uid : 'anonymous'
        const documents = await db.getDocumentsByProps(this.collectionName, props)
        this.logger.info(`${this.collectionName} where ${ObjectToString(props)}\n retrieved by ${userId}`)
        return documents
    }
    // GET MY
    getMyDocuments = async (user) => {
        const db = await getDataService()
        if (!user)
            throw new AuthError('User is not authenticated')
        const userId = !!user ? user.uid : 'anonymous'
        const documents = await db.getMyDocuments(this.collectionName, userId)
        this.logger.info(`Own ${this.collectionName} retrieved by user ${userId}`)
        return documents
    }
    // GET USER
    getUserDocuments = async (user, ownerId) => {
        const db = await getDataService()
        // ADMIN ONLY
        if (!user || !user.admin)
            throw new AuthError('User is not authenticated')
        const userId = !!user ? user.uid : 'anonymous'
        const documents = await db.getUserDocuments(this.collectionName, ownerId)
        this.logger.info(`${this.collectionName} owned by user ${userId} retrieved by user ${userId}`)
        return documents
    }

    // TODO: GET TRENDING
    // TODO: GET RECENT
    // TODO: GET POPULAR

    // UPDATE
    updateDocument = async (documentId, data, user) => {
        const db = await getDataService()
        const oldData = db.getDocumentById(this.collectionName, documentId)
        if (!oldData)
            throw new NotFoundError(`ID ${documentId} not found in ${this.collectionName}`)
        // User must be creator or admin
        if (!user && !(user.admin || user.uid === oldData.createdBy))
            throw new AuthError('User is not authenticated')
        const userId = !!user ? user.uid : 'anonymous'
        const filteredData = filterObjectByProps(data, this.propNames)
        validateData(filteredData, this.validationRules, db, this.collectionName)
        const newData = await db.updateDocument(this.collectionName, documentId, filteredData, userId)
        this.logger.info(`${this.collectionName}: ${documentId} updated by user ${userId}:` +
            `${getDiffString(oldData, newData)}`)
        return { id: documentId, ...newData }
    }
    // ARCHIVE
    archiveDocument = async (documentId, user) => {
        const db = await getDataService()
        // User must be creator or admin
        if (!user || !(user.admin || user.uid === data.createdBy))
            throw new AuthError('User is not authenticated')
        const userId = !!user ? user.uid : 'anonymous'
        await db.archiveDocument(this.collectionName, documentId, userId)
        this.logger.info(`${this.collectionName}: ${documentId} archived by user ${userId}`)
        return { id: documentId }
    }
    // DE-ARCHIVE
    dearchiveDocument = async (documentId, user) => {
        const db = await getDataService()
        // ADMIN ONLY
        if (!user || !user.admin) throw new AuthError('User is not authenticated')
        const userId = !!user ? user.uid : 'anonymous'
        await db.dearchiveDocument(this.collectionName, documentId)
        this.logger.warn(`${this.collectionName}: ${documentId} - DE-ARCHIVED by user ${userId}`)
        return { id: documentId }
    }
    // DELETE
    deleteDocument = async (documentId, user) => {
        const db = await getDataService()
        // ADMIN ONLY
        if (!user || !user.admin) throw new AuthError('User is not authenticated')
        const userId = !!user ? user.uid : 'anonymous'
        await db.deleteDocument(this.collectionName, documentId)
        this.logger.warn(`${this.collectionName}: ${documentId} - DELETED by user ${userId}`)
        return { id: documentId }
    }
}

module.exports = ControllerBase