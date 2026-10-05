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
 * Server upload preko Vercel funkcije ima
 * ograničenje veličine requesta, zato
 * koristimo maksimalno 4 MB po fotografiji.
 */
const MAX_SIZE = 4 * 1024 * 1024;

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
     * Provjera svih fotografija
     * prije nego što počnemo upload.
     */
    for (const file of files) {
      if (
        !file.type.startsWith("image/")
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
    }

    try {
      setUploading(true);
      setTotalFiles(files.length);
      setCurrentFile(0);

      const uploaded: TourImageData[] =
        [];

      /*
       * Fotografije šaljemo jednu po jednu.
       */
      for (
        let i = 0;
        i < files.length;
        i++
      ) {
        const file = files[i];

        setCurrentFile(i + 1);

        const formData =
          new FormData();

        formData.append(
          "file",
          file
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
            .catch(() => ({}));

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
    if (uploading) return;

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
          Prva fotografija je naslovna.
        </p>
      </div>

      {/* Pregled fotografija */}
      {images.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {images.map(
            (image, index) => (
              <div
                key={image.url}
                className="relative overflow-hidden rounded-xl border border-black/10 bg-black/5"
              >
                <img
                  src={image.url}
                  alt={`Fotografija ture ${
                    index + 1
                  }`}
                  className="aspect-[4/3] w-full object-cover"
                />

                {/* Naslovna */}
                {index === 0 && (
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
                {index !== 0 && (
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
                    Postavi kao naslovnu
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
            accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
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
              ? `Šaljem fotografiju ${currentFile}/${totalFiles}...`
              : "📷 + Dodaj fotografije"}
          </button>
        </>
      )}

      {/* Upload indikator */}
      {uploading && (
        <div className="rounded-xl bg-brand-light p-3">
          <div className="mb-2 flex justify-between text-xs text-brand-dark">
            <span>
              Upload fotografija
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
          JPG, PNG, WebP, HEIC · max 4 MB
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
