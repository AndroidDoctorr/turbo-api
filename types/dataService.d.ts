export interface DataDocument<T> {
    id: string,
    data: T,
}

export interface DataService {
    getCurrentDate(): Date
    createDocument<T>(
        collectionName: string,
        data: T,
        userId: string,
        noMetaData: boolean
    ): Promise<DataDocument>

    getDocumentById<T>(
        collectionName: string,
        documentId: string,
        includeInactive: boolean
    ): Promise<T | null>

    getDocumentsByProp<T>(
        collectionName: string,
        propName: string,
        propValue: any,
        includeInactive: boolean
    ): Promise<T[]>

    getDocumentsByProps<T>(
        collectionName: string,
        props: Record<string, any>,
        includeInactive: boolean
    ): Promise<T[]>

    getAllDocuments<T>(collectionName: string): Promise<T[]>

    getActiveDocuments<T>(collectionName: string): Promise<T[]>

    getMyDocuments<T>(collectionName: string, userId: string): Promise<T[]>

    getUserDocuments<T>(collectionName: string, userId: string): Promise<T[]>

    updateDocument<T>(
        collectionName: string,
        documentId: string,
        data: T,
        userId: string,
        noMetaData: boolean
    ): Promise<DataDocument>

    archiveDocument<T>(
        collectionName: string,
        documentId: string,
        userId: string,
        noMetaData: boolean
    ): Promise<DataDocument>

    dearchiveDocument<T>(
        collectionName: string,
        documentId: string,
        userId: string,
        noMetaData: boolean
    ): Promise<DataDocument>

    deleteDocument(collectionName: string, documentId: string): Promise<{ id: string }>
}
