import { NextResponse } from "next/server"
import { getDb } from "@/lib/mongodb"

export const runtime = "nodejs"

export async function GET() {
  try {
    const db = await getDb()
    const users = await db
      .collection("system_users")
      .find(
        {},
        {
          projection: {
            _id: 0,
            id: 1,
            name: 1,
            token: 1,
            createdAt: 1,
            updatedAt: 1,
          },
        }
      )
      .sort({ updatedAt: -1 })
      .toArray()

    return NextResponse.json({ success: true, data: users })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json(
      { success: false, message: "Failed to fetch system users", error: message },
      { status: 500 }
    )
  }
}
