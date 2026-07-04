const { randomUUID } = require('crypto')
const { Pool } = require('pg')
const { getConfig } = require('../file')
const { resolvePostgresConfig } = require('../postgresConfig')
const { NotFoundError } = require('../validation')

const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS turbo_api_documents (
    collection TEXT NOT NULL,
    id TEXT NOT NULL,
    document JSONB NOT NULL,
    PRIMARY KEY (collection, id)
);
CREATE INDEX IF NOT EXISTS idx_turbo_api_documents_collection
    ON turbo_api_documents (collection);
CREATE INDEX IF NOT EXISTS idx_turbo_api_documents_document_gin
    ON turbo_api_documents USING gin (document);
`

const resolveLimit = (limit, defaultLimit) => (isNaN(limit) ? defaultLimit : limit)
const resolveOffset = (startAtIndex, queryLimit) =>
    (isNaN(startAtIndex) ? 0 : startAtIndex * queryLimit)

class PostgresService {
    constructor() {
        this.defaultLimit = 50
        this.pool = null
        this.schemaReady = null
    }

    async getPool() {
        if (!this.pool) {
            const config = await getConfig()
            this.pool = new Pool(resolvePostgresConfig(config))
        }
        if (!this.schemaReady)
            this.schemaReady = this.ensureSchema()
        await this.schemaReady
        return this.pool
    }

    async ensureSchema() {
        const pool = this.pool
        await pool.query(SCHEMA_SQL)
    }

    getCurrentTimestamp() {
        return Date.now()
    }

    mapRow(row) {
        const document = row.document || {}
        return { id: row.id, ...document }
    }

    activeClause(includeInactive, paramIndex) {
        if (includeInactive) return { sql: '', params: [] }
        return {
            sql: ` AND COALESCE((document->>'isActive')::boolean, true) = true`,
            params: [],
        }
    }

    buildPropEqualsClause(prop, value, paramIndex) {
        if (value === undefined || value === null)
            return {
                sql: ` AND (document->>$${paramIndex} IS NULL OR document->>$${paramIndex} = 'null')`,
                params: [prop],
                nextIndex: paramIndex + 1,
            }
        return {
            sql: ` AND document->>$${paramIndex} = $${paramIndex + 1}`,
            params: [prop, String(value)],
            nextIndex: paramIndex + 2,
        }
    }

    async queryDocuments(collectionName, {
        whereSql = '',
        whereParams = [],
        orderBy,
        limit,
        startAtIndex,
        descending = false,
    }) {
        const pool = await this.getPool()
        const queryLimit = resolveLimit(limit, this.defaultLimit)
        const offset = resolveOffset(startAtIndex, queryLimit)
        const params = [collectionName, ...whereParams]
        let orderSql = ''
        if (orderBy)
            orderSql = ` ORDER BY document->>$${params.length + 1} ${descending ? 'DESC' : 'ASC'}`
        const limitIndex = params.length + (orderBy ? 2 : 1)
        const offsetIndex = limitIndex + 1
        if (orderBy) params.push(orderBy)
        params.push(queryLimit, offset)

        const sql = `
            SELECT id, document
            FROM turbo_api_documents
            WHERE collection = $1
            ${whereSql}
            ${orderSql}
            LIMIT $${limitIndex} OFFSET $${offsetIndex}
        `
        const result = await pool.query(sql, params)
        return result.rows.map((row) => this.mapRow(row))
    }

    createDocument = async (collectionName, data, userId, noMetaData) => {
        const pool = await this.getPool()
        const id = randomUUID()
        const now = this.getCurrentTimestamp()
        const document = { ...data, isActive: true }
        if (!noMetaData) {
            document.created = now
            document.createdBy = userId
            document.modified = now
            document.modifiedBy = userId
        }
        await pool.query(
            `INSERT INTO turbo_api_documents (collection, id, document) VALUES ($1, $2, $3::jsonb)`,
            [collectionName, id, JSON.stringify(document)],
        )
        return { id, ...document }
    }

    getDocumentById = async (collectionName, documentId, includeInactive) => {
        const pool = await this.getPool()
        const active = this.activeClause(includeInactive, 3)
        const result = await pool.query(
            `SELECT id, document FROM turbo_api_documents
             WHERE collection = $1 AND id = $2${active.sql}`,
            [collectionName, documentId],
        )
        if (result.rows.length === 0) return null
        return this.mapRow(result.rows[0])
    }

    getDocumentsByProp = async (collectionName, propName, propValue, limit, startAtIndex, orderBy, includeInactive) => {
        const active = this.activeClause(includeInactive)
        const prop = this.buildPropEqualsClause(propName, propValue, 3)
        return this.queryDocuments(collectionName, {
            whereSql: active.sql + prop.sql,
            whereParams: prop.params,
            orderBy,
            limit,
            startAtIndex,
        })
    }

    getDocumentsByProps = async (collectionName, props, limit, startAtIndex, orderBy, includeInactive) => {
        let whereSql = this.activeClause(includeInactive).sql
        const whereParams = []
        let paramIndex = 3
        for (const prop in props) {
            const clause = this.buildPropEqualsClause(prop, props[prop], paramIndex)
            whereSql += clause.sql
            whereParams.push(...clause.params)
            paramIndex = clause.nextIndex
        }
        return this.queryDocuments(collectionName, {
            whereSql,
            whereParams,
            orderBy,
            limit,
            startAtIndex,
        })
    }

    queryDocumentsByProp = async (collectionName, propName, queryText, limit, startAtIndex, orderBy, includeInactive) => {
        const pool = await this.getPool()
        const queryLimit = resolveLimit(limit, this.defaultLimit)
        const offset = resolveOffset(startAtIndex, queryLimit)
        const prefix = queryText.toLowerCase()
        const active = this.activeClause(includeInactive)
        const params = [collectionName, propName, `${prefix}%`]
        let orderSql = ` ORDER BY document->>$4 ASC`
        params.push(orderBy || propName, queryLimit, offset)
        const sql = `
            SELECT id, document FROM turbo_api_documents
            WHERE collection = $1
            ${active.sql}
            AND lower(document->>$2) LIKE $3
            ${orderSql}
            LIMIT $5 OFFSET $6
        `
        const result = await pool.query(sql, params)
        return result.rows.map((row) => this.mapRow(row))
    }

    getDocumentsWhereInProp = async (collectionName, propName, values, limit, startAtIndex, orderBy, includeInactive) => {
        const pool = await this.getPool()
        const queryLimit = resolveLimit(limit, this.defaultLimit)
        const offset = resolveOffset(startAtIndex, queryLimit)
        const active = this.activeClause(includeInactive)
        const params = [collectionName, propName, values.map(String)]
        let orderSql = ''
        if (orderBy) {
            orderSql = ` ORDER BY document->>$4 ASC`
            params.push(orderBy)
        }
        const limitIndex = params.length + 1
        const offsetIndex = limitIndex + 1
        params.push(queryLimit, offset)
        const sql = `
            SELECT id, document FROM turbo_api_documents
            WHERE collection = $1
            ${active.sql}
            AND document->>$2 = ANY($3::text[])
            ${orderSql}
            LIMIT $${limitIndex} OFFSET $${offsetIndex}
        `
        const result = await pool.query(sql, params)
        return result.rows.map((row) => this.mapRow(row))
    }

    getAllDocuments = async (collectionName, limit, orderBy, startAtIndex) => {
        return this.queryDocuments(collectionName, { orderBy, limit, startAtIndex })
    }

    getActiveDocuments = async (collectionName, limit, startAtIndex, orderBy) => {
        const active = this.activeClause(false)
        return this.queryDocuments(collectionName, {
            whereSql: active.sql,
            orderBy,
            limit,
            startAtIndex,
        })
    }

    getRecentDocuments = async (collectionName, limit, startAtIndex) => {
        const pool = await this.getPool()
        const queryLimit = resolveLimit(limit, this.defaultLimit)
        const offset = resolveOffset(startAtIndex, queryLimit)
        const active = this.activeClause(false)
        const result = await pool.query(
            `SELECT id, document FROM turbo_api_documents
             WHERE collection = $1${active.sql}
             ORDER BY COALESCE((document->>'created')::bigint, 0) DESC
             LIMIT $2 OFFSET $3`,
            [collectionName, queryLimit, offset],
        )
        return result.rows.map((row) => this.mapRow(row))
    }

    getMyDocuments = async (collectionName, userId, limit, startAtIndex, orderBy) => {
        const active = this.activeClause(false)
        const owner = this.buildPropEqualsClause('createdBy', userId, 3)
        return this.queryDocuments(collectionName, {
            whereSql: active.sql + owner.sql,
            whereParams: owner.params,
            orderBy,
            limit,
            startAtIndex,
        })
    }

    getUserDocuments = async (collectionName, userId, limit, startAtIndex, orderBy) => {
        const owner = this.buildPropEqualsClause('createdBy', userId, 3)
        return this.queryDocuments(collectionName, {
            whereSql: owner.sql,
            whereParams: owner.params,
            orderBy,
            limit,
            startAtIndex,
        })
    }

    updateDocument = async (collectionName, documentId, data, userId, noMetaData) => {
        const pool = await this.getPool()
        const existing = await this.getDocumentById(collectionName, documentId, true)
        if (!existing)
            throw new NotFoundError(`${collectionName}:${documentId} not found`)

        const { id, ...rest } = existing
        const updated = { ...rest, ...data }
        if (!noMetaData && userId) {
            updated.modified = this.getCurrentTimestamp()
            updated.modifiedBy = userId
        }
        await pool.query(
            `UPDATE turbo_api_documents SET document = $3::jsonb
             WHERE collection = $1 AND id = $2`,
            [collectionName, documentId, JSON.stringify(updated)],
        )
        return { id: documentId, ...updated }
    }

    archiveDocument = async (collectionName, documentId, userId, noMetaData) => {
        return this.updateDocument(collectionName, documentId, { isActive: false }, userId, noMetaData)
    }

    dearchiveDocument = async (collectionName, documentId, userId, noMetaData) => {
        return this.updateDocument(collectionName, documentId, { isActive: true }, userId, noMetaData)
    }

    deleteDocument = async (collectionName, documentId) => {
        const pool = await this.getPool()
        const existing = await this.getDocumentById(collectionName, documentId, true)
        if (!existing)
            throw new NotFoundError(`${collectionName}:${documentId} not found`)
        await pool.query(
            `DELETE FROM turbo_api_documents WHERE collection = $1 AND id = $2`,
            [collectionName, documentId],
        )
        return { id: documentId }
    }
}

module.exports = PostgresService
