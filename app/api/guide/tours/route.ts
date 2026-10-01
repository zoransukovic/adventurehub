
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { guard } from "@/lib/guard";

export async function GET() {
  try {
    const { error, session } = await guard("GUIDE");

    if (error) return error;

    const tours = await prisma.tour.findMany({
      where: {
        guideId: session!.userId,
      },

      include: {
        activityType: {
          select: {
            id: true,
            name: true,
            nameEn: true,
          },
        },

        departures: {
          orderBy: {
            startsAt: "asc",
          },

          include: {
            bookings: {
              where: {
                status: {
                  in: ["PENDING", "CONFIRMED"],
                },
              },

              orderBy: {
                createdAt: "asc",
              },

              include: {
                user: {
                  select: {
                    id: true,
                    fullName: true,
                    email: true,
                    phone: true,
                    country: true,
                  },
                },
              },
            },
          },
        },
      },

      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({ tours });
  } catch (error) {
    console.error("Guide tours error:", error);

    return NextResponse.json(
      { error: "Greška pri učitavanju tura." },
      { status: 500 }
    );
  }
}
