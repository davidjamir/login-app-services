import { NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
  const { accessToken } = await req.json()

  if (!accessToken) {
    return NextResponse.json({ error: "Missing accessToken" }, { status: 400 })
  }

  const appId = process.env.NEXT_PUBLIC_FB_APP_ID!
  const appSecret = process.env.FB_APP_SECRET!
  const version = process.env.NEXT_PUBLIC_FB_APP_VERSION!

  const url = `https://graph.facebook.com/${version}/oauth/access_token?` +
    `grant_type=fb_exchange_token&` +
    `client_id=${appId}&` +
    `client_secret=${appSecret}&` +
    `fb_exchange_token=${accessToken}`

  const response = await fetch(url)
  const data = await response.json()

  if (!response.ok) {
    return NextResponse.json(data, { status: 400 })
  }

  return NextResponse.json(data)
}