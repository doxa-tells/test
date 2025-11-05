// web/catalog/app/api/public-actors/route.ts
import { NextResponse } from "next/server";
import { listActors } from "../../../lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const limit = Number(searchParams.get("limit") || 60);
  const items = await listActors({ limit });
  return NextResponse.json({ ok: true, items });
}
