import { NextResponse } from "next/server"
import { facebookService } from "@/services/facebook.service"

export async function POST(req: Request) {
  try {
    const body = await req.json() as {
      token?: string
      businessId?: string
      systemUserId?: string
      name?: string
    }

    const token = body.token?.trim()
    const businessId = body.businessId?.trim()
    const systemUserId = body.systemUserId?.trim()
    const name = body.name?.trim()

    if (!token) {
      return NextResponse.json(
        { success: false, message: "Token is required" },
        { status: 400 }
      )
    }

    if (!businessId) {
      return NextResponse.json(
        { success: false, message: "Business ID is required" },
        { status: 400 }
      )
    }

    if (!systemUserId) {
      return NextResponse.json(
        { success: false, message: "System User ID is required" },
        { status: 400 }
      )
    }

    if (!name) {
      return NextResponse.json(
        { success: false, message: "Name is required" },
        { status: 400 }
      )
    }

    await facebookService.updateBusinessSystemUser(
      token,
      businessId,
      systemUserId,
      name
    )

    return NextResponse.json({
      success: true,
      message: "System user updated successfully",
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json(
      { success: false, message: "Failed to update system user", error: message },
      { status: 500 }
    )
  }
}
