"use client";

import {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  useParams,
  useRouter,
} from "next/navigation";

import Link from "next/link";
import dynamic from "next/dynamic";

const TrackingMap = dynamic(
  () =>
    import(
      "@/app/components/TrackingMap"
    ),
  {
    ssr: false,
  }
);

type TrackingPoint = {
  id?: string;
  lat: number;
  lng: number;
  elevation?: number | null;
  speedKmh?: number | null;
  recordedAt?: string;
};

type RoutePoint = {
  lat: number;
  lng: number;
};

type TourRoute = {
  distanceKm: number | null;
  elevationGainM: number | null;
  estimatedMins: number | null;
  points: RoutePoint[] | unknown;
};

type Session = {
  id: string;
  status: string;
  startedAt: string;
  finishedAt: string | null;

  distanceCoveredKm: number;

  currentLat: number | null;
  currentLng: number | null;

  currentSpeedKmh: number | null;
  currentElevationM: number | null;

  points: TrackingPoint[];

  departure?: {
    tour?: {
      id: string;
      title: string;
      route?: TourRoute | null;
    };
  };
};

export default function TrackingPage() {
  const { id } =
    useParams<{ id: string }>();

  const router = useRouter();

  const [
    session,
    setSession,
  ] = useState<Session | null>(null);

  const [
    plannedPoints,
    setPlannedPoints,
  ] = useState<RoutePoint[]>([]);

  const [
    traveledPoints,
    setTraveledPoints,
  ] = useState<TrackingPoint[]>([]);

  const [
    accuracy,
    setAccuracy,
  ] = useState<number | null>(null);

  const [
    elapsed,
    setElapsed,
  ] = useState(0);

  const [
    done,
    setDone,
  ] = useState(false);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    error,
    setError,
  ] = useState<string | null>(null);

  const [
    gpsError,
    setGpsError,
  ] = useState<string | null>(null);

  const [
    gpsActive,
    setGpsActive,
  ] = useState(false);

  const [
    finishing,
    setFinishing,
  ] = useState(false);

  const watchRef =
    useRef<number | null>(null);

  const lastPingRef =
    useRef<number>(0);

  /*
   * Učitavanje tracking sesije.
   */
  useEffect(() => {
    async function loadSession() {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch(
          `/api/tracking/${id}`
        );

        const data = await res.json();

        if (!res.ok) {
          setError(
            data.error ||
              "Tracking sesija nije pronađena."
          );

          return;
        }

        const loadedSession:
          Session = data.session;

        setSession(
          loadedSession
        );

        setTraveledPoints(
          loadedSession.points ?? []
        );

        const route =
          loadedSession.departure
            ?.tour?.route;

        if (
          route &&
          Array.isArray(route.points)
        ) {
          const valid =
            route.points.filter(
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

          setPlannedPoints(valid);
        }

        /*
         * Trajanje računamo od
         * stvarnog početka sesije.
         */
        const started =
          new Date(
            loadedSession.startedAt
          ).getTime();

        if (
          Number.isFinite(started)
        ) {
          setElapsed(
            Math.max(
              0,
              Math.floor(
                (Date.now() -
                  started) /
                  1000
              )
            )
          );
        }

        if (
          loadedSession.status !==
          "ACTIVE"
        ) {
          setDone(true);
        }
      } catch (err) {
        console.error(
          "Tracking load error:",
          err
        );

        setError(
          "Greška pri učitavanju tracking sesije."
        );
      } finally {
        setLoading(false);
      }
    }

    loadSession();
  }, [id]);

  /*
   * Sat za trajanje ture.
   */
  useEffect(() => {
    if (
      !session ||
      session.status !== "ACTIVE"
    ) {
      return;
    }

    const timer =
      window.setInterval(() => {
        const started =
          new Date(
            session.startedAt
          ).getTime();

        setElapsed(
          Math.max(
            0,
            Math.floor(
              (Date.now() -
                started) /
                1000
            )
          )
        );
      }, 1000);

    return () =>
      window.clearInterval(timer);
  }, [
    session?.id,
    session?.startedAt,
    session?.status,
  ]);

  /*
   * GPS praćenje.
   */
  useEffect(() => {
    if (
      !session ||
      session.status !== "ACTIVE"
    ) {
      return;
    }

    if (
      !navigator.geolocation
    ) {
      setGpsError(
        "GPS nije dostupan u ovom browseru."
      );

      return;
    }

    setGpsError(null);

    watchRef.current =
      navigator.geolocation.watchPosition(
        async (position) => {
          setGpsActive(true);

          const {
            latitude,
            longitude,
            altitude,
            speed,
            accuracy:
              gpsAccuracy,
          } = position.coords;

          setAccuracy(
            gpsAccuracy
          );

          /*
           * Ne šaljemo veoma
           * neprecizne GPS tačke.
           */
          if (
            gpsAccuracy > 100
          ) {
            return;
          }

          /*
           * Maksimalno jedan ping
           * svakih 5 sekundi.
           */
          const now = Date.now();

          if (
            now -
              lastPingRef.current <
            5000
          ) {
            return;
          }

          lastPingRef.current =
            now;

          try {
            const res =
              await fetch(
                `/api/tracking/${id}/ping`,
                {
                  method: "POST",

                  headers: {
                    "Content-Type":
                      "application/json",
                  },

                  body:
                    JSON.stringify({
                      lat: latitude,
                      lng: longitude,

                      elevation:
                        altitude !=
                        null
                          ? Math.round(
                              altitude
                            )
                          : undefined,

                      speedKmh:
                        speed != null
                          ? speed *
                            3.6
                          : undefined,
                    }),
                }
              );

            const data =
              await res.json();

            if (!res.ok) {
              console.error(
                "Tracking ping:",
                data
              );

              return;
            }

            setSession(
              (
                current
              ) => {
                if (!current) {
                  return current;
                }

                return {
                  ...current,
                  ...data.session,
                };
              }
            );

            /*
             * Dodaj novu GPS tačku
             * na plavu pređenu putanju.
             */
            setTraveledPoints(
              (current) => [
                ...current,
                {
                  lat: latitude,
                  lng: longitude,

                  elevation:
                    altitude != null
                      ? Math.round(
                          altitude
                        )
                      : null,

                  speedKmh:
                    speed != null
                      ? speed * 3.6
                      : null,

                  recordedAt:
                    new Date().toISOString(),
                },
              ]
            );
          } catch (err) {
            console.error(
              "GPS ping error:",
              err
            );
          }
        },

        (geoError) => {
          console.error(
            "Geolocation error:",
            geoError
          );

          setGpsActive(false);

          if (
            geoError.code === 1
          ) {
            setGpsError(
              "Pristup lokaciji nije dozvoljen. Dozvoli GPS lokaciju u browseru."
            );
          } else if (
            geoError.code === 2
          ) {
            setGpsError(
              "Trenutna GPS lokacija nije dostupna."
            );
          } else if (
            geoError.code === 3
          ) {
            setGpsError(
              "Određivanje GPS lokacije traje predugo."
            );
          } else {
            setGpsError(
              "Nije moguće odrediti GPS lokaciju."
            );
          }
        },

        {
          enableHighAccuracy: true,
          maximumAge: 5000,
          timeout: 20000,
        }
      );

    return () => {
      if (
        watchRef.current !== null
      ) {
        navigator.geolocation.clearWatch(
          watchRef.current
        );

        watchRef.current = null;
      }

      setGpsActive(false);
    };
  }, [
    id,
    session?.id,
    session?.status,
  ]);

  async function finish(
    sos = false
  ) {
    if (finishing) return;

    setFinishing(true);

    try {
      const res =
        await fetch(
          `/api/tracking/${id}/finish`,
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                sos,
              }),
          }
        );

      const data =
        await res.json();

      if (!res.ok) {
        alert(
          data.error ||
            "Nije moguće završiti turu."
        );

        return;
      }

      setSession(
        (
          current
        ) =>
          current
            ? {
                ...current,
                ...data.session,
              }
            : current
      );

      if (
        watchRef.current !== null
      ) {
        navigator.geolocation.clearWatch(
          watchRef.current
        );

        watchRef.current = null;
      }

      setGpsActive(false);

      if (sos) {
        alert(
          "SOS signal je poslan vodiču!"
        );

        setDone(true);
      } else {
        setDone(true);
      }
    } catch (err) {
      console.error(
        "Finish tracking error:",
        err
      );

      alert(
        "Došlo je do greške."
      );
    } finally {
      setFinishing(false);
    }
  }

  function formatElapsed(
    seconds: number
  ) {
    const hours =
      Math.floor(
        seconds / 3600
      );

    const minutes =
      Math.floor(
        (seconds % 3600) /
          60
      );

    const secs =
      seconds % 60;

    return `${hours}:${String(
      minutes
    ).padStart(
      2,
      "0"
    )}:${String(
      secs
    ).padStart(2, "0")}`;
  }

  const route =
    session?.departure?.tour
      ?.route ?? null;

  const progress =
    session &&
    route?.distanceKm &&
    route.distanceKm > 0
      ? Math.min(
          100,
          (session.distanceCoveredKm /
            route.distanceKm) *
            100
        )
      : 0;

  const remaining =
    session &&
    route?.distanceKm != null
      ? Math.max(
          0,
          route.distanceKm -
            session.distanceCoveredKm
        )
      : null;

  const eta =
    session?.currentSpeedKmh &&
    session.currentSpeedKmh >
      0.5 &&
    remaining != null &&
    remaining > 0
      ? Math.round(
          (remaining /
            session.currentSpeedKmh) *
            60
        )
      : null;

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-foreground/50">
        Učitavanje tracking
        sesije...
      </div>
    );
  }

  if (
    error ||
    !session
  ) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
        <div className="text-4xl">
          ⚠️
        </div>

        <p className="text-sm text-red-600">
          {error ||
            "Tracking sesija nije pronađena."}
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

  if (done) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center">
        <div className="text-6xl">
          {session.status ===
          "SOS"
            ? "🆘"
            : "✅"}
        </div>

        <h2 className="text-xl font-medium">
          {session.status ===
          "SOS"
            ? "SOS signal poslan"
            : "Tura završena!"}
        </h2>

        <p className="text-sm text-foreground/60">
          Pređeno:{" "}
          {session.distanceCoveredKm.toFixed(
            2
          )}{" "}
          km
        </p>

        <Link
          href="/profile"
          className="rounded-xl bg-brand px-6 py-3 text-sm font-medium text-white"
        >
          Nazad na profil
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-brand px-4 pb-4 pt-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-lg font-medium text-white">
              Live Tracking
            </h1>

            {session.departure
              ?.tour?.title && (
              <p className="mt-0.5 text-xs text-white/70">
                {
                  session
                    .departure
                    .tour.title
                }
              </p>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            <div
              className={`h-2 w-2 rounded-full ${
                gpsActive
                  ? "animate-pulse bg-green-300"
                  : "bg-white/40"
              }`}
            />

            <span className="text-xs text-white/80">
              {gpsActive
                ? "GPS aktivan"
                : "GPS čeka"}
            </span>
          </div>
        </div>
      </div>

      <div className="p-4">
        {gpsError && (
          <div className="mb-3 rounded-xl bg-amber-50 p-3 text-xs text-amber-700">
            {gpsError}
          </div>
        )}

        <div className="mb-4 overflow-hidden rounded-2xl bg-white shadow-sm">
          <div className="relative h-[360px]">
            <TrackingMap
              plannedPoints={
                plannedPoints
              }
              traveledPoints={
                traveledPoints
              }
              currentLat={
                session.currentLat
              }
              currentLng={
                session.currentLng
              }
              accuracy={accuracy}
            />

            <div className="absolute bottom-3 left-3 right-3 z-[1000] rounded-xl bg-white/95 px-3 py-2 shadow">
              <div className="mb-1 flex justify-between text-xs text-foreground/60">
                <span>
                  Napredak
                </span>

                <span>
                  {progress.toFixed(
                    0
                  )}
                  %
                </span>
              </div>

              <div className="h-1.5 overflow-hidden rounded-full bg-black/10">
                <div
                  className="h-full rounded-full bg-brand transition-all"
                  style={{
                    width: `${progress}%`,
                  }}
                />
              </div>

              <div className="mt-2 flex gap-4 text-[10px] text-foreground/50">
                <span>
                  🟢 Planirana ruta
                </span>

                <span>
                  🔵 Pređena ruta
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="mb-4 grid grid-cols-2 gap-3">
          {[
            [
              "📍 Pređeno",
              `${session.distanceCoveredKm.toFixed(
                2
              )} km`,
            ],

            [
              "🏁 Ostalo",
              remaining != null
                ? `${remaining.toFixed(
                    2
                  )} km`
                : "—",
            ],

            [
              "⏱ Trajanje",
              formatElapsed(
                elapsed
              ),
            ],

            [
              "⚡ Brzina",
              session.currentSpeedKmh !=
              null
                ? `${session.currentSpeedKmh.toFixed(
                    1
                  )} km/h`
                : "—",
            ],

            [
              "⛰ Visina",
              session.currentElevationM !=
              null
                ? `${session.currentElevationM} m`
                : "—",
            ],

            [
              "⏰ Procj. dolazak",
              eta != null
                ? `za ${eta} min`
                : "—",
            ],
          ].map(
            ([label, value]) => (
              <div
                key={label}
                className="rounded-xl bg-white p-3 shadow-sm"
              >
                <div className="text-xs text-foreground/50">
                  {label}
                </div>

                <div className="mt-0.5 text-lg font-medium text-foreground">
                  {value}
                </div>
              </div>
            )
          )}
        </div>

        {accuracy != null && (
          <p className="mb-3 text-center text-xs text-foreground/40">
            GPS preciznost: ±
            {Math.round(
              accuracy
            )}{" "}
            m
          </p>
        )}

        <button
          type="button"
          disabled={finishing}
          onClick={() => {
            if (
              window.confirm(
                "Da li želite završiti turu?"
              )
            ) {
              finish(false);
            }
          }}
          className="w-full rounded-xl bg-brand py-3 text-sm font-medium text-white disabled:opacity-50"
        >
          {finishing
            ? "Završavanje..."
            : "✓ Završi turu"}
        </button>

        <button
          type="button"
          disabled={finishing}
          onClick={() => {
            if (
              window.confirm(
                "Poslati SOS signal vodiču?"
              )
            ) {
              finish(true);
            }
          }}
          className="mt-2 w-full rounded-xl border border-red-200 bg-red-50 py-3 text-sm font-medium text-red-600 disabled:opacity-50"
        >
          🆘 SOS — Trebam pomoć
        </button>

        <p className="mt-4 text-center text-[11px] text-foreground/40">
          Za praćenje tokom ture
          ostavite GPS uključen i
          dozvolite browseru pristup
          lokaciji.
        </p>
      </div>
    </div>
  );
}
