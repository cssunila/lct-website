import { NextRequest, NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { existsSync } from "node:fs";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path: segments } = await params;
  const baseUploadDir = path.resolve(process.cwd(), "public", "uploads");
  const targetPath = path.resolve(baseUploadDir, ...segments);

  if (!targetPath.startsWith(baseUploadDir) || !existsSync(targetPath)) {
    return new NextResponse("File Not Found", { status: 404 });
  }

  try {
    const fileBuffer = await readFile(targetPath);
    const ext = path.extname(targetPath).toLowerCase();

    let contentType = "application/octet-stream";
    if (ext === ".png") contentType = "image/png";
    else if (ext === ".jpg" || ext === ".jpeg") contentType = "image/jpeg";
    else if (ext === ".webp") contentType = "image/webp";
    else if (ext === ".gif") contentType = "image/gif";
    else if (ext === ".svg") contentType = "image/svg+xml";

    return new NextResponse(fileBuffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return new NextResponse("Gagal membaca file", { status: 500 });
  }
}
