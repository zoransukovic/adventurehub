import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { guard } from "@/lib/guard";
export async function GET(req: NextRequest) {
  const { error, session } = await guard(); if (error) return error;
  const notifications = await prisma.notification.findMany({ where:{ userId:session!.userId }, orderBy:{ createdAt:"desc" }, take:50 });
  return NextResponse.json({ notifications });
}
export async function PATCH(req: NextRequest) {
  const { error, session } = await guard(); if (error) return error;
  const { ids } = await req.json().catch(() => ({ ids: [] }));
  if (ids?.length) {
    await prisma.notification.updateMany({ where:{ id:{ in:ids }, userId:session!.userId }, data:{ read:true } });
  } else {
    await prisma.notification.updateMany({ where:{ userId:session!.userId }, data:{ read:true } });
  }
  return NextResponse.json({ ok: true });
}
