import { DataService } from "./dataService"

export type ValidationRules = {
    [prop: string]: ValidationRule
}

export type ValidationRule =
    | StringRule
    | NumberRule
    | BoolRule
    | EnumRule
    | FKeyRule
    | UniqueComboRule

export type StringRule = {
    type: "string"
    minLength: number
    maxLength: number
    required: boolean
    unique: boolean
}

export type NumberRule = {
    type: "number"
    minValue: number
    maxValue: number
    required: boolean
}

export type BoolRule = {
    type: "boolean"
    required: boolean
}

export type EnumRule = {
    type: "string" | "number"
    values: string[] | number[]
    required: boolean
}

export type FKeyRule = {
    type: "string" | "number"
    reference: string
    required: boolean
}

export type StringRuleFunction = (minLength: number, maxLength: number, required: boolean, unique: boolean) => StringRule
export type BoolRuleFunction = (required: boolean) => BoolRule
export type FKeyRuleFunction = (reference: string, required: boolean, isNumber: boolean) => FKeyRule
export type EnumRuleFunction = (values: (string | number)[], required: boolean, isNumber: boolean) => EnumRule
export type NumberRuleFunction = (minValue: number, maxValue: number, required: boolean) => NumberRule

export type UniqueComboRule = string[]

export type AnyValue = string | number | boolean

export type ValidationFunctions = {
    AuthError: typeof Error
    NotFoundError: typeof Error
    NoContentError: typeof Error
    ValidationError: typeof Error
    ForbiddenError: typeof Error
    LogicError: typeof Error
    DependencyError: typeof Error
    InternalError: typeof Error
    ServiceError: typeof Error
    applyDefaults: <T, TRules>(data: T, validationRules: TRules) => T
    validateData: <T, TRules>(
        data: T,
        rules: TRules,
        dbService: DataService,
        collectionName: string
    ) => Promise<void>
    filterObjectByProps: <T>(data: T, propNames: string[]) => T
    stringType: string
    numberType: string
    boolType: string
    arrType: string
    stringRule: StringRuleFunction
    boolRule: BoolRuleFunction
    fKeyRule: FKeyRuleFunction
    enumRule: EnumRuleFunction
    numberRule: NumberRuleFunction
}