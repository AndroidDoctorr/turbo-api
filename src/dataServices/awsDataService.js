const AWS = require('aws-sdk')
const { NotFoundError } = require('../validation')

class AWSDynamoDBService {
    constructor() {
        this.dynamoDB = new AWS.DynamoDB.DocumentClient()
        this.defaultLimit = 50
    }

    getCurrentDate() {
        return new Date().toISOString()
    }

    createDocument = async (tableName, data, userId, noMetaData) => {
        const currentDate = this.getCurrentDate()
        const newData = {
            ...data,
        }
        if (!noMetaData) {
            newData.created = currentDate
            newData.createdBy = userId
            newData.modified = currentDate
            newData.modifiedBy = userId
        }
        newData.isActive = true

        const params = {
            TableName: tableName,
            Item: newData,
        }

        await this.dynamoDB.put(params).promise()
        return { id: newData.id, ...newData }
    }

    getDocumentById = async (tableName, documentId, includeInactive) => {
        const params = {
            TableName: tableName,
            Key: {
                id: documentId,
            },
        }

        try {
            const result = await this.dynamoDB.get(params).promise()

            if (!result.Item) {
                return null
            }

            const data = result.Item

            if (!data.isActive && !includeInactive) {
                return null
            }

            return { id: documentId, ...data }
        } catch (error) {
            console.error('Error getting document by ID:', error)
            throw error
        }
    }

    getDocumentsByProp = async (tableName, propName, propValue, includeInactive, limit, orderBy) => {
        const queryLimit = isNaN(limit) ? this.defaultLimit : limit

        const params = {
            TableName: tableName,
            IndexName: propName + '-index',
            KeyConditionExpression: `${propName} = :value`,
            ExpressionAttributeValues: {
                ':value': propValue,
            },
            Limit: queryLimit,
            ScanIndexForward: orderBy !== undefined,
        }

        if (!includeInactive) {
            params.FilterExpression = 'isActive = :isActive'
            params.ExpressionAttributeValues[':isActive'] = true
        }

        if (orderBy) {
            params.ScanIndexForward = true
        }

        try {
            const result = await this.dynamoDB.query(params).promise()

            return result.Items.map((item) => ({ id: item.id, ...item }))
        } catch (error) {
            console.error('Error getting documents by property:', error)
            throw error
        }
    }

    getDocumentsByProps = async (tableName, props, includeInactive, limit, orderBy) => {
        const queryLimit = isNaN(limit) ? this.defaultLimit : limit

        const params = {
            TableName: tableName,
            Limit: queryLimit,
            ScanIndexForward: orderBy !== undefined, // Set to false for descending order
        }

        for (const prop in props) {
            params.FilterExpression = params.FilterExpression
                ? `${params.FilterExpression} AND ${prop} = :${prop}`
                : `${prop} = :${prop}`

            params.ExpressionAttributeValues = {
                ...params.ExpressionAttributeValues,
                [`:${prop}`]: props[prop],
            }
        }

        if (!includeInactive) {
            params.FilterExpression = params.FilterExpression
                ? `${params.FilterExpression} AND isActive = :isActive`
                : 'isActive = :isActive'

            params.ExpressionAttributeValues[':isActive'] = true
        }

        if (orderBy) {
            params.ScanIndexForward = true // Set to true for ascending order
        }

        try {
            const result = await this.dynamoDB.scan(params).promise()

            return result.Items.map((item) => ({ id: item.id, ...item }))
        } catch (error) {
            console.error('Error getting documents by properties:', error)
            throw error
        }
    }

    queryDocumentsByProp = async (tableName, propName, queryText, limit, orderBy) => {
        const queryLimit = isNaN(limit) ? this.defaultLimit : limit

        const params = {
            TableName: tableName,
            KeyConditionExpression: `${propName} BETWEEN :start AND :end`,
            ExpressionAttributeValues: {
                ':start': queryText.toLowerCase(),
                ':end': queryText.toLowerCase() + '\uf8ff',
            },
            Limit: queryLimit,
            ScanIndexForward: orderBy !== undefined, // Set to false for descending order
        }

        if (orderBy) {
            params.ScanIndexForward = true // Set to true for ascending order
        }

        try {
            const result = await this.dynamoDB.query(params).promise()

            return result.Items.map((item) => ({ id: item.id, ...item }))
        } catch (error) {
            console.error('Error querying documents by property:', error)
            throw error
        }
    }

    getDocumentsWhereInProp = async (tableName, propName, values, limit, orderBy) => {
        const queryLimit = isNaN(limit) ? this.defaultLimit : limit

        const params = {
            TableName: tableName,
            ScanIndexForward: orderBy !== undefined, // Set to false for descending order
            Limit: queryLimit,
        }

        const placeholders = values.map((value, index) => `:value${index}`)
        const expression = placeholders.join(', ')

        params.FilterExpression = `${propName} IN (${expression})`

        values.forEach((value, index) => {
            params.ExpressionAttributeValues[`:value${index}`] = value
        })

        if (orderBy) {
            params.ScanIndexForward = true // Set to true for ascending order
        }

        try {
            const result = await this.dynamoDB.scan(params).promise()

            return result.Items.map((item) => ({ id: item.id, ...item }))
        } catch (error) {
            console.error('Error getting documents where property is in values:', error)
            throw error
        }
    }

    getAllDocuments = async (tableName, limit, orderBy) => {
        const queryLimit = isNaN(limit) ? this.defaultLimit : limit

        const params = {
            TableName: tableName,
            ScanIndexForward: orderBy !== undefined, // Set to false for descending order
            Limit: queryLimit,
        }

        if (orderBy) {
            params.ScanIndexForward = true // Set to true for ascending order
        }

        try {
            const result = await this.dynamoDB.scan(params).promise()

            return result.Items.map((item) => ({ id: item.id, ...item }))
        } catch (error) {
            console.error('Error getting all documents:', error)
            throw error
        }
    }

    getActiveDocuments = async (tableName, limit, orderBy) => {
        const queryLimit = isNaN(limit) ? this.defaultLimit : limit

        const params = {
            TableName: tableName,
            IndexName: 'isActive-index',
            KeyConditionExpression: 'isActive = :isActive',
            ExpressionAttributeValues: {
                ':isActive': true,
            },
            ScanIndexForward: orderBy !== undefined,
            Limit: queryLimit,
        }

        if (orderBy) {
            params.ScanIndexForward = true
        }

        try {
            const result = await this.dynamoDB.query(params).promise()

            return result.Items.map((item) => ({ id: item.id, ...item }))
        } catch (error) {
            console.error('Error getting active documents:', error)
            throw error
        }
    }

    getRecentDocuments = async (tableName, limit) => {
        const queryLimit = isNaN(limit) ? this.defaultLimit : limit

        const params = {
            TableName: tableName,
            ScanIndexForward: false, // Sort in descending order by 'created'
            Limit: queryLimit,
            IndexName: 'created-index', // Assuming an index named 'created-index' on the 'created' attribute
        }

        try {
            const result = await this.dynamoDB.scan(params).promise()

            return result.Items.map((item) => ({ id: item.id, ...item }))
        } catch (error) {
            console.error('Error getting recent documents:', error)
            throw error
        }
    }

    getMyDocuments = async (tableName, userId, limit, orderBy) => {
        const queryLimit = isNaN(limit) ? this.defaultLimit : limit

        const params = {
            TableName: tableName,
            IndexName: 'isActive-createdBy-index', // Assuming an index named 'isActive-createdBy-index'
            KeyConditionExpression: 'createdBy = :userId',
            ExpressionAttributeValues: {
                ':userId': userId,
            },
            ScanIndexForward: orderBy !== undefined, // Set to false for descending order
            Limit: queryLimit,
        }

        if (!orderBy) {
            params.ScanIndexForward = true // Set to true for ascending order
        }

        try {
            const result = await this.dynamoDB.query(params).promise()

            return result.Items.map((item) => ({ id: item.id, ...item }))
        } catch (error) {
            console.error('Error getting documents created by user:', error)
            throw error
        }
    }

    getUserDocuments = async (tableName, userId, limit, orderBy) => {
        const queryLimit = isNaN(limit) ? this.defaultLimit : limit

        const params = {
            TableName: tableName,
            IndexName: 'createdBy-index', // Assuming an index named 'createdBy-index'
            KeyConditionExpression: 'createdBy = :userId',
            ExpressionAttributeValues: {
                ':userId': userId,
            },
            ScanIndexForward: orderBy !== undefined, // Set to false for descending order
            Limit: queryLimit,
        }

        if (!orderBy) {
            params.ScanIndexForward = true // Set to true for ascending order
        }

        try {
            const result = await this.dynamoDB.query(params).promise()

            return result.Items.map((item) => ({ id: item.id, ...item }))
        } catch (error) {
            console.error('Error getting documents by user:', error)
            throw error
        }
    }

    updateDocument = async (tableName, documentId, data, userId, noMetaData) => {
        const params = {
            TableName: tableName,
            Key: {
                id: documentId,
            },
            ReturnValues: 'ALL_NEW', // Return the updated item
        }

        try {
            const result = await this.dynamoDB.update(params).promise()

            if (!result.Attributes) {
                throw new NotFoundError(`${tableName}:${documentId} not found`)
            }

            const updatedData = {
                ...result.Attributes,
                ...data,
            }

            if (!noMetaData && userId) {
                updatedData.modified = this.getCurrentDate()
                updatedData.modifiedBy = userId
            }

            return { id: documentId, ...updatedData }
        } catch (error) {
            console.error('Error updating document:', error)
            throw error
        }
    }

    archiveDocument = async (tableName, documentId, userId, noMetaData) => {
        const params = {
            TableName: tableName,
            Key: {
                id: documentId,
            },
            ReturnValues: 'ALL_NEW', // Return the updated item
        }

        try {
            const result = await this.dynamoDB.update(params).promise()

            if (!result.Attributes) {
                throw new NotFoundError(`${tableName}:${documentId} not found`)
            }

            const updatedData = {
                ...result.Attributes,
                isActive: false,
            }

            if (!noMetaData && userId) {
                updatedData.modified = this.getCurrentDate()
                updatedData.modifiedBy = userId
            }

            return { id: documentId, ...updatedData }
        } catch (error) {
            console.error('Error archiving document:', error)
            throw error
        }
    }

    dearchiveDocument = async (tableName, documentId, userId, noMetaData) => {
        const params = {
            TableName: tableName,
            Key: {
                id: documentId,
            },
            ReturnValues: 'ALL_NEW', // Return the updated item
        }

        try {
            const result = await this.dynamoDB.update(params).promise()

            if (!result.Attributes) {
                throw new NotFoundError(`${tableName}:${documentId} not found`)
            }

            const updatedData = {
                ...result.Attributes,
                isActive: true,
            }

            if (!noMetaData && userId) {
                updatedData.modified = this.getCurrentDate()
                updatedData.modifiedBy = userId
            }

            return { id: documentId, ...updatedData }
        } catch (error) {
            console.error('Error dearchiving document:', error)
            throw error
        }
    }

    deleteDocument = async (tableName, documentId) => {
        const params = {
            TableName: tableName,
            Key: { id: documentId },
        }

        const result = await this.dynamoDB.delete(params).promise()
        if (!result.Attributes) {
            throw new NotFoundError(`${tableName}:${documentId} not found`)
        }

        return { id: documentId }
    }
}

module.exports = AWSDynamoDBService
