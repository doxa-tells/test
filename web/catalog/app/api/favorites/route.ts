// web/catalog/app/api/favorites/route.ts
import { NextResponse } from "next/server";
import { ensureTables, addFavorite, removeFavorite, listFavoriteActors, isFavorite } from "../../../lib/db";
import { currentUser } from "../../../lib/auth";

export async function GET(req: Request) {
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
}

export async function POST(req: Request) {
  await ensureTables();
  const user = await currentUser();
  if (!user) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  const { actor_user_id } = await req.json();
  if (!actor_user_id) return NextResponse.json({ ok: false, error: "bad_request" }, { status: 400 });
  await addFavorite(user.id, Number(actor_user_id));
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  await ensureTables();
  const user = await currentUser();
  if (!user) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const actor = searchParams.get("actor");
  if (!actor) return NextResponse.json({ ok: false, error: "bad_request" }, { status: 400 });
  await removeFavorite(user.id, Number(actor));
  return NextResponse.json({ ok: true });
}
