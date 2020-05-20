import chai from 'chai'
import dirtyChai from 'dirty-chai'
import chaiAsPromised from 'chai-as-promised'

import { QueryTypes, Sequelize } from 'sequelize'
import { init, getObject, reset, purge } from '../src'

chai.use(chaiAsPromised)
chai.use(dirtyChai)
const expect = chai.expect

function sleep<T> (ms: number, ...args: T[]): Promise<T> {
  return new Promise(resolve => setTimeout(() => resolve(...args), ms))
}

describe('SequelizeStore', function () {
  let sequelize: Sequelize

  async function getDbEntries (): Promise<object> {
    // noinspection SqlDialectInspection,SqlNoDataSourceInspection,ES6RedundantAwait
    const results = await sequelize.query('SELECT * FROM `data-store`', {
      type: QueryTypes.SELECT
    })

    return results.reduce((previous: object, current: object) => {
      // @ts-ignore
      previous[current.key] = current.value
      return previous
    }, {})
  }

  beforeEach(async () => {
    sequelize = new Sequelize('sqlite://:memory:')
    await sequelize.sync()
    reset()
  })

  it('should create model in Sequelize', async () => {
    await init(sequelize, { key: 'string' })
    expect(sequelize.isDefined('sequelizeStore-dbstore')).to.be.true()
  })

  it('should set and get data', async () => {
    await init(sequelize, {
      string: 'string',
      bool: 'bool',
      int: 'int',
      float: 'float',
      object: 'json'
    })

    const obj = getObject()
    obj.bool = false
    obj.string = 'hey'
    obj.int = 1
    obj.float = 2.3
    obj.object = { some: 'object' }

    expect(obj.bool).to.eql(false)
    expect(obj.string).to.eql('hey')
    expect(obj.int).to.eql(1)
    expect(obj.float).to.eql(2.3)
    expect(obj.object).to.eql({ some: 'object' })

    await sleep(100)
    const dbEntries = await getDbEntries()
    expect(dbEntries).to.eql({
      bool: 'false',
      string: 'hey',
      int: '1',
      float: '2.3',
      object: '{"some":"object"}'
    })
  })

  it('should load data on init from db', async () => {
    await init(sequelize, { key: 'string' })
    sequelize.query('INSERT INTO `data-store` (`key`,`value`) VALUES (\'bool\',\'false\'), (\'string\',\'hey\'), (\'int\',\'1\'), (\'float\',\'2.3\'), (\'object\',\'{"some":"object"}\')', {
      type: QueryTypes.INSERT
    })

    reset()
    await init(sequelize, {
      string: 'string',
      bool: 'bool',
      int: 'int',
      float: 'float',
      object: 'json'
    })

    const dbEntries = await getDbEntries()
    expect(dbEntries).to.eql({
      bool: 'false',
      string: 'hey',
      int: '1',
      float: '2.3',
      object: '{"some":"object"}'
    })

    const obj = getObject()
    expect(obj.bool).to.eql(false)
    expect(obj.string).to.eql('hey')
    expect(obj.int).to.eql(1)
    expect(obj.float).to.eql(2.3)
    expect(obj.object).to.eql({ some: 'object' })
  })

  it('should delete from the object', async () => {
    await init(sequelize, {
      string: 'string',
      bool: 'bool',
      int: 'int',
      float: 'float',
      object: 'json'
    })

    const obj = getObject()
    obj.bool = false
    obj.string = 'hey'
    obj.int = 1
    obj.float = 2.3
    obj.object = { some: 'object' }

    delete obj.string

    expect(obj.int).to.eql(1)
    expect(obj.float).to.eql(2.3)
    expect(obj.object).to.eql({ some: 'object' })

    await sleep(100)
    const dbEntries = await getDbEntries()
    expect(dbEntries).to.eql({
      bool: 'false',
      int: '1',
      float: '2.3',
      object: '{"some":"object"}'
    })
  })

  it('should give defaults if set', async () => {
    await init(sequelize, {
      string: { type: 'string', default: 'ahoj' },
      bool: 'bool',
      int: 'int',
      float: 'float',
      object: 'json'
    })

    const obj = getObject()
    expect(obj.string).to.eql('ahoj')
    expect(obj.bool).to.be.undefined()
  })

  it('should list values', async () => {
    await init(sequelize, {
      string: 'string',
      bool: 'bool',
      int: 'int',
      float: 'float',
      object: 'json'
    })

    const obj = getObject()
    obj.bool = false
    obj.string = 'hey'
    obj.int = 1

    expect(Object.entries(obj)).to.eql([['bool', false], ['string', 'hey'], ['int', 1]])
  })

  describe('purge', function () {
    it('should remove data from database and local store', async () => {
      await init(sequelize, {
        string: 'string',
        bool: 'bool',
        int: 'int',
        float: 'float',
        object: 'json'
      })

      const obj = getObject()
      obj.bool = false
      obj.string = 'hey'
      obj.int = 1
      obj.float = 2.3
      obj.object = { some: 'object' }

      await sleep(100)
      expect(obj.string).to.eql('hey')
      let dbEntries = await getDbEntries()
      expect(dbEntries).to.eql({
        bool: 'false',
        string: 'hey',
        int: '1',
        float: '2.3',
        object: '{"some":"object"}'
      })

      await purge()

      await sleep(100)
      dbEntries = await getDbEntries()
      expect(dbEntries).to.eql({})
      expect(obj.string).to.be.undefined()
    })
  })

  describe('scope', function () {
    it('should scope get operation', async () => {
      await init(sequelize, {
        prefixString: 'string',
        bool: 'bool',
        prefixInt: 'int',
        float: 'float',
        object: 'json'
      })

      const obj = getObject()
      obj.bool = false
      obj.prefixString = 'hey'
      obj.prefixInt = 1
      obj.float = 2.3
      obj.object = { some: 'object' }

      const prefixedObj = getObject('prefix')
      expect(prefixedObj.String).to.eql('hey')
      expect(prefixedObj.Int).to.eql(1)
      expect(() => prefixedObj.bool).to.throw('Property prefixbool was not defined in Store\'s schema!')
    })

    it('should scope set operation', async () => {
      await init(sequelize, {
        prefixString: 'string',
        bool: 'bool',
        prefixInt: 'int',
        float: 'float',
        object: 'json'
      })

      const obj = getObject()
      obj.bool = false
      obj.prefixString = 'hey'
      obj.prefixInt = 1
      obj.float = 2.3
      obj.object = { some: 'object' }

      const prefixedObj = getObject('prefix')
      prefixedObj.String = 'hola'
      expect(prefixedObj.String).to.eql('hola')
      expect(obj.prefixString).to.eql('hola')
    })

    it('should scope delete operation', async () => {
      await init(sequelize, {
        prefixString: 'string',
        bool: 'bool',
        prefixInt: 'int',
        float: 'float',
        object: 'json'
      })

      const obj = getObject()
      obj.bool = false
      obj.prefixString = 'hey'
      obj.prefixInt = 1
      obj.float = 2.3
      obj.object = { some: 'object' }

      const prefixedObj = getObject('prefix')
      delete prefixedObj.String
      expect(prefixedObj.String).to.be.undefined()
      expect(obj.prefixString).to.be.undefined()
    })
  })
})
