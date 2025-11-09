// web/catalog/app/api/favorites/route.ts
import { NextResponse } from "next/server";
import { ensureTables, addFavorite, removeFavorite, listFavoriteActors, isFavorite } from "../../../lib/db";
import { currentUser } from "../../../lib/auth";

export async function GET(req: Request) {
  try {
    await ensureTables();
    const user = await currentUser();
    if (!user) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    const { searchParams } = new URL(req.url);
    const actor = searchParams.get("actor");
    if (actor) {
      const liked = await isFavorite(user.id, Number(actor));
      return NextResponse.json({ ok: true, liked });
    }
    const items = await listFavoriteActors(user.id);
    return NextResponse.json({ ok: true, items });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "server_error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await ensureTables();
    const user = await currentUser();
    if (!user) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    let body: any = {};
    try { body = await req.json(); } catch { body = {}; }
    const { actor_user_id } = body;
    if (!actor_user_id) return NextResponse.json({ ok: false, error: "bad_request" }, { status: 400 });
    await addFavorite(user.id, Number(actor_user_id));
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "server_error" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    await ensureTables();
    const user = await currentUser();
    if (!user) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    const { searchParams } = new URL(req.url);
    const actor = searchParams.get("actor");
    if (!actor) return NextResponse.json({ ok: false, error: "bad_request" }, { status: 400 });
    await removeFavorite(user.id, Number(actor));
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "server_error" }, { status: 500 });
  }
}
