"use client";

import { useRef, useState } from "react";

export type TourImageData = {
  url: string;
  position: number;
};

type Props = {
  images: TourImageData[];
  onChange: (images: TourImageData[]) => void;
};

const MAX_IMAGES = 5;

/*
 * Maksimalna veličina originalnog fajla
 * koji korisnik može izabrati.
 */
const MAX_SIZE = 4 * 1024 * 1024;

/*
 * Fotografija se prije uploada automatski
 * smanjuje. Duža strana će imati najviše
 * 1500 px.
 */
const MAX_DIMENSION = 1500;

/*
 * JPEG kvalitet nakon optimizacije.
 * 0.82 = 82%
 */
const JPEG_QUALITY = 0.82;

/*
 * Automatska optimizacija fotografije.
 *
 * - zadržava originalni odnos stranica
 * - smanjuje dužu stranu na max 1500 px
 * - pretvara fotografiju u JPEG
 * - kvalitet 82%
 *
 * Odnos 3:2 koristimo prilikom prikaza
 * fotografije pomoću object-cover.
 */
async function optimizeImage(
  file: File
): Promise<File> {
  const imageUrl =
    URL.createObjectURL(file);

  try {
    const img =
      await new Promise<HTMLImageElement>(
        (resolve, reject) => {
          const image = new Image();

          image.onload = () =>
            resolve(image);

          image.onerror = () =>
            reject(
              new Error(
                `Fotografiju "${file.name}" nije moguće obraditi.`
              )
            );

          image.src = imageUrl;
        }
      );

    let width = img.naturalWidth;
    let height = img.naturalHeight;

    /*
     * Smanjujemo fotografiju samo ako je
     * neka njena strana veća od 1500 px.
     */
    if (
      width > MAX_DIMENSION ||
      height > MAX_DIMENSION
    ) {
      const scale =
        MAX_DIMENSION /
        Math.max(width, height);

      width = Math.round(
        width * scale
      );

      height = Math.round(
        height * scale
      );
    }

    const canvas =
      document.createElement(
        "canvas"
      );

    canvas.width = width;
    canvas.height = height;

    const ctx =
      canvas.getContext("2d");

    if (!ctx) {
      throw new Error(
        "Fotografiju nije moguće obraditi."
      );
    }

    /*
     * Bijela pozadina je korisna ako
     * korisnik pošalje PNG sa providnom
     * pozadinom, jer JPEG nema
     * transparentnost.
     */
    ctx.fillStyle = "#ffffff";

    ctx.fillRect(
      0,
      0,
      width,
      height
    );

    ctx.drawImage(
      img,
      0,
      0,
      width,
      height
    );

    const blob =
      await new Promise<Blob | null>(
        (resolve) => {
          canvas.toBlob(
            resolve,
            "image/jpeg",
            JPEG_QUALITY
          );
        }
      );

    if (!blob) {
      throw new Error(
        "Kompresija fotografije nije uspjela."
      );
    }

    const baseName =
      file.name.replace(
        /\.[^/.]+$/,
        ""
      );

    return new File(
      [blob],
      `${baseName}.jpg`,
      {
        type: "image/jpeg",
      }
    );
  } finally {
    URL.revokeObjectURL(
      imageUrl
    );
  }
}

export default function TourImageUploader({
  images,
  onChange,
}: Props) {
  const inputRef =
    useRef<HTMLInputElement>(null);

  const [uploading, setUploading] =
    useState(false);

  const [currentFile, setCurrentFile] =
    useState(0);

  const [totalFiles, setTotalFiles] =
    useState(0);

  const [error, setError] =
    useState("");

  async function selectFiles(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const files = Array.from(
      event.target.files ?? []
    );

    /*
     * Omogućava da kasnije ponovo
     * izaberemo isti fajl.
     */
    event.target.value = "";

    if (!files.length) {
      return;
    }

    setError("");

    const remaining =
      MAX_IMAGES - images.length;

    if (remaining <= 0) {
      setError(
        "Možete dodati najviše 5 fotografija."
      );

      return;
    }

    if (files.length > remaining) {
      setError(
        `Možete dodati još najviše ${remaining} ${
          remaining === 1
            ? "fotografiju"
            : "fotografije"
        }.`
      );

      return;
    }

    /*
     * Provjera svih fotografija prije
     * nego što počnemo optimizaciju
     * i upload.
     */
    for (const file of files) {
      if (
        !file.type.startsWith(
          "image/"
        )
      ) {
        setError(
          `"${file.name}" nije fotografija.`
        );

        return;
      }

      if (file.size > MAX_SIZE) {
        setError(
          `Fotografija "${file.name}" je veća od 4 MB.`
        );

        return;
      }

      /*
       * Za sada podržavamo formate
       * koje browser može pouzdano
       * obraditi preko Canvas API-ja.
       */
      const supportedTypes = [
        "image/jpeg",
        "image/png",
        "image/webp",
      ];

      if (
        !supportedTypes.includes(
          file.type
        )
      ) {
        setError(
          `Format fotografije "${file.name}" trenutno nije podržan. Koristite JPG, PNG ili WebP.`
        );

        return;
      }
    }

    try {
      setUploading(true);

      setTotalFiles(
        files.length
      );

      setCurrentFile(0);

      const uploaded: TourImageData[] =
        [];

      /*
       * Fotografije obrađujemo i
       * šaljemo jednu po jednu.
       */
      for (
        let i = 0;
        i < files.length;
        i++
      ) {
        const file =
          files[i];

        setCurrentFile(
          i + 1
        );

        /*
         * Fotografija se prvo smanjuje
         * i kompresuje u browseru.
         */
        const optimizedFile =
          await optimizeImage(
            file
          );

        const formData =
          new FormData();

        formData.append(
          "file",
          optimizedFile
        );

        const response =
          await fetch(
            "/api/tour-images/upload",
            {
              method: "POST",
              body: formData,
            }
          );

        const data =
          await response
            .json()
            .catch(
              () => ({})
            );

        if (!response.ok) {
          throw new Error(
            data.error ||
              `Upload fotografije "${file.name}" nije uspio.`
          );
        }

        if (!data.url) {
          throw new Error(
            "Server nije vratio URL fotografije."
          );
        }

        uploaded.push({
          url: data.url,

          position:
            images.length +
            uploaded.length,
        });
      }

      /*
       * Tek kada su fotografije
       * uspješno uploadovane dodajemo
       * ih u formu ture.
       */
      onChange([
        ...images,
        ...uploaded,
      ]);
    } catch (err) {
      console.error(
        "Greška pri uploadu fotografije:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "Upload fotografije nije uspio."
      );
    } finally {
      setUploading(false);

      setCurrentFile(0);

      setTotalFiles(0);
    }
  }

  /*
   * Uklanjanje fotografije iz forme.
   *
   * position se nakon toga ponovo
   * postavlja na 0, 1, 2...
   */
  function removeImage(
    index: number
  ) {
    if (uploading) {
      return;
    }

    const next = images
      .filter(
        (_, i) =>
          i !== index
      )
      .map(
        (image, i) => ({
          ...image,
          position: i,
        })
      );

    onChange(next);
  }

  /*
   * Izabranu fotografiju stavljamo
   * na prvo mjesto.
   *
   * position 0 = naslovna fotografija.
   */
  function makeCover(
    index: number
  ) {
    if (
      uploading ||
      index === 0
    ) {
      return;
    }

    const selected =
      images[index];

    const rest =
      images.filter(
        (_, i) =>
          i !== index
      );

    const next = [
      selected,
      ...rest,
    ].map(
      (image, i) => ({
        ...image,
        position: i,
      })
    );

    onChange(next);
  }

  return (
    <div className="space-y-3">
      <div>
        <h3 className="text-base font-medium">
          Fotografije ture
        </h3>

        <p className="mt-1 text-sm text-foreground/55">
          Dodajte do 5 fotografija.
          Prva fotografija je
          naslovna.
        </p>

        <p className="mt-1 text-xs text-foreground/45">
          Fotografije se automatski
          optimizuju za brže
          učitavanje.
        </p>
      </div>

      {/* Pregled fotografija */}
      {images.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {images.map(
            (
              image,
              index
            ) => (
              <div
                key={
                  image.url
                }
                className="relative overflow-hidden rounded-xl border border-black/10 bg-black/5"
              >
                <img
                  src={
                    image.url
                  }
                  alt={`Fotografija ture ${
                    index + 1
                  }`}
                  className="aspect-[3/2] w-full object-cover"
                />

                {/* Naslovna */}
                {index ===
                  0 && (
                  <div className="absolute left-2 top-2 rounded-full bg-brand px-2 py-1 text-xs font-medium text-white shadow">
                    Naslovna
                  </div>
                )}

                {/* Brisanje */}
                <button
                  type="button"
                  disabled={
                    uploading
                  }
                  onClick={() =>
                    removeImage(
                      index
                    )
                  }
                  className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-black/65 text-base text-white shadow disabled:opacity-40"
                  aria-label="Obriši fotografiju"
                >
                  ✕
                </button>

                {/* Postavi kao naslovnu */}
                {index !==
                  0 && (
                  <button
                    type="button"
                    disabled={
                      uploading
                    }
                    onClick={() =>
                      makeCover(
                        index
                      )
                    }
                    className="absolute bottom-2 left-2 right-2 rounded-lg bg-black/65 px-2 py-2 text-xs font-medium text-white disabled:opacity-40"
                  >
                    Postavi kao
                    naslovnu
                  </button>
                )}
              </div>
            )
          )}
        </div>
      )}

      {/* Izbor fotografija */}
      {images.length <
        MAX_IMAGES && (
        <>
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            className="hidden"
            disabled={
              uploading
            }
            onChange={
              selectFiles
            }
          />

          <button
            type="button"
            disabled={
              uploading
            }
            onClick={() =>
              inputRef.current?.click()
            }
            className="w-full rounded-xl border-2 border-dashed border-brand/35 bg-brand-light px-4 py-5 text-center text-sm font-medium text-brand-dark disabled:opacity-50"
          >
            {uploading
              ? `Obrađujem i šaljem fotografiju ${currentFile}/${totalFiles}...`
              : "📷 + Dodaj fotografije"}
          </button>
        </>
      )}

      {/* Upload indikator */}
      {uploading && (
        <div className="rounded-xl bg-brand-light p-3">
          <div className="mb-2 flex justify-between text-xs text-brand-dark">
            <span>
              Optimizacija i
              upload
            </span>

            <span>
              {currentFile}/
              {totalFiles}
            </span>
          </div>

          <div className="h-2 overflow-hidden rounded-full bg-black/10">
            <div
              className="h-full bg-brand transition-all"
              style={{
                width:
                  totalFiles >
                  0
                    ? `${
                        (currentFile /
                          totalFiles) *
                        100
                      }%`
                    : "0%",
              }}
            />
          </div>
        </div>
      )}

      <div className="flex justify-between text-xs text-foreground/45">
        <span>
          JPG, PNG, WebP · max
          4 MB · automatska
          optimizacija
        </span>

        <span>
          {images.length}/5
        </span>
      </div>

      {/* Greška */}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-600">
          {error}
        </div>
      )}
    </div>
  );
}
