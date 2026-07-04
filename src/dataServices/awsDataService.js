const crypto = require('crypto')
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb')
const {
    DynamoDBDocumentClient,
    GetCommand,
    PutCommand,
    DeleteCommand,
    ScanCommand,
} = require('@aws-sdk/lib-dynamodb')
const { NotFoundError } = require('../validation')

const resolveLimit = (limit, defaultLimit) => (isNaN(limit) ? defaultLimit : limit)
const resolveOffset = (startAtIndex, queryLimit) =>
    (isNaN(startAtIndex) ? 0 : startAtIndex * queryLimit)

class DynamoDBService {
    constructor() {
        this.defaultLimit = 50
        const client = new DynamoDBClient({
            region: process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || 'us-east-1',
        })
        this.docClient = DynamoDBDocumentClient.from(client, {
            marshallOptions: { removeUndefinedValues: true },
        })
    }

    getCurrentTimestamp() {
        return Date.now()
    }

    resolveTableName(collectionName) {
        const prefix = process.env.TURBO_AWS_TABLE_PREFIX || ''
        return `${prefix}${collectionName}`
    }

    mapItem(item) {
        if (!item) return null
        const { id, ...rest } = item
        return { id, ...rest }
    }

    matchesInactiveFilter(item, includeInactive) {
        if (includeInactive) return true
        return item.isActive !== false
    }

    sortItems(items, orderBy) {
        if (!orderBy) return items
        return [...items].sort((a, b) => {
            const av = a[orderBy]
            const bv = b[orderBy]
            if (av === bv) return 0
            if (av === undefined || av === null) return 1
            if (bv === undefined || bv === null) return -1
            return av < bv ? -1 : 1
        })
    }

    paginateItems(items, limit, startAtIndex) {
        const queryLimit = resolveLimit(limit, this.defaultLimit)
        const offset = resolveOffset(startAtIndex, queryLimit)
        return items.slice(offset, offset + queryLimit)
    }

    async scanCollection(tableName, includeInactive = false) {
        const items = []
        let exclusiveStartKey
        do {
            const result = await this.docClient.send(new ScanCommand({
                TableName: tableName,
                ExclusiveStartKey: exclusiveStartKey,
            }))
            for (const item of result.Items || []) {
                if (this.matchesInactiveFilter(item, includeInactive))
                    items.push(this.mapItem(item))
            }
            exclusiveStartKey = result.LastEvaluatedKey
        } while (exclusiveStartKey)
        return items
    }

    filterByProp(items, propName, propValue) {
        if (propValue === undefined)
            return items.filter((item) => item[propName] === undefined || item[propName] === null)
        return items.filter((item) => item[propName] === propValue)
    }

    filterByProps(items, props) {
        return items.filter((item) =>
            Object.keys(props).every((prop) => {
                const expected = props[prop]
                if (expected === undefined)
                    return item[prop] === undefined || item[prop] === null
                return item[prop] === expected
            }))
    }

    createDocument = async (collectionName, data, userId, noMetaData) => {
        const tableName = this.resolveTableName(collectionName)
        const id = crypto.randomUUID()
        const now = this.getCurrentTimestamp()
        const newData = { ...data, id, isActive: true }
        if (!noMetaData) {
            newData.created = now
            newData.createdBy = userId
            newData.modified = now
            newData.modifiedBy = userId
        }
        await this.docClient.send(new PutCommand({
            TableName: tableName,
            Item: newData,
        }))
        return { ...newData }
    }

    getDocumentById = async (collectionName, documentId, includeInactive) => {
        const tableName = this.resolveTableName(collectionName)
        const result = await this.docClient.send(new GetCommand({
            TableName: tableName,
            Key: { id: documentId },
        }))
        if (!result.Item) return null
        const item = this.mapItem(result.Item)
        if (!this.matchesInactiveFilter(item, includeInactive)) return null
        return item
    }

    getDocumentsByProp = async (collectionName, propName, propValue, limit, startAtIndex, orderBy, includeInactive) => {
        const tableName = this.resolveTableName(collectionName)
        let items = await this.scanCollection(tableName, includeInactive)
        items = this.filterByProp(items, propName, propValue)
        items = this.sortItems(items, orderBy)
        return this.paginateItems(items, limit, startAtIndex)
    }

    getDocumentsByProps = async (collectionName, props, limit, startAtIndex, orderBy, includeInactive) => {
        const tableName = this.resolveTableName(collectionName)
        let items = await this.scanCollection(tableName, includeInactive)
        items = this.filterByProps(items, props)
        items = this.sortItems(items, orderBy)
        return this.paginateItems(items, limit, startAtIndex)
    }

    queryDocumentsByProp = async (collectionName, propName, queryText, limit, startAtIndex, orderBy, includeInactive) => {
        const tableName = this.resolveTableName(collectionName)
        const prefix = queryText.toLowerCase()
        let items = await this.scanCollection(tableName, includeInactive)
        items = items.filter((item) => {
            const value = item[propName]
            return typeof value === 'string' && value.toLowerCase().startsWith(prefix)
        })
        items = this.sortItems(items, orderBy || propName)
        return this.paginateItems(items, limit, startAtIndex)
    }

    getDocumentsWhereInProp = async (collectionName, propName, values, limit, startAtIndex, orderBy, includeInactive) => {
        const tableName = this.resolveTableName(collectionName)
        const valueSet = new Set(values)
        let items = await this.scanCollection(tableName, includeInactive)
        items = items.filter((item) => valueSet.has(item[propName]))
        items = this.sortItems(items, orderBy)
        return this.paginateItems(items, limit, startAtIndex)
    }

    getAllDocuments = async (collectionName, limit, orderBy, startAtIndex) => {
        const tableName = this.resolveTableName(collectionName)
        let items = await this.scanCollection(tableName, true)
        items = this.sortItems(items, orderBy)
        return this.paginateItems(items, limit, startAtIndex)
    }

    getActiveDocuments = async (collectionName, limit, startAtIndex, orderBy) => {
        const tableName = this.resolveTableName(collectionName)
        let items = await this.scanCollection(tableName, false)
        items = this.sortItems(items, orderBy)
        return this.paginateItems(items, limit, startAtIndex)
    }

    getRecentDocuments = async (collectionName, limit, startAtIndex) => {
        const tableName = this.resolveTableName(collectionName)
        let items = await this.scanCollection(tableName, false)
        items.sort((a, b) => (b.created || 0) - (a.created || 0))
        return this.paginateItems(items, limit, startAtIndex)
    }

    getMyDocuments = async (collectionName, userId, limit, startAtIndex, orderBy) => {
        const tableName = this.resolveTableName(collectionName)
        let items = await this.scanCollection(tableName, false)
        items = items.filter((item) => item.createdBy === userId)
        items = this.sortItems(items, orderBy)
        return this.paginateItems(items, limit, startAtIndex)
    }

    getUserDocuments = async (collectionName, userId, limit, startAtIndex, orderBy) => {
        const tableName = this.resolveTableName(collectionName)
        let items = await this.scanCollection(tableName, true)
        items = items.filter((item) => item.createdBy === userId)
        items = this.sortItems(items, orderBy)
        return this.paginateItems(items, limit, startAtIndex)
    }

    updateDocument = async (collectionName, documentId, data, userId, noMetaData) => {
        const tableName = this.resolveTableName(collectionName)
        const existing = await this.getDocumentById(collectionName, documentId, true)
        if (!existing)
            throw new NotFoundError(`${collectionName}:${documentId} not found`)

        const updatedData = { ...existing, ...data, id: documentId }
        if (!noMetaData && userId) {
            updatedData.modified = this.getCurrentTimestamp()
            updatedData.modifiedBy = userId
        }
        await this.docClient.send(new PutCommand({
            TableName: tableName,
            Item: updatedData,
        }))
        return { ...updatedData }
    }

    archiveDocument = async (collectionName, documentId, userId, noMetaData) => {
        return this.updateDocument(collectionName, documentId, { isActive: false }, userId, noMetaData)
    }

    dearchiveDocument = async (collectionName, documentId, userId, noMetaData) => {
        return this.updateDocument(collectionName, documentId, { isActive: true }, userId, noMetaData)
    }

    deleteDocument = async (collectionName, documentId) => {
        const tableName = this.resolveTableName(collectionName)
        const existing = await this.getDocumentById(collectionName, documentId, true)
        if (!existing)
            throw new NotFoundError(`${collectionName}:${documentId} not found`)
        await this.docClient.send(new DeleteCommand({
            TableName: tableName,
            Key: { id: documentId },
        }))
        return { id: documentId }
    }
}

module.exports = DynamoDBService
