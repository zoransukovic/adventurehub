
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const session = await getSession();

  if (!session) {
    return NextResponse.json(
      { error: "Niste prijavljeni" },
      { status: 401 }
    );
  }

  const { currentPassword, newPassword } = await req.json();

  if (!currentPassword || !newPassword) {
    return NextResponse.json(
      { error: "Unesite trenutnu i novu lozinku" },
      { status: 400 }
    );
  }

  if (newPassword.length < 8) {
    return NextResponse.json(
      { error: "Nova lozinka mora imati najmanje 8 karaktera" },
      { status: 400 }
    );
  }

  const user = await prisma.user.findUnique({
    where: { id: session.userId }
  });

  if (!user) {
    return NextResponse.json(
      { error: "Korisnik nije pronađen" },
      { status: 404 }
    );
  }

  const valid = await bcrypt.compare(
    currentPassword,
    user.passwordHash
  );

  if (!valid) {
    return NextResponse.json(
      { error: "Trenutna lozinka nije ispravna" },
      { status: 400 }
    );
  }

  const passwordHash = await bcrypt.hash(newPassword, 12);

  await prisma.user.update({
    where: { id: session.userId },
    data: { passwordHash }
  });

  return NextResponse.json({
    message: "Lozinka je uspješno promijenjena"
  });
}
