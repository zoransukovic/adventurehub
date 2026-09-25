import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { guard } from "@/lib/guard";
import { z } from "zod";
const schema = z.object({ name: z.string().min(2), nameEn: z.string().optional(), icon: z.string().optional() });
export async function GET() {
  const activities = await prisma.activityType.findMany({ where: { active: true }, orderBy: { name: "asc" } });
  return NextResponse.json({ activities });
}
export async function POST(req: NextRequest) {
  const { error, session } = await guard("ADMIN");
  if (error) return error;
  const b = schema.safeParse(await req.json().catch(() => ({})));
  if (!b.success) return NextResponse.json({ error: b.error.issues[0]?.message }, { status: 400 });
  if (await prisma.activityType.findUnique({ where: { name: b.data.name } }))
    return NextResponse.json({ error: "Aktivnost već postoji" }, { status: 409 });
  const activity = await prisma.activityType.create({ data: { name: b.data.name, nameEn: b.data.nameEn, icon: b.data.icon ?? "mountain" } });
  return NextResponse.json({ activity }, { status: 201 });
}
