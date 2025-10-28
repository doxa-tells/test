import { NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";

export const dynamic = "force-dynamic";

function guessFile(baseDir: string, userId: string, n: string) {
  // поддерживаем и нижний, и верхний регистр расширений
  const tryExt = ["jpg","jpeg","png","webp","gif","JPG","JPEG","PNG","WEBP","GIF"];
  const namePatterns = [
    (num: string, ext: string) => path.join(baseDir, userId, `photo${num}.${ext}`),
    (num: string, ext: string) => path.join(baseDir, userId, `${num}.${ext}`),
    (num: string, ext: string) => path.join(baseDir, userId, "photo", `${num}.${ext}`),
    (num: string, ext: string) => path.join(baseDir, userId, `photo_${num}.${ext}`),
  ];
  for (const ext of tryExt) {
    for (const build of namePatterns) {
      const p = build(n, ext);
      try {
        if (fs.existsSync(p)) return p;
      } catch {}
    }
  }
  return null;
}

export async function GET(
  req: Request,
  { params }: { params: { userId: string; n: string } }
) {
  // ВАЖНО: из каталога `web/catalog` до data/user_media — на ДВА уровня вверх
  const root =
    process.env.MEDIA_ROOT ||
    path.resolve(process.cwd(), "../../data/user_media");

  const file = guessFile(root, params.userId, params.n);
  if (!file) {
    console.warn(`[media] not found: ${params.userId}/photo${params.n} at ${root}`);
    const transparentPngBase64 =
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHhwJ/jl4wWwAAAABJRU5ErkJggg==";
    const buf = Buffer.from(transparentPngBase64, "base64");
    return new NextResponse(buf, {
      status: 200,
      headers: {
        "Content-Type": "image/png",
        "Content-Length": String(buf.length),
        "Cache-Control": "public, max-age=0, must-revalidate",
        "X-Placeholder": "1",
      },
    });
  }

  const stat = await fs.promises.stat(file);
  if (!stat.isFile() || stat.size === 0) {
    console.warn(`[media] empty or not a file: ${file}`);
    return new NextResponse(null, { status: 404 });
  }

  const ext = path.extname(file).slice(1).toLowerCase();
  const type =
    ext === "png"  ? "image/png"  :
    ext === "webp" ? "image/webp" :
    ext === "gif"  ? "image/gif"  : "image/jpeg";

  // Генерируем ETag из размера и mtime (миллисек)
  const etag = `"${stat.size}-${Math.floor(stat.mtimeMs)}"`;
  const ifNoneMatch = req.headers.get("if-none-match");

  if (ifNoneMatch && ifNoneMatch === etag) {
    // 304 — файлы не отдаем, только заголовки
    return new NextResponse(null, {
      status: 304,
      headers: {
        "ETag": etag,
        "Last-Modified": stat.mtime.toUTCString(),
        "Cache-Control": "public, max-age=0, must-revalidate",
        "X-Sent-File": path.basename(file),
      },
    });
  }

  const buf = await fs.promises.readFile(file);

  return new NextResponse(buf, {
    status: 200,
    headers: {
      "Content-Type": type,
      "Content-Length": String(stat.size),
      "ETag": etag,
      "Last-Modified": stat.mtime.toUTCString(),
      "Cache-Control": "public, max-age=0, must-revalidate",
      "X-Sent-File": path.basename(file),
    },
  });
}