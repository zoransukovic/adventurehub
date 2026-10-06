import {
  NextRequest,
  NextResponse,
} from "next/server";

import { prisma } from "@/lib/prisma";
import { guard } from "@/lib/guard";
import { z } from "zod";

/*
 * =========================================================
 * VALIDACIJA RUTE
 * =========================================================
 */

const routeSchema = z.object({
  creationMode: z.enum([
    "auto",
    "manual",
  ]),

  startLabel: z
    .string()
    .optional(),

  endLabel: z
    .string()
    .optional(),

  startLat: z.number(),
  startLng: z.number(),

  endLat: z.number(),
  endLng: z.number(),

  points: z.array(
    z.object({
      lat: z.number(),
      lng: z.number(),
      elevation: z
        .number()
        .optional(),
    })
  ),

  distanceKm: z
    .number()
    .optional(),

  elevationGainM: z
    .number()
    .optional(),

  estimatedMins: z
    .number()
    .optional(),
});

/*
 * =========================================================
 * VALIDACIJA TERMINA
 * =========================================================
 */

const departureSchema = z.object({
  startsAt: z
    .string()
    .min(
      1,
      "Datum polaska je obavezan."
    ),

  bookingDeadline: z
    .string()
    .min(
      1,
      "Rok za rezervacije je obavezan."
    ),

  spotsLeft: z
    .number()
    .int()
    .positive(
      "Broj slobodnih mjesta mora biti veći od 0."
    ),
});

/*
 * =========================================================
 * VALIDACIJA FOTOGRAFIJA
 * =========================================================
 */

const imageSchema = z.object({
  url: z
    .string()
    .min(
      1,
      "URL fotografije nije ispravan."
    ),

  position: z
    .number()
    .int()
    .nonnegative(),
});

/*
 * =========================================================
 * VALIDACIJA TURE
 * =========================================================
 */

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

  descriptionEn: z
    .string()
    .optional(),

  activityTypeId: z
    .string()
    .min(
      1,
      "Izaberite vrstu aktivnosti."
    ),

  pricePerPerson: z
    .number()
    .positive(
      "Cijena mora biti veća od 0."
    ),

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
    .enum([
      "EASY",
      "MODERATE",
      "HARD",
    ])
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

  meetingPoint: z
    .string()
    .optional(),

  includesItems: z
    .array(z.string())
    .default([]),

  departureDates: z
    .array(departureSchema)
    .min(
      1,
      "Dodajte najmanje jedan termin polaska."
    ),

  /*
   * Maksimalno 5 fotografija.
   *
   * position 0 predstavlja
   * naslovnu fotografiju.
   */
  images: z
    .array(imageSchema)
    .max(
      5,
      "Možete dodati najviše 5 fotografija."
    )
    .default([]),

  route: routeSchema,
});

/*
 * =========================================================
 * GET /api/tours
 * =========================================================
 *
 * Vraća sve aktivne ture.
 *
 * Učitavamo:
 * - vrstu aktivnosti
 * - vodiča
 * - fotografije
 * - rutu
 * - ocjene
 * - prvi naredni termin
 */

export async function GET(
  req: NextRequest
) {
  const sp =
    new URL(
      req.url
    ).searchParams;

  const tours =
    await prisma.tour.findMany({
      where: {
        active: true,

        activityTypeId:
          sp.get(
            "activityTypeId"
          ) || undefined,

        title: sp.get("search")
          ? {
              contains:
                sp.get(
                  "search"
                )!,
              mode: "insensitive",
            }
          : undefined,
      },

      include: {
        /*
         * Vrsta aktivnosti.
         */
        activityType: true,

        /*
         * Podaci vodiča.
         */
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
         * Prva fotografija
         * (position = 0)
         * predstavlja naslovnu.
         */
        images: {
          orderBy: {
            position: "asc",
          },
        },

        /*
         * Ruta ture.
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

        /*
         * Ocjene ture.
         */
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

  orderBy: [
  {
    featured: "desc",
  },
  {
    featuredOrder: {
      sort: "asc",
      nulls: "last",
    },
  },
  {
    createdAt: "desc",
  },
],
    });

  /*
   * Dodajemo prosječnu ocjenu
   * i broj recenzija.
   */
  return NextResponse.json({
    tours: tours.map(
      (tour) => ({
        ...tour,

        avgRating:
          tour.reviews.length >
          0
            ? tour.reviews.reduce(
                (
                  sum,
                  review
                ) =>
                  sum +
                  review.rating,
                0
              ) /
              tour.reviews
                .length
            : null,

        reviewCount:
          tour.reviews.length,
      })
    ),
  });
}

/*
 * =========================================================
 * POST /api/tours
 * =========================================================
 *
 * Kreiranje nove ture.
 */

export async function POST(
  req: NextRequest
) {
  /*
   * Samo GUIDE ili korisnik
   * koji prolazi GUIDE guard
   * može kreirati turu.
   */
  const {
    error,
    session,
  } = await guard("GUIDE");

  if (error) {
    return error;
  }

  /*
   * =======================================================
   * 1. VALIDACIJA PODATAKA
   * =======================================================
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
          body.error
            .issues[0]
            ?.message ||
          "Podaci nijesu ispravni.",
      },
      {
        status: 400,
      }
    );
  }

  /*
   * Fotografije izdvajamo posebno
   * jer predstavljaju Prisma relaciju,
   * a ne direktna polja Tour modela.
   */
  const {
    route,
    departureDates,
    images,
    ...tourData
  } = body.data;

  /*
   * =======================================================
   * 2. PROVJERA AKTIVNOSTI
   * =======================================================
   */

  const activity =
    await prisma
      .activityType
      .findUnique({
        where: {
          id:
            tourData
              .activityTypeId,
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
   * Ne dozvoljavamo kreiranje
   * ture za deaktiviranu aktivnost.
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
   * =======================================================
   * 3. PROVJERA TERMINA
   * =======================================================
   */

  for (
    let i = 0;
    i <
    departureDates.length;
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
        departure
          .bookingDeadline
      );

    /*
     * Provjera formata datuma.
     */
    if (
      Number.isNaN(
        startsAt.getTime()
      ) ||
      Number.isNaN(
        bookingDeadline
          .getTime()
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
     * Polazak mora biti
     * u budućnosti.
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
     * Rok rezervacije mora biti
     * prije vremena polaska.
     */
    if (
      bookingDeadline
        .getTime() >=
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
     * Rok rezervacije takođe
     * mora biti u budućnosti.
     */
    if (
      bookingDeadline
        .getTime() <=
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
     * Slobodnih mjesta ne može
     * biti više od maksimalnog
     * kapaciteta ture.
     */
    if (
      departure.spotsLeft >
      tourData
        .maxParticipants
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
   * =======================================================
   * 4. KREIRANJE TURE
   * =======================================================
   */

  try {
    const tour =
      await prisma
        .tour
        .create({
          data: {
            ...tourData,

            /*
             * Trenutni vodič.
             */
            guideId:
              session!.userId,

            /*
             * Ruta.
             */
            route: {
              create: {
                ...route,

                points:
                  route.points as never,
              },
            },

            /*
             * Termini polaska.
             */
            departures: {
              create:
                departureDates.map(
                  (
                    departure
                  ) => ({
                    startsAt:
                      new Date(
                        departure
                          .startsAt
                      ),

                    bookingDeadline:
                      new Date(
                        departure
                          .bookingDeadline
                      ),

                    spotsLeft:
                      departure
                        .spotsLeft,
                  })
                ),
            },

            /*
             * FOTOGRAFIJE
             *
             * Ovo je dio koji je
             * ranije nedostajao.
             *
             * URL fotografije je već
             * dobijen iz
             * /api/tour-images/upload.
             *
             * Sada ga povezujemo
             * sa novom turom.
             */
            images: {
              create:
                images.map(
                  (
                    image
                  ) => ({
                    url:
                      image.url,

                    position:
                      image.position,
                  })
                ),
            },
          },

          /*
           * Odmah nakon kreiranja
           * vraćamo i povezane podatke.
           */
          include: {
            route: true,

            activityType:
              true,

            departures:
              true,

            images: {
              orderBy: {
                position:
                  "asc",
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
