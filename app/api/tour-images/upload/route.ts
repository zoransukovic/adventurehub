import {
  handleUpload,
  type HandleUploadBody,
} from "@vercel/blob/client";

import { NextResponse } from "next/server";
import { guard } from "@/lib/guard";

export async function POST(request: Request) {
  try {
    /*
     * Korisnik mora biti prijavljen.
     */
    const { error } = await guard();

    if (error) {
      return error;
    }

    const body =
      (await request.json()) as HandleUploadBody;

    const jsonResponse =
      await handleUpload({
        body,
        request,

        onBeforeGenerateToken: async (
          pathname
        ) => {
          console.log(
            "Generating Blob upload token:",
            pathname
          );

          return {
            allowedContentTypes: [
              "image/jpeg",
              "image/png",
              "image/webp",
              "image/heic",
              "image/heif",
            ],

            maximumSizeInBytes:
              10 * 1024 * 1024,

            addRandomSuffix: true,
          };
        },

        onUploadCompleted: async ({
          blob,
        }) => {
          console.log(
            "Tour image uploaded:",
            blob.url
          );
        },
      });

    return NextResponse.json(
      jsonResponse
    );
  } catch (error) {
    console.error(
      "BLOB UPLOAD ERROR:",
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
        status: 400,
      }
    );
  }
}
