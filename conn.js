import { MongoClient } from "mongodb"

import dotenv from 'dotenv'
dotenv.config()

const connectionString = process.env.CONNECTION_URL || ""
//info
const client = new MongoClient(connectionString)

let conn;
try {
  conn = await client.connect()
} catch(e) {
  console.error(e)
}

const db = conn.db("IdeaDatabase")

export default db
