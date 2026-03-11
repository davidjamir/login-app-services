import { NextResponse } from "next/server"
import { getDb } from "@/lib/mongodb"
import { facebookService } from "@/services/facebook.service"

export const runtime = "nodejs"

export async function POST(req: Request) {
  try {
    const { token, appName } = await req.json() as { token?: string; appName?: string }

    if (!token?.trim()) {
      return NextResponse.json(
        { success: false, message: "Token is required" },
        { status: 400 }
      )
    }

    const cleanToken = token.trim()
    const cleanAppName = appName?.trim().toLowerCase() ?? ""
    const fbUser = await facebookService.getMe(cleanToken)

    const db = await getDb()
    const result = await db.collection("system_users").findOneAndUpdate(
      { id: fbUser.id, appName: cleanAppName },
      {
        $set: {
          id: fbUser.id,
          name: fbUser.name,
          token: cleanToken,
          appName: cleanAppName,
          updatedAt: new Date(),
        },
        $setOnInsert: {
          createdAt: new Date(),
        },
      },
      { upsert: true, returnDocument: "after" }
    )

    return NextResponse.json({
      success: true,
      data: {
        id: fbUser.id,
        name: fbUser.name,
        appName: cleanAppName,
        createdAt: result?.createdAt ?? null,
        updatedAt: result?.updatedAt ?? null,
      },
      message: "System user saved successfully",
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json(
      { success: false, message: "Failed to save system user", error: message },
      { status: 500 }
    )
  }
}
