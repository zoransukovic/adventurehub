import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
const prisma = new PrismaClient();

async function main() {
  const activities = [
    { name: "Planinarenje", nameEn: "Hiking", icon: "mountain" },
    { name: "Kajak", nameEn: "Kayaking", icon: "ripple" },
    { name: "Ribolov", nameEn: "Fishing", icon: "fish" },
    { name: "Quad / ATV", nameEn: "Quad / ATV", icon: "car" },
    { name: "Ronjenje", nameEn: "Diving", icon: "scuba-mask" },
    { name: "Biciklizam", nameEn: "Cycling", icon: "bike" },
  ];
  for (const a of activities) {
    await prisma.activityType.upsert({ where: { name: a.name }, update: {}, create: a });
  }
  const adminEmail = "admin@adventurehub.me";
  if (!(await prisma.user.findUnique({ where: { email: adminEmail } }))) {
    await prisma.user.create({
      data: { email: adminEmail, passwordHash: await bcrypt.hash("PromijeniMe123!", 12), fullName: "Administrator", role: "ADMIN" },
    });
    console.log("Admin: admin@adventurehub.me / PromijeniMe123! — PROMIJENI ODMAH");
  }
  console.log("Seed gotov.");
}
main().catch(console.error).finally(() => prisma.$disconnect());
