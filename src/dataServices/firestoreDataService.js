const admin = require('firebase-admin')
const { NotFoundError } = require('../validation')

class FirebaseService {
    constructor() {
        this.db = admin.firestore()
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
            data.created = currentDate
            data.createdBy = userId
            data.modified = currentDate
            data.modifiedBy = userId
        }
        data.isActive = true
        const docRef = await this.db.collection(collectionName).add(newData)
        return { id: docRef.id, ...newData }
    }
    getDocumentById = async (collectionName, documentId, includeInactive) => {
        const docRef = this.db.collection(collectionName).doc(documentId)
        const docSnapshot = await docRef.get()
        if (!docSnapshot.exists) return null
        const data = docSnapshot.doc.data()
        if (!data.isActive && !includeInactive) return null
        return { id: data.id, ...data }
    }
    getDocumentsByProp = async (collectionName, propName, propValue, includeInactive) => {
        const docRef = this.db.collection(collectionName)
            .where(propName, '==', propValue)
        if (!includeInactive)
            docRef.where('isActive', '==', true)
        const docSnapshot = await docRef.get()
        return docSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
    }
    getDocumentsByProps = async (collectionName, props, includeInactive) => {
        const docRef = this.db.collection(collectionName)
        for (const prop in props)
            docRef = docRef.where(prop, '==', props[prop])
        if (!includeInactive)
            docRef.where('isActive', '==', true)
        const docSnapshot = await docRef.get()
        return docSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
    }
    getAllDocuments = async (collectionName) => {
        const docRef = this.db.collection(collectionName)
        const docSnapshot = await docRef.get()
        return docSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
    }
    getActiveDocuments = async (collectionName) => {
        const docRef = this.db.collection(collectionName)
            .where('isActive', '==', true)
        const docSnapshot = await docRef.get()
        return docSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
    }
    getMyDocuments = async (collectionName, userId) => {
        const docRef = this.db.collection(collectionName)
            .where('isActive', '==', true)
            .where('createdBy', '==', userId)
        const docSnapshot = await docRef.get()
        return docSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
    }
    getUserDocuments = async (collectionName, userId) => {
        const docRef = this.db.collection(collectionName)
            .where('createdBy', '==', userId)
        const docSnapshot = await docRef.get()
        return docSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
    }
    updateDocument = async (collectionName, documentId, data, userId) => {
        const docRef = this.db.collection(collectionName).doc(documentId)
        const docSnapshot = await docRef.get()
        if (!docSnapshot.exists)
            throw new NotFoundError(`${collectionName}:${documentId} not found`)

        const updatedData = {
            ...docSnapshot.data(),
            ...data,
            modified: this.getCurrentDate(),
            modifiedBy: userId
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