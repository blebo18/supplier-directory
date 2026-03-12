import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest, requireRole } from "@/lib/auth";
import { saveFile } from "@/lib/storage";

const MAX_SIZE = 10 * 1024 * 1024; // 10MB

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUserFromRequest(request);
  if (!requireRole(user, "ADMIN", "EDITOR")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const supplierId = parseInt(id, 10);
  if (isNaN(supplierId)) {
    return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
  }

  const supplier = await prisma.supplier.findUnique({ where: { id: supplierId } });
  if (!supplier) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  const title = (formData.get("title") as string | null)?.trim() || null;

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  if (file.type !== "application/pdf") {
    return NextResponse.json({ error: "Only PDF files are allowed" }, { status: 400 });
  }

  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: "File size must be under 10MB" }, { status: 400 });
  }

  // Validate PDF magic bytes
  const buffer = Buffer.from(await file.arrayBuffer());
  if (buffer.length < 4 || buffer.toString("ascii", 0, 4) !== "%PDF") {
    return NextResponse.json({ error: "Invalid PDF file" }, { status: 400 });
  }

  const storagePath = await saveFile("documents", supplierId, file.name, buffer);

  const doc = await prisma.supplierDocument.create({
    data: {
      supplierId,
      filename: file.name,
      title,
      storagePath,
      fileSize: file.size,
    },
  });

  return NextResponse.json({
    id: doc.id,
    filename: doc.filename,
    title: doc.title,
    fileSize: doc.fileSize,
  });
}
