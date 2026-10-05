import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { guard } from "@/lib/guard";

const MAX_SIZE = 4 * 1024 * 1024;

export async function POST(request: Request) {
  try {
    const { error } = await guard();

    if (error) {
      return error;
    }

    const formData = await request.formData();

    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json(
        {
          error: "Fotografija nije pronađena.",
        },
        {
          status: 400,
        }
      );
    }

    if (!file.type.startsWith("image/")) {
      return NextResponse.json(
        {
          error: "Dozvoljene su samo fotografije.",
        },
        {
          status: 400,
        }
      );
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        {
          error:
            "Fotografija može imati najviše 4 MB.",
        },
        {
          status: 400,
        }
      );
    }

    const safeName = file.name
      .replace(/[^a-zA-Z0-9._-]/g, "-")
      .toLowerCase();

    const blob = await put(
      `tours/${Date.now()}-${safeName}`,
      file,
      {
        access: "public",
        addRandomSuffix: true,
      }
    );

    return NextResponse.json({
      url: blob.url,
    });
  } catch (error) {
    console.error(
      "BLOB SERVER UPLOAD ERROR:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Upload fotografije nije uspio.",
      },
      {
        status: 500,
      }
    );
  }
}
