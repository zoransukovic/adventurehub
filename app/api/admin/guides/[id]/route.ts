import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { guard } from "@/lib/guard";
import { createNotification } from "@/lib/notify";
type P = { params: Promise<{ id: string }> };
export async function PATCH(req: NextRequest, { params }: P) {
  const { error } = await guard("ADMIN"); if (error) return error;
  const { id } = await params;
  const { guideStatus, guideCertified } = await req.json().catch(() => ({}));
  const user = await prisma.user.update({ where:{id}, data:{ guideStatus, guideCertified } });
  if (guideStatus === "APPROVED") await createNotification(id, "SYSTEM", "Nalog odobren!", "Možete početi da objavljujete ture.", "/tours/new");
  if (guideStatus === "REJECTED") await createNotification(id, "SYSTEM", "Nalog odbijen", "Kontaktirajte administratora za više informacija.", "/");
  return NextResponse.json({ user });
}
