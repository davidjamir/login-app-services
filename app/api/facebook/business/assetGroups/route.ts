import { NextResponse } from "next/server"
import { facebookService } from "@/services/facebook.service"

export async function POST(req: Request) {
  try {
    const body = await req.json() as {
      token?: string
      businessId?: string
      action: "list" | "update" | "delete" | "assigned-users" | "assign-user" | "remove-user" | "contained-pages" | "add-page" | "remove-page"
      assetGroupId?: string
      name?: string
      userId?: string
      pageRoles?: string[]
      pageId?: string
    }

    const token = body.token?.trim()
    const businessId = body.businessId?.trim()
    const action = body.action

    if (!token) {
      return NextResponse.json(
        { success: false, message: "Token is required" },
        { status: 400 }
      )
    }

    if (!businessId && !["update", "delete", "contained-pages", "add-page", "remove-page"].includes(action)) {
      return NextResponse.json(
        { success: false, message: "Business ID is required" },
        { status: 400 }
      )
    }

    switch (action) {
      case "list": {
        const groups = await facebookService.getBusinessAssetGroups(token, businessId!)
        return NextResponse.json({ success: true, data: groups })
      }

      case "update": {
        const assetGroupId = body.assetGroupId?.trim()
        const name = body.name?.trim()
        if (!assetGroupId || !name) {
          return NextResponse.json(
            { success: false, message: "Asset Group ID and name are required" },
            { status: 400 }
          )
        }
        await facebookService.updateBusinessAssetGroup(token, assetGroupId, name)
        return NextResponse.json({ success: true, message: "Asset group updated" })
      }

      case "delete": {
        const assetGroupId = body.assetGroupId?.trim()
        if (!assetGroupId) {
          return NextResponse.json(
            { success: false, message: "Asset Group ID is required" },
            { status: 400 }
          )
        }
        await facebookService.deleteBusinessAssetGroup(token, assetGroupId)
        return NextResponse.json({ success: true, message: "Asset group deleted" })
      }

      case "assigned-users": {
        const assetGroupId = body.assetGroupId?.trim()
        if (!assetGroupId) {
          return NextResponse.json(
            { success: false, message: "Asset Group ID is required" },
            { status: 400 }
          )
        }
        const users = await facebookService.getAssetGroupAssignedUsers(
          token,
          assetGroupId,
          businessId!
        )
        return NextResponse.json({ success: true, data: users })
      }

      case "assign-user": {
        const assetGroupId = body.assetGroupId?.trim()
        const userId = body.userId?.trim()
        const pageRoles = Array.isArray(body.pageRoles)
          ? body.pageRoles
          : ["ANALYZE", "ADVERTISE"]
        if (!assetGroupId || !userId) {
          return NextResponse.json(
            { success: false, message: "Asset Group ID and User ID are required" },
            { status: 400 }
          )
        }
        await facebookService.assignUserToAssetGroup(
          token,
          assetGroupId,
          businessId!,
          userId,
          pageRoles
        )
        return NextResponse.json({ success: true, message: "User assigned to asset group" })
      }

      case "remove-user": {
        const assetGroupId = body.assetGroupId?.trim()
        const userId = body.userId?.trim()
        if (!assetGroupId || !userId) {
          return NextResponse.json(
            { success: false, message: "Asset Group ID and User ID are required" },
            { status: 400 }
          )
        }
        await facebookService.removeUserFromAssetGroup(
          token,
          assetGroupId,
          businessId!,
          userId
        )
        return NextResponse.json({ success: true, message: "User removed from asset group" })
      }

      case "contained-pages": {
        const assetGroupId = body.assetGroupId?.trim()
        if (!assetGroupId) {
          return NextResponse.json(
            { success: false, message: "Asset Group ID is required" },
            { status: 400 }
          )
        }
        const pages = await facebookService.getAssetGroupContainedPages(token, assetGroupId)
        return NextResponse.json({ success: true, data: pages })
      }

      case "add-page": {
        const assetGroupId = body.assetGroupId?.trim()
        const pageId = body.pageId?.trim()
        if (!assetGroupId || !pageId) {
          return NextResponse.json(
            { success: false, message: "Asset Group ID and Page ID are required" },
            { status: 400 }
          )
        }
        await facebookService.addPageToAssetGroup(token, assetGroupId, pageId)
        return NextResponse.json({ success: true, message: "Page added to asset group" })
      }

      case "remove-page": {
        const assetGroupId = body.assetGroupId?.trim()
        const pageId = body.pageId?.trim()
        if (!assetGroupId || !pageId) {
          return NextResponse.json(
            { success: false, message: "Asset Group ID and Page ID are required" },
            { status: 400 }
          )
        }
        await facebookService.removePageFromAssetGroup(token, assetGroupId, pageId)
        return NextResponse.json({ success: true, message: "Page removed from asset group" })
      }

      default:
        return NextResponse.json(
          { success: false, message: "Invalid action" },
          { status: 400 }
        )
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json(
      { success: false, message: "Operation failed", error: message },
      { status: 500 }
    )
  }
}
