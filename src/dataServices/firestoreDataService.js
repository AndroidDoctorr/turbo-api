const admin = require('firebase-admin')
const { NotFoundError } = require('../validation')

class FirebaseService {
    constructor() {
        this.db = admin.firestore()
        this.defaultLimit = 50
    }

    getCurrentDate() {
        return admin.firestore.Timestamp.now()
    }

    createDocument = async (collectionName, data, userId, noMetaData) => {
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
        const docRef = await this.db.collection(collectionName).add(newData)
        return { id: docRef.id, ...newData }
    }
    getDocumentById = async (collectionName, documentId, includeInactive) => {
        const docRef = this.db.collection(collectionName).doc(documentId)
        const docSnapshot = await docRef.get()
        if (!docSnapshot.exists) return null
        const data = docSnapshot.data()
        if (!data.isActive && !includeInactive) return null
        return { id: documentId, ...data }
    }
    getDocumentsByProp = async (collectionName, propName, propValue, includeInactive, limit, orderBy) => {
        const queryLimit = isNaN(limit) ? this.defaultLimit : limit
        const docRef = this.db.collection(collectionName)
            .where(propName, '==', propValue)
        if (!includeInactive)
            docRef.where('isActive', '==', true)
        docRef.limit(queryLimit)
        docRef.orderBy(!!orderBy ? orderBy : propName)
        const docSnapshot = await docRef.get()
        return docSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
    }
    getDocumentsByProps = async (collectionName, props, includeInactive, limit, orderBy) => {
        const queryLimit = isNaN(limit) ? this.defaultLimit : limit
        const docRef = this.db.collection(collectionName)
        for (const prop in props)
            docRef = docRef.where(prop, '==', props[prop])
        if (!includeInactive)
            docRef.where('isActive', '==', true)
        docRef.limit(queryLimit)
        if (orderBy)
            docRef.orderBy(orderBy)
        const docSnapshot = await docRef.get()
        return docSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
    }
    queryDocumentsByProp = async (collectionName, propName, queryText, limit, orderBy) => {
        const queryLimit = isNaN(limit) ? this.defaultLimit : limit
        const docRef = this.db.collection(collectionName)
        const query = docRef
            .where(propName, '>=', queryText.toLowerCase())
            .where(propName, '<=', queryText.toLowerCase() + '\uf8ff')
            .orderBy(!!orderBy ? orderBy : propName)
            .limit(queryLimit)
        const snapshot = await query.get()
        const docs = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
        return docs
    }
    getDocumentsWhereInProp = async (collectionName, propName, values, limit, orderBy) => {
        const queryLimit = isNaN(limit) ? this.defaultLimit : limit
        const docRef = this.db.collection(collectionName)
        const query = docRef
            .where(propName, 'in', values)
            .orderBy(!!orderBy ? orderBy : propName)
            .limit(queryLimit)
        const snapshot = await query.get()
        const docs = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
        return docs
    }
    getAllDocuments = async (collectionName, limit, orderBy) => {
        const queryLimit = isNaN(limit) ? this.defaultLimit : limit
        const docRef = this.db.collection(collectionName)
        docRef.limit(queryLimit)
        if (orderBy) docRef.orderBy(orderBy)
        const docSnapshot = await docRef.get()
        return docSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
    }
    getActiveDocuments = async (collectionName, limit, orderBy) => {
        const queryLimit = isNaN(limit) ? this.defaultLimit : limit
        const docRef = this.db.collection(collectionName)
            .where('isActive', '==', true)
        docRef.limit(queryLimit)
        if (orderBy) docRef.orderBy(orderBy)
        const docSnapshot = await docRef.get()
        return docSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
    }
    getRecentDocuments = async (collectionName, limit) => {
        const queryLimit = isNaN(limit) ? this.defaultLimit : limit
        const docRef = this.db.collection(collectionName)
            .orderBy('created', 'desc')
            .limit(queryLimit)
        const docSnapshot = await docRef.get()
        return docSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
    }
    getMyDocuments = async (collectionName, userId, limit, orderBy) => {
        const queryLimit = isNaN(limit) ? this.defaultLimit : limit
        const docRef = this.db.collection(collectionName)
            .where('isActive', '==', true)
            .where('createdBy', '==', userId)
        docRef.limit(queryLimit)
        if (orderBy) docRef.orderBy(orderBy)
        const docSnapshot = await docRef.get()
        return docSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
    }
    getUserDocuments = async (collectionName, userId, limit, orderBy) => {
        const queryLimit = isNaN(limit) ? this.defaultLimit : limit
        const docRef = this.db.collection(collectionName)
            .where('createdBy', '==', userId)
        docRef.limit(queryLimit)
        if (orderBy) docRef.orderBy(orderBy)
        const docSnapshot = await docRef.get()
        return docSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
    }
    updateDocument = async (collectionName, documentId, data, userId, noMetaData) => {
        const docRef = this.db.collection(collectionName).doc(documentId)
        const docSnapshot = await docRef.get()
        if (!docSnapshot.exists)
            throw new NotFoundError(`${collectionName}:${documentId} not found`)

        const updatedData = {
            ...docSnapshot.data(),
            ...data,
        }
        if (!noMetaData && !!userId) {
            updatedData.modified = this.getCurrentDate()
            updatedData.modifiedBy = userId
        }

        await docRef.update(updatedData)
        return { id: documentId, ...updatedData }
    }
    archiveDocument = async (collectionName, documentId, userId, noMetaData) => {
        const docRef = this.db.collection(collectionName).doc(documentId)
        const docSnapshot = await docRef.get()
        if (!docSnapshot.exists)
            throw new NotFoundError(`${collectionName}:${documentId} not found`)

        const updatedData = {
            ...docSnapshot.data(),
            isActive: false,
        }
        if (!noMetaData && !!userId) {
            updatedData.modified = this.getCurrentDate()
            updatedData.modifiedBy = userId
        }

        await docRef.update(updatedData)
        return { id: documentId, ...updatedData }
    }
    dearchiveDocument = async (collectionName, documentId, userId, noMetaData) => {
        const docRef = this.db.collection(collectionName).doc(documentId)
        const docSnapshot = await docRef.get()
        if (!docSnapshot.exists)
            throw new NotFoundError(`${collectionName}:${documentId} not found`)
        const updatedData = {
            ...docSnapshot.data(),
            isActive: true,
        }
        if (!noMetaData && !!userId) {
            updatedData.modified = this.getCurrentDate()
            updatedData.modifiedBy = userId
        }
        await docRef.update(updatedData)
        return { id: documentId, ...updatedData }
    }
    deleteDocument = async (collectionName, documentId) => {
        const docRef = this.db.collection(collectionName).doc(documentId)
        const docSnapshot = await docRef.get()
        if (!docSnapshot.exists)
            throw new NotFoundError(`${collectionName}:${documentId} not found`)
        await docRef.delete()
        return { id: documentId }
    }
}

module.exports = FirebaseService