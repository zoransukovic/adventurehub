
import {
  handleUpload,
  type HandleUploadBody,
} from "@vercel/blob/client";

import { NextResponse } from "next/server";
import { guard } from "@/lib/guard";

export async function POST(
  request: Request
) {
  try {
    /*
     * Samo prijavljeni GUIDE/ADMIN
     * smije dobiti dozvolu za upload.
     */
    const { error } = await guard("GUIDE");

    if (error) {
      return error;
    }

    const body =
      (await request.json()) as HandleUploadBody;

    const response =
      await handleUpload({
        request,
        body,

        onBeforeGenerateToken:
          async (
            pathname
          ) => {
            /*
             * Dozvoljavamo samo fotografije.
             */
            return {
              allowedContentTypes: [
                "image/jpeg",
                "image/png",
                "image/webp",
                "image/heic",
                "image/heif",
              ],

              /*
               * Maksimalno 10 MB po fotografiji.
               */
              maximumSizeInBytes:
                10 * 1024 * 1024,

              addRandomSuffix: true,
            };
          },

        onUploadCompleted:
          async ({
            blob,
          }) => {
            console.log(
              "Tour image uploaded:",
              blob.url
            );

            /*
             * Ovdje još NE upisujemo
             * TourImage u bazu.
             *
             * Fotografije ćemo vezati
             * za turu kada sama tura
             * bude uspješno kreirana.
             */
          },
      });

    return NextResponse.json(
      response
    );
  } catch (error) {
    console.error(
      "Tour image upload error:",
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
