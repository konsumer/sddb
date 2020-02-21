# Simple DynamoDB client

By using some conventions, we can have records that can be queried efficiently & stored in a single table, and are fairly easy to understand and shape into graphs.

The idea is every record has an owner (or "NONE") and type (or "GENERIC") and id.

All records should look like this:

| name | type | description | example, in database |
|------|------|-------------|---------|
| owner | PK | allows "get all things for this user" | `auth0\|5dbc572b7d61140efc78de3e` |
| id | SK | allows `begins_with "Thing\|"` and `== "Thing\|ID"` | `Thing\|yFOqLW2V71Sj3vXwC_DF5` |
| id | GSI1-PK | allows reverse-lookups without owner | `Thing\|yFOqLW2V71Sj3vXwC_DF5` |

## examples

```js
// use require('aws-sdk').config.update(), if you need to set the AWS config

const SDDB = require('sddb')
const ddb = new SDDB('data') // "data" is table-name

ddb.get({ owner: 'konsumer' }) // get all objects, of any sub-type, owned by konsumer
ddb.get({ id: 'A' }) // get all objects, of any sub-type, with specific id
ddb.get({ owner: 'konsumer' }, 'Thing') // get the Things owned by konsumer
ddb.get({ id: 'A' }, 'Thing') // get all Things, with id, owned by anyone
ddb.get({ id: 'A', owner: 'konsumer' }, 'Thing') // get 1 Thing by id, owned by konsumer
ddb.set({ id: 'A', owner: 'konsumer', ...otherattribs }, 'Thing') // create/edit a Thing, owned by konsumer, with specific id
ddb.set({ id: 'A', owner: 'konsumer', ...otherattribs }) // create/edit a generic object (not a Thing) with owner & id
ddb.set({ id: 'A', ...otherattribs }) // create/edit a generic object (not a Thing) with owner set to "NONE" and specifc id
ddb.set(otherattribs) // create/edit a GENERIC object (not a Thing) with owned by NONE, with no specific id

// you can also use it this way to preset a sub-type:
const Things = ddb.table('Thing')

Things.get({ owner: 'konsumer' }) // get all the Things owned by konsumer
Things.get({ id: 'A' }) // get all Things, with id, owned by anyone
Things.get({ id: 'A', owner: 'konsumer' }) // get 1 Thing by id, owned by konsumer
Things.set({ id: 'A', owner: 'konsumer', ...otherattribs }) // create/edit a Thing, owned by konsumer, with specific id
Things.set({ id: 'A', ...otherattribs }) // create/edit a Thing, owned by NONE, with specific id

// full document-client, if you need it:
ddb.doc
```

## notes

* update/create is determined by presense of `id` in `set`
* `id` is required on all records, and `id` and `owner` are the only things that can be queried on
* if there is no `owner` on creation, it's a kind of global record (like for config or whatever) and set to "NONE".
* `owner` can be a person, or the ID of another item or whatever. You can create a graph using this. Think of it as the primary collection of a thing, like an ID for a customer or a containing item.
