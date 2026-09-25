import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { sign, setToken } from "@/lib/auth";
const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  fullName: z.string().min(2),
  role: z.enum(["TOURIST","GUIDE"]),
  country: z.string().optional(),
});
export async function POST(req: NextRequest) {
  const b = schema.safeParse(await req.json().catch(() => ({})));
  if (!b.success) return NextResponse.json({ error: b.error.issues[0]?.message }, { status: 400 });
  const { email, password, fullName, role, country } = b.data;
  if (await prisma.user.findUnique({ where: { email } }))
    return NextResponse.json({ error: "Email već postoji" }, { status: 409 });
  const user = await prisma.user.create({
    data: { email, passwordHash: await bcrypt.hash(password, 12), fullName, role, country, guideStatus: role==="GUIDE" ? "PENDING" : null },
  });
  await setToken(sign({ userId: user.id, role: user.role, email: user.email }));
  return NextResponse.json({ user: { id: user.id, email, fullName, role, guideStatus: user.guideStatus } });
}
