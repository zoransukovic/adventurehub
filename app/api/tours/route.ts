import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { guard } from "@/lib/guard";
import { z } from "zod";

const routeSchema = z.object({
  creationMode: z.enum(["auto", "manual"]),

  startLabel: z.string().optional(),
  endLabel: z.string().optional(),

  startLat: z.number(),
  startLng: z.number(),
  endLat: z.number(),
  endLng: z.number(),

  points: z.array(
    z.object({
      lat: z.number(),
      lng: z.number(),
      elevation: z.number().optional(),
    })
  ),

  distanceKm: z.number().optional(),
  elevationGainM: z.number().optional(),
  estimatedMins: z.number().optional(),
});

const departureSchema = z.object({
  startsAt: z
    .string()
    .min(1, "Datum polaska je obavezan."),

  bookingDeadline: z
    .string()
    .min(1, "Rok za rezervacije je obavezan."),

  spotsLeft: z
    .number()
    .int()
    .positive(
      "Broj slobodnih mjesta mora biti veći od 0."
    ),
});

const tourSchema = z.object({
  title: z
    .string()
    .trim()
    .min(
      3,
      "Naziv ture mora imati najmanje 3 karaktera."
    ),

  descriptionSr: z
    .string()
    .trim()
    .min(
      10,
      "Opis mora imati najmanje 10 karaktera."
    ),

  descriptionEn: z.string().optional(),

  activityTypeId: z
    .string()
    .min(1, "Izaberite vrstu aktivnosti."),

  pricePerPerson: z
    .number()
    .positive("Cijena mora biti veća od 0."),

  maxParticipants: z
    .number()
    .int()
    .positive(
      "Maksimalan broj učesnika mora biti veći od 0."
    ),

  durationMinutes: z
    .number()
    .int()
    .positive(
      "Trajanje mora biti veće od 0."
    )
    .optional(),

  difficulty: z
    .enum(["EASY", "MODERATE", "HARD"])
    .default("MODERATE"),

  transportMode: z.enum([
    "FOOT",
    "BIKE",
    "CAR",
    "ATV",
    "KAYAK",
    "DIVING",
    "OTHER",
  ]),

  meetingPoint: z.string().optional(),

  includesItems: z
    .array(z.string())
    .default([]),

  departureDates: z
    .array(departureSchema)
    .min(
      1,
      "Dodajte najmanje jedan termin polaska."
    ),

  route: routeSchema,
});

/*
 * GET /api/tours
 *
 * Vraća aktivne ture.
 *
 * Učitavamo:
 * - tip aktivnosti
 * - vodiča
 * - fotografije
 * - rutu
 * - ocjene
 * - prvi naredni termin
 */
export async function GET(req: NextRequest) {
  const sp =
    new URL(req.url).searchParams;

  const tours =
    await prisma.tour.findMany({
      where: {
        active: true,

        activityTypeId:
          sp.get("activityTypeId") ||
          undefined,

        title: sp.get("search")
          ? {
              contains:
                sp.get("search")!,
              mode: "insensitive",
            }
          : undefined,
      },

      include: {
        activityType: true,

        guide: {
          select: {
            id: true,
            fullName: true,
            avatarUrl: true,
            guideCertified: true,
          },
        },

        /*
         * Fotografije ture.
         *
         * Prva fotografija po position
         * može se koristiti kao naslovna.
         */
        images: {
          orderBy: {
            position: "asc",
          },
        },

        /*
         * Podaci rute potrebni za
         * prikaz ture na mapi.
         */
        route: {
          select: {
            startLat: true,
            startLng: true,

            endLat: true,
            endLng: true,

            startLabel: true,
            endLabel: true,

            points: true,

            distanceKm: true,
            elevationGainM: true,
            estimatedMins: true,
          },
        },

        reviews: {
          select: {
            rating: true,
          },
        },

        /*
         * Vraćamo samo prvi
         * naredni termin ture.
         */
        departures: {
          where: {
            startsAt: {
              gte: new Date(),
            },
          },

          orderBy: {
            startsAt: "asc",
          },

          take: 1,
        },
      },

      orderBy: {
        createdAt: "desc",
      },
    });

  return NextResponse.json({
    tours: tours.map((t) => ({
      ...t,

      avgRating:
        t.reviews.length
          ? t.reviews.reduce(
              (sum, review) =>
                sum + review.rating,
              0
            ) / t.reviews.length
          : null,

      reviewCount:
        t.reviews.length,
    })),
  });
}

/*
 * POST /api/tours
 *
 * Kreiranje nove ture.
 */
export async function POST(
  req: NextRequest
) {
  const { error, session } =
    await guard("GUIDE");

  if (error) return error;

  /*
   * 1. Provjera podataka koje je
   * poslao frontend.
   */
  const body =
    tourSchema.safeParse(
      await req
        .json()
        .catch(() => ({}))
    );

  if (!body.success) {
    return NextResponse.json(
      {
        error:
          body.error.issues[0]
            ?.message ||
          "Podaci nijesu ispravni.",
      },
      {
        status: 400,
      }
    );
  }

  const {
    route,
    departureDates,
    ...tourData
  } = body.data;

  /*
   * 2. Provjera da izabrana vrsta
   * aktivnosti stvarno postoji.
   */
  const activity =
    await prisma.activityType.findUnique({
      where: {
        id: tourData.activityTypeId,
      },

      select: {
        id: true,
        name: true,
        active: true,
      },
    });

  if (!activity) {
    return NextResponse.json(
      {
        error:
          "Izabrana vrsta aktivnosti ne postoji. Vratite se na prvi korak i izaberite aktivnost.",
      },
      {
        status: 400,
      }
    );
  }

  /*
   * Ako je aktivnost deaktivirana,
   * ne dozvoljavamo kreiranje nove ture.
   */
  if (!activity.active) {
    return NextResponse.json(
      {
        error:
          `Aktivnost "${activity.name}" trenutno nije dostupna.`,
      },
      {
        status: 400,
      }
    );
  }

  /*
   * 3. Serverska provjera svih termina.
   */
  for (
    let i = 0;
    i < departureDates.length;
    i++
  ) {
    const departure =
      departureDates[i];

    const startsAt =
      new Date(
        departure.startsAt
      );

    const bookingDeadline =
      new Date(
        departure.bookingDeadline
      );

    if (
      Number.isNaN(
        startsAt.getTime()
      ) ||
      Number.isNaN(
        bookingDeadline.getTime()
      )
    ) {
      return NextResponse.json(
        {
          error:
            `Termin ${i + 1}: datum ili vrijeme nije ispravno.`,
        },
        {
          status: 400,
        }
      );
    }

    /*
     * Ne dozvoljavamo termin
     * u prošlosti.
     */
    if (
      startsAt.getTime() <=
      Date.now()
    ) {
      return NextResponse.json(
        {
          error:
            `Termin ${i + 1}: vrijeme polaska mora biti u budućnosti.`,
        },
        {
          status: 400,
        }
      );
    }

    /*
     * Rok mora biti prije polaska.
     */
    if (
      bookingDeadline.getTime() >=
      startsAt.getTime()
    ) {
      return NextResponse.json(
        {
          error:
            `Termin ${i + 1}: rok za rezervacije mora biti prije vremena polaska.`,
        },
        {
          status: 400,
        }
      );
    }

    /*
     * Rok za rezervacije mora
     * biti u budućnosti.
     */
    if (
      bookingDeadline.getTime() <=
      Date.now()
    ) {
      return NextResponse.json(
        {
          error:
            `Termin ${i + 1}: rok za rezervacije mora biti u budućnosti.`,
        },
        {
          status: 400,
        }
      );
    }

    /*
     * Broj mjesta ne može biti veći
     * od maksimalnog kapaciteta ture.
     */
    if (
      departure.spotsLeft >
      tourData.maxParticipants
    ) {
      return NextResponse.json(
        {
          error:
            `Termin ${i + 1}: broj slobodnih mjesta ne može biti veći od maksimalnog broja učesnika (${tourData.maxParticipants}).`,
        },
        {
          status: 400,
        }
      );
    }
  }

  /*
   * 4. Kreiranje ture.
   */
  try {
    const tour =
      await prisma.tour.create({
        data: {
          ...tourData,

          guideId:
            session!.userId,

          route: {
            create: {
              ...route,

              points:
                route.points as never,
            },
          },

          departures: {
            create:
              departureDates.map(
                (departure) => ({
                  startsAt:
                    new Date(
                      departure.startsAt
                    ),

                  bookingDeadline:
                    new Date(
                      departure.bookingDeadline
                    ),

                  spotsLeft:
                    departure.spotsLeft,
                })
              ),
          },
        },

        include: {
          route: true,
          activityType: true,
          departures: true,

          /*
           * Ako postoje fotografije
           * vezane za turu, vraćamo
           * ih u odgovoru.
           */
          images: {
            orderBy: {
              position: "asc",
            },
          },
        },
      });

    return NextResponse.json(
      {
        tour,
      },
      {
        status: 201,
      }
    );
  } catch (err) {
    console.error(
      "Greška pri kreiranju ture:",
      err
    );

    return NextResponse.json(
      {
        error:
          "Došlo je do greške prilikom čuvanja ture. Pokušajte ponovo.",
      },
      {
        status: 500,
      }
    );
  }
}
