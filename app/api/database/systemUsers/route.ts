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
            _id: 1,
            id: 1,
            name: 1,
            appName: 1,
            token: 1,
            createdAt: 1,
            updatedAt: 1,
          },
        }
      )
      .sort({ updatedAt: -1 })
      .toArray()

    const normalizedUsers = users.map((user) => ({
      ...user,
      _id: String(user._id),
    }))

    return NextResponse.json({ success: true, data: normalizedUsers })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json(
      { success: false, message: "Failed to fetch system users", error: message },
      { status: 500 }
    )
  }
}
