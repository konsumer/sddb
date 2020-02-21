/* global beforeAll, afterAll, describe, it, expect */

const SDDB = require('sddb')
const AWS = require('aws-sdk')
const localDynamo = require('local-dynamo')

let ddb
let mockServer

// start a local in-memory dynamo server, and a new SDDB instance that connects to it
beforeAll(async () => {
  AWS.config.update({
    region: 'localhost',
    endpoint: 'http://localhost:4567'
  })
  ddb = new SDDB('data')
  mockServer = localDynamo.launch(null, 4567)
  await ddb.setup()
})

afterAll(() => {
  mockServer.kill()
})

let bookCreateID

describe('SDDB', () => {
  it('should have unit-tests', () => {
    expect(1 + 1).toBe(2)
  })

  it('should be able to create a fresh record', async () => {
    const Book = ddb.table('Book')
    const { id, ...book } = await Book.set({ owner: 'konsumer', title: 'Neuromancer', author: 'William Gibson' })
    expect(book).toMatchSnapshot()
    bookCreateID = id
  })

  it('should be able to update a record', async () => {
    const Book = ddb.table('Book')
    const { id, ...book } = await Book.set({ id: bookCreateID, owner: 'konsumer', favorite: true })
    expect(book).toMatchSnapshot()
    expect(id).toBe(bookCreateID)
  })

  it('should be able to get a single record', async () => {
    const Book = ddb.table('Book')
    const { id } = await Book.set({ owner: 'konsumer', title: 'The Eye', author: 'Vladimir Nabokov' })
    const getBook = await Book.get({ id, owner: 'konsumer' })
    ddb.doc.scan(null, (err, r) => {
      console.error(err)
      console.log(r)
    })
  })

  it.skip('should be able to get all objects by owner', async () => {
    const Book = ddb.table('Book')
    const Furniture = ddb.table('Furniture')

    // make some books
    await Book.set({ owner: 'konsumer', title: 'Dune', author: 'Frank Herbert' })
    await Book.set({ owner: 'konsumer', title: 'Caves of Steel', author: 'Isaac Asimov' })

    // make some furniture
    await Furniture.set({ owner: 'konsumer', name: 'Bingsta', store: 'Ikea', type: 'chair' })
    await Furniture.set({ owner: 'konsumer', name: 'Pello', store: 'Ikea', type: 'chair' })

    const stuff = await ddb.get({ owner: 'konsumer' })
    console.log(stuff)
  })
})
