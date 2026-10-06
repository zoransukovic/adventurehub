"use client";

import {
  useEffect,
  useState,
  useCallback,
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

export default function DashboardPage() {
  const [activities, setActivities] =
    useState<ActivityType[]>([]);

  const [tours, setTours] =
    useState<TourListItem[]>([]);

  const [filter, setFilter] =
    useState<string | null>(null);

  const [search, setSearch] =
    useState("");

  const [loading, setLoading] =
    useState(true);

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

      const d =
        await res.json();

      setTours(
        d.tours ?? []
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
    const t = setTimeout(
      () =>
        load(
          filter,
          search
        ),
      300
    );

    return () =>
      clearTimeout(t);
  }, [
    filter,
    search,
    load,
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
          (a) => (
            <button
              key={a.id}
              onClick={() =>
                setFilter(
                  a.id
                )
              }
              className={`shrink-0 rounded-full border px-4 py-2 text-sm ${
                filter === a.id
                  ? "border-brand bg-brand text-white"
                  : "border-black/10 text-foreground/70"
              }`}
            >
              {a.name}
            </button>
          )
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
          tours.length ===
            0 && (
            <p className="py-8 text-center text-sm text-foreground/40">
              Nema tura za
              izabrani filter.
            </p>
          )}

        <div className="flex flex-col gap-4">
          {tours.map(
            (t) => {
              /*
               * API vraća fotografije
               * sortirane po position.
               *
               * position 0 =
               * naslovna fotografija.
               */
              const coverImage =
                t.images?.[0]
                  ?.url;

              const icon =
                TRANSPORT_ICONS[
                  t.transportMode
                ] ?? "🌿";

              return (
                <Link
                  key={t.id}
                  href={`/tours/${t.id}`}
                  className="block overflow-hidden rounded-2xl border border-black/8 bg-white shadow-sm transition hover:shadow-md"
                >
                  {/* FOTOGRAFIJA — odnos 3:2 */}
<div className="relative aspect-[3/2] w-full overflow-hidden bg-brand-light">
  {coverImage ? (
    <img
      src={coverImage}
      alt={t.title}
      className="h-full w-full object-cover"
    />
  ) : (
    /*
     * Fallback za stare ture
     * koje nemaju fotografiju.
     */
    <div className="flex h-full items-center justify-center">
      <div className="text-center">
        <div className="text-5xl">
          {icon}
        </div>

        <div className="mt-2 text-sm font-medium text-brand-dark">
          {t.activityType.name}
        </div>
      </div>
    </div>
  )}
</div>
                    {/* OZNAKA AKTIVNOSTI */}
                    <div className="absolute left-3 top-3 flex items-center gap-1.5 rounded-full bg-black/65 px-3 py-1.5 text-sm font-medium text-white shadow">
                      <span>
                        {icon}
                      </span>

                      <span>
                        {
                          t
                            .activityType
                            .name
                        }
                      </span>
                    </div>
                  </div>

                  {/* PODACI TURE */}
                  <div className="p-4">
                    <div className="text-lg font-medium text-foreground">
                      {t.title}
                    </div>

                    <div className="mt-1 text-sm text-foreground/55">
                      Vodič:{" "}
                      {
                        t.guide
                          .fullName
                      }

                      {t.guide
                        .guideCertified
                        ? " ✓"
                        : ""}
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      {!!t.route
                        ?.distanceKm && (
                        <span className="rounded-full bg-black/5 px-2.5 py-1 text-xs">
                          {
                            t
                              .route
                              .distanceKm
                          }{" "}
                          km
                        </span>
                      )}

                      <span className="rounded-full bg-black/5 px-2.5 py-1 text-xs">
                        {
                          DIFF_LABELS[
                            t
                              .difficulty
                          ]
                        }
                      </span>

                      {!!t.avgRating && (
                        <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs text-amber-700">
                          ★{" "}
                          {t.avgRating.toFixed(
                            1
                          )}{" "}
                          (
                          {
                            t.reviewCount
                          }
                          )
                        </span>
                      )}

                      {t
                        .departures[0] && (
                        <span className="rounded-full bg-black/5 px-2.5 py-1 text-xs">
                          {
                            t
                              .departures[0]
                              .spotsLeft
                          }{" "}
                          mjesta
                        </span>
                      )}
                    </div>

                    <div className="mt-3 text-base font-medium text-brand-dark">
                      €
                      {
                        t.pricePerPerson
                      }{" "}
                      / po osobi
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
