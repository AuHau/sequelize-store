import { ParseError } from './errors'

export interface StoreOptions {
  tableName?: string
}

export type Type = 'int' | 'float' | 'bool' | 'string' | 'json'
export type NativeTypes = number | boolean | string | object

export interface ValueOptions {
  type: Type
  default?: NativeTypes
}

export type Schema = Record<string, ValueOptions | Type>

/// /////////////////////////////////////////////////////////////////////////////////////
// Helpers function

export function isType (t: any): t is Type {
  if (typeof t !== 'string' && !(t instanceof String)) {
    return false
  }

  // @ts-ignore
  return ['int', 'float', 'bool', 'string', 'json'].includes(t)
}

export function getType (t: any): Type {
  if (isType(t)) {
    return t
  }

  return t.type
}

export function parseType (data: string, type: Type): NativeTypes {
  switch (type) {
    case 'bool':
      return data === 'true'
    case 'int':
      return parseInt(data)
    case 'float':
      return parseFloat(data)
    case 'json':
      return JSON.parse(data)
    case 'string':
      return data
    default:
      throw new ParseError(`Unknown type ${type}`)
  }
}

export function validateType (data: any, type: Type): boolean {
  switch (type) {
    case 'bool':
      return typeof data === 'boolean'
    case 'int':
      return typeof data === 'number'
    case 'float':
      return typeof data === 'number'
    case 'json':
      return typeof data === 'object'
    case 'string':
      return typeof data === 'string'
    default:
      throw new ParseError(`Unknown type ${type}`)
  }
}

export function isValueOptions (obj: any): obj is ValueOptions {
  if (typeof obj !== 'object' || !('type' in obj)) {
    return false
  }

  return isType(obj.type)
}
