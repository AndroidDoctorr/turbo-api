const admin = require('firebase-admin')
const { NotFoundError } = require('../validation')

module.exports = class FirebaseService {
    constructor() {
        this.db = admin.firestore()
    }

    getCurrentDate() {
        return admin.firestore.Timestamp.now()
    }

    createDocument = async (collectionName, data, userId) => {
        const currentDate = getCurrentDate()
        const newData = {
            ...data,
            created: currentDate,
            createdBy: userId,
            modified: currentDate,
            modifiedBy: userId,
            isActive: true,
        }
        const docRef = await db.collection(collectionName).add(newData)
        return { id: docRef.id, ...newData }
    }
    getDocumentById = async (collectionName, documentId, includeInactive) => {
        const docRef = db.collection(collectionName).doc(documentId)
        const docSnapshot = await docRef.get()
        if (!docSnapshot.exists) return null
        const data = docSnapshot.doc.data()
        if (!data.isActive && !includeInactive) return null
        return { id: data.id, ...data }
    }
    getDocumentsByProp = async (collectionName, propName, propValue, includeInactive) => {
        const docRef = db.collection(collectionName)
            .where(propName, '==', propValue)
        if (!includeInactive)
            docRef.where('isActive', '==', true)
        const docSnapshot = await docRef.get()
        return docSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
    }
    getDocumentsByProps = async (collectionName, props, includeInactive) => {
        const docRef = db.collection(collectionName)
        for (const prop in props)
            docRef = docRef.where(prop, '==', props[prop])
        if (!includeInactive)
            docRef.where('isActive', '==', true)
        const docSnapshot = await docRef.get()
        return docSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
    }
    getAllDocuments = async (collectionName) => {
        const docRef = db.collection(collectionName)
        const docSnapshot = await docRef.get()
        return docSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
    }
    getActiveDocuments = async (collectionName) => {
        const docRef = db.collection(collectionName)
            .where('isActive', '==', true)
        const docSnapshot = await docRef.get()
        return docSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
    }
    getMyDocuments = async (collectionName, userId) => {
        const docRef = db.collection(collectionName)
            .where('isActive', '==', true)
            .where('createdBy', '==', userId)
        const docSnapshot = await docRef.get()
        return docSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
    }
    getUserDocuments = async (collectionName, userId) => {
        const docRef = db.collection(collectionName)
            .where('createdBy', '==', userId)
        const docSnapshot = await docRef.get()
        return docSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
    }
    updateDocument = async (collectionName, documentId, data, userId) => {
        const docRef = db.collection(collectionName).doc(documentId)
        const docSnapshot = await docRef.get()
        if (!docSnapshot.exists)
            throw new NotFoundError(`${collectionName}:${documentId} not found`)

        const updatedData = {
            ...docSnapshot.data(),
            ...data,
            modified: getCurrentDate(),
            modifiedBy: userId
        }

        await docRef.update(updatedData)
        return { id: documentId, ...updatedData }
    }
    archiveDocument = async (collectionName, documentId, userId) => {
        const docRef = db.collection(collectionName).doc(documentId)
        const docSnapshot = await docRef.get()
        if (!docSnapshot.exists)
            throw new NotFoundError(`${collectionName}:${documentId} not found`)

        const updatedData = {
            ...docSnapshot.data(),
            modified: getCurrentDate(),
            modifiedBy: userId,
            isActive: false,
        }

        await docRef.update(updatedData)
        return { id: documentId, ...updatedData }
    }
    dearchiveDocument = async (collectionName, documentId, userId) => {
        const docRef = db.collection(collectionName).doc(documentId)
        const docSnapshot = await docRef.get()
        if (!docSnapshot.exists)
            throw new NotFoundError(`${collectionName}:${documentId} not found`)

        const updatedData = {
            ...docSnapshot.data(),
            modified: getCurrentDate(),
            modifiedBy: userId,
            isActive: true,
        }

        await docRef.update(updatedData)
        return { id: documentId, ...updatedData }
    }
    deleteDocument = async (collectionName, documentId) => {
        const docRef = db.collection(collectionName).doc(documentId)
        const docSnapshot = await docRef.get()
        if (!docSnapshot.exists)
            throw new NotFoundError(`${collectionName}:${documentId} not found`)

        await docRef.delete()
        return { id: documentId }
    }
}