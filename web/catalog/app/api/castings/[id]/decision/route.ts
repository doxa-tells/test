// web/catalog/app/api/castings/[id]/decision/route.ts
import { NextResponse } from "next/server";
import { ensureTables, recordDecision, getCasting } from "../../../../../lib/db";
import { currentUser } from "../../../../../lib/auth";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  await ensureTables();
  const user = await currentUser();
  if (!user) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  const castingId = Number(params.id);
  const casting = await getCasting(castingId, user.id);
  if (!casting) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });

  const { actor_user_id, decision } = await req.json();
  if (!actor_user_id || (decision !== "like" && decision !== "skip"))
    return NextResponse.json({ ok: false, error: "bad_request" }, { status: 400 });

  await recordDecision(castingId, Number(actor_user_id), decision);
  return NextResponse.json({ ok: true });
}
