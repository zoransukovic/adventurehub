import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { guard } from "@/lib/guard";

export async function GET() {
  const { error } = await guard("ADMIN");
  if (error) return error;

  try {
    const tours = await prisma.tour.findMany({
      select: {
        id: true,
        title: true,
        active: true,
        featured: true,
        featuredOrder: true,
        pricePerPerson: true,
        createdAt: true,

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
        error: "Greška pri učitavanju tura.",
      },
      {
        status: 500,
      }
    );
  }
}
