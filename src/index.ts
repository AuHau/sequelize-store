import { DataTypes, Model } from 'sequelize'
import queue from 'queue'

import type { Sequelize } from 'sequelize'

import {
  getType,
  isType,
  isValueOptions,
  NativeTypes,
  parseType,
  Schema,
  StoreOptions,
  validateType
} from './definitions'
import { EntryError, SchemaError } from './errors'

class StoreEntry extends Model {
  public key!: string
  public value!: string

  public parseValue (schema: Schema): any {
    if (!schema[this.key]) {
      throw new EntryError(`There is no entry in schema for key ${this.key}`)
    }

    const type = getType(schema[this.key])
    return parseType(this.value, type)
  }
}

const DbStoreDefinition = {
  key: { type: DataTypes.STRING, primaryKey: true },
  value: { type: DataTypes.STRING }

}

const STORE_MODEL_NAME = 'sequelizeStore-dbstore'

function validateSchema (schema: Schema): void {
  if (!schema) {
    throw new SchemaError('Schema has to be defined!')
  }

  if (Object.keys(schema).length === 0) {
    throw new SchemaError('Schema must not be empty!')
  }

  for (const [keyName, valueDefinition] of Object.entries(schema)) {
    if (typeof keyName !== 'string') {
      throw new SchemaError(`Key name "${keyName}" is not a string!`)
    }

    if (typeof valueDefinition === 'string' || valueDefinition instanceof String) {
      if (!isType(valueDefinition)) {
        throw new SchemaError(`Key ${keyName} is defined with unknown type ${valueDefinition}`)
      }
    } else {
      if (typeof valueDefinition !== 'object') {
        throw new SchemaError(`Key's ${keyName} definition needs to be either string or object!`)
      }

      if (!isValueOptions(valueDefinition)) {
        throw new SchemaError(`Key's ${keyName} definition is not valid!`)
      }
    }
  }
}

function actionNotAllowed (): never {
  throw new Error('Sorry this action is not supported for SequelizeStore')
}

let proxyObject: any
const dbQueue = queue({ autostart: true, concurrency: 1 })
dbQueue.on('error', (e: Error) => {
  throw new EntryError(`There was an error during updating database of SequelizeStore: ${e}`)
})

export function reset (): void {
  proxyObject = undefined
}

export function getObject (): Record<string, NativeTypes> {
  if (!proxyObject) {
    throw new Error('SequelizeStore was not initialized!')
  }

  return proxyObject
}

export async function init (sequelize: Sequelize, schema: Schema, { tableName = 'data-store' } = {} as StoreOptions): Promise<void> {
  if (proxyObject) {
    return
  }

  if (!sequelize) {
    throw new Error('We need Sequelize instance!')
  }

  if (!sequelize.isDefined(STORE_MODEL_NAME)) {
    StoreEntry.init(DbStoreDefinition, { sequelize, tableName, timestamps: false, modelName: STORE_MODEL_NAME })
    await StoreEntry.sync()
  }

  validateSchema(schema)
  const localStore: Record<string, NativeTypes> = {}

  for (const entry of await StoreEntry.findAll()) {
    localStore[entry.key] = entry.parseValue(schema)
  }

  proxyObject = new Proxy({}, {
    get (target: {}, name: PropertyKey): any {
      if (typeof name === 'symbol') {
        throw new EntryError('Symbols are not supported by SequelizeStore')
      }

      const propertyDefinitions = schema[name]

      if (!propertyDefinitions) {
        // This is needed in order for the proxyObject to be returned from async function,
        // which checks if the object is "thenable" in order to recursively resolve promises.
        // https://stackoverflow.com/questions/48318843/why-does-await-trigger-then-on-a-proxy-returned-by-an-async-function
        if (name === 'then') {
          return undefined
        }

        throw new EntryError(`Property ${name} was not defined in Store's schema!`)
      }

      if (localStore[name] !== undefined) {
        return localStore[name]
      }

      if (isValueOptions(propertyDefinitions) && propertyDefinitions.default !== undefined) {
        return propertyDefinitions.default
      }

      return undefined
    },
    set (target: {}, name: PropertyKey, value: any): boolean {
      if (typeof name === 'symbol') {
        throw new EntryError('Symbols are not supported by SequelizeStore')
      }

      const propertyDefinitions = schema[name]

      if (!propertyDefinitions) {
        throw new EntryError(`Property ${name} was not defined in Store's schema!`)
      }

      const expectedType = getType(propertyDefinitions)

      if (!validateType(value, expectedType)) {
        throw new EntryError(`Invalid type for ${name}! Expected ${expectedType} type.`)
      }

      if (typeof value === 'object' && typeof value !== 'string') {
        localStore[name] = Object.freeze(value)
        value = JSON.stringify(value)
      } else {
        localStore[name] = value
      }

      dbQueue.push(() => StoreEntry.upsert({ key: name, value: value.toString() }))
      return true
    },
    deleteProperty (target: {}, name: PropertyKey): boolean {
      if (typeof name === 'symbol') {
        throw new EntryError('Symbols are not supported by SequelizeStore')
      }

      const propertyDefinitions = schema[name]

      if (!propertyDefinitions) {
        throw new EntryError(`Property ${name} was not defined in Store's schema!`)
      }

      delete localStore[name]
      dbQueue.push(() => StoreEntry.destroy({ where: { key: name } }))

      return true
    },
    getPrototypeOf: actionNotAllowed,
    setPrototypeOf: actionNotAllowed,
    getOwnPropertyDescriptor: actionNotAllowed,
    defineProperty: actionNotAllowed,
    apply: actionNotAllowed,
    construct: actionNotAllowed
  })
}
