const { ObjectToString } = require("./string")

// Basic Types
const stringType = typeof ''
const numberType = typeof 1
const boolType = typeof true
const arrType = typeof []

const stringRule = (minLength, maxLength, required, unique) => { type: stringType, minLength, maxLength, unique, required }
const boolRule = (required) => { type: boolType, required }
const fKeyRule = (reference, required, isNumber) => { type: isNumber ? numberType : stringType, reference, required }
const enumRule = (values, required, isNumber) => { type: isNumber ? numberType : stringType, values, required }
const numberRule = (minValue, maxValue, required) => { type: numberType, minValue, maxValue, required }

// Custom Error Types
// 2##
// 204-type error
// Throw when a request is unnecessary
const NoContentError = class NoContentError extends Error {
    constructor(message) {
        super(message)
        this.name = 'NoContentError'
    }
}
// 4##
// 400-type error (bad request)
// Throw when a request is not properly formatted
const ValidationError = class ValidationError extends Error {
    constructor(message) {
        super(message)
        this.name = 'ValidationError'
    }
}
// 401-type error (not authorized)
// Throw when a user does not have permission to complete the request
const AuthError = class AuthError extends Error {
    constructor(message) {
        super(message)
        this.name = 'AuthError'
    }
}
// 403-type error (forbidden)
// Throw when a request is valid but presents a conflict
const ForbiddenError = class ForbiddenError extends Error {
    constructor(message) {
        super(message)
        this.name = 'ForbiddenError'
    }
}
// 404-type error (not found)
// Throw when a necessary resource cannot be retrieved
const NotFoundError = class NotFoundError extends Error {
    constructor(message) {
        super(message)
        this.name = 'NotFoundError'
    }
}
// 418-type error (I'm a teapot)
// Throw when a request is valid but the data is logically invalid
//    or defies the philosophy of the schema
const LogicError = class LogicError extends Error {
    constructor(message) {
        super(message)
        this.name = 'LogicError'
    }
}
// 424-type error (failed dependency call)
// Throw when a secondary call fails
const DependencyError = class DependencyError extends Error {
    constructor(message) {
        super(message)
        this.name = 'DependencyError'
    }
}
// 500-type error (internal error)
// Throw when an unknown error has occurred
const InternalError = class InternalError extends Error {
    constructor(message) {
        super(message)
        this.name = 'InternalError'
    }
}
// 503-type error (service not available)
// Throw when a third-party service is not available (e.g. ML)
const ServiceError = class ServiceError extends Error {
    constructor(message) {
        super(message)
        this.name = 'ServiceError'
    }
}
// Sanitize incoming data against allowed props
const filterObjectByProps = (data, propNames) => {
    const filteredData = {}
    for (const propName of propNames)
        if (data.hasOwnProperty(propName))
            filteredData[propName] = data[propName]
    return filteredData
}
// Apply default values to props according to the rules
const applyDefaults = (data, rules) => {
    const newData = { ...data }
    for (const rule in rules) {
        if (
            !newData.hasOwnProperty(rule) &&
            rules.hasOwnProperty(rule) &&
            rules[rule].default !== undefined &&
            newData[rule] === undefined
        )
            newData[rule] = rules[rule].default
    }
    return newData
}
// Validate a data object against its rules set, and potentially against the database
const validateData = async (data, rules, dbService, collectionName) => {
    if (!data) throw new ValidationError(`No data`)
    for (const prop in rules) {
        const rule = rules[prop]
        if (prop === 'uniquePropCombination')
            await validateUniquePropCombo(data, rule, dbService, collectionName)
        else
            await validateProp(prop, data, rule, dbService, collectionName)
    }
}
// HELPER FUNCTIONS
// Validate an individual property against its rules
const validateProp = async (prop, data, rule, dbService, collectionName) => {
    // Determine whether the property is required
    const value = data[prop]
    const valueIsNull = value === undefined || value === null
    const isRequired = validateCondition(prop, data, rule.required)
    if (isRequired && valueIsNull) throw new ValidationError(`Prop ${prop} is required but is null`)
    if (!!rule.condition)
        if (validateCondition(prop, data, rule.condition) == valueIsNull)
            throw new ValidationError(`Prop ${prop} fails conditional requirement`)
    if (valueIsNull) return
    // Basic property rules
    validateType(prop, value, rule)
    validateLength(prop, value, rule)
    validateSize(prop, value, rule)
    validateValue(prop, value, rule)
    validateFormat(prop, value, rule)
    // Rules that require checking against existing data
    await validateForeignKey(prop, value, rule, dbService)
    await validateUniqueness(prop, value, rule, dbService, collectionName)
}
// BASIC VALIDATORS
// Validate the property type, if specified
const validateType = (prop, value, rule) => {
    if (!rule.type) return
    // Check value type
    if (typeof value !== rule.type)
        throw new ValidationError(`Prop ${prop} is a(n) ${typeof value}, should be a(n) ${rule.type}`)
}
// Validate the length of string/array-like properties
const validateLength = (prop, value, rule) => {
    if (!rule.minLength && !rule.maxLength) return
    // Must be string or array (object)
    if ((typeof value !== arrType) && (typeof value !== stringType))
        throw new ValidationError(`Type mismatch: ${prop} is ${typeof value}, cannot check max/min length`)
    // Minimum Length (inlcusive)
    if (!!rule.minLength && value.length < rule.minLength)
        throw new ValidationError(`Prop ${prop} does not meet minimum length of ${rule.minLength}`)
    // Maximum Length (inlcusive)
    if (!!rule.maxLength && value.length > rule.maxLength)
        throw new ValidationError(`Prop ${prop} exceeds maximum length of ${rule.maxLength}`)
}
// Validate the value of numerical properties
const validateSize = (prop, value, rule) => {
    if (!rule.minValue && !rule.maxValue) return
    // Must be a number
    if (typeof value !== numberType)
        throw new ValidationError(`Type mismatch: ${prop} is ${typeof value}, cannot check max/min value`)
    // Minimum Value (inlcusive)
    if (!!rule.minValue && value < rule.minValue)
        throw new ValidationError(`Prop ${prop} does not meet minimum value of ${rule.minValue}`)
    // Maximum Value (inlcusive)
    if (!!rule.maxValue && value > rule.maxValue)
        throw new ValidationError(`Prop ${prop} exceeds maximum value of ${rule.maxValue}`)
}
// Validate the property against a set of allowed values, like an enum
const validateValue = (prop, value, rule) => {
    if (!rule.values) return
    // Must be a string or a number
    if ((typeof value !== numberType) && (typeof value !== stringType))
        throw new ValidationError(`Type mismatch: ${prop} is ${typeof value}, cannot use like an enum`)
    // Allowed values
    if (!rule.values.includes(value))
        throw new ValidationError(`Prop ${prop} must be one of: ${rule.values.join(', ')}`)
}
// Validate condition - Is a requirement condition met?
const validateCondition = (prop, data, condition) => {
    if (!condition) return false
    if (condition === true) return true
    // Conditional requirements must have 3 components
    if (condition.length !== 3)
        throw new InternalError(`Validation rules not formatted properly for ${prop}` +
            ` - required condition must have 3 parts`)
    const [base, comparison, target] = condition
    const props = Object.keys(data)
    // Base component must be a property reference
    if (!props.includes(base))
        throw new InternalError(`Validation rules not formatted properly for ${prop}` +
            ` - first required array item must be a property name`)
    let targetValue
    // Target value can be a property reference or a direct value
    if (props.includes(target)) targetValue = data[target]
    else targetValue = target
    const baseValue = data[base]
    return doComparison(baseValue, comparison, targetValue)
}
// Validate format via regex
const validateFormat = (prop, value, rule) => {
    if (!rule.format) return
    if (typeof value !== stringType)
        throw new ValidationError(`${prop} format cannot be validated - not a string`)
    if (!value.match(rule.format))
        throw new ValidationError(`${prop} value ${value} does not fit the required format`)
}
// Comparison helper
const doComparison = (baseValue, comparison, targetValue) => {
    // Compare base value to target value
    switch (comparison) {
        case '==': return baseValue == targetValue
        case '!=': return baseValue != targetValue
        case '>': return baseValue > targetValue
        case '>=': return baseValue >= targetValue
        case '<': return baseValue < targetValue
        case '<=': return baseValue <= targetValue
        case 'oneOf': return targetValue.includes(baseValue)
        default: throw new InternalError(`Unsupported comparison operator for ${base}: ${comparison}`)
    }
}
// DATA VALIDATORS
// Validate a foreign key reference - referenced object must exist
const validateForeignKey = async (prop, value, rule, dbService) => {
    if (!rule.reference) return
    // Need data service to check
    if (!dbService)
        throw new ServiceError('Cannot constrain foreign key - no database reference available')
    // Check for existence of referenced document
    const doc = await dbService.getDocumentById(rule.reference, value)
    if (!doc)
        throw new ValidationError(`Prop ${prop} is not a valid foreign key`)
}
// Validate the uniqueness of a property value within the collection
const validateUniqueness = async (prop, value, rule, dbService, collectionName) => {
    // Unique value
    if (!rule.unique) return
    // Need data service to check
    if (!dbService)
        throw new ServiceError('Cannot check for uniqueness - no data service available')
    // Check for existing documents with the specified property value
    const documents = await dbService.getDocumentsByProp(collectionName, prop, value)
    // Results should be empty
    if (documents.length > 0)
        throw new ValidationError(`Prop ${prop} must be unique. The ${collectionName}` +
            `collection already contains an item with a value of ${value}`)
}
// Validate the combination of specified properties as unique
const validateUniquePropCombo = async (data, props, dbService, collectionName) => {
    const propData = {}
    for (const prop of props)
        propData[prop] = data[prop]
    // Check for existing documents with identical props
    const documents = await dbService.getDocumentsByProps(collectionName, propData, false)
    if (documents.length > 0)
        throw new ForbiddenError(`Data is not unique in ${collectionName}: ${ObjectToString(propData)}`)
}

module.exports = {
    validateData,
    applyDefaults,
    filterObjectByProps,
    NoContentError,
    ValidationError,
    AuthError,
    ForbiddenError,
    NotFoundError,
    LogicError,
    DependencyError,
    InternalError,
    ServiceError,
    stringType,
    numberType,
    boolType,
    arrType,
    stringRule,
    fKeyRule,
    boolRule,
    enumRule,
    numberRule,
}