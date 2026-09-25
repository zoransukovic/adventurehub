import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { guard } from "@/lib/guard";
export async function GET() {
  const { error } = await guard("ADMIN"); if (error) return error;
  const guides = await prisma.user.findMany({ where:{ role:"GUIDE" }, select:{ id:true, fullName:true, email:true, guideStatus:true, guideCertified:true, createdAt:true, _count:{ select:{ toursCreated:true } } }, orderBy:{ createdAt:"desc" } });
  return NextResponse.json({ guides });
}
