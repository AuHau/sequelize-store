# Sequelize Store

[![CircleCI](https://flat.badgen.net/circleci/github/auhau/sequelize-store/master)](https://app.circleci.com/pipelines/github/AuHau/sequelize-store)
[![Dependency Status](https://david-dm.org/auhau/sequelize-store.svg?style=flat-square)](https://david-dm.org/auhau/sequelize-store)
[![standard-readme compliant](https://img.shields.io/badge/standard--readme-OK-brightgreen.svg?style=flat-square)](https://github.com/RichardLitt/standard-readme)
[![js-standard-style](https://img.shields.io/badge/code%20style-standard-brightgreen.svg?style=flat-square)](https://github.com/feross/standard)
[![Managed by tAsEgir](https://img.shields.io/badge/%20managed%20by-tasegir-brightgreen?style=flat-square)](https://github.com/auhau/tasegir)
![](https://img.shields.io/badge/npm-%3E%3D6.0.0-orange.svg?style=flat-square)
![](https://img.shields.io/badge/Node.js-%3E%3D10.0.0-orange.svg?style=flat-square)

> Key Value store backed by Sequelize

## Table of Contents

- [Install](#install)
- [Usage](#usage)
- [API](#api)
- [Contribute](#contribute)
- [License](#license)

## Install

> $ npm install sequelize-store

This package requires `Sequelize` as peer-dependency, but that should
be already satisfied because most probably you will use this package in projects where it is already present.
In case not just run:

> $ npm install sequelize

## Usage

 There are four steps you have to do:
  1. Define schema and initialize SequelizeStore
  1. Retrieve the store's object
  1. Set / retrieve values as you like
  1. **Profit**

```js
import {init, getObject} from 'sequelize-store'

const sequelize = sequelizeFactory()

// Define schema and init
await init(sequelize, {
  adminId: 'int', // Lets say this was already set previously and hence is pesisted in DB
  secretToken: { type: 'string', default: 'notSoRandomSecret' },
  someCoolObject: 'json',
  scope1_id: 'int',
  scope1_name: 'string'
})

const store = getObject()
console.log(store.secretToken) // --> 'notSoRandomSecret'
console.log(store.adminId) // --> undefined

store.adminId = 5
console.log(store.adminId) // --> 5

delete store.adminId
console.log(store.adminId) // --> undefined
console.log(store.adminId) // --> 5

// Scopes
store.scope1_id = 10
const scopedStore = getObject('scope1_')
console.log(scopedStore.id) // --> 10
console.log(scopedStore.name) // --> undefined
```

### Schema

Schema is an object that defines the structure of the Store. Supported types are:
`bool`, `int`, `float`, `json`, `string`.

The Schema has two following formats

```
{
 'key-name': <<type string>>,
 otherKeyName: {
   type: <<type string>>,
   default: 'some default'
 }
}
```

## API

#### `init(sequelize: Sequelize, schema: Schema, options?: StoreOptions) -> Promise<void>`

> Initialize SequelizeStore for usage

Parameters:
 - `sequelize: Sequelize` (required) - Instance of Sequelize
 - `schema: Schema` (required) - Object defining the [Schema](#schema) of the store
 - `options` - Store's options
    - `options.tableName: string` - string defining name of the table where the data should be stored

#### `getObject(scope?: string) -> object`

> Returns the Store objects which is a singleton, so you can call it anywhere (after initialization!)

Parameters:
 - `scope?: string` - The returned object will be scoped to given scoped. That means that all keys will prefixed with the string.

#### `purge() -> Promise<void>`

> Delete all data in database and the local cache

## Contribute

There are some ways you can make this module better:

- Consult our [open issues](https://github.com/auhau/sequelize-store/issues) and take on one of them
- Help our tests reach 100% coverage!

## License

[MIT](./LICENSE)
