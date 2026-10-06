"use client";

import {
  useEffect,
  useState,
  useCallback,
  useMemo,
} from "react";

import Link from "next/link";

import type {
  ActivityType,
  TourListItem,
} from "@/app/lib-client/types";

const TRANSPORT_ICONS: Record<
  string,
  string
> = {
  FOOT: "🥾",
  BIKE: "🚵",
  CAR: "🚗",
  ATV: "🏍️",
  KAYAK: "🛶",
  DIVING: "🤿",
  OTHER: "🌿",
};

const DIFF_LABELS: Record<
  string,
  string
> = {
  EASY: "Lako",
  MODERATE: "Umjereno",
  HARD: "Teško",
};

type SortMode =
  | "recommended"
  | "newest"
  | "nearest"
  | "rating"
  | "priceAsc"
  | "priceDesc";

type UserPosition = {
  lat: number;
  lng: number;
};

function distanceKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
) {
  const earthRadiusKm = 6371;

  const toRadians = (
    value: number
  ) => (value * Math.PI) / 180;

  const dLat =
    toRadians(lat2 - lat1);

  const dLng =
    toRadians(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) *
      Math.sin(dLat / 2) +
    Math.cos(
      toRadians(lat1)
    ) *
      Math.cos(
        toRadians(lat2)
      ) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  const c =
    2 *
    Math.atan2(
      Math.sqrt(a),
      Math.sqrt(1 - a)
    );

  return earthRadiusKm * c;
}

export default function DashboardPage() {
  const [activities, setActivities] =
    useState<ActivityType[]>([]);

  const [tours, setTours] =
    useState<TourListItem[]>([]);

  const [filter, setFilter] =
    useState<string | null>(
      null
    );

  const [search, setSearch] =
    useState("");

  const [loading, setLoading] =
    useState(true);

  const [sortMode, setSortMode] =
    useState<SortMode>(
      "recommended"
    );

  const [
    userPosition,
    setUserPosition,
  ] =
    useState<UserPosition | null>(
      null
    );

  const [
    locationLoading,
    setLocationLoading,
  ] = useState(false);

  const [
    locationError,
    setLocationError,
  ] =
    useState<string | null>(
      null
    );

  const load = useCallback(
    async (
      actId: string | null,
      q: string
    ) => {
      const params =
        new URLSearchParams();

      if (actId) {
        params.set(
          "activityTypeId",
          actId
        );
      }

      if (q) {
        params.set(
          "search",
          q
        );
      }

      const res = await fetch(
        `/api/tours?${params}`
      );

      const data =
        await res.json();

      setTours(
        data.tours ?? []
      );
    },
    []
  );

  useEffect(() => {
    Promise.all([
      fetch(
        "/api/activities"
      ).then((r) =>
        r.json()
      ),

      load(null, ""),
    ]).then(([a]) => {
      setActivities(
        a.activities ?? []
      );

      setLoading(false);
    });
  }, [load]);

  useEffect(() => {
    const timer =
      setTimeout(
        () =>
          load(
            filter,
            search
          ),
        300
      );

    return () =>
      clearTimeout(timer);
  }, [
    filter,
    search,
    load,
  ]);

  function requestLocation() {
    setLocationError(null);

    if (
      !navigator.geolocation
    ) {
      setLocationError(
        "Ovaj uređaj ne podržava određivanje lokacije."
      );

      return;
    }

    setLocationLoading(true);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserPosition({
          lat:
            position.coords
              .latitude,

          lng:
            position.coords
              .longitude,
        });

        setLocationLoading(
          false
        );
      },

      () => {
        setLocationLoading(
          false
        );

        setLocationError(
          "Lokacija nije dostupna. Provjerite da li ste dozvolili pristup lokaciji."
        );
      },

      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000,
      }
    );
  }

  function handleSortChange(
    value: SortMode
  ) {
    setSortMode(value);
    setLocationError(null);

    if (
      value === "nearest" &&
      !userPosition
    ) {
      requestLocation();
    }
  }

  const sortedTours =
    useMemo(() => {
      const result = [
        ...tours,
      ];

      if (
        sortMode ===
        "recommended"
      ) {
        result.sort(
          (a, b) => {
            if (
              a.featured !==
              b.featured
            ) {
              return a.featured
                ? -1
                : 1;
            }

            if (
              a.featured &&
              b.featured
            ) {
              const orderA =
                a.featuredOrder ??
                Number.MAX_SAFE_INTEGER;

              const orderB =
                b.featuredOrder ??
                Number.MAX_SAFE_INTEGER;

              if (
                orderA !== orderB
              ) {
                return (
                  orderA -
                  orderB
                );
              }
            }

            return (
              new Date(
                b.createdAt
              ).getTime() -
              new Date(
                a.createdAt
              ).getTime()
            );
          }
        );
      }

      if (
        sortMode ===
        "newest"
      ) {
        result.sort(
          (a, b) =>
            new Date(
              b.createdAt
            ).getTime() -
            new Date(
              a.createdAt
            ).getTime()
        );
      }

      if (
        sortMode ===
        "rating"
      ) {
        result.sort(
          (a, b) => {
            const ratingDiff =
              (b.avgRating ??
                0) -
              (a.avgRating ??
                0);

            if (
              ratingDiff !== 0
            ) {
              return ratingDiff;
            }

            return (
              b.reviewCount -
              a.reviewCount
            );
          }
        );
      }

      if (
        sortMode ===
        "priceAsc"
      ) {
        result.sort(
          (a, b) =>
            a.pricePerPerson -
            b.pricePerPerson
        );
      }

      if (
        sortMode ===
        "priceDesc"
      ) {
        result.sort(
          (a, b) =>
            b.pricePerPerson -
            a.pricePerPerson
        );
      }

      if (
        sortMode ===
          "nearest" &&
        userPosition
      ) {
        result.sort(
          (a, b) => {
            const routeA =
              a.route;

            const routeB =
              b.route;

            if (
              !routeA &&
              !routeB
            ) {
              return 0;
            }

            if (!routeA) {
              return 1;
            }

            if (!routeB) {
              return -1;
            }

            const distanceA =
              distanceKm(
                userPosition.lat,
                userPosition.lng,
                routeA.startLat,
                routeA.startLng
              );

            const distanceB =
              distanceKm(
                userPosition.lat,
                userPosition.lng,
                routeB.startLat,
                routeB.startLng
              );

            return (
              distanceA -
              distanceB
            );
          }
        );
      }

      return result;
    }, [
      tours,
      sortMode,
      userPosition,
    ]);

  return (
    <div className="min-h-screen">
      {/* HEADER */}
      <div className="sticky top-0 z-10 bg-brand px-4 pb-4 pt-5">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-medium text-white">
              Istraži ture
            </h1>

            <p className="text-sm text-white/70">
              Explore adventures ·
              Crna Gora
            </p>
          </div>
        </div>

        <input
          value={search}
          onChange={(e) =>
            setSearch(
              e.target.value
            )
          }
          placeholder="🔍 Pretraži ture..."
          className="w-full rounded-xl bg-white/20 px-4 py-3 text-base text-white placeholder:text-white/60 outline-none"
        />
      </div>

      {/* FILTERI */}
      <div className="flex gap-2 overflow-x-auto px-4 py-3 scrollbar-none">
        <button
          onClick={() =>
            setFilter(null)
          }
          className={`shrink-0 rounded-full border px-4 py-2 text-sm ${
            filter === null
              ? "border-brand bg-brand text-white"
              : "border-black/10 text-foreground/70"
          }`}
        >
          Sve
        </button>

        {activities.map(
          (activity) => (
            <button
              key={
                activity.id
              }
              onClick={() =>
                setFilter(
                  activity.id
                )
              }
              className={`shrink-0 rounded-full border px-4 py-2 text-sm ${
                filter ===
                activity.id
                  ? "border-brand bg-brand text-white"
                  : "border-black/10 text-foreground/70"
              }`}
            >
              {
                activity.name
              }
            </button>
          )
        )}
      </div>

      {/* SORTIRANJE */}
      <div className="px-4 pb-3">
        <div className="flex flex-col gap-2 rounded-xl border border-black/8 bg-white p-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-medium text-foreground/60">
              Sortiraj ture
            </p>

            {sortMode ===
              "nearest" &&
              userPosition && (
                <p className="mt-1 text-xs text-brand">
                  ✓ Lokacija
                  pronađena
                </p>
              )}

            {sortMode ===
              "nearest" &&
              locationLoading && (
                <p className="mt-1 text-xs text-foreground/50">
                  Određivanje
                  lokacije...
                </p>
              )}
          </div>

          <select
            value={sortMode}
            onChange={(e) =>
              handleSortChange(
                e.target
                  .value as SortMode
              )
            }
            className="rounded-xl border border-black/10 bg-white px-3 py-2.5 text-sm outline-none focus:border-brand"
          >
            <option value="recommended">
              Preporučeno
            </option>

            <option value="newest">
              Najnovije
            </option>

            <option value="nearest">
              Najbliže meni
            </option>

            <option value="rating">
              Najbolje
              ocijenjene
            </option>

            <option value="priceAsc">
              Cijena: niža
              prvo
            </option>

            <option value="priceDesc">
              Cijena: viša
              prvo
            </option>
          </select>
        </div>

        {sortMode ===
          "nearest" &&
          locationError && (
            <div className="mt-2 rounded-xl bg-amber-50 p-3 text-xs text-amber-800">
              {locationError}

              <button
                type="button"
                onClick={
                  requestLocation
                }
                className="ml-2 font-medium underline"
              >
                Pokušaj ponovo
              </button>
            </div>
          )}
      </div>

      {/* TURE */}
      <div className="px-4 pb-24">
        {loading && (
          <p className="py-8 text-center text-sm text-foreground/40">
            Učitavanje...
          </p>
        )}

        {!loading &&
          sortedTours.length ===
            0 && (
            <p className="py-8 text-center text-sm text-foreground/40">
              Nema tura za
              izabrani filter.
            </p>
          )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sortedTours.map(
            (tour) => {
              const coverImage =
                tour.images?.[0]
                  ?.url;

              const icon =
                TRANSPORT_ICONS[
                  tour.transportMode
                ] ?? "🌿";

              let userDistance:
                | number
                | null = null;

              if (
                userPosition &&
                tour.route
              ) {
                userDistance =
                  distanceKm(
                    userPosition.lat,
                    userPosition.lng,
                    tour.route
                      .startLat,
                    tour.route
                      .startLng
                  );
              }

              return (
                <Link
                  key={tour.id}
                  href={`/tours/${tour.id}`}
                  className="block overflow-hidden rounded-2xl border border-black/8 bg-white shadow-sm transition hover:shadow-md"
                >
                  {/* FOTOGRAFIJA */}
                  <div className="relative aspect-[3/2] w-full overflow-hidden bg-brand-light">
                    {coverImage ? (
                      <img
                        src={
                          coverImage
                        }
                        alt={
                          tour.title
                        }
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center">
                        <div className="text-center">
                          <div className="text-5xl">
                            {
                              icon
                            }
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

                    {tour.featured && (
                      <div className="absolute left-3 top-3 rounded-full bg-white/95 px-3 py-1.5 text-xs font-medium text-amber-700 shadow-sm">
                        ★ Istaknuto
                      </div>
                    )}
                  </div>

                  {/* PODACI */}
                  <div className="p-4">
                    <div className="text-lg font-medium text-foreground">
                      {
                        tour.title
                      }
                    </div>

                    <div className="mt-1 text-sm text-foreground/55">
                      Vodič:{" "}
                      {
                        tour.guide
                          .fullName
                      }

                      {tour.guide
                        .guideCertified
                        ? " ✓"
                        : ""}
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      {!!tour.route
                        ?.distanceKm && (
                        <span className="rounded-full bg-black/5 px-2.5 py-1 text-xs">
                          {
                            tour
                              .route
                              .distanceKm
                          }{" "}
                          km
                        </span>
                      )}

                      <span className="rounded-full bg-black/5 px-2.5 py-1 text-xs">
                        {
                          DIFF_LABELS[
                            tour
                              .difficulty
                          ]
                        }
                      </span>

                      {!!tour.avgRating && (
                        <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs text-amber-700">
                          ★{" "}
                          {tour.avgRating.toFixed(
                            1
                          )}{" "}
                          (
                          {
                            tour.reviewCount
                          }
                          )
                        </span>
                      )}

                      {tour
                        .departures[0] && (
                        <span className="rounded-full bg-black/5 px-2.5 py-1 text-xs">
                          {
                            tour
                              .departures[0]
                              .spotsLeft
                          }{" "}
                          mjesta
                        </span>
                      )}

                      {sortMode ===
                        "nearest" &&
                        userDistance !==
                          null && (
                          <span className="rounded-full bg-brand-light px-2.5 py-1 text-xs text-brand-dark">
                            📍{" "}
                            {userDistance <
                            10
                              ? userDistance.toFixed(
                                  1
                                )
                              : Math.round(
                                  userDistance
                                )}{" "}
                            km od vas
                          </span>
                        )}
                    </div>

                    <div className="mt-3 text-base font-medium text-brand-dark">
                      €
                      {
                        tour.pricePerPerson
                      }{" "}
                      po osobi
                    </div>
                  </div>
                </Link>
              );
            }
          )}
        </div>
      </div>
    </div>
  );
}
