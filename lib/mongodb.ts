import { MongoClient } from "mongodb"
import { attachDatabasePool } from "@vercel/functions"

const client = new MongoClient(process.env.MONGODB_URI!)

attachDatabasePool(client)

let db: Awaited<ReturnType<typeof client.db>> | null = null

export async function getDb() {
  if (db) return db

  await client.connect()
  db = client.db(process.env.MONGODB_DB || "databases")

  return db
}