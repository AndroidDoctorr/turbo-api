import type { Application, NextFunction, Request, Response } from 'express'

/** Firebase-style decoded token; may include custom claims such as `admin`. */
export interface TurboApiUser {
    uid: string
    admin?: boolean
    disabled?: boolean
    [claim: string]: unknown
}

export interface ControllerCrudOptions {
    isPublicGet?: boolean
    isPublicPost?: boolean
    noMetaData?: boolean
    allowUserDelete?: boolean
    isAdminOnly?: boolean
}

export type ComparisonOperator = '==' | '!=' | '>' | '>=' | '<' | '<=' | 'oneOf'

/** Rule object shape produced by helpers like `stringRule` / `numberRule`. */
export interface FieldValidationRule {
    type?: string
    minLength?: number
    maxLength?: number
    minValue?: number
    maxValue?: number
    values?: ReadonlyArray<string | number>
    reference?: string
    required?: boolean
    unique?: boolean
    format?: RegExp
    default?: unknown
    isColor?: boolean
    condition?: true | [string, ComparisonOperator, unknown]
}

/** Rules map: field rules plus optional `uniquePropCombination: string[]`. */
export interface ValidationRules {
    uniquePropCombination?: string[]
    [field: string]: FieldValidationRule | string[] | undefined
}

export type DocumentRecord = Record<string, unknown> & { id: string }

/** Contract implemented by data services (e.g. Firestore). */
export interface TurboDataService {
    createDocument(
        collectionName: string,
        data: Record<string, unknown>,
        userId: string,
        noMetaData?: boolean,
    ): Promise<DocumentRecord>
    getDocumentById(
        collectionName: string,
        documentId: string,
        includeInactive?: boolean,
    ): Promise<DocumentRecord | null>
    getDocumentsByProp(
        collectionName: string,
        propName: string,
        propValue: unknown,
        limit?: number,
        orderBy?: string,
        includeInactive?: boolean,
    ): Promise<DocumentRecord[]>
    getDocumentsByProps(
        collectionName: string,
        props: Record<string, unknown>,
        limit?: number,
        orderBy?: string,
        includeInactive?: boolean,
    ): Promise<DocumentRecord[]>
    queryDocumentsByProp(
        collectionName: string,
        propName: string,
        queryText: string,
        limit?: number,
        orderBy?: string,
        includeInactive?: boolean,
    ): Promise<DocumentRecord[]>
    getDocumentsWhereInProp(
        collectionName: string,
        propName: string,
        values: unknown[],
        limit?: number,
        orderBy?: string,
        includeInactive?: boolean,
    ): Promise<DocumentRecord[]>
    getAllDocuments(
        collectionName: string,
        limit?: number,
        orderBy?: string,
    ): Promise<DocumentRecord[]>
    getActiveDocuments(
        collectionName: string,
        limit?: number,
        orderBy?: string,
    ): Promise<DocumentRecord[]>
    getRecentDocuments(collectionName: string, limit?: number): Promise<DocumentRecord[]>
    getMyDocuments(
        collectionName: string,
        userId: string,
        limit?: number,
        orderBy?: string,
    ): Promise<DocumentRecord[]>
    getUserDocuments(
        collectionName: string,
        userId: string,
        limit?: number,
        orderBy?: string,
    ): Promise<DocumentRecord[]>
    updateDocument(
        collectionName: string,
        documentId: string,
        data: Record<string, unknown>,
        userId: string,
        noMetaData?: boolean,
    ): Promise<DocumentRecord>
    archiveDocument(
        collectionName: string,
        documentId: string,
        userId: string,
        noMetaData?: boolean,
    ): Promise<DocumentRecord>
    dearchiveDocument(
        collectionName: string,
        documentId: string,
        userId: string,
        noMetaData?: boolean,
    ): Promise<DocumentRecord>
    deleteDocument(collectionName: string, documentId: string): Promise<{ id: string }>
}

export interface TurboLoggingService {
    log(message: string): void
    info(message: string): void
    warn(message: string): void
    error(message: string): void
}

export type AuthMiddlewareFactory = (
    dataService: TurboDataService,
) => (req: Request, res: Response, next: NextFunction) => void | Promise<void>

export type DataServiceClass = new () => TurboDataService
export type LoggingServiceClass = new () => TurboLoggingService

export class ControllerBase {
    collectionName: string
    validationRules: ValidationRules
    propNames: string[]
    router: import('express').Router
    options: ControllerCrudOptions

    constructor(collectionName: string, validationRules: ValidationRules, propNames: string[])

    configureRoutes(): void

    basicCRUD(options?: ControllerCrudOptions): void
    fullCRUD(options?: ControllerCrudOptions): void

    getRouter(): import('express').Router

    createDocument(data: Record<string, unknown>, user: TurboApiUser | undefined): Promise<DocumentRecord>
    getDocumentById(
        documentId: string,
        user: TurboApiUser | undefined,
        isPublic?: boolean,
    ): Promise<DocumentRecord | null>
    getDocumentByIdFull(
        documentId: string,
        user: TurboApiUser | undefined,
        isPublic?: boolean,
    ): Promise<DocumentRecord | null>
    getActiveDocuments(user: TurboApiUser | undefined, isPublic?: boolean): Promise<DocumentRecord[]>
    getAllDocuments(user: TurboApiUser | undefined): Promise<DocumentRecord[]>
    getDocumentsByProp(
        prop: string,
        value: unknown,
        user: TurboApiUser | undefined,
        isPublic?: boolean,
    ): Promise<DocumentRecord[]>
    getDocumentsByProps(
        props: Record<string, unknown>,
        user: TurboApiUser | undefined,
        isPublic?: boolean,
    ): Promise<DocumentRecord[]>
    queryDocumentsByProp(
        prop: string,
        value: string,
        user: TurboApiUser | undefined,
        isPublic?: boolean,
    ): Promise<DocumentRecord[]>
    getDocumentsWhereInProp(
        prop: string,
        values: unknown[],
        user: TurboApiUser | undefined,
        isPublic?: boolean,
    ): Promise<DocumentRecord[]>
    getRecentDocuments(
        count: number | undefined,
        user: TurboApiUser | undefined,
        isPublic?: boolean,
    ): Promise<DocumentRecord[]>
    getMyDocuments(user: TurboApiUser | undefined): Promise<DocumentRecord[]>
    getUserDocuments(user: TurboApiUser | undefined, ownerId: string): Promise<DocumentRecord[]>
    updateDocument(
        documentId: string,
        data: Record<string, unknown>,
        user: TurboApiUser,
    ): Promise<DocumentRecord>
    archiveDocument(documentId: string, user: TurboApiUser): Promise<{ id: string }>
    dearchiveDocument(documentId: string, user: TurboApiUser): Promise<{ id: string }>
    deleteDocument(documentId: string, user: TurboApiUser): Promise<{ id: string }>

    isUserAdmin(user: TurboApiUser | undefined): boolean
}

type ValidationErrorConstructor<T extends string = string> = new (message?: string) => Error & {
    name: T
}

export const validation: {
    stringType: string
    numberType: string
    boolType: string
    arrType: string
    stringRule: (
        minLength: number,
        maxLength: number,
        required?: boolean,
        unique?: boolean,
    ) => FieldValidationRule
    boolRule: (required?: boolean) => FieldValidationRule
    fKeyRule: (reference: string, required?: boolean, isNumber?: boolean) => FieldValidationRule
    enumRule: (
        values: ReadonlyArray<string | number>,
        required?: boolean,
        isNumber?: boolean,
    ) => FieldValidationRule
    numberRule: (minValue: number, maxValue: number, required?: boolean) => FieldValidationRule
    colorRule: (required?: boolean, unique?: boolean) => FieldValidationRule
    filterObjectByProps: <T extends Record<string, unknown>>(
        data: T,
        propNames: string[],
    ) => Partial<T>
    applyDefaults: (data: Record<string, unknown>, rules: ValidationRules) => Record<string, unknown>
    validateData: (
        data: Record<string, unknown>,
        rules: ValidationRules,
        dbService: TurboDataService | undefined,
        collectionName: string,
    ) => Promise<void>
    validateDataPartial: (
        data: Record<string, unknown>,
        rules: ValidationRules,
        dbService: TurboDataService | undefined,
        collectionName: string,
    ) => Promise<void>
    NoContentError: ValidationErrorConstructor<'NoContentError'>
    ValidationError: ValidationErrorConstructor<'ValidationError'>
    AuthError: ValidationErrorConstructor<'AuthError'>
    ForbiddenError: ValidationErrorConstructor<'ForbiddenError'>
    NotFoundError: ValidationErrorConstructor<'NotFoundError'>
    LogicError: ValidationErrorConstructor<'LogicError'>
    DependencyError: ValidationErrorConstructor<'DependencyError'>
    InternalError: ValidationErrorConstructor<'InternalError'>
    ServiceError: ValidationErrorConstructor<'ServiceError'>
}

export function buildApp(): Promise<Application>

export const stringHelpers: {
    objectToString(document: unknown, maxStringLength?: number, depth?: number): string
    getDiffString(oldData: Record<string, unknown>, newData: Record<string, unknown>): string
}

export const httpHelpers: {
    handleRoute(
        req: Request,
        res: Response,
        action: (req: Request) => Promise<unknown>,
    ): Promise<Response | void>
    handleErrors(res: Response, error: unknown): Response | void
}

export const serviceFactory: {
    registerService(
        serviceName: string,
        DataService: DataServiceClass,
        LoggingService: LoggingServiceClass,
        authMiddleware: AuthMiddlewareFactory,
    ): void
    getDataService(): Promise<TurboDataService | undefined>
    getLoggingService(): Promise<TurboLoggingService | undefined>
    getAuthService(): Promise<AuthMiddlewareFactory | undefined>
}

declare global {
    namespace Express {
        interface Request {
            /** Set by Turbo-API Firebase auth middleware when a Bearer token is verified. */
            user?: TurboApiUser
        }
    }
}
