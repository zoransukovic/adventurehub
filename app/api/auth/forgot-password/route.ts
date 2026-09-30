
import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    if (!email || typeof email !== "string") {
      return NextResponse.json(
        { error: "Unesite email adresu." },
        { status: 400 }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    // Uvijek vraćamo istu poruku kako ne bismo otkrivali
    // da li određeni email postoji u bazi.
    if (!user) {
      return NextResponse.json({
        message:
          "Ako postoji nalog sa ovom email adresom, poslaćemo link za reset lozinke.",
      });
    }

    // Brišemo eventualne prethodne reset tokene ovog korisnika.
    await prisma.passwordResetToken.deleteMany({
      where: { userId: user.id },
    });

    // Token koji će korisnik dobiti u emailu.
    const token = crypto.randomBytes(32).toString("hex");

    // U bazi čuvamo samo hash tokena.
    const tokenHash = crypto
      .createHash("sha256")
      .update(token)
      .digest("hex");

    const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

    await prisma.passwordResetToken.create({
      data: {
        tokenHash,
        userId: user.id,
        expiresAt,
      },
    });

    /*
      Sljedeći korak:
      ovdje ćemo preko Resenda poslati link:

      https://TVOJ-DOMEN/reset-password?token=TOKEN

      Sam token se NE čuva u bazi.
    */

    return NextResponse.json({
      message:
        "Ako postoji nalog sa ovom email adresom, poslaćemo link za reset lozinke.",
    });
  } catch (error) {
    console.error("Forgot password error:", error);

    return NextResponse.json(
      { error: "Došlo je do greške. Pokušajte ponovo." },
      { status: 500 }
    );
  }
}
