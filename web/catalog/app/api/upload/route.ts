// web/catalog/app/api/upload/route.ts
import { NextResponse } from "next/server";
import { ensureTables, query } from "../../../lib/db";
import { currentUser } from "../../../lib/auth";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";

export async function POST(req: Request) {
  await ensureTables();
  const user = await currentUser();
  if (!user) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });

  const form = await req.formData();
  const casting_id = Number(form.get("casting_id"));
  const file = form.get("file") as unknown as File | null;
  if (!casting_id || !file) return NextResponse.json({ ok: false, error: "bad_request" }, { status: 400 });

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const dir = join(process.cwd(), "public", "uploads", String(user.id));
  await mkdir(dir, { recursive: true });
  const filename = `${Date.now()}_${file.name}`;
  const filepath = join(dir, filename);
  await writeFile(filepath, buffer);
  const url = `/uploads/${user.id}/${filename}`;

  await query(
    `INSERT INTO casting_files(casting_id, filename, filetype, url) VALUES ($1,$2,$3,$4)`,
    [casting_id, file.name, file.type || null, url]
  );

  return NextResponse.json({ ok: true, url });
}
