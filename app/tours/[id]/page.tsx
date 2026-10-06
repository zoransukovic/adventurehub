"use client";

import {
  useEffect,
  useState,
} from "react";

import {
  useParams,
  useRouter,
} from "next/navigation";

type TourImage = {
  id: string;
  url: string;
  position: number;
};

type Tour = {
  id: string;
  title: string;
  descriptionSr: string;
  descriptionEn: string | null;

  pricePerPerson: number;
  maxParticipants: number;

  durationMinutes: number | null;

  difficulty: string;
  transportMode: string;

  meetingPoint: string | null;

  includesItems: string[];

  active: boolean;

  images: TourImage[];

  activityType: {
    id: string;
    name: string;
    nameEn?: string | null;
    icon?: string;
  };

  guide: {
    id: string;
    fullName: string;
    avatarUrl: string | null;
    guideCertified: boolean;
    guideBio: string | null;
  };

  route: {
    id?: string;
    startLat: number;
    startLng: number;
    endLat: number;
    endLng: number;

    startLabel: string | null;
    endLabel: string | null;

    points: {
      lat: number;
      lng: number;
      elevation?: number;
    }[];

    distanceKm: number | null;
    elevationGainM: number | null;
    estimatedMins: number | null;
  } | null;

  departures: {
    id: string;
    startsAt: string;
    bookingDeadline: string | null;
    spotsLeft: number;
  }[];

  reviews: {
    id: string;
    rating: number;
    comment: string | null;
    createdAt: string;

    author?: {
      id: string;
      fullName: string;
      avatarUrl: string | null;
    };
  }[];

  avgRating: number | null;
  reviewCount: number;
};

const DIFFICULTY: Record<
  string,
  string
> = {
  EASY: "Lako",
  MODERATE: "Umjereno",
  HARD: "Teško",
};

const TRANSPORT: Record<
  string,
  string
> = {
  FOOT: "Pješke",
  BIKE: "Bicikl",
  CAR: "Automobil",
  ATV: "ATV",
  KAYAK: "Kajak",
  DIVING: "Ronjenje",
  OTHER: "Ostalo",
};

function formatDuration(
  minutes: number | null
) {
  if (!minutes) {
    return "Nije navedeno";
  }

  const hours =
    Math.floor(minutes / 60);

  const mins =
    minutes % 60;

  if (hours && mins) {
    return `${hours} h ${mins} min`;
  }

  if (hours) {
    return `${hours} h`;
  }

  return `${mins} min`;
}

function formatDate(
  value: string
) {
  return new Date(
    value
  ).toLocaleString(
    "sr-ME",
    {
      dateStyle: "medium",
      timeStyle: "short",
    }
  );
}

export default function TourPage() {
  const params = useParams();
  const router = useRouter();

  const id =
    params.id as string;

  const [tour, setTour] =
    useState<Tour | null>(
      null
    );

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  /*
   * Trenutno prikazana
   * fotografija.
   */
  const [
    currentImage,
    setCurrentImage,
  ] = useState(0);

  /*
   * Prikaz detalja rute.
   */
  const [
    showRoute,
    setShowRoute,
  ] = useState(false);


const [selectedDepartureId, setSelectedDepartureId] =
  useState("");

const [participantsInput, setParticipantsInput] =
  useState("1");

const [participantsInfo, setParticipantsInfo] =
  useState<
    {
      fullName: string;
      age: string;
    }[]
  >([
    {
      fullName: "",
      age: "",
    },
  ]);

const [booking, setBooking] = useState<{
  loading: boolean;
  done: boolean;
  error: string;
}>({
  loading: false,
  done: false,
  error: "",
});
  
  /*
   * =======================================================
   * UČITAVANJE TURE
   * =======================================================
   */
  useEffect(() => {
    if (!id) {
      return;
    }

    async function loadTour() {
      try {
        setLoading(true);
        setError("");

        const response =
          await fetch(
            `/api/tours/${id}`,
            {
              cache:
                "no-store",
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
              "Tura nije pronađena."
          );
        }

        setTour(data.tour);

        /*
         * Svaki put kada učitamo
         * novu turu krećemo od
         * naslovne fotografije.
         */
        setCurrentImage(0);
      } catch (err) {
        console.error(
          "Greška pri učitavanju ture:",
          err
        );

        setError(
          err instanceof Error
            ? err.message
            : "Došlo je do greške."
        );
      } finally {
        setLoading(false);
      }
    }

    loadTour();
  }, [id]);

  /*
   * =======================================================
   * LOADING
   * =======================================================
   */
  if (loading) {
    return (
      <main className="mx-auto max-w-5xl px-4 py-8">
        <div className="rounded-2xl border border-black/10 bg-white p-8 text-center">
          Učitavanje ture...
        </div>
      </main>
    );
  }

  /*
   * =======================================================
   * GREŠKA
   * =======================================================
   */
  if (
    error ||
    !tour
  ) {
    return (
      <main className="mx-auto max-w-5xl px-4 py-8">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700">
          {error ||
            "Tura nije pronađena."}
        </div>

        <button
          type="button"
          onClick={() =>
            router.back()
          }
          className="mt-4 rounded-xl border border-black/10 bg-white px-4 py-2 text-sm font-medium"
        >
          ← Nazad
        </button>
      </main>
    );
  }

  /*
   * Fotografije već dolaze
   * sortirane po position iz API-ja,
   * ali ih dodatno sortiramo radi
   * sigurnosti.
   */
  const images = [
    ...(tour.images ?? []),
  ].sort(
    (a, b) =>
      a.position -
      b.position
  );

  const hasImages =
    images.length > 0;

  const hasMultipleImages =
    images.length > 1;

  const selectedImage =
    images[currentImage];

  function previousImage() {
    if (
      images.length <= 1
    ) {
      return;
    }

    setCurrentImage(
      (current) =>
        current === 0
          ? images.length - 1
          : current - 1
    );
  }

  function nextImage() {
    if (images.length <= 1) {
      return;
    }

    setCurrentImage((current) =>
      current === images.length - 1 ? 0 : current + 1
    );
  }

  const selectedDeparture = tour.departures.find(
    (d) => d.id === selectedDepartureId
  );

  const maxAvailable =
    selectedDeparture?.spotsLeft ?? tour.maxParticipants ?? 1;

  function resizeParticipants(count: number) {
    setParticipantsInfo((current) => {
      const next = [...current];

      while (next.length < count) {
        next.push({ fullName: "", age: "" });
      }

      return next.slice(0, count);
    });
  }

  function changeParticipantCount(value: string) {
    if (value === "") {
      setParticipantsInput("");
      return;
    }

    if (!/^\d+$/.test(value)) return;

    const count = Number(value);

    if (count > maxAvailable) {
      setParticipantsInput(String(maxAvailable));
      resizeParticipants(maxAvailable);
      return;
    }

    setParticipantsInput(value);
    if (count >= 1) resizeParticipants(count);
  }

  function participantBlur() {
    const count = Number(participantsInput);

    if (participantsInput === "" || !Number.isInteger(count) || count < 1) {
      setParticipantsInput("1");
      resizeParticipants(1);
      return;
    }

    if (count > maxAvailable) {
      setParticipantsInput(String(maxAvailable));
      resizeParticipants(maxAvailable);
    }
  }

  function updateParticipant(
    index: number,
    field: "fullName" | "age",
    value: string
  ) {
    setParticipantsInfo((current) =>
      current.map((person, i) =>
        i === index ? { ...person, [field]: value } : person
      )
    );
  }

  async function bookTour() {
    if (!selectedDepartureId) {
      setBooking({ loading: false, done: false, error: "Izaberite termin polaska." });
      return;
    }

    const count = Number(participantsInput);

    if (!Number.isInteger(count) || count < 1) {
      setBooking({ loading: false, done: false, error: "Unesite ispravan broj učesnika." });
      return;
    }

    if (count > maxAvailable) {
      setBooking({ loading: false, done: false, error: `Dostupno je najviše ${maxAvailable} mjesta.` });
      return;
    }

    for (let i = 0; i < count; i++) {
      const person = participantsInfo[i];

      if (!person || person.fullName.trim().length < 3) {
        setBooking({ loading: false, done: false, error: `Unesite ime i prezime za učesnika ${i + 1}.` });
        return;
      }

      const age = Number(person.age);
      if (!Number.isInteger(age) || age < 1 || age > 120) {
        setBooking({ loading: false, done: false, error: `Unesite ispravnu starost za učesnika ${i + 1}.` });
        return;
      }
    }

    setBooking({ loading: true, done: false, error: "" });

    try {
      const response = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tourId: id,
          departureId: selectedDepartureId,
          participants: count,
          participantsInfo: participantsInfo.slice(0, count).map((person) => ({
            fullName: person.fullName.trim(),
            age: Number(person.age),
          })),
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (response.status === 401) {
        router.push("/login");
        return;
      }

      if (!response.ok) {
        setBooking({ loading: false, done: false, error: data.error || "Rezervacija nije uspjela." });
        return;
      }

      setBooking({ loading: false, done: true, error: "" });

      setTour((current) => {
        if (!current) return current;
        return {
          ...current,
          departures: current.departures.map((departure) =>
            departure.id === selectedDepartureId
              ? { ...departure, spotsLeft: departure.spotsLeft - count }
              : departure
          ),
        };
      });
    } catch {
      setBooking({ loading: false, done: false, error: "Došlo je do greške. Pokušajte ponovo." });
    }
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-6 sm:py-8">
      {/* NAZAD */}
      <button
        type="button"
        onClick={() =>
          router.back()
        }
        className="mb-4 text-sm font-medium text-brand-dark hover:underline"
      >
        ← Nazad
      </button>

      <div className="overflow-hidden rounded-2xl border border-black/10 bg-white shadow-sm">

        {/* =============================================== */}
        {/* GALERIJA FOTOGRAFIJA */}
        {/* =============================================== */}

        {hasImages &&
        selectedImage ? (
          <div>
            <div className="relative bg-black">
              <img
                src={
                  selectedImage.url
                }
                alt={`${tour.title} - fotografija ${
                  currentImage +
                  1
                }`}
                className="h-64 w-full object-cover sm:h-80 md:h-[430px]"
              />

              {/* Brojač */}
              {hasMultipleImages && (
                <div className="absolute right-3 top-3 rounded-full bg-black/65 px-3 py-1.5 text-xs font-medium text-white shadow">
                  {currentImage +
                    1}{" "}
                  /{" "}
                  {
                    images.length
                  }
                </div>
              )}

              {/* Lijeva strelica */}
              {hasMultipleImages && (
                <button
                  type="button"
                  onClick={
                    previousImage
                  }
                  aria-label="Prethodna fotografija"
                  className="absolute left-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/55 text-3xl leading-none text-white shadow transition hover:bg-black/75"
                >
                  ‹
                </button>
              )}

              {/* Desna strelica */}
              {hasMultipleImages && (
                <button
                  type="button"
                  onClick={
                    nextImage
                  }
                  aria-label="Sljedeća fotografija"
                  className="absolute right-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/55 text-3xl leading-none text-white shadow transition hover:bg-black/75"
                >
                  ›
                </button>
              )}
            </div>

            {/* Male fotografije */}
            {hasMultipleImages && (
              <div className="flex gap-2 overflow-x-auto border-b border-black/10 bg-white p-3">
                {images.map(
                  (
                    image,
                    index
                  ) => (
                    <button
                      key={
                        image.id
                      }
                      type="button"
                      onClick={() =>
                        setCurrentImage(
                          index
                        )
                      }
                      className={`shrink-0 overflow-hidden rounded-xl border-2 transition ${
                        currentImage ===
                        index
                          ? "border-brand"
                          : "border-transparent opacity-70 hover:opacity-100"
                      }`}
                      aria-label={`Prikaži fotografiju ${
                        index +
                        1
                      }`}
                    >
                      <img
                        src={
                          image.url
                        }
                        alt={`${tour.title} ${
                          index +
                          1
                        }`}
                        className="h-16 w-24 object-cover sm:h-20 sm:w-28"
                      />
                    </button>
                  )
                )}
              </div>
            )}
          </div>
        ) : (
          /*
           * Stare ture bez fotografija.
           */
          <div className="flex h-48 items-center justify-center bg-brand-light sm:h-56">
            <div className="text-center">
              <div className="text-5xl">
                📍
              </div>

              <div className="mt-2 text-sm font-medium text-brand-dark">
                {
                  tour
                    .activityType
                    .name
                }
              </div>
            </div>
          </div>
        )}

        {/* =============================================== */}
        {/* OSNOVNI PODACI */}
        {/* =============================================== */}

        <div className="p-5 sm:p-7">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="mb-2 text-sm font-medium text-brand">
                {
                  tour
                    .activityType
                    .name
                }
              </div>

              <h1 className="text-2xl font-bold sm:text-3xl">
                {tour.title}
              </h1>

              <div className="mt-3 flex flex-wrap gap-2 text-sm text-foreground/65">
                <span className="rounded-full bg-black/5 px-3 py-1">
                  {
                    DIFFICULTY[
                      tour
                        .difficulty
                    ] ??
                    tour.difficulty
                  }
                </span>

                <span className="rounded-full bg-black/5 px-3 py-1">
                  {
                    TRANSPORT[
                      tour
                        .transportMode
                    ] ??
                    tour
                      .transportMode
                  }
                </span>

                <span className="rounded-full bg-black/5 px-3 py-1">
                  ⏱{" "}
                  {formatDuration(
                    tour.durationMinutes
                  )}
                </span>
              </div>
            </div>

            <div className="shrink-0 sm:text-right">
              <div className="text-3xl font-bold text-brand-dark">
                €
                {
                  tour.pricePerPerson
                }
              </div>

              <div className="text-sm text-foreground/50">
                po osobi
              </div>
            </div>
          </div>

          {/* OCJENA */}

          <div className="mt-5 flex items-center gap-2 text-sm">
            <span className="text-lg">
              ⭐
            </span>

            {tour.avgRating !==
            null ? (
              <>
                <strong>
                  {tour.avgRating.toFixed(
                    1
                  )}
                </strong>

                <span className="text-foreground/50">
                  (
                  {
                    tour.reviewCount
                  }{" "}
                  recenzija)
                </span>
              </>
            ) : (
              <span className="text-foreground/50">
                Još nema recenzija
              </span>
            )}
          </div>

          {/* OPIS */}

          <section className="mt-7">
            <h2 className="text-lg font-semibold">
              Opis ture
            </h2>

            <p className="mt-2 whitespace-pre-line leading-7 text-foreground/75">
              {
                tour.descriptionSr
              }
            </p>
          </section>

          {/* ============================================= */}
          {/* DETALJI */}
          {/* ============================================= */}

          <section className="mt-7">
            <h2 className="text-lg font-semibold">
              Detalji
            </h2>

            <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <div className="rounded-xl bg-black/[0.03] p-4">
                <div className="text-xs text-foreground/50">
                  Maksimalno učesnika
                </div>

                <div className="mt-1 font-semibold">
                  {
                    tour.maxParticipants
                  }
                </div>
              </div>

              <div className="rounded-xl bg-black/[0.03] p-4">
                <div className="text-xs text-foreground/50">
                  Trajanje
                </div>

                <div className="mt-1 font-semibold">
                  {formatDuration(
                    tour.durationMinutes
                  )}
                </div>
              </div>

              <div className="rounded-xl bg-black/[0.03] p-4">
                <div className="text-xs text-foreground/50">
                  Prevoz
                </div>

                <div className="mt-1 font-semibold">
                  {
                    TRANSPORT[
                      tour
                        .transportMode
                    ] ??
                    tour
                      .transportMode
                  }
                </div>
              </div>

              {tour.route
                ?.distanceKm !=
                null && (
                <div className="rounded-xl bg-black/[0.03] p-4">
                  <div className="text-xs text-foreground/50">
                    Dužina rute
                  </div>

                  <div className="mt-1 font-semibold">
                    {
                      tour
                        .route
                        .distanceKm
                    }{" "}
                    km
                  </div>
                </div>
              )}

              {tour.route
                ?.elevationGainM !=
                null && (
                <div className="rounded-xl bg-black/[0.03] p-4">
                  <div className="text-xs text-foreground/50">
                    Uspon
                  </div>

                  <div className="mt-1 font-semibold">
                    +
                    {
                      tour
                        .route
                        .elevationGainM
                    }{" "}
                    m
                  </div>
                </div>
              )}

              {tour.meetingPoint && (
                <div className="rounded-xl bg-black/[0.03] p-4">
                  <div className="text-xs text-foreground/50">
                    Mjesto sastanka
                  </div>

                  <div className="mt-1 font-semibold">
                    {
                      tour.meetingPoint
                    }
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* ============================================= */}
          {/* UKLJUČENO */}
          {/* ============================================= */}

          {tour.includesItems
            .length >
            0 && (
            <section className="mt-7">
              <h2 className="text-lg font-semibold">
                Uključeno u cijenu
              </h2>

              <div className="mt-3 flex flex-wrap gap-2">
                {tour.includesItems.map(
                  (
                    item,
                    index
                  ) => (
                    <span
                      key={`${item}-${index}`}
                      className="rounded-full bg-brand-light px-3 py-2 text-sm text-brand-dark"
                    >
                      ✓ {item}
                    </span>
                  )
                )}
              </div>
            </section>
          )}

          {/* ============================================= */}
          {/* VODIČ */}
          {/* ============================================= */}

          <section className="mt-7">
            <h2 className="text-lg font-semibold">
              Vodič
            </h2>

            <div className="mt-3 rounded-xl border border-black/10 p-4">
              <div className="flex items-center gap-3">
                {tour.guide
                  .avatarUrl ? (
                  <img
                    src={
                      tour.guide
                        .avatarUrl
                    }
                    alt={
                      tour.guide
                        .fullName
                    }
                    className="h-12 w-12 rounded-full object-cover"
                  />
                ) : (
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-light text-lg font-semibold text-brand-dark">
                    {tour.guide.fullName
                      .charAt(0)
                      .toUpperCase()}
                  </div>
                )}

                <div>
                  <div className="font-semibold">
                    {
                      tour.guide
                        .fullName
                    }

                    {tour.guide
                      .guideCertified && (
                      <span
                        className="ml-2"
                        title="Verifikovani vodič"
                      >
                        ✓
                      </span>
                    )}
                  </div>

                  {tour.guide
                    .guideCertified && (
                    <div className="text-xs text-brand">
                      Verifikovani vodič
                    </div>
                  )}
                </div>
              </div>

              {tour.guide
                .guideBio && (
                <p className="mt-3 text-sm leading-6 text-foreground/65">
                  {
                    tour.guide
                      .guideBio
                  }
                </p>
              )}
            </div>
          </section>

          {/* ============================================= */}
{/* REZERVACIJA */}
{/* ============================================= */}

<section className="mt-7">
  <h2 className="text-lg font-semibold">
    Rezerviši turu
  </h2>

  {tour.departures.length === 0 ? (
    <div className="mt-3 rounded-xl bg-black/[0.03] p-4 text-sm text-foreground/55">
      Trenutno nema dostupnih budućih termina.
    </div>
  ) : (
    <div className="mt-3 rounded-2xl border border-black/10 p-4">

      {/* TERMIN */}

      <label className="mb-1 block text-xs text-foreground/60">
        Termin polaska
      </label>

      <select
        value={selectedDepartureId}
        onChange={(e) => {
          const departureId = e.target.value;

          setSelectedDepartureId(departureId);

          setBooking({
            loading: false,
            done: false,
            error: "",
          });

          const departure =
            tour.departures.find(
              (d) => d.id === departureId
            );

          if (departure) {
            const current =
              Number(participantsInput);

            if (
              Number.isInteger(current) &&
              current > departure.spotsLeft
            ) {
              const next = Math.max(
                1,
                departure.spotsLeft
              );

              setParticipantsInput(
                String(next)
              );

              resizeParticipants(next);
            }
          }
        }}
        className="w-full rounded-xl border border-black/10 bg-white px-3 py-3 text-sm"
      >
        <option value="">
          Izaberite termin
        </option>

        {tour.departures.map((departure) => (
          <option
            key={departure.id}
            value={departure.id}
            disabled={departure.spotsLeft < 1}
          >
            {formatDate(departure.startsAt)}
            {" · "}
            {departure.spotsLeft} slobodnih mjesta
          </option>
        ))}
      </select>

      {/* BROJ UČESNIKA */}

      <div className="mt-4">
        <label className="mb-1 block text-xs text-foreground/60">
          Broj učesnika
        </label>

        <input
          type="number"
          inputMode="numeric"
          min={1}
          max={maxAvailable}
          value={participantsInput}
          onChange={(e) =>
            changeParticipantCount(
              e.target.value
            )
          }
          onBlur={participantBlur}
          className="w-full rounded-xl border border-black/10 px-3 py-3 text-sm outline-none focus:border-brand"
        />

        {selectedDeparture && (
          <p className="mt-1 text-xs text-foreground/50">
            Dostupno:{" "}
            {selectedDeparture.spotsLeft} mjesta
          </p>
        )}
      </div>

      {/* PODACI UČESNIKA */}

      {participantsInput !== "" &&
        Number(participantsInput) >= 1 && (
          <div className="mt-5">
            <h3 className="font-medium">
              Podaci o učesnicima
            </h3>

            <p className="mt-1 text-xs text-foreground/50">
              Unesite ime i prezime i starost
              za svaku osobu.
            </p>

            <div className="mt-3 space-y-3">
              {participantsInfo
                .slice(
                  0,
                  Number(participantsInput)
                )
                .map((person, index) => (
                  <div
                    key={index}
                    className="rounded-xl border border-black/10 p-3"
                  >
                    <div className="mb-2 text-sm font-medium text-brand-dark">
                      Učesnik {index + 1}
                    </div>

                    <label className="mb-1 block text-xs text-foreground/60">
                      Ime i prezime
                    </label>

                    <input
                      type="text"
                      value={person.fullName}
                      onChange={(e) =>
                        updateParticipant(
                          index,
                          "fullName",
                          e.target.value
                        )
                      }
                      placeholder="npr. Marko Marković"
                      className="w-full rounded-xl border border-black/10 px-3 py-2.5 text-sm outline-none focus:border-brand"
                    />

                    <label className="mb-1 mt-3 block text-xs text-foreground/60">
                      Starost
                    </label>

                    <input
                      type="number"
                      min={1}
                      max={120}
                      value={person.age}
                      onChange={(e) =>
                        updateParticipant(
                          index,
                          "age",
                          e.target.value
                        )
                      }
                      placeholder="npr. 35"
                      className="w-full rounded-xl border border-black/10 px-3 py-2.5 text-sm outline-none focus:border-brand"
                    />
                  </div>
                ))}
            </div>
          </div>
        )}

      {/* UKUPNO */}

      <div className="mt-5 flex items-center justify-between border-t border-black/10 pt-4">
        <span className="text-sm text-foreground/60">
          Ukupno:
        </span>

        <span className="text-xl font-bold text-brand-dark">
          €
          {(
            tour.pricePerPerson *
            (Number(participantsInput) || 0)
          ).toFixed(2)}
        </span>
      </div>

      {/* GREŠKA */}

      {booking.error && (
        <div className="mt-3 rounded-xl bg-red-50 p-3 text-sm text-red-600">
          {booking.error}
        </div>
      )}

      {/* USPJEŠNA REZERVACIJA */}

      {booking.done ? (
        <div className="mt-3 rounded-xl bg-brand-light p-4 text-sm font-medium text-brand-dark">
          ✓ Rezervacija je uspješno poslata!
        </div>
      ) : (
        <button
          type="button"
          onClick={bookTour}
          disabled={
            booking.loading ||
            !selectedDepartureId ||
            participantsInput === "" ||
            Number(participantsInput) < 1 ||
            (selectedDeparture?.spotsLeft ?? 0) < 1
          }
          className="mt-4 w-full rounded-xl bg-brand px-4 py-3 font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          {booking.loading
            ? "Rezervisanje..."
            : `Rezerviši za €${(
                tour.pricePerPerson *
                (Number(participantsInput) || 0)
              ).toFixed(2)}`}
        </button>
      )}
    </div>
  )}
</section>

          {/* ============================================= */}
          {/* RUTA */}
          {/* ============================================= */}

          {tour.route && (
            <section className="mt-7">
              <div className="flex items-center justify-between gap-4">
                <h2 className="text-lg font-semibold">
                  Ruta
                </h2>

                <button
                  type="button"
                  onClick={() =>
                    setShowRoute(
                      (
                        current
                      ) =>
                        !current
                    )
                  }
                  className="rounded-xl border border-black/10 px-3 py-2 text-sm font-medium"
                >
                  {showRoute
                    ? "Sakrij detalje"
                    : "Prikaži detalje"}
                </button>
              </div>

              {showRoute && (
                <div className="mt-3 rounded-xl bg-black/[0.03] p-4">
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div>
                      <div className="text-xs text-foreground/50">
                        Dužina
                      </div>

                      <div className="font-semibold">
                        {tour.route
                          .distanceKm ??
                          "—"}{" "}
                        {tour.route
                          .distanceKm !=
                        null
                          ? "km"
                          : ""}
                      </div>
                    </div>

                    <div>
                      <div className="text-xs text-foreground/50">
                        Uspon
                      </div>

                      <div className="font-semibold">
                        {tour.route
                          .elevationGainM !=
                        null
                          ? `+${tour.route.elevationGainM} m`
                          : "—"}
                      </div>
                    </div>

                    <div>
                      <div className="text-xs text-foreground/50">
                        Procijenjeno vrijeme
                      </div>

                      <div className="font-semibold">
                        {tour.route
                          .estimatedMins !=
                        null
                          ? formatDuration(
                              tour
                                .route
                                .estimatedMins
                            )
                          : "—"}
                      </div>
                    </div>
                  </div>

                  {tour.route
                    .startLabel && (
                    <div className="mt-4 text-sm">
                      <strong>
                        Početak:
                      </strong>{" "}
                      {
                        tour.route
                          .startLabel
                      }
                    </div>
                  )}

                  {tour.route
                    .endLabel && (
                    <div className="mt-1 text-sm">
                      <strong>
                        Kraj:
                      </strong>{" "}
                      {
                        tour.route
                          .endLabel
                      }
                    </div>
                  )}
                </div>
              )}
            </section>
          )}

          {/* ============================================= */}
          {/* RECENZIJE */}
          {/* ============================================= */}

          <section className="mt-7">
            <h2 className="text-lg font-semibold">
              Recenzije
            </h2>

            {tour.reviews
              .length >
            0 ? (
              <div className="mt-3 space-y-3">
                {tour.reviews.map(
                  (
                    review
                  ) => (
                    <div
                      key={
                        review.id
                      }
                      className="rounded-xl border border-black/10 p-4"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="font-medium">
                          {review
                            .author
                            ?.fullName ??
                            "Korisnik"}
                        </div>

                        <div>
                          {"⭐".repeat(
                            Math.max(
                              0,
                              Math.min(
                                5,
                                review.rating
                              )
                            )
                          )}
                        </div>
                      </div>

                      {review.comment && (
                        <p className="mt-2 text-sm leading-6 text-foreground/65">
                          {
                            review.comment
                          }
                        </p>
                      )}
                    </div>
                  )
                )}
              </div>
            ) : (
              <div className="mt-3 rounded-xl bg-black/[0.03] p-4 text-sm text-foreground/55">
                Ova tura još nema
                recenzija.
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
