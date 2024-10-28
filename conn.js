import { MongoClient } from "mongodb"

import dotenv from 'dotenv'
dotenv.config()

const connectionString = process.env.CONNECTION_URL || ""

const client = new MongoClient(connectionString)
//info
let conn;
try {
  conn = await client.connect()
} catch(e) {
  console.error(e)
}

const db = conn.db("myFirstDatabase")

export default db
