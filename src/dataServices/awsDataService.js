/*
const { DynamoDB } = require('aws-sdk')
const { NotFoundError } = require('../validation')

module.exports = class DynamoDBService {
    constructor(config) {
        this.config = config
        this.dynamodb = new DynamoDB(this.config)
    }

    async createDocument(tableName, data, userId) {
        const item = this.mapDataToItem(data)
        item.created = { N: Date.now().toString() }
        item.createdBy = { S: userId }
        item.modified = { N: Date.now().toString() }
        item.modifiedBy = { S: userId }
        const params = {
            TableName: tableName,
            Item: item,
        }
        await this.dynamodb.putItem(params).promise()
        return { id: data.id, ...data }
    }

    async getDocumentById(tableName, documentId) {
        const params = {
            TableName: tableName,
            Key: { id: { S: documentId } },
        }
        const response = await this.dynamodb.getItem(params).promise()
        const item = response.Item

        if (!item)
            throw new NotFoundError(`${tableName}:${documentId} not found`)

        return item
    }

    async getDocumentsByProp(tableName, propName, propValue, includeInactive) {
        const params = {
            TableName: tableName,
            ExpressionAttributeNames: { '#propName': propName },
            ExpressionAttributeValues: { ':propValue': propValue },
            FilterExpression: '#propName = :propValue',
        }

        if (!includeInactive) {
            params.ExpressionAttributeNames['#isActive'] = 'isActive'
            params.ExpressionAttributeValues[':isActive'] = true
            params.FilterExpression += ' AND #isActive = :isActive'
        }

        const data = await this.dynamodb.scan(params).promise()
        return data.Items.map(item => this.mapItemToData(item))
    }

    async getDocumentsByProps(tableName, props, includeInactive) {
        // Initialize the FilterExpression and ExpressionAttributeValues
        const filterExpressionParts = []
        const expressionAttributeValues = {}
        // Iterate through the props object and construct the filter conditions
        for (const prop in props) {
            const attributeName = `#${prop}`
            const attributeValue = `:${prop}`
            filterExpressionParts.push(`${attributeName} = ${attributeValue}`)
            expressionAttributeValues[attributeValue] = props[prop]
        }
        // Add the isActive condition if necessary
        if (!includeInactive) {
            filterExpressionParts.push('#isActive = :isActive')
            expressionAttributeValues[':isActive'] = true
        }
        // Join the filter conditions with 'AND' to form the FilterExpression
        const filterExpression = filterExpressionParts.join(' AND ')
        // Construct the query parameters
        const params = {
            TableName: tableName,
            FilterExpression: filterExpression,
            ExpressionAttributeNames: {},
            ExpressionAttributeValues: expressionAttributeValues,
        }
        // Populate ExpressionAttributeNames with attribute names
        for (const prop in props)
            params.ExpressionAttributeNames[`#${prop}`] = prop
        // Add the 'isActive' attribute name if necessary
        if (!includeInactive)
            params.ExpressionAttributeNames['#isActive'] = 'isActive'

        const data = await this.dynamodb.scan(params).promise()
        return data.Items.map(item => this.mapItemToData(item))
    }

    async getAllDocuments(tableName) {
        const params = {
            TableName: tableName,
        }

        const data = await this.dynamodb.scan(params).promise()
        return data.Items.map(item => this.mapItemToData(item))
    }

    async getActiveDocuments(tableName) {
        const params = {
            TableName: tableName,
            ExpressionAttributeNames: {
                '#isActive': 'isActive',
            },
            ExpressionAttributeValues: {
                ':isActive': true,
            },
            FilterExpression: '#isActive = :isActive',
        }

        const data = await this.dynamodb.scan(params).promise()
        return data.Items.map(item => this.mapItemToData(item))
    }

    async getMyDocuments(tableName, userId) {
        const params = {
            TableName: tableName,
            ExpressionAttributeNames: {
                '#isActive': 'isActive',
                '#createdBy': 'createdBy',
            },
            ExpressionAttributeValues: {
                ':isActive': true,
                ':userId': userId,
            },
            FilterExpression: '#isActive = :isActive AND #createdBy = :userId',
        }

        const data = await this.dynamodb.scan(params).promise()
        return data.Items.map(item => this.mapItemToData(item))
    }

    async getUserDocuments(tableName, userId) {
        const params = {
            TableName: tableName,
            ExpressionAttributeNames: {
                '#createdBy': 'createdBy',
            },
            ExpressionAttributeValues: {
                ':userId': userId,
            },
            FilterExpression: '#createdBy = :userId',
        }

        const data = await this.dynamodb.scan(params).promise()
        return data.Items.map(item => this.mapItemToData(item))
    }

    async archiveDocument(tableName, documentId, userId) {
        return this.updateDocument(tableName, documentId, { isActive: false }, userId)
    }

    async dearchiveDocument(tableName, documentId, userId) {
        return this.updateDocument(tableName, documentId, { isActive: true }, userId)
    }

    async deleteDocument(tableName, documentId) {
        const params = {
            TableName: tableName,
            Key: { id: { S: documentId } },
        }

        await this.dynamodb.deleteItem(params).promise()
        return { id: documentId }
    }

    mapDataToItem(data) {
        const item = {}
        for (const [key, value] of Object.entries(data)) {
            if (this.schema[key]) {
                const attributeType = this.schema[key]
                item[key] = this.mapValueToAttributeType(value, attributeType)
            }
        }
        return item
    }

    mapValueToAttributeType(value, attributeType) {
        if (attributeType === 'S') {
            return { S: value }
        } else if (attributeType === 'N') {
            return { N: value.toString() }
        } else if (attributeType === 'BOOL') {
            return { BOOL: value }
        }
        // Other data types??
    }
}
*/