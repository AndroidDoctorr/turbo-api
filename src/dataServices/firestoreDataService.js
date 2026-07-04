const { getFirestore, Timestamp } = require('firebase-admin/firestore')
const { NotFoundError } = require('../validation')

class FirebaseService {
    constructor() {
        this.db = getFirestore()
        this.defaultLimit = 50
    }

    getCurrentDate() {
        return Timestamp.now()
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
    getDocumentsByProp = async (collectionName, propName, propValue, limit, startAtIndex, orderBy, includeInactive) => {
        const queryLimit = isNaN(limit) ? this.defaultLimit : limit
        const startAt = isNaN(startAtIndex) ? 0 : startAtIndex * queryLimit
        let docRef = this.db.collection(collectionName)
            .where(propName, '==', propValue)
        if (!includeInactive)
            docRef = docRef.where('isActive', '==', true)
        if (orderBy) docRef = docRef.orderBy(orderBy)
        const docSnapshot = await docRef.offset(startAt).limit(queryLimit).get()
        return docSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
    }
    getDocumentsByProps = async (collectionName, props, limit, startAtIndex, orderBy, includeInactive) => {
        const queryLimit = isNaN(limit) ? this.defaultLimit : limit
        const startAt = isNaN(startAtIndex) ? 0 : startAtIndex * queryLimit
        let docRef = this.db.collection(collectionName)
        for (const prop in props) {
            if (props[prop] === undefined) {
                docRef = docRef.where(prop, '==', null)
            } else {
                docRef = docRef.where(prop, '==', props[prop])
            }
        }
        if (!includeInactive)
            docRef = docRef.where('isActive', '==', true)
        if (orderBy) docRef = docRef.orderBy(orderBy)
        const docSnapshot = await docRef.offset(startAt).limit(queryLimit).get()
        return docSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
    }
    queryDocumentsByProp = async (collectionName, propName, queryText, limit, startAtIndex, orderBy, includeInactive) => {
        const queryLimit = isNaN(limit) ? this.defaultLimit : limit
        const startAt = isNaN(startAtIndex) ? 0 : startAtIndex * queryLimit
        let docRef = this.db.collection(collectionName)
            .where(propName, '>=', queryText.toLowerCase())
            .where(propName, '<=', queryText.toLowerCase() + '\uf8ff')
        if (!includeInactive)
            docRef = docRef.where('isActive', '==', true)
        if (orderBy) docRef = docRef.orderBy(orderBy)
        const docSnapshot = await docRef.offset(startAt).limit(queryLimit).get()
        return docSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
    }
    getDocumentsWhereInProp = async (collectionName, propName, values, limit, startAtIndex, orderBy, includeInactive) => {
        const queryLimit = isNaN(limit) ? this.defaultLimit : limit
        const startAt = isNaN(startAtIndex) ? 0 : startAtIndex * queryLimit
        let docRef = this.db.collection(collectionName)
            .where(propName, 'in', values)
        if (!includeInactive)
            docRef = docRef.where('isActive', '==', true)
        if (orderBy) docRef = docRef.orderBy(orderBy)
        const docSnapshot = await docRef.offset(startAt).limit(queryLimit).get()
        return docSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
    }
    getAllDocuments = async (collectionName, limit, orderBy, startAtIndex) => {
        const queryLimit = isNaN(limit) ? this.defaultLimit : limit
        const startAt = isNaN(startAtIndex) ? 0 : startAtIndex * queryLimit
        let docRef = this.db.collection(collectionName)
        if (orderBy) docRef = docRef.orderBy(orderBy)
        const docSnapshot = await docRef.offset(startAt).limit(queryLimit).get()
        return docSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
    }
    getActiveDocuments = async (collectionName, limit, startAtIndex, orderBy) => {
        const queryLimit = isNaN(limit) ? this.defaultLimit : limit
        const startAt = isNaN(startAtIndex) ? 0 : startAtIndex * queryLimit
        let docRef = this.db.collection(collectionName)
            .where('isActive', '==', true)
        if (orderBy) docRef = docRef.orderBy(orderBy)
        const docSnapshot = await docRef.offset(startAt).limit(queryLimit).get()
        return docSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
    }
    getRecentDocuments = async (collectionName, limit, startAtIndex) => {
        const queryLimit = isNaN(limit) ? this.defaultLimit : limit
        const startAt = isNaN(startAtIndex) ? 0 : startAtIndex * queryLimit
        let docRef = this.db.collection(collectionName)
            .orderBy('created', 'desc')
        const docSnapshot = await docRef.offset(startAt).limit(queryLimit).get()
        return docSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
    }
    getMyDocuments = async (collectionName, userId, limit, startAtIndex, orderBy) => {
        const queryLimit = isNaN(limit) ? this.defaultLimit : limit
        const startAt = isNaN(startAtIndex) ? 0 : startAtIndex * queryLimit
        let docRef = this.db.collection(collectionName)
            .where('isActive', '==', true)
            .where('createdBy', '==', userId)
        if (orderBy) docRef = docRef.orderBy(orderBy)
        const docSnapshot = await docRef.offset(startAt).limit(queryLimit).get()
        return docSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
    }
    getUserDocuments = async (collectionName, userId, limit, startAtIndex, orderBy) => {
        const queryLimit = isNaN(limit) ? this.defaultLimit : limit
        const startAt = isNaN(startAtIndex) ? 0 : startAtIndex * queryLimit
        let docRef = this.db.collection(collectionName)
            .where('createdBy', '==', userId)
        if (orderBy) docRef = docRef.orderBy(orderBy)
        const docSnapshot = await docRef.offset(startAt).limit(queryLimit).get()
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
