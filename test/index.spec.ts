import chai from 'chai'
import dirtyChai from 'dirty-chai'
import chaiAsPromised from 'chai-as-promised'

import { QueryTypes, Sequelize } from 'sequelize'
import { init, getObject, reset } from '../src'

chai.use(chaiAsPromised)
chai.use(dirtyChai)
const expect = chai.expect

function sleep<T> (ms: number, ...args: T[]): Promise<T> {
  return new Promise(resolve => setTimeout(() => resolve(...args), ms))
}

describe('SequelizeStore', function () {
  let sequelize: Sequelize

  async function getEntries (): Promise<object> {
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

  beforeEach(() => {
    sequelize = new Sequelize('sqlite://:memory:')
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
    const dbEntries = await getEntries()
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

    const dbEntries = await getEntries()
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
    const dbEntries = await getEntries()
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
})
