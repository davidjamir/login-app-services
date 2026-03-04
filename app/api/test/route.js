import { NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";

export async function GET() {
  const db = await getDb();

  const pages = await db.collection("pages").find({}).limit(5).toArray();

  return NextResponse.json({
    ok: true,
    pages,
  });
}
