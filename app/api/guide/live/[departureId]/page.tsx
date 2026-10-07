"use client";

import {
  useEffect,
  useState,
} from "react";

import {
  useParams,
} from "next/navigation";

import Link from "next/link";
import dynamic from "next/dynamic";

const GuideLiveMap = dynamic(
  () =>
    import(
      "@/app/components/GuideLiveMap"
    ),
  {
    ssr: false,
  }
);

type RoutePoint = {
  lat: number;
  lng: number;
};

type TrackingPoint = {
  id: string;
  lat: number;
  lng: number;
  elevation: number | null;
  speedKmh: number | null;
  recordedAt: string;
};

export type LiveTrackingSession = {
  id: string;

  status: string;

  startedAt: string;
  finishedAt: string | null;

  distanceCoveredKm: number;

  currentLat: number | null;
  currentLng: number | null;

  currentSpeedKmh: number | null;
  currentElevationM: number | null;

  user: {
    id: string;
    fullName: string;
  };

  points: TrackingPoint[];
};

type Departure = {
  id: string;
  startsAt: string;
  spotsLeft: number;

  tour: {
    id: string;
    title: string;

    route: {
      points: unknown;
      distanceKm: number | null;
    } | null;
  };
};

export default function GuideLivePage() {
  const {
    departureId,
  } = useParams<{
    departureId: string;
  }>();

  const [
    departure,
    setDeparture,
  ] =
    useState<Departure | null>(
      null
    );

  const [
    trackingSessions,
    setTrackingSessions,
  ] = useState<
    LiveTrackingSession[]
  >([]);

  const [
    plannedPoints,
    setPlannedPoints,
  ] = useState<RoutePoint[]>([]);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    error,
    setError,
  ] =
    useState<string | null>(
      null
    );

  const [
    lastUpdate,
    setLastUpdate,
  ] =
    useState<Date | null>(
      null
    );

  async function loadLiveData(
    silent = false
  ) {
    try {
      if (!silent) {
        setLoading(true);
      }

      const res = await fetch(
        `/api/guide/live/${departureId}`,
        {
          cache: "no-store",
        }
      );

      const data =
        await res.json();

      if (!res.ok) {
        setError(
          data.error ||
            "Live podaci nijesu dostupni."
        );

        return;
      }

      setError(null);

      setDeparture(
        data.departure
      );

      setTrackingSessions(
        data.trackingSessions ??
          []
      );

      const routePoints =
        data.departure?.tour
          ?.route?.points;

      if (
        Array.isArray(
          routePoints
        )
      ) {
        const valid =
          routePoints.filter(
            (
              point
            ): point is RoutePoint => {
              if (
                !point ||
                typeof point !==
                  "object"
              ) {
                return false;
              }

              const p =
                point as Record<
                  string,
                  unknown
                >;

              return (
                typeof p.lat ===
                  "number" &&
                typeof p.lng ===
                  "number" &&
                Number.isFinite(
                  p.lat
                ) &&
                Number.isFinite(
                  p.lng
                )
              );
            }
          );

        setPlannedPoints(
          valid
        );
      } else {
        setPlannedPoints([]);
      }

      setLastUpdate(
        new Date()
      );
    } catch (err) {
      console.error(
        "Guide live load error:",
        err
      );

      setError(
        "Greška pri učitavanju Live praćenja."
      );
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  }

  useEffect(() => {
    loadLiveData();

    /*
     * Automatsko osvježavanje
     * pozicija svakih 5 sekundi.
     */
    const interval =
      window.setInterval(
        () => {
          loadLiveData(true);
        },
        5000
      );

    return () =>
      window.clearInterval(
        interval
      );
  }, [departureId]);

  function statusLabel(
    status: string
  ) {
    if (
      status === "ACTIVE"
    ) {
      return "🟢 Aktivno";
    }

    if (
      status === "PAUSED"
    ) {
      return "⏸ Pauzirano";
    }

    if (
      status === "FINISHED"
    ) {
      return "🏁 Završeno";
    }

    if (
      status === "SOS"
    ) {
      return "🆘 SOS";
    }

    return status;
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-foreground/50">
        Učitavanje Live
        praćenja...
      </div>
    );
  }

  if (
    error &&
    !departure
  ) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
        <div className="text-4xl">
          ⚠️
        </div>

        <p className="text-sm text-red-600">
          {error}
        </p>

        <Link
          href="/profile"
          className="rounded-xl bg-brand px-5 py-3 text-sm font-medium text-white"
        >
          Nazad na profil
        </Link>
      </div>
    );
  }

  if (!departure) {
    return null;
  }

  const activeCount =
    trackingSessions.filter(
      (item) =>
        item.status ===
        "ACTIVE"
    ).length;

  const sosCount =
    trackingSessions.filter(
      (item) =>
        item.status === "SOS"
    ).length;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-brand px-4 pb-4 pt-5 text-white">
        <div className="flex items-center justify-between gap-3">
          <div>
            <Link
              href="/profile"
              className="text-xs text-white/70"
            >
              ← Nazad
            </Link>

            <h1 className="mt-1 text-lg font-medium">
              📍 Live učesnici
            </h1>

            <p className="mt-0.5 text-xs text-white/70">
              {
                departure.tour
                  .title
              }
            </p>
          </div>

          <div className="text-right">
            <p className="text-sm font-medium">
              {activeCount} aktivnih
            </p>

            <p className="text-[11px] text-white/60">
              {trackingSessions.length}{" "}
              tracking sesija
            </p>
          </div>
        </div>
      </div>

      {sosCount > 0 && (
        <div className="m-4 rounded-xl border border-red-300 bg-red-50 p-4">
          <p className="font-medium text-red-700">
            🆘 SOS UPOZORENJE
          </p>

          <p className="mt-1 text-sm text-red-600">
            {sosCount === 1
              ? "Jedan učesnik je poslao SOS signal."
              : `${sosCount} učesnika je poslalo SOS signal.`}
          </p>
        </div>
      )}

      {error && (
        <div className="mx-4 mt-4 rounded-xl bg-amber-50 p-3 text-xs text-amber-700">
          {error}
        </div>
      )}

      <div className="p-4">
        <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
          <div className="h-[430px]">
            <GuideLiveMap
              plannedPoints={
                plannedPoints
              }
              sessions={
                trackingSessions
              }
            />
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between text-[11px] text-foreground/40">
          <span>
            Automatsko osvježavanje:
            5 s
          </span>

          <span>
            {lastUpdate
              ? `Ažurirano ${lastUpdate.toLocaleTimeString(
                  "sr-Latn",
                  {
                    hour: "2-digit",
                    minute:
                      "2-digit",
                    second:
                      "2-digit",
                  }
                )}`
              : ""}
          </span>
        </div>

        {trackingSessions.length ===
          0 && (
          <div className="mt-4 rounded-xl bg-white p-5 text-center shadow-sm">
            <div className="text-4xl">
              📍
            </div>

            <p className="mt-2 text-sm font-medium">
              Nema aktivnog
              praćenja
            </p>

            <p className="mt-1 text-xs text-foreground/50">
              Učesnici će se
              pojaviti ovdje kada
              pokrenu turu.
            </p>
          </div>
        )}

        {trackingSessions.length >
          0 && (
          <div className="mt-4">
            <h2 className="mb-2 text-sm font-medium">
              Učesnici
            </h2>

            <div className="flex flex-col gap-2">
              {trackingSessions.map(
                (tracking) => (
                  <div
                    key={
                      tracking.id
                    }
                    className={`rounded-xl border bg-white p-3 shadow-sm ${
                      tracking.status ===
                      "SOS"
                        ? "border-red-300"
                        : "border-black/5"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium">
                          {
                            tracking
                              .user
                              .fullName
                          }
                        </p>

                        <p
                          className={`mt-1 text-xs ${
                            tracking.status ===
                            "SOS"
                              ? "font-medium text-red-600"
                              : "text-foreground/50"
                          }`}
                        >
                          {statusLabel(
                            tracking.status
                          )}
                        </p>
                      </div>

                      <div className="text-right">
                        <p className="text-sm font-medium">
                          {tracking.distanceCoveredKm.toFixed(
                            2
                          )}{" "}
                          km
                        </p>

                        <p className="mt-1 text-xs text-foreground/50">
                          {tracking.currentSpeedKmh !=
                          null
                            ? `${tracking.currentSpeedKmh.toFixed(
                                1
                              )} km/h`
                            : "—"}
                        </p>
                      </div>
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                      <div className="rounded-lg bg-black/[0.025] p-2">
                        <span className="text-foreground/40">
                          Visina
                        </span>

                        <p className="mt-0.5 font-medium">
                          {tracking.currentElevationM !=
                          null
                            ? `${tracking.currentElevationM} m`
                            : "—"}
                        </p>
                      </div>

                      <div className="rounded-lg bg-black/[0.025] p-2">
                        <span className="text-foreground/40">
                          GPS tačke
                        </span>

                        <p className="mt-0.5 font-medium">
                          {
                            tracking
                              .points
                              .length
                          }
                        </p>
                      </div>
                    </div>
                  </div>
                )
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
