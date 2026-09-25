import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { guard } from "@/lib/guard";
type P = { params: Promise<{ id: string }> };
export async function PATCH(req: NextRequest, { params }: P) {
  const { error } = await guard("ADMIN"); if (error) return error;
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const activity = await prisma.activityType.update({ where: { id }, data: { name: body.name, nameEn: body.nameEn, icon: body.icon, active: body.active } });
  return NextResponse.json({ activity });
}
export async function DELETE(_: NextRequest, { params }: P) {
  const { error } = await guard("ADMIN"); if (error) return error;
  const { id } = await params;
  const count = await prisma.tour.count({ where: { activityTypeId: id } });
  if (count > 0) {
    await prisma.activityType.update({ where: { id }, data: { active: false } });
    return NextResponse.json({ ok: true, message: `Deaktivirana (koristi je ${count} tura)` });
  }
  await prisma.activityType.delete({ where: { id } });
  return NextResponse.json({ ok: true, message: "Obrisana" });
}
