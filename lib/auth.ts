import { NextRequest } from "next/server"

export function isAuthorized(req: NextRequest) {
  const token = req.headers.get("authorization")

  return token === `Bearer ${process.env.INTERNAL_API_KEY}`
}