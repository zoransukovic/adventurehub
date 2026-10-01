
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { guard } from "@/lib/guard";
import { createNotification } from "@/lib/notify";
import { z } from "zod";

const participantSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(3, "Unesite ime i prezime učesnika."),

  age: z
    .number()
    .int()
    .min(1, "Starost mora biti najmanje 1 godina.")
    .max(120, "Unesite ispravnu starost."),
});

const updateSchema = z.object({
  participants: z
    .number()
    .int()
    .min(1, "Rezervacija mora imati najmanje jednog učesnika."),

  participantsInfo: z.array(participantSchema),
});

/*
 * PATCH /api/bookings/[id]
 *
 * Izmjena postojeće rezervacije.
 */
export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { error, session } = await guard();

  if (error) return error;

  const { id } = await context.params;

  const parsed = updateSchema.safeParse(
    await req.json().catch(() => ({}))
  );

  if (!parsed.success) {
    return NextResponse.json(
      {
        error:
          parsed.error.issues[0]?.message ||
          "Podaci nijesu ispravni.",
      },
      { status: 400 }
    );
  }

  const {
    participants,
    participantsInfo,
  } = parsed.data;

  /*
   * Mora postojati tačno onoliko podataka
   * o učesnicima koliko ima rezervisanih mjesta.
   */
  if (participantsInfo.length !== participants) {
    return NextResponse.json(
      {
        error:
          `Morate unijeti podatke za svih ${participants} učesnika.`,
      },
      { status: 400 }
    );
  }

  /*
   * Pronalazimo postojeću rezervaciju.
   */
  const booking = await prisma.booking.findUnique({
    where: {
      id,
    },

    include: {
      tour: {
        select: {
          id: true,
          title: true,
          pricePerPerson: true,
          maxParticipants: true,
          guideId: true,
        },
      },

      departure: true,

      participantsInfo: true,
    },
  });

  if (!booking) {
    return NextResponse.json(
      {
        error: "Rezervacija nije pronađena.",
      },
      { status: 404 }
    );
  }

  /*
   * Samo korisnik koji je napravio rezervaciju
   * može je mijenjati.
   */
  if (booking.userId !== session!.userId) {
    return NextResponse.json(
      {
        error:
          "Nemate pravo da mijenjate ovu rezervaciju.",
      },
      { status: 403 }
    );
  }

  /*
   * Mijenjamo samo aktivne rezervacije.
   */
  if (
    booking.status !== "PENDING" &&
    booking.status !== "CONFIRMED"
  ) {
    return NextResponse.json(
      {
        error:
          "Ovu rezervaciju više nije moguće mijenjati.",
      },
      { status: 400 }
    );
  }

  /*
   * Termin ne smije biti već počeo.
   */
  if (
    booking.departure.startsAt.getTime() <=
    Date.now()
  ) {
    return NextResponse.json(
      {
        error:
          "Termin je već počeo ili je završen. Rezervaciju više nije moguće mijenjati.",
      },
      { status: 400 }
    );
  }

  /*
   * Provjera roka koji je postavio vodič.
   */
  if (booking.departure.bookingDeadline) {
    if (
      booking.departure.bookingDeadline.getTime() <=
      Date.now()
    ) {
      return NextResponse.json(
        {
          error:
            "Rok za izmjenu ove rezervacije je istekao.",
        },
        { status: 400 }
      );
    }
  }

  /*
   * Ne može se rezervisati više osoba
   * nego što tura ukupno dozvoljava.
   */
  if (
    participants >
    booking.tour.maxParticipants
  ) {
    return NextResponse.json(
      {
        error:
          `Maksimalan broj učesnika za ovu turu je ${booking.tour.maxParticipants}.`,
      },
      { status: 400 }
    );
  }

  /*
   * Računamo razliku.
   *
   * Primjer:
   * stara rezervacija = 2
   * nova rezervacija = 3
   * difference = 1
   *
   * Potrebno je još jedno slobodno mjesto.
   *
   * Ako je:
   * 3 -> 2
   * difference = -1
   *
   * Jedno mjesto vraćamo.
   */
  const difference =
    participants - booking.participants;

  /*
   * Ako dodaje osobe, provjeravamo
   * ima li dovoljno slobodnih mjesta.
   */
  if (
    difference > 0 &&
    booking.departure.spotsLeft < difference
  ) {
    return NextResponse.json(
      {
        error:
          difference === 1
            ? "Nema još jednog slobodnog mjesta za ovaj termin."
            : `Za izmjenu je potrebno još ${difference} mjesta, a dostupno je ${booking.departure.spotsLeft}.`,
      },
      { status: 400 }
    );
  }

  try {
    const updatedBooking =
      await prisma.$transaction(
        async (tx) => {
          /*
           * Ponovo čitamo rezervaciju i termin
           * unutar transakcije.
           */
          const currentBooking =
            await tx.booking.findUnique({
              where: {
                id,
              },

              include: {
                departure: true,

                tour: {
                  select: {
                    pricePerPerson: true,
                    maxParticipants: true,
                  },
                },
              },
            });

          if (!currentBooking) {
            throw new Error(
              "Rezervacija više ne postoji."
            );
          }

          /*
           * Ponovna kontrola vlasnika.
           */
          if (
            currentBooking.userId !==
            session!.userId
          ) {
            throw new Error(
              "Nemate pravo da mijenjate ovu rezervaciju."
            );
          }

          /*
           * Ponovna kontrola statusa.
           */
          if (
            currentBooking.status !== "PENDING" &&
            currentBooking.status !== "CONFIRMED"
          ) {
            throw new Error(
              "Ovu rezervaciju više nije moguće mijenjati."
            );
          }

          /*
           * Ponovna kontrola roka.
           */
          if (
            currentBooking.departure
              .bookingDeadline &&
            currentBooking.departure
              .bookingDeadline.getTime() <=
              Date.now()
          ) {
            throw new Error(
              "Rok za izmjenu ove rezervacije je istekao."
            );
          }

          if (
            currentBooking.departure.startsAt.getTime() <=
            Date.now()
          ) {
            throw new Error(
              "Termin je već počeo ili je završen."
            );
          }

          const currentDifference =
            participants -
            currentBooking.participants;

          /*
           * Ako dodajemo učesnike,
           * ponovo provjeravamo mjesta.
           */
          if (
            currentDifference > 0 &&
            currentBooking.departure
              .spotsLeft < currentDifference
          ) {
            throw new Error(
              `Nema dovoljno slobodnih mjesta. Dostupno je ${currentBooking.departure.spotsLeft}.`
            );
          }

          /*
           * Ažuriramo broj slobodnih mjesta.
           *
           * Ako je difference +1:
           * spotsLeft smanjujemo za 1.
           *
           * Ako je difference -1:
           * spotsLeft povećavamo za 1.
           */
          if (currentDifference !== 0) {
            await tx.tourDeparture.update({
              where: {
                id: currentBooking.departureId,
              },

              data: {
                spotsLeft: {
                  increment:
                    -currentDifference,
                },
              },
            });
          }

          /*
           * Brišemo stare podatke učesnika.
           */
          await tx.bookingParticipant.deleteMany({
            where: {
              bookingId: id,
            },
          });

          /*
           * Ažuriramo rezervaciju i ponovo
           * kreiramo podatke svih učesnika.
           */
          return tx.booking.update({
            where: {
              id,
            },

            data: {
              participants,

              totalPrice:
                currentBooking.tour
                  .pricePerPerson *
                participants,

              participantsInfo: {
                create:
                  participantsInfo.map(
                    (person) => ({
                      fullName:
                        person.fullName.trim(),

                      age: person.age,
                    })
                  ),
              },
            },

            include: {
              participantsInfo: true,

              departure: true,

              tour: {
                select: {
                  id: true,
                  title: true,
                  pricePerPerson: true,
                },
              },
            },
          });
        }
      );

    /*
     * Obavještavamo vodiča da je
     * rezervacija izmijenjena.
     */
    const user = await prisma.user.findUnique({
      where: {
        id: session!.userId,
      },

      select: {
        fullName: true,
      },
    });

    await createNotification(
      booking.tour.guideId,
      "BOOKING_CONFIRMED",
      `Izmijenjena rezervacija za "${booking.tour.title}"`,
      `${user?.fullName} - sada ${participants} osoba`,
      "/profile"
    );

    return NextResponse.json({
      booking: updatedBooking,
      message:
        "Rezervacija je uspješno izmijenjena.",
    });
  } catch (err) {
    console.error(
      "Greška pri izmjeni rezervacije:",
      err
    );

    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : "Došlo je do greške prilikom izmjene rezervacije.",
      },
      { status: 400 }
    );
  }
}

/*
 * DELETE /api/bookings/[id]
 *
 * Otkazivanje postojeće rezervacije.
 */
export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { error, session } = await guard();

  if (error) return error;

  const { id } = await context.params;

  /*
   * Pronalazimo rezervaciju.
   */
  const booking = await prisma.booking.findUnique({
    where: {
      id,
    },

    include: {
      departure: true,

      tour: {
        select: {
          id: true,
          title: true,
          guideId: true,
        },
      },
    },
  });

  if (!booking) {
    return NextResponse.json(
      {
        error: "Rezervacija nije pronađena.",
      },
      {
        status: 404,
      }
    );
  }

  /*
   * Samo vlasnik rezervacije
   * može da je otkaže.
   */
  if (booking.userId !== session!.userId) {
    return NextResponse.json(
      {
        error:
          "Nemate pravo da otkažete ovu rezervaciju.",
      },
      {
        status: 403,
      }
    );
  }

  /*
   * Možemo otkazati samo aktivnu rezervaciju.
   */
  if (
    booking.status !== "PENDING" &&
    booking.status !== "CONFIRMED"
  ) {
    return NextResponse.json(
      {
        error:
          "Ovu rezervaciju nije moguće otkazati.",
      },
      {
        status: 400,
      }
    );
  }

  /*
   * Termin ne smije biti već počeo.
   */
  if (
    booking.departure.startsAt.getTime() <=
    Date.now()
  ) {
    return NextResponse.json(
      {
        error:
          "Termin je već počeo ili je završen. Rezervaciju više nije moguće otkazati.",
      },
      {
        status: 400,
      }
    );
  }

  /*
   * Otkazivanje je dozvoljeno samo
   * do bookingDeadline.
   */
  if (booking.departure.bookingDeadline) {
    if (
      booking.departure.bookingDeadline.getTime() <=
      Date.now()
    ) {
      return NextResponse.json(
        {
          error:
            "Rok za otkazivanje ove rezervacije je istekao.",
        },
        {
          status: 400,
        }
      );
    }
  }

  try {
    const cancelledBooking =
      await prisma.$transaction(
        async (tx) => {
          /*
           * Ponovo čitamo rezervaciju
           * unutar transakcije.
           */
          const currentBooking =
            await tx.booking.findUnique({
              where: {
                id,
              },

              include: {
                departure: true,
              },
            });

          if (!currentBooking) {
            throw new Error(
              "Rezervacija više ne postoji."
            );
          }

          /*
           * Ponovna provjera vlasnika.
           */
          if (
            currentBooking.userId !==
            session!.userId
          ) {
            throw new Error(
              "Nemate pravo da otkažete ovu rezervaciju."
            );
          }

          /*
           * Sprečavamo dvostruko otkazivanje.
           *
           * Ovo je posebno važno jer bi inače
           * spotsLeft mogao biti povećan dva puta.
           */
          if (
            currentBooking.status !== "PENDING" &&
            currentBooking.status !== "CONFIRMED"
          ) {
            throw new Error(
              "Ova rezervacija je već otkazana ili završena."
            );
          }

          /*
           * Ponovna provjera vremena polaska.
           */
          if (
            currentBooking.departure.startsAt.getTime() <=
            Date.now()
          ) {
            throw new Error(
              "Termin je već počeo ili je završen."
            );
          }

          /*
           * Ponovna provjera bookingDeadline.
           */
          if (
            currentBooking.departure
              .bookingDeadline &&
            currentBooking.departure
              .bookingDeadline.getTime() <=
              Date.now()
          ) {
            throw new Error(
              "Rok za otkazivanje ove rezervacije je istekao."
            );
          }

          /*
           * Vraćamo sva mjesta koja je
           * rezervacija zauzimala.
           */
          await tx.tourDeparture.update({
            where: {
              id: currentBooking.departureId,
            },

            data: {
              spotsLeft: {
                increment:
                  currentBooking.participants,
              },
            },
          });

          /*
           * Rezervaciju NE brišemo.
           *
           * Ostaje u istoriji, ali dobija
           * status CANCELLED.
           */
          return tx.booking.update({
            where: {
              id,
            },

            data: {
              status: "CANCELLED",
            },

            include: {
              participantsInfo: true,

              departure: true,

              tour: {
                select: {
                  id: true,
                  title: true,
                  pricePerPerson: true,
                },
              },
            },
          });
        }
      );

    /*
     * Ime korisnika za obavještenje vodiču.
     */
    const user = await prisma.user.findUnique({
      where: {
        id: session!.userId,
      },

      select: {
        fullName: true,
      },
    });

    /*
     * Obavještavamo vodiča.
     */
    await createNotification(
      booking.tour.guideId,
      "BOOKING_CONFIRMED",
      `Otkazana rezervacija za "${booking.tour.title}"`,
      `${user?.fullName} je otkazao/la rezervaciju za ${booking.participants} osoba`,
      "/profile"
    );

    return NextResponse.json({
      booking: cancelledBooking,
      message:
        "Rezervacija je uspješno otkazana.",
    });
  } catch (err) {
    console.error(
      "Greška pri otkazivanju rezervacije:",
      err
    );

    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : "Došlo je do greške prilikom otkazivanja rezervacije.",
      },
      {
        status: 400,
      }
    );
  }
}
