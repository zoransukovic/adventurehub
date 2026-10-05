
"use client";

import { upload } from "@vercel/blob/client";
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
const MAX_SIZE = 10 * 1024 * 1024;

export default function TourImageUploader({
  images,
  onChange,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");

  async function selectFiles(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const files = Array.from(event.target.files ?? []);

    // Omogućava ponovni izbor istog fajla.
    event.target.value = "";

    if (!files.length) return;

    setError("");

    const remaining = MAX_IMAGES - images.length;

    if (remaining <= 0) {
      setError("Možete dodati najviše 5 fotografija.");
      return;
    }

    if (files.length > remaining) {
      setError(
        `Možete dodati još najviše ${remaining} ${
          remaining === 1 ? "fotografiju" : "fotografije"
        }.`
      );
      return;
    }

    /*
     * Provjera fajlova prije uploada.
     */
    for (const file of files) {
      if (!file.type.startsWith("image/")) {
        setError(
          "Dozvoljeni su samo fajlovi sa fotografijama."
        );
        return;
      }

      if (file.size > MAX_SIZE) {
        setError(
          `Fotografija "${file.name}" je veća od 10 MB.`
        );
        return;
      }
    }

    try {
      setUploading(true);
      setProgress(0);

      const uploaded: TourImageData[] = [];

      /*
       * Fotografije šaljemo jednu po jednu.
       */
      for (let i = 0; i < files.length; i++) {
        const file = files[i];

        const blob = await upload(
          `tours/${Date.now()}-${file.name}`,
          file,
          {
            access: "public",

            handleUploadUrl:
              "/api/tour-images/upload",

            onUploadProgress(event) {
              const fileProgress =
                event.percentage / files.length;

              const completedProgress =
                (i * 100) / files.length;

              setProgress(
                Math.round(
                  completedProgress +
                    fileProgress
                )
              );
            },
          }
        );

        uploaded.push({
          url: blob.url,
          position: images.length + i,
        });
      }

      /*
       * Dodajemo nove slike postojećim.
       */
      onChange([
        ...images,
        ...uploaded,
      ]);

      setProgress(100);
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
    }
  }

  /*
   * Brisanje fotografije iz liste.
   *
   * Nakon brisanja ponovo postavljamo
   * position: 0, 1, 2...
   */
  function removeImage(index: number) {
    const next = images
      .filter((_, i) => i !== index)
      .map((image, i) => ({
        ...image,
        position: i,
      }));

    onChange(next);
  }

  /*
   * Izabranu fotografiju stavljamo
   * na prvo mjesto.
   *
   * position 0 = naslovna.
   */
  function makeCover(index: number) {
    if (index === 0) return;

    const selected = images[index];

    const rest = images.filter(
      (_, i) => i !== index
    );

    const next = [
      selected,
      ...rest,
    ].map((image, i) => ({
      ...image,
      position: i,
    }));

    onChange(next);
  }

  return (
    <div className="space-y-3">
      <div>
        <h3 className="text-base font-medium">
          Fotografije ture
        </h3>

        <p className="mt-1 text-sm text-foreground/55">
          Dodajte do 5 fotografija. Prva fotografija
          je naslovna.
        </p>
      </div>

      {/* Pregled dodatih fotografija */}
      {images.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {images.map((image, index) => (
            <div
              key={image.url}
              className="relative overflow-hidden rounded-xl border border-black/10 bg-black/5"
            >
              <img
                src={image.url}
                alt={`Fotografija ture ${index + 1}`}
                className="aspect-[4/3] w-full object-cover"
              />

              {/* Naslovna oznaka */}
              {index === 0 && (
                <div className="absolute left-2 top-2 rounded-full bg-brand px-2 py-1 text-xs font-medium text-white shadow">
                  Naslovna
                </div>
              )}

              {/* Brisanje */}
              <button
                type="button"
                onClick={() => removeImage(index)}
                className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-black/65 text-base text-white shadow"
                aria-label="Obriši fotografiju"
              >
                ✕
              </button>

              {/* Postavi kao naslovnu */}
              {index !== 0 && (
                <button
                  type="button"
                  onClick={() => makeCover(index)}
                  className="absolute bottom-2 left-2 right-2 rounded-lg bg-black/65 px-2 py-2 text-xs font-medium text-white"
                >
                  Postavi kao naslovnu
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Izbor fotografija */}
      {images.length < MAX_IMAGES && (
        <>
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
            multiple
            className="hidden"
            onChange={selectFiles}
          />

          <button
            type="button"
            disabled={uploading}
            onClick={() =>
              inputRef.current?.click()
            }
            className="w-full rounded-xl border-2 border-dashed border-brand/35 bg-brand-light px-4 py-5 text-center text-sm font-medium text-brand-dark disabled:opacity-50"
          >
            {uploading
              ? `Šaljem fotografije... ${progress}%`
              : "📷 + Dodaj fotografije"}
          </button>
        </>
      )}

      {/* Progress bar */}
      {uploading && (
        <div className="h-2 overflow-hidden rounded-full bg-black/10">
          <div
            className="h-full bg-brand transition-all"
            style={{
              width: `${progress}%`,
            }}
          />
        </div>
      )}

      <div className="flex justify-between text-xs text-foreground/45">
        <span>JPG, PNG, WebP, HEIC</span>
        <span>{images.length}/5</span>
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
