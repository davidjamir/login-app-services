import { NextResponse } from "next/server"
import { getDb } from "@/lib/mongodb"
import { facebookService } from "@/services/facebook.service"
import { ObjectId } from "mongodb"

export const runtime = "nodejs"

const parseAppStructuredText = (raw: string) => {
  const parts = raw
    .split("-")
    .map((part) => part.trim())
    .filter(Boolean)

  const roleCode = (parts[0] ?? "").toUpperCase()
  const role =
    roleCode === "AD" ? "admin"
      : "employee"
  const businessName = parts[1] ?? ""
  const description = parts.slice(2).join(" - ")

  return { roleCode: roleCode || "EM", role, businessName, description }
}

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

    const fbUser = await facebookService.getMe(existingUser.token)
    const parsed = parseAppStructuredText(fbUser.name)

    let businessId: string | undefined
    let businessName = parsed.businessName

    try {
      const businesses = await facebookService.getBusinesses(existingUser.token)
      if (businesses.length === 1) {
        businessId = businesses[0].id
        businessName = businesses[0].name
      }
    } catch {
      // Fallback to parsed name for businessName; businessId stays unchanged
    }

    const updateFields: Record<string, unknown> = {
      name: fbUser.name,
      businessName,
      roleCode: parsed.roleCode,
      role: parsed.role,
      description: parsed.description,
      updatedAt: new Date(),
    }
    if (businessId != null) {
      updateFields.businessId = businessId
    }

    await db.collection("system_users").updateOne(
      { _id: new ObjectId(_id.trim()) },
      { $set: updateFields }
    )

    return NextResponse.json({
      success: true,
      message: "System user recrawled successfully",
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json(
      { success: false, message: "Failed to recrawl system user", error: message },
      { status: 500 }
    )
  }
}
