
/**
 * Error for problems related to defined schema
 */
export class SchemaError extends Error {
  static code = 'SCHEMA_ERR'

  constructor (message: string) {
    super(message)
    this.name = 'SchemaError'
  }
}

/**
 * Error for problems related to entries
 */
export class EntryError extends Error {
  static code = 'ENTRY_ERR'

  constructor (message: string) {
    super(message)
    this.name = 'EntryError'
  }
}

/**
 * Error for problems related to parsing entries
 */
export class ParseError extends Error {
  static code = 'PARSE_ERR'

  constructor (message: string) {
    super(message)
    this.name = 'ParseError'
  }
}
