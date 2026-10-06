"use client";

import { useEffect, useState } from "react";
import Navbar from "@/app/components/Navbar";

type Activity = {
  id: string;
  name: string;
  nameEn: string | null;
  active: boolean;
};

type Guide = {
  id: string;
  fullName: string;
  email: string;
  guideStatus: string | null;
  guideCertified: boolean;
  _count: {
    toursCreated: number;
  };
};

type AdminTour = {
  id: string;
  title: string;
  active: boolean;
  featured: boolean;
  featuredOrder: number | null;
  pricePerPerson: number;
  createdAt: string;

  activityType: {
    id: string;
    name: string;
    icon: string;
  };

  guide: {
    id: string;
    fullName: string;
  };

  images: {
    id: string;
    url: string;
    position: number;
  }[];

  _count: {
    reviews: number;
    bookings: number;
  };
};

type Stats = {
  users: number;
  tours: number;
  guides: number;
};

type Tab =
  | "activities"
  | "guides"
  | "tours"
  | "stats";

export default function AdminPage() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [guides, setGuides] = useState<Guide[]>([]);
  const [tours, setTours] = useState<AdminTour[]>([]);

  const [stats, setStats] = useState<Stats | null>(null);

  const [newAct, setNewAct] = useState({
    name: "",
    nameEn: "",
    icon: "mountain",
  });

  const [actError, setActError] =
    useState<string | null>(null);

  const [tourError, setTourError] =
    useState<string | null>(null);

  const [tourLoading, setTourLoading] =
    useState(false);

  const [savingTourId, setSavingTourId] =
    useState<string | null>(null);

  const [orderDrafts, setOrderDrafts] =
    useState<Record<string, string>>({});

  const [savedOrders, setSavedOrders] =
  useState<Record<string, string>>({});

  const [tab, setTab] =
    useState<Tab>("activities");

  useEffect(() => {
    loadActivities();
    loadGuides();
    loadTours();
  }, []);

  async function loadActivities() {
    try {
      const res = await fetch("/api/activities");
      const data = await res.json();

      setActivities(data.activities ?? []);
    } catch (error) {
      console.error(
        "Greška pri učitavanju aktivnosti:",
        error
      );
    }
  }

  async function loadGuides() {
    try {
      const res = await fetch("/api/admin/guides");
      const data = await res.json();

      const loadedGuides: Guide[] =
        data.guides ?? [];

      setGuides(loadedGuides);

      setStats((current) => ({
        users:
          current?.users ??
          loadedGuides.length + 10,

        tours:
          current?.tours ?? 0,

        guides: loadedGuides.filter(
          (guide) =>
            guide.guideStatus === "APPROVED"
        ).length,
      }));
    } catch (error) {
      console.error(
        "Greška pri učitavanju vodiča:",
        error
      );
    }
  }

  async function loadTours() {
    setTourLoading(true);
    setTourError(null);

    try {
      const res = await fetch(
        "/api/admin/tours",
        {
          cache: "no-store",
        }
      );

      const data = await res.json();

      if (!res.ok) {
        setTourError(
          data.error ||
            "Greška pri učitavanju tura."
        );

        return;
      }

      const loadedTours: AdminTour[] =
        data.tours ?? [];

      setTours(loadedTours);

      const drafts: Record<string, string> = {};

      loadedTours.forEach((tour) => {
        drafts[tour.id] =
          tour.featuredOrder?.toString() ?? "";
      });

      setOrderDrafts(drafts);

      setSavedOrders(drafts);

      setStats((current) => ({
        users: current?.users ?? 0,

        tours: loadedTours.length,

        guides: current?.guides ?? 0,
      }));
    } catch (error) {
      console.error(
        "Greška pri učitavanju tura:",
        error
      );

      setTourError(
        "Greška pri učitavanju tura."
      );
    } finally {
      setTourLoading(false);
    }
  }

  async function addActivity() {
    setActError(null);

    if (!newAct.name.trim()) {
      setActError("Naziv je obavezan");
      return;
    }

    const res = await fetch(
      "/api/activities",
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/json",
        },

        body: JSON.stringify(newAct),
      }
    );

    const data = await res.json();

    if (!res.ok) {
      setActError(
        data.error ||
          "Greška pri dodavanju aktivnosti."
      );

      return;
    }

    setActivities((current) => [
      ...current,
      data.activity,
    ]);

    setNewAct({
      name: "",
      nameEn: "",
      icon: "mountain",
    });
  }

  async function deleteActivity(
    id: string
  ) {
    if (
      !confirm(
        "Obrisati ovu aktivnost?"
      )
    ) {
      return;
    }

    const res = await fetch(
      `/api/activities/${id}`,
      {
        method: "DELETE",
      }
    );

    const data = await res.json();

    if (res.ok) {
      setActivities((current) =>
        current.filter(
          (activity) =>
            activity.id !== id
        )
      );

      alert(data.message);
    }
  }

  async function updateGuide(
    id: string,
    guideStatus: string
  ) {
    const res = await fetch(
      `/api/admin/guides/${id}`,
      {
        method: "PATCH",

        headers: {
          "Content-Type":
            "application/json",
        },

        body: JSON.stringify({
          guideStatus,
        }),
      }
    );

    if (res.ok) {
      setGuides((current) =>
        current.map((guide) =>
          guide.id === id
            ? {
                ...guide,
                guideStatus,
              }
            : guide
        )
      );
    }
  }

  async function toggleCertified(
    id: string,
    current: boolean
  ) {
    const res = await fetch(
      `/api/admin/guides/${id}`,
      {
        method: "PATCH",

        headers: {
          "Content-Type":
            "application/json",
        },

        body: JSON.stringify({
          guideCertified: !current,
        }),
      }
    );

    if (res.ok) {
      setGuides((guides) =>
        guides.map((guide) =>
          guide.id === id
            ? {
                ...guide,
                guideCertified:
                  !current,
              }
            : guide
        )
      );
    }
  }

  async function patchTour(
    id: string,
    body: {
      featured?: boolean;
      featuredOrder?: number | null;
    }
  ) {
    setSavingTourId(id);
    setTourError(null);

    try {
      const res = await fetch(
        `/api/admin/tours/${id}`,
        {
          method: "PATCH",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify(body),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        setTourError(
          data.error ||
            "Greška pri izmjeni ture."
        );

        return false;
      }

      setTours((current) =>
        current.map((tour) =>
          tour.id === id
            ? {
                ...tour,
                ...data.tour,
              }
            : tour
        )
      );

      return true;
    } catch (error) {
      console.error(
        "Greška pri izmjeni ture:",
        error
      );

      setTourError(
        "Greška pri izmjeni ture."
      );

      return false;
    } finally {
      setSavingTourId(null);
    }
  }

  async function toggleFeatured(
    tour: AdminTour
  ) {
    const newFeatured =
      !tour.featured;

    let featuredOrder:
      | number
      | null
      | undefined;

    if (newFeatured) {
      const existingOrders = tours
        .filter(
          (item) =>
            item.featured &&
            item.featuredOrder !== null
        )
        .map(
          (item) =>
            item.featuredOrder as number
        );

      featuredOrder =
        existingOrders.length > 0
          ? Math.max(
              ...existingOrders
            ) + 1
          : 1;
    } else {
      featuredOrder = null;
    }

    const success =
      await patchTour(
        tour.id,
        {
          featured: newFeatured,
          featuredOrder,
        }
      );

    if (success) {
      setOrderDrafts(
        (current) => ({
          ...current,

          [tour.id]:
            featuredOrder?.toString() ??
            "",
        })
      );

      await loadTours();
    }
  }

async function saveFeaturedOrder(
  tour: AdminTour
) {
  const raw =
    orderDrafts[tour.id] ?? "";

  if (!raw.trim()) {
    setTourError(
      "Unesi redosled istaknute ture."
    );
    return;
  }

  const order = Number(raw);

  if (
    !Number.isInteger(order) ||
    order < 1
  ) {
    setTourError(
      "Redosled mora biti cijeli broj: 1, 2, 3..."
    );
    return;
  }

  const duplicate = tours.find(
    (item) =>
      item.id !== tour.id &&
      item.featured &&
      item.featuredOrder === order
  );

  if (duplicate) {
    setTourError(
      `Redosled ${order} već koristi tura "${duplicate.title}".`
    );
    return;
  }

  const success =
    await patchTour(
      tour.id,
      {
        featured: true,
        featuredOrder: order,
      }
    );

  if (success) {
    setSavedOrders(
      (current) => ({
        ...current,
        [tour.id]:
          order.toString(),
      })
    );

    setTourError(null);
  }
}


  async function deleteTour(
    tour: AdminTour
  ) {
    const confirmed = window.confirm(
      `Trajno izbrisati turu "${tour.title}"?\n\nOvu radnju nije moguće poništiti.`
    );

    if (!confirmed) {
      return;
    }

    setTourError(null);
    setSavingTourId(tour.id);

    try {
      const res = await fetch(
        `/api/admin/tours/${tour.id}`,
        { method: "DELETE" }
      );

      const data = await res.json();

      if (!res.ok) {
        setTourError(
          data.error || "Greška pri brisanju ture."
        );
        return;
      }

      setTours((current) =>
        current.filter((item) => item.id !== tour.id)
      );

      setOrderDrafts((current) => {
        const next = { ...current };
        delete next[tour.id];
        return next;
      });

      setSavedOrders((current) => {
        const next = { ...current };
        delete next[tour.id];
        return next;
      });

      setStats((current) =>
        current
          ? { ...current, tours: Math.max(0, current.tours - 1) }
          : current
      );
    } catch (error) {
      console.error("Greška pri brisanju ture:", error);
      setTourError("Greška pri povezivanju sa serverom.");
    } finally {
      setSavingTourId(null);
    }
  }

  const STATUS_STYLE: Record<
    string,
    string
  > = {
    PENDING:
      "bg-amber-50 text-amber-700",

    APPROVED:
      "bg-brand-light text-brand-dark",

    REJECTED:
      "bg-red-50 text-red-600",
  };

  const STATUS_LABEL: Record<
    string,
    string
  > = {
    PENDING: "Na čekanju",
    APPROVED: "Odobren",
    REJECTED: "Odbijen",
  };

  return (
    <div className="min-h-screen pb-20">
      <Navbar />

      <div className="bg-brand px-4 pb-4 pt-5">
        <h1 className="text-lg font-medium text-white">
          Admin panel
        </h1>

        <p className="text-xs text-white/70">
          Upravljanje platformom
        </p>
      </div>

      {stats && (
        <div className="grid grid-cols-3 gap-3 p-4">
          {[
            [
              "Korisnika",
              stats.users,
            ],
            [
              "Tura",
              stats.tours,
            ],
            [
              "Vodiča",
              stats.guides,
            ],
          ].map(([label, value]) => (
            <div
              key={label as string}
              className="rounded-xl border border-black/8 p-3 text-center"
            >
              <div className="text-2xl font-medium text-brand">
                {value}
              </div>

              <div className="mt-0.5 text-xs text-foreground/50">
                {label}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="flex overflow-x-auto border-b border-black/8 px-4">
        {(
          [
            "activities",
            "guides",
            "tours",
            "stats",
          ] as const
        ).map((item) => (
          <button
            key={item}
            onClick={() =>
              setTab(item)
            }
            className={`min-w-[90px] flex-1 whitespace-nowrap px-2 py-3 text-xs ${
              tab === item
                ? "border-b-2 border-brand font-medium text-brand"
                : "text-foreground/50"
            }`}
          >
            {item ===
            "activities"
              ? "Aktivnosti"
              : item ===
                  "guides"
                ? "Vodiči"
                : item ===
                    "tours"
                  ? "Ture"
                  : "Izvještaji"}
          </button>
        ))}
      </div>

      <div className="p-4">
        {tab ===
          "activities" && (
          <>
            <p className="mb-3 text-sm font-medium">
              Upravljanje vrstama
              aktivnosti
            </p>

            <div className="mb-4 flex flex-col gap-2 rounded-xl border border-black/8 p-3">
              <p className="text-xs font-medium text-foreground/60">
                Dodaj novu aktivnost
              </p>

              <input
                value={
                  newAct.name
                }
                onChange={(e) =>
                  setNewAct(
                    (current) => ({
                      ...current,
                      name: e.target
                        .value,
                    })
                  )
                }
                placeholder="Naziv (srpski, npr. Zip-line)"
                className="rounded-lg border border-black/10 px-3 py-2 text-sm outline-none focus:border-brand"
              />

              <input
                value={
                  newAct.nameEn
                }
                onChange={(e) =>
                  setNewAct(
                    (current) => ({
                      ...current,
                      nameEn:
                        e.target.value,
                    })
                  )
                }
                placeholder="Name (English, e.g. Zip-line)"
                className="rounded-lg border border-black/10 px-3 py-2 text-sm outline-none focus:border-brand"
              />

              <input
                value={
                  newAct.icon
                }
                onChange={(e) =>
                  setNewAct(
                    (current) => ({
                      ...current,
                      icon: e.target
                        .value,
                    })
                  )
                }
                placeholder="Icon (npr. mountain, fish, bike...)"
                className="rounded-lg border border-black/10 px-3 py-2 text-sm outline-none focus:border-brand"
              />

              {actError && (
                <p className="text-xs text-red-600">
                  {actError}
                </p>
              )}

              <button
                onClick={
                  addActivity
                }
                className="rounded-xl bg-brand py-2.5 text-sm font-medium text-white"
              >
                + Dodaj aktivnost
              </button>
            </div>

            <div className="flex flex-col gap-2">
              {activities.map(
                (activity) => (
                  <div
                    key={
                      activity.id
                    }
                    className="flex items-center gap-3 rounded-xl border border-black/8 p-3"
                  >
                    <div className="flex-1">
                      <p className="text-sm font-medium">
                        {
                          activity.name
                        }
                      </p>

                      {activity.nameEn && (
                        <p className="text-xs text-foreground/50">
                          {
                            activity.nameEn
                          }
                        </p>
                      )}
                    </div>

                    <span
                      className={`rounded-full px-2 py-0.5 text-xs ${
                        activity.active
                          ? "bg-brand-light text-brand-dark"
                          : "bg-black/5 text-foreground/40"
                      }`}
                    >
                      {activity.active
                        ? "Aktivna"
                        : "Neaktivna"}
                    </span>

                    <button
                      onClick={() =>
                        deleteActivity(
                          activity.id
                        )
                      }
                      className="rounded-lg border border-red-200 px-2 py-1 text-xs text-red-400"
                    >
                      Briši
                    </button>
                  </div>
                )
              )}
            </div>
          </>
        )}

        {tab === "guides" && (
          <>
            <p className="mb-3 text-sm font-medium">
              Upravljanje vodičima
            </p>

            {guides.length ===
              0 && (
              <p className="py-8 text-center text-sm text-foreground/40">
                Nema registrovanih
                vodiča.
              </p>
            )}

            {guides.map(
              (guide) => (
                <div
                  key={guide.id}
                  className="mb-3 rounded-xl border border-black/8 p-4"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium">
                        {
                          guide.fullName
                        }
                      </p>

                      <p className="text-xs text-foreground/50">
                        {guide.email}
                      </p>

                      <p className="mt-0.5 text-xs text-foreground/50">
                        {
                          guide._count
                            .toursCreated
                        }{" "}
                        tura
                      </p>
                    </div>

                    <span
                      className={`rounded-full px-2 py-1 text-xs ${
                        STATUS_STYLE[
                          guide.guideStatus ??
                            ""
                        ] ?? ""
                      }`}
                    >
                      {STATUS_LABEL[
                        guide.guideStatus ??
                          ""
                      ] ?? "—"}
                    </span>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    {guide.guideStatus !==
                      "APPROVED" && (
                      <button
                        onClick={() =>
                          updateGuide(
                            guide.id,
                            "APPROVED"
                          )
                        }
                        className="rounded-lg bg-brand-light px-3 py-1.5 text-xs text-brand-dark"
                      >
                        ✓ Odobri
                      </button>
                    )}

                    {guide.guideStatus !==
                      "REJECTED" && (
                      <button
                        onClick={() =>
                          updateGuide(
                            guide.id,
                            "REJECTED"
                          )
                        }
                        className="rounded-lg bg-red-50 px-3 py-1.5 text-xs text-red-600"
                      >
                        ✗ Odbij
                      </button>
                    )}

                    <button
                      onClick={() =>
                        toggleCertified(
                          guide.id,
                          guide.guideCertified
                        )
                      }
                      className={`rounded-lg px-3 py-1.5 text-xs ${
                        guide.guideCertified
                          ? "bg-amber-50 text-amber-700"
                          : "bg-black/5 text-foreground/60"
                      }`}
                    >
                      {guide.guideCertified
                        ? "★ Ukloni certifikat"
                        : "★ Dodaj certifikat"}
                    </button>
                  </div>
                </div>
              )
            )}
          </>
        )}

        {tab === "tours" && (
          <>
            <div className="mb-4">
              <p className="text-sm font-medium">
                Upravljanje turama
              </p>

              <p className="mt-1 text-xs leading-5 text-foreground/50">
                Istaknute ture će
                imati prednost u
                preporučenom prikazu.
                Broj 1 predstavlja
                prvu istaknutu turu,
                broj 2 drugu itd.
              </p>
            </div>

            {tourError && (
              <div className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-600">
                {tourError}
              </div>
            )}

            {tourLoading && (
              <p className="py-8 text-center text-sm text-foreground/40">
                Učitavanje tura...
              </p>
            )}

            {!tourLoading &&
              tours.length ===
                0 && (
                <p className="py-8 text-center text-sm text-foreground/40">
                  Nema tura.
                </p>
              )}

            <div className="flex flex-col gap-3">
              {tours.map(
                (tour) => {
                  const cover =
                    tour.images?.[0]
                      ?.url;

                  const saving =
                    savingTourId ===
                    tour.id;

                  return (
                    <div
                      key={tour.id}
                      className={`overflow-hidden rounded-2xl border ${
                        tour.featured
                          ? "border-amber-300 bg-amber-50/30"
                          : "border-black/8"
                      }`}
                    >
                      <div className="flex gap-3 p-3">
                        <div className="h-20 w-28 shrink-0 overflow-hidden rounded-xl bg-black/5">
                          {cover ? (
                            <img
                              src={
                                cover
                              }
                              alt={
                                tour.title
                              }
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-xs text-foreground/30">
                              Bez slike
                            </div>
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium">
                                {
                                  tour.title
                                }
                              </p>

                              <p className="mt-0.5 text-xs text-foreground/50">
                                {
                                  tour
                                    .activityType
                                    .name
                                }
                              </p>

                              <p className="mt-0.5 text-xs text-foreground/50">
                                Vodič:{" "}
                                {
                                  tour
                                    .guide
                                    .fullName
                                }
                              </p>
                            </div>

                            {tour.featured && (
                              <span className="shrink-0 rounded-full bg-amber-100 px-2 py-1 text-xs font-medium text-amber-700">
                                ★{" "}
                                {tour.featuredOrder ??
                                  "—"}
                              </span>
                            )}
                          </div>

                          <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-foreground/50">
                            <span>
                              €
                              {
                                tour.pricePerPerson
                              }{" "}
                              po osobi
                            </span>

                            <span>
                              {
                                tour
                                  ._count
                                  .reviews
                              }{" "}
                              recenzija
                            </span>

                            <span>
                              {
                                tour
                                  ._count
                                  .bookings
                              }{" "}
                              rezervacija
                            </span>
                          </div>

                          <div className="mt-2">
                            <span
                              className={`rounded-full px-2 py-0.5 text-xs ${
                                tour.active
                                  ? "bg-brand-light text-brand-dark"
                                  : "bg-black/5 text-foreground/40"
                              }`}
                            >
                              {tour.active
                                ? "Aktivna"
                                : "Neaktivna"}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="border-t border-black/5 p-3">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                          <button
                            disabled={
                              saving
                            }
                            onClick={() =>
                              toggleFeatured(
                                tour
                              )
                            }
                            className={`rounded-xl px-4 py-2.5 text-sm font-medium disabled:opacity-50 ${
                              tour.featured
                                ? "bg-amber-100 text-amber-800"
                                : "bg-brand-light text-brand-dark"
                            }`}
                          >
                            {saving
                              ? "Čuvanje..."
                              : tour.featured
                                ? "★ Ukloni iz istaknutih"
                                : "☆ Označi kao istaknutu"}
                          </button>

                          {tour.featured && (
                            <div className="flex flex-1 items-center gap-2">
                              <span className="whitespace-nowrap text-xs text-foreground/60">
                                Redosled:
                              </span>

                              <input
                                type="number"
                                min="1"
                                step="1"
                                value={
                                  orderDrafts[
                                    tour.id
                                  ] ??
                                  ""
                                }
                                onChange={(
                                  e
                                ) =>
                                  setOrderDrafts(
                                    (
                                      current
                                    ) => ({
                                      ...current,

                                      [tour.id]:
                                        e
                                          .target
                                          .value,
                                    })
                                  )
                                }
                                className="w-20 rounded-lg border border-black/10 px-3 py-2 text-sm outline-none focus:border-brand"
                              />

                             <button
  disabled={
    saving ||
    (orderDrafts[tour.id] ?? "") ===
      (savedOrders[tour.id] ?? "")
  }
  onClick={() =>
    saveFeaturedOrder(tour)
  }
  className={`rounded-lg px-3 py-2 text-xs font-medium ${
    (orderDrafts[tour.id] ?? "") ===
    (savedOrders[tour.id] ?? "")
      ? "cursor-default bg-black/5 text-foreground/40"
      : "bg-brand text-white"
  } disabled:opacity-70`}
>
  {saving
    ? "Čuvanje..."
    : (orderDrafts[tour.id] ?? "") ===
        (savedOrders[tour.id] ?? "")
      ? "✓ Sačuvano"
      : "Sačuvaj"}
</button>
                            </div>
                          )}
                        </div>

                        <div className="mt-3 border-t border-black/5 pt-3">
                          <button
                            type="button"
                            disabled={saving}
                            onClick={() => deleteTour(tour)}
                            className="rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-medium text-red-700 transition hover:bg-red-100 disabled:opacity-50"
                          >
                            {saving ? "Brisanje..." : "🗑 Izbriši turu"}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                }
              )}
            </div>
          </>
        )}

        {tab === "stats" && (
          <div className="flex flex-col gap-3">
            <div className="rounded-xl border border-black/8 p-4">
              <p className="mb-3 text-sm font-medium">
                Aktivnosti po broju
                tura
              </p>

              {activities.map(
                (activity) => (
                  <div
                    key={
                      activity.id
                    }
                    className="flex justify-between border-b border-black/5 py-1.5 text-sm"
                  >
                    <span>
                      {
                        activity.name
                      }
                    </span>

                    <span className="text-foreground/50">
                      {activity.active
                        ? "Aktivna"
                        : "—"}
                    </span>
                  </div>
                )
              )}
            </div>

            <div className="rounded-xl bg-amber-50 p-4 text-sm text-amber-800">
              Detaljna analitika
              (prihodi, konverzije,
              trendovi) dostupna je
              putem Prisma Studio ili
              dashboarda po izboru
              (Metabase, Grafana...).
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
