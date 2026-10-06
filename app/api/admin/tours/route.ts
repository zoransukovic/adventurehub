
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    const tours = await prisma.tour.findMany({
      orderBy: [
        {
          featured: "desc",
        },
        {
          featuredOrder: "asc",
        },
        {
          createdAt: "desc",
        },
      ],

      include: {
        activityType: {
          select: {
            id: true,
            name: true,
            icon: true,
          },
        },

        guide: {
          select: {
            id: true,
            fullName: true,
          },
        },

        images: {
          orderBy: {
            position: "asc",
          },

          take: 1,

          select: {
            id: true,
            url: true,
            position: true,
          },
        },

        _count: {
          select: {
            reviews: true,
            bookings: true,
          },
        },
      },
    });

    return NextResponse.json({
      tours,
    });
  } catch (error) {
    console.error(
      "ADMIN TOURS GET ERROR:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Greška pri učitavanju tura.",
      },
      {
        status: 500,
      }
    );
  }
}
