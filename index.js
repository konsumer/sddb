const AWS = require('aws-sdk')
const nanoid = require('nanoid')

class SDDB {
  constructor (options, gsiName = 'gsi1-id', optionsOther = {}) {
    // allow first param to be string for table-name
    if (typeof options === 'string') {
      optionsOther.params = { ...optionsOther.params, TableName: options }
      options = optionsOther
    }
    this.doc = (options instanceof AWS.DynamoDB.DocumentClient) ? options : new AWS.DynamoDB.DocumentClient(options)
    this.gsiName = gsiName
    this.tableName = options.params.TableName
  }

  // get records by owner or id in dynamodb
  get (query = {}, subtable, p) {
    const { owner, id } = query
    const params = {}
    if (id && owner) {
      params.Key = {
        owner,
        id: subtable ? `${subtable}|${id}` : id
      }
    } else if (id && !owner) {
      params.IndexName = this.gsiName
      params.Key = {
        id: subtable ? `${subtable}|${id}` : id
      }
    } else if (!id && owner) {
      params.Key = {
        owner
      }
    }

    return new Promise((resolve, reject) => {
      this.doc.get({ ...params, ...p }, (err, data) => {
        if (err) {
          return reject(err)
        }
        resolve(data)
      })
    })
  }

  // save record in dynamodb
  set (updates, subtable, p) {
    if (updates.id) {
      const { id, owner = 'NONE', ...atributes } = updates
      const params = { Key: { id, owner }, ReturnValues: 'ALL_OLD' }
      const UpdateExpression = []
      params.ExpressionAttributeValues = {}
      Object.keys(atributes).forEach(a => {
        params.ExpressionAttributeValues[`:${a}`] = atributes[a]
        UpdateExpression.push(`${a}=:${a}`)
      })
      params.UpdateExpression = `SET ${UpdateExpression.join(', ')}`
      return new Promise((resolve, reject) => {
        this.doc.update(params, (err, data) => {
          if (err) {
            return reject(err)
          }
          resolve({ ...data.Attributes, ...updates })
        })
      })
    } else {
      const id = nanoid()
      const params = { Item: { id, ...updates }, ReturnValues: 'NONE' }
      return new Promise((resolve, reject) => {
        this.doc.put(params, (err, data) => {
          if (err) {
            return reject(err)
          }
          resolve({ id, ...updates })
        })
      })
    }
  }

  // pre-configure for a single sub-table
  table (subtable) {
    return {
      get: (query, p) => this.get(query, subtable, p),
      set: (updates, p) => this.set(updates, subtable, p)
    }
  }

  // Setup the required key structure for a dynamodb table
  setup (p) {
    const dynamodb = new AWS.DynamoDB()
    return new Promise((resolve, reject) => {
      var params = {
        TableName: this.tableName,
        KeySchema: [
          { AttributeName: 'owner', KeyType: 'HASH' },
          { AttributeName: 'id', KeyType: 'RANGE' }
        ],
        AttributeDefinitions: [
          { AttributeName: 'owner', AttributeType: 'S' },
          { AttributeName: 'id', AttributeType: 'S' }
        ],
        ProvisionedThroughput: {
          ReadCapacityUnits: 1,
          WriteCapacityUnits: 1
        },
        GlobalSecondaryIndexes: [{
          IndexName: this.gsiName,
          KeySchema: [
            { AttributeName: 'id', KeyType: 'HASH' }
          ],
          Projection: {
            ProjectionType: 'ALL'
          },
          ProvisionedThroughput: {
            ReadCapacityUnits: 1,
            WriteCapacityUnits: 1
          }
        }],
        ...p
      }
      dynamodb.createTable(params, (err, data) => {
        if (err) {
          return reject(err)
        }
        resolve(data)
      })
    })
  }
}

module.exports = SDDB
