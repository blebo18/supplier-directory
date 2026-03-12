import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest, requireRole } from "@/lib/auth";
import { z } from "zod";

const createSchema = z.object({
  title: z.string().min(1).max(255),
  url: z.string().min(1).max(2000),
});

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

  const body = await request.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const maxOrder = await prisma.supplierLink.aggregate({
    where: { supplierId },
    _max: { sortOrder: true },
  });

  const link = await prisma.supplierLink.create({
    data: {
      supplierId,
      title: parsed.data.title,
      url: parsed.data.url,
      sortOrder: (maxOrder._max.sortOrder ?? -1) + 1,
    },
  });

  return NextResponse.json(link, { status: 201 });
}

export async function DELETE(
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

  const { linkId } = await request.json().catch(() => ({ linkId: null }));
  if (!linkId) {
    return NextResponse.json({ error: "linkId required" }, { status: 400 });
  }

  const link = await prisma.supplierLink.findFirst({
    where: { id: linkId, supplierId },
  });

  if (!link) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.supplierLink.delete({ where: { id: linkId } });

  return NextResponse.json({ success: true });
}
