import { NextResponse } from "next/server"
import { facebookService } from "@/services/facebook.service"

export async function POST(req: Request) {
  try {
    const body = await req.json() as {
      token?: string
      businessId?: string
      name?: string
      role?: string
    }

    const token = body.token?.trim()
    const businessId = body.businessId?.trim()
    const name = body.name?.trim()
    const role = body.role?.toUpperCase()

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

    if (!name) {
      return NextResponse.json(
        { success: false, message: "Name is required" },
        { status: 400 }
      )
    }

    if (role !== "ADMIN" && role !== "EMPLOYEE") {
      return NextResponse.json(
        { success: false, message: "Role must be ADMIN or EMPLOYEE" },
        { status: 400 }
      )
    }

    const result = await facebookService.createBusinessSystemUser(
      token,
      businessId,
      name,
      role as "ADMIN" | "EMPLOYEE"
    )

    return NextResponse.json({
      success: true,
      data: { id: result.id },
      message: "System user created successfully",
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json(
      { success: false, message: "Failed to create system user", error: message },
      { status: 500 }
    )
  }
}
