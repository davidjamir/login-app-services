import { NextResponse } from "next/server"
import { getDb } from "@/lib/mongodb"

export const runtime = "nodejs"

export interface Page {
  pageId: string
  name: string
  source: string
  token: string
}

export async function POST(req: Request) {
  try {
    const payload = await req.json()

    if (!Array.isArray(payload)) {
      return NextResponse.json(
        { success: false, message: "Payload must be an array" },
        { status: 400 }
      )
    }

    const db = await getDb()
    const col = db.collection("pages")

    const operations = payload.map((item: Page) => {
      const filter = { pageId: item.pageId }

      const update = {
        $set: {
          ...item,
          updatedAt: new Date(),
        },
        $setOnInsert: {
          createdAt: new Date(),
        },
      }

      return col.findOneAndUpdate(filter, update, {
        upsert: true,
        returnDocument: "after",
      })
    })

    await Promise.all(operations)

    return NextResponse.json({
      success: true,
      message: "Pages successfully saved/updated.",
    })
  } catch (error: unknown) {
    console.error("Error while saving pages:", error)

  let message = "Unknown error"

  if (error instanceof Error) {
    message = error.message
  }

  return NextResponse.json(
    {
      success: false,
      message: "An error occurred while saving pages.",
      error: message,
    },
    { status: 500 }
  )
  }
}