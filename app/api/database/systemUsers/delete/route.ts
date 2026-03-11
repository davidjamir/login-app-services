import { NextResponse } from "next/server"
import { getDb } from "@/lib/mongodb"
import { ObjectId } from "mongodb"

export const runtime = "nodejs"

export async function POST(req: Request) {
  try {
    const { _id, password } = await req.json() as {
      _id?: string
      password?: string
    }

    const adminPassword = process.env.ADMIN_PASSWORD
    if (!adminPassword) {
      return NextResponse.json(
        { success: false, message: "Delete feature is not configured yet" },
        { status: 500 }
      )
    }

    if (!password || password !== adminPassword) {
      return NextResponse.json(
        { success: false, message: "Invalid password" },
        { status: 401 }
      )
    }

    if (!_id?.trim()) {
      return NextResponse.json(
        { success: false, message: "System user record id is required" },
        { status: 400 }
      )
    }

    const db = await getDb()
    const result = await db.collection("system_users").deleteOne({ _id: new ObjectId(_id.trim()) })

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { success: false, message: "System user not found" },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      message: "System user deleted successfully",
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json(
      { success: false, message: "Failed to delete system user", error: message },
      { status: 500 }
    )
  }
}
