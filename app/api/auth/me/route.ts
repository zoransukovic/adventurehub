import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
export async function GET() {
  const s = await getSession();
  if (!s) return NextResponse.json({ user: null });
  const user = await prisma.user.findUnique({ where: { id: s.userId },
    select: { id:true, email:true, fullName:true, role:true, country:true, language:true, avatarUrl:true, guideStatus:true, guideCertified:true } });
  return NextResponse.json({ user });
}
