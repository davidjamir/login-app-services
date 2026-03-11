import { NextResponse } from "next/server"
import { getDb } from "@/lib/mongodb"
import { facebookService } from "@/services/facebook.service"
import { ObjectId } from "mongodb"

export const runtime = "nodejs"

export async function POST(req: Request) {
  try {
    const { _id, password } = await req.json() as { _id?: string; password?: string }
    const adminPassword = process.env.ADMIN_PASSWORD

    if (!adminPassword) {
      return NextResponse.json(
        { success: false, message: "Feature is not configured yet" },
        { status: 500 }
      )
    }

    if (!password || password !== adminPassword) {
      return NextResponse.json(
        { success: false, message: "Invalid admin password" },
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
    const existingUser = await db.collection("system_users").findOne(
      { _id: new ObjectId(_id.trim()) },
      { projection: { token: 1 } }
    )

    if (!existingUser?.token) {
      return NextResponse.json(
        { success: false, message: "System user token not found" },
        { status: 404 }
      )
    }

    const pages = await facebookService.getPages(existingUser.token)
    return NextResponse.json({ success: true, data: pages })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json(
      { success: false, message: "Failed to fetch pages", error: message },
      { status: 500 }
    )
  }
}
