import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { sign, setToken } from "@/lib/auth";
export async function POST(req: NextRequest) {
  const { email, password } = await req.json().catch(() => ({}));
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !(await bcrypt.compare(password, user.passwordHash)))
    return NextResponse.json({ error: "Pogrešan email ili lozinka" }, { status: 401 });
  await setToken(sign({ userId: user.id, role: user.role, email: user.email }));
  return NextResponse.json({ user: { id: user.id, email, fullName: user.fullName, role: user.role, guideStatus: user.guideStatus } });
}
