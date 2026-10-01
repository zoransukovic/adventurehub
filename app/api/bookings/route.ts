import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { guard } from "@/lib/guard";
import { createNotification } from "@/lib/notify";
import { z } from "zod";

const participantSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(3, "Unesite ime i prezime učesnika"),
  age: z
    .number()
    .int()
    .min(1, "Starost mora biti najmanje 1 godina")
    .max(120, "Unesite ispravnu starost"),
});

const schema = z.object({
  tourId: z.string(),
  departureId: z.string(),
  participants: z.number().int().min(1),
  participantsInfo: z.array(participantSchema),
});

export async function GET(req: NextRequest) {
  const { error, session } = await guard();
  if (error) return error;

  const bookings = await prisma.booking.findMany({
    where: {
      userId: session!.userId,
    },
    include: {
      tour: {
        select: {
          id: true,
          title: true,
          activityType: true,
        },
      },
      departure: true,
      review: {
        select: {
          id: true,
          rating: true,
        },
      },
      participantsInfo: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return NextResponse.json({ bookings });
}

export async function POST(req: NextRequest) {
  const { error, session } = await guard();
  if (error) return error;

  const parsed = schema.safeParse(
    await req.json().catch(() => ({}))
  );

  if (!parsed.success) {
    return NextResponse.json(
      {
        error:
          parsed.error.issues[0]?.message ||
          "Podaci za rezervaciju nijesu ispravni.",
      },
      { status: 400 }
    );
  }

  const {
    tourId,
    departureId,
    participants,
    participantsInfo,
  } = parsed.data;

  // Broj unesenih osoba mora odgovarati broju rezervisanih mjesta
  if (participantsInfo.length !== participants) {
    return NextResponse.json(
      {
        error: `Morate unijeti podatke za svih ${participants} učesnika.`,
      },
      { status: 400 }
    );
  }

  const tour = await prisma.tour.findUnique({
    where: {
      id: tourId,
    },
  });

  if (!tour) {
    return NextResponse.json(
      { error: "Tura nije pronađena." },
      { status: 404 }
    );
  }

  // Vodič ne može rezervisati svoju turu
  if (tour.guideId === session!.userId) {
    return NextResponse.json(
      { error: "Ne možete rezervisati sopstvenu turu." },
      { status: 400 }
    );
  }

  const departure = await prisma.tourDeparture.findUnique({
    where: {
      id: departureId,
    },
  });

  if (!departure) {
    return NextResponse.json(
      { error: "Termin nije pronađen." },
      { status: 404 }
    );
  }

  if (departure.tourId !== tourId) {
    return NextResponse.json(
      { error: "Izabrani termin ne pripada ovoj turi." },
      { status: 400 }
    );
  }

  // Isti korisnik ne može ponovo rezervisati isti termin
  const existingBooking = await prisma.booking.findFirst({
    where: {
      userId: session!.userId,
      departureId,
      status: {
        in: ["PENDING", "CONFIRMED"],
      },
    },
  });

  if (existingBooking) {
    return NextResponse.json(
      { error: "Već imate rezervaciju za ovaj termin." },
      { status: 409 }
    );
  }

  if (departure.spotsLeft < participants) {
    return NextResponse.json(
      {
        error: `Dostupno je samo ${departure.spotsLeft} mjesta.`,
      },
      { status: 400 }
    );
  }

  /*
    Kreiramo rezervaciju i sve učesnike u jednoj transakciji.
    Ako nešto ne uspije, ništa se neće djelimično upisati.
  */
  const booking = await prisma.$transaction(async (tx) => {
    const newBooking = await tx.booking.create({
      data: {
        userId: session!.userId,
        tourId,
        departureId,
        participants,
        status: "CONFIRMED",
        totalPrice: tour.pricePerPerson * participants,

        participantsInfo: {
          create: participantsInfo.map((person) => ({
            fullName: person.fullName.trim(),
            age: person.age,
          })),
        },
      },
      include: {
        participantsInfo: true,
      },
    });

    await tx.tourDeparture.update({
      where: {
        id: departureId,
      },
      data: {
        spotsLeft: {
          decrement: participants,
        },
      },
    });

    return newBooking;
  });

  const user = await prisma.user.findUnique({
    where: {
      id: session!.userId,
    },
    select: {
      fullName: true,
    },
  });

  await createNotification(
    tour.guideId,
    "BOOKING_CONFIRMED",
    `Nova rezervacija za "${tour.title}"`,
    `${user?.fullName} - ${participants} osoba`,
    "/profile"
  );

  await createNotification(
    session!.userId,
    "BOOKING_CONFIRMED",
    "Rezervacija potvrđena!",
    tour.title,
    "/profile"
  );

  return NextResponse.json(
    { booking },
    { status: 201 }
  );
}
