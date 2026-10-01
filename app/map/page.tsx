"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import Navbar from "@/app/components/Navbar";
import type {
  TourListItem,
  ActivityType,
} from "@/app/lib-client/types";

/*
 * Leaflet ne radi server-side jer koristi window/document.
 * Zato komponentu mape učitavamo samo u browseru.
 */
const ToursMap = dynamic(
  () => import("@/app/components/ToursMap"),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full w-full items-center justify-center bg-brand-light">
        <div className="text-center">
          <div className="mb-2 text-4xl">🗺️</div>
          <p className="text-sm text-foreground/60">
            Učitavanje mape...
          </p>
        </div>
      </div>
    ),
  }
);

const TRANSPORT_ICONS: Record<string, string> = {
  FOOT: "🥾",
  BIKE: "🚵",
  CAR: "🚗",
  ATV: "🏍️",
  KAYAK: "🛶",
  DIVING: "🤿",
  OTHER: "🌿",
};

export default function MapPage() {
  const [tours, setTours] = useState<TourListItem[]>([]);
  const [activities, setActivities] =
    useState<ActivityType[]>([]);

  const [filter, setFilter] =
    useState<string | null>(null);

  const [sel, setSel] =
    useState<TourListItem | null>(null);

  const [loading, setLoading] =
    useState(true);

  /*
   * Učitavanje vrsta aktivnosti.
   */
  useEffect(() => {
    fetch("/api/activities")
      .then((r) => r.json())
      .then((data) => {
        setActivities(
          data.activities ?? []
        );
      })
      .catch((error) => {
        console.error(
          "Greška pri učitavanju aktivnosti:",
          error
        );
      });
  }, []);

  /*
   * Učitavanje tura.
   *
   * Kada korisnik promijeni filter,
   * API ponovo vraća odgovarajuće ture.
   */
  useEffect(() => {
    setLoading(true);

    const params = filter
      ? `?activityTypeId=${encodeURIComponent(
          filter
        )}`
      : "";

    fetch(`/api/tours${params}`, {
      cache: "no-store",
    })
      .then((r) => r.json())
      .then((data) => {
        setTours(data.tours ?? []);

        /*
         * Ako promijenimo filter,
         * zatvaramo prethodno odabranu turu.
         */
        setSel(null);
      })
      .catch((error) => {
        console.error(
          "Greška pri učitavanju tura:",
          error
        );

        setTours([]);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [filter]);

  /*
   * Na mapu šaljemo samo ture
   * koje imaju ispravne GPS koordinate.
   */
  const mapTours = useMemo(
    () =>
      tours.filter(
        (tour) =>
          tour.route &&
          Number.isFinite(
            tour.route.startLat
          ) &&
          Number.isFinite(
            tour.route.startLng
          )
      ),
    [tours]
  );

  return (
    <div className="flex h-screen flex-col pb-20">
      <Navbar />

      {/* Naslov */}
      <div className="shrink-0 bg-brand px-4 pb-3 pt-4">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-medium text-white">
            Mapa tura
          </h1>

          <span className="text-xs text-white/70">
            {mapTours.length}{" "}
            {mapTours.length === 1
              ? "tura"
              : "tura"}
          </span>
        </div>
      </div>

      {/* Filter aktivnosti */}
      <div className="flex shrink-0 gap-2 overflow-x-auto bg-white px-4 py-2">
        <button
          type="button"
          onClick={() => setFilter(null)}
          className={`shrink-0 rounded-full border px-3 py-1.5 text-xs ${
            !filter
              ? "border-brand bg-brand text-white"
              : "border-black/10 text-foreground/70"
          }`}
        >
          Sve
        </button>

        {activities.map((activity) => (
          <button
            key={activity.id}
            type="button"
            onClick={() =>
              setFilter(activity.id)
            }
            className={`shrink-0 rounded-full border px-3 py-1.5 text-xs ${
              filter === activity.id
                ? "border-brand bg-brand text-white"
                : "border-black/10 text-foreground/70"
            }`}
          >
            {activity.name}
          </button>
        ))}
      </div>

      {/* Prava Leaflet mapa */}
      <div className="relative min-h-0 flex-1">
        {loading ? (
          <div className="flex h-full items-center justify-center bg-brand-light">
            <div className="text-center">
              <div className="mb-2 text-4xl">
                🗺️
              </div>

              <p className="text-sm text-foreground/60">
                Učitavanje tura...
              </p>
            </div>
          </div>
        ) : (
          <ToursMap
            tours={mapTours}
            selectedTourId={
              sel?.id ?? null
            }
            onSelectTour={(tour) =>
              setSel(tour)
            }
          />
        )}

        {!loading &&
          mapTours.length === 0 && (
            <div className="pointer-events-none absolute left-1/2 top-4 z-[500] -translate-x-1/2">
              <div className="rounded-xl bg-white/95 px-4 py-2 text-center text-xs shadow">
                Nema tura sa GPS lokacijom
                za izabrani filter.
              </div>
            </div>
          )}
      </div>

      {/* Odabrana tura */}
      {sel && (
        <div className="shrink-0 border-t border-black/10 bg-white p-4 shadow-lg">
          <div className="flex items-start gap-3">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-brand-light text-2xl">
              {TRANSPORT_ICONS[
                sel.transportMode
              ] ?? "🌿"}
            </div>

            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">
                {sel.title}
              </p>

              <p className="mt-0.5 text-xs text-foreground/55">
                {sel.activityType.name}
                {" · "}
                {sel.guide.fullName}
              </p>

              {sel.route?.startLabel && (
                <p className="mt-1 truncate text-[11px] text-foreground/50">
                  📍{" "}
                  {sel.route.startLabel}
                </p>
              )}

              <div className="mt-2 flex flex-wrap gap-2">
                {sel.route?.distanceKm !=
                  null && (
                  <span className="rounded-full bg-black/5 px-2 py-0.5 text-[11px]">
                    {sel.route.distanceKm} km
                  </span>
                )}

                {sel.route
                  ?.elevationGainM !=
                  null && (
                  <span className="rounded-full bg-black/5 px-2 py-0.5 text-[11px]">
                    ↗ +
                    {
                      sel.route
                        .elevationGainM
                    }{" "}
                    m
                  </span>
                )}

                {sel.avgRating !=
                  null && (
                  <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] text-amber-700">
                    ★{" "}
                    {sel.avgRating.toFixed(
                      1
                    )}
                  </span>
                )}

                <span className="rounded-full bg-brand-light px-2 py-0.5 text-[11px] font-medium text-brand-dark">
                  €{sel.pricePerPerson}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setSel(null)}
              className="text-lg text-foreground/30"
            >
              ✕
            </button>
          </div>

          <Link
            href={`/tours/${sel.id}`}
            className="mt-3 block w-full rounded-xl bg-brand py-3 text-center text-sm font-medium text-white"
          >
            Pogledaj turu
          </Link>
        </div>
      )}
    </div>
  );
}
