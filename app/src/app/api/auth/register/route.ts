import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword, signAccessToken, signRefreshToken } from "@/lib/auth";
import { z } from "zod";

const schema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email().max(255),
  password: z.string().min(8).max(128),
});

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { name, email, password } = parsed.data;

  // Public registration is only allowed for the first user (initial admin setup).
  // All other users must be created by an admin via /api/admin/users.
  const userCount = await prisma.user.count();
  if (userCount > 0) {
    return NextResponse.json({ error: "Registration is disabled. Contact an administrator." }, { status: 403 });
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: "Email already registered" }, { status: 409 });
  }

  const role = "ADMIN";

  const user = await prisma.user.create({
    data: {
      name,
      email,
      passwordHash: await hashPassword(password),
      role,
    },
  });

  const payload = { sub: user.id, email: user.email, role: user.role };
  const accessToken = await signAccessToken(payload);
  const refreshToken = await signRefreshToken(payload);

  const response = NextResponse.json({
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
    accessToken,
  });

  response.cookies.set("refreshToken", refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });

  return response;
}
