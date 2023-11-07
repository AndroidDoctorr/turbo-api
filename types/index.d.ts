import { Application, Router } from "express"
import { DataService } from "./dataService"
import { LoggingService } from "./loggingService"
import { AnyValue, ValidationFunctions } from "./validation"

declare module 'turbo-api' {
    export function buildApp(): Promise<Application>

    export type CRUDOptions = {
        isPublicGet?: boolean
        isPublicPost?: boolean
        noMetaData?: boolean
        allowUserDelete?: boolean
    }

    export type ControllerBase<T, TInput, TUser, TRules> = {
        new(
            collectionName: string,
            validationRules: TRules,
            propNames: string[]
        ): {
            basicCRUD(options?: CRUDOptions): void
            fullCRUD(options?: CRUDOptions): void
            getRouter(): Router
            createDocument(
                data: TInput,
                user: TUser,
                isPublic: boolean,
                noMetaData: boolean
            ): Promise<T>
            getDocumentById(
                documentId: string,
                user: TUser,
                isPublic: boolean
            ): Promise<T>
            getActiveDocuments(
                user: TUser,
                isPublic: boolean
            ): Promise<T[]>
            getAllDocuments(
                user: TUser
            ): Promise<T[]>
            getDocumentsByProp(
                prop: string,
                value: AnyValue | AnyValue[],
                user: TUser,
                isPublic: boolean
            ): Promise<T[]>
            getDocumentsByProps(
                props: Record<string, AnyValue>,
                user: TUser,
                isPublic: boolean
            ): Promise<T[]>
            getMyDocuments(
                user: TUser
            ): Promise<T[]>
            getUserDocuments(
                user: TUser,
                ownerId: string
            ): Promise<T[]>
        }
    }

    export type HttpHelpers = {
        handleRoute: (req: Request, res: Response, action: (req: Request) => Promise<any>) => Promise<void>
        handleErrors: (res: Response, error: Error) => Response
    }

    export type StringHelpers = {
        objectToString: (obj: any) => string
        getDiffString: (oldData: any, newData: any) => string
    }

    export type ServiceFactory = {
        getDataService: () => DataService
        getLoggingService: () => LoggingService
    }

    export type Validation = ValidationFunctions
}