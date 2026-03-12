import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest, requireRole } from "@/lib/auth";
import { z } from "zod";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supplierId = parseInt(id, 10);

  if (isNaN(supplierId)) {
    return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
  }

  const supplier = await prisma.supplier.findUnique({
    where: { id: supplierId },
    include: {
      categories: { include: { category: true } },
      images: { orderBy: { sortOrder: "asc" } },
      videos: { orderBy: { createdAt: "desc" } },
      documents: { orderBy: { createdAt: "desc" } },
      links: { orderBy: { sortOrder: "asc" } },
    },
  });

  if (!supplier) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({
    id: supplier.id,
    company: supplier.company,
    website: supplier.website,
    phone: supplier.phone,
    fax: supplier.fax,
    street: supplier.street,
    city: supplier.city,
    state: supplier.state,
    zip: supplier.zip,
    employees: supplier.employees,
    squareFeet: supplier.squareFeet,
    description: supplier.description,
    archived: supplier.archived,
    featured: supplier.featured,
    categories: supplier.categories.map((sc) => sc.category.name).sort(),
    images: supplier.images.map((img) => ({
      id: img.id,
      url: img.url,
      altText: img.altText,
      sortOrder: img.sortOrder,
    })),
    videos: supplier.videos.map((v) => ({
      id: v.id,
      url: v.url,
      title: v.title,
    })),
    documents: supplier.documents.map((d) => ({
      id: d.id,
      filename: d.filename,
      title: d.title,
      fileSize: d.fileSize,
    })),
    links: supplier.links.map((l) => ({
      id: l.id,
      title: l.title,
      url: l.url,
      sortOrder: l.sortOrder,
    })),
  });
}

const updateSchema = z.object({
  company: z.string().min(1).max(255).optional(),
  website: z.string().max(500).nullable().optional(),
  phone: z.string().max(50).nullable().optional(),
  fax: z.string().max(50).nullable().optional(),
  street: z.string().max(255).nullable().optional(),
  city: z.string().max(100).nullable().optional(),
  state: z.string().max(50).nullable().optional(),
  zip: z.string().max(20).nullable().optional(),
  employees: z.number().int().positive().nullable().optional(),
  squareFeet: z.string().max(50).nullable().optional(),
  description: z.string().nullable().optional(),
  categories: z.array(z.string().min(1).max(100)).optional(),
  archived: z.boolean().optional(),
  featured: z.boolean().optional(),
});

export async function PUT(
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

  const body = await request.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const existing = await prisma.supplier.findUnique({ where: { id: supplierId } });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { categories, ...supplierData } = parsed.data;

  const updated = await prisma.supplier.update({
    where: { id: supplierId },
    data: supplierData,
  });

  // Update categories if provided
  if (categories !== undefined) {
    // Delete existing category links
    await prisma.supplierCategory.deleteMany({ where: { supplierId } });

    // Upsert categories and create links
    for (const name of categories) {
      const cat = await prisma.category.upsert({
        where: { name },
        update: {},
        create: { name },
      });
      await prisma.supplierCategory.create({
        data: { supplierId, categoryId: cat.id },
      });
    }
  }

  // Return updated supplier with categories
  const result = await prisma.supplier.findUnique({
    where: { id: supplierId },
    include: {
      categories: { include: { category: true } },
    },
  });

  return NextResponse.json({
    ...result,
    categories: result!.categories.map((sc) => sc.category.name).sort(),
  });
}
