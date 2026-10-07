"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Navbar from "@/app/components/Navbar";

type User = {
  id: string;
  email: string;
  fullName: string;
  role: string;
  country: string | null;
  language: string;
  guideStatus: string | null;
  guideCertified: boolean;
} | null;

type Booking = {
  id: string;
  status: string;
  totalPrice: number;
  participants: number;

  tour: {
    id: string;
    title: string;

    activityType: {
      name: string;
    };

    guide: {
      id: string;
      fullName: string;
    };
  };

  departure: {
    id: string;
    startsAt: string;
    bookingDeadline: string | null;
    spotsLeft: number;
  };

  review: {
    id: string;
  } | null;

  participantsInfo: {
    id: string;
    fullName: string;
    age: number;
  }[];
};

type GuideBooking = {
  id: string;
  participants: number;
  status: string;
  totalPrice: number;
  createdAt: string;
  user: {
    id: string;
    fullName: string;
    email: string;
    phone: string | null;
    country: string | null;
  };
};

type GuideDeparture = {
  id: string;
  startsAt: string;
  spotsLeft: number;
  bookings: GuideBooking[];
};

type GuideTour = {
  id: string;
  title: string;
  maxParticipants: number;
  pricePerPerson: number;
  active: boolean;
  activityType: {
    id: string;
    name: string;
    nameEn: string | null;
  };
  departures: GuideDeparture[];
};

export default function ProfilePage() {
  const router = useRouter();

  const [user, setUser] = useState<User>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [guideTours, setGuideTours] = useState<GuideTour[]>([]);
  const [tab, setTab] = useState<"main" | "settings">("main");
  const [loading, setLoading] = useState(true);
  const [editingBookingId, setEditingBookingId] = useState<string | null>(null);
  const [editParticipants, setEditParticipants] = useState<{ fullName: string; age: number }[]>([]);
  const [editParticipantCount, setEditParticipantCount] = useState("");
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [cancellingBookingId, setCancellingBookingId] = useState<string | null>(null);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [groupOpeningDepartureId, setGroupOpeningDepartureId] = useState<string | null>(null);
  const [groupMessageError, setGroupMessageError] = useState<string | null>(null);
const [trackingStartingBookingId, setTrackingStartingBookingId] =
  useState<string | null>(null);

const [trackingError, setTrackingError] =
  useState<string | null>(null);
  
  useEffect(() => {
    async function loadProfile() {
      try {
        const meRes = await fetch("/api/auth/me");
        const me = await meRes.json();

        if (!me.user) {
          router.push("/login");
          return;
        }

        setUser(me.user);

        if (me.user.role === "GUIDE") {
          const toursRes = await fetch("/api/guide/tours");
          const toursData = await toursRes.json();

          if (toursRes.ok) {
            setGuideTours(toursData.tours ?? []);
          }
        } else {
          const bookingsRes = await fetch("/api/bookings");
          const bookingsData = await bookingsRes.json();

          if (bookingsRes.ok) {
            setBookings(bookingsData.bookings ?? []);
          }
        }
      } catch (error) {
        console.error("Profile load error:", error);
      } finally {
        setLoading(false);
      }
    }

    loadProfile();
  }, [router]);

  function canEditBooking(booking: Booking) {
    if (!["PENDING", "CONFIRMED"].includes(booking.status)) return false;
    if (new Date(booking.departure.startsAt).getTime() <= Date.now()) return false;
    if (booking.departure.bookingDeadline &&
        new Date(booking.departure.bookingDeadline).getTime() <= Date.now()) return false;
    return true;
  }

  function startEditBooking(booking: Booking) {
    setEditingBookingId(booking.id);
    setEditError(null);
    setCancelError(null);

    const existing = booking.participantsInfo ?? [];

    const initialParticipants =
      existing.length > 0
        ? existing.map((p) => ({
            fullName: p.fullName,
            age: p.age,
          }))
        : Array.from(
            { length: booking.participants },
            () => ({
              fullName: "",
              age: 18,
            })
          );

    // Ako API iz nekog razloga vrati manje participantsInfo zapisa
    // nego što booking.participants kaže, dopuni samo nedostajuće redove.
    while (initialParticipants.length < booking.participants) {
      initialParticipants.push({
        fullName: "",
        age: 18,
      });
    }

    setEditParticipants(initialParticipants);
    setEditParticipantCount(
      booking.participants.toString()
    );
  }

  function changeParticipantCount(
    rawValue: string,
    maxCount: number
  ) {
    // Dozvoli korisniku da privremeno obriše broj dok upisuje novi.
    setEditParticipantCount(rawValue);

    if (rawValue === "") {
      return;
    }

    const count = Number(rawValue);

    if (
      !Number.isInteger(count) ||
      count < 1 ||
      count > maxCount
    ) {
      return;
    }

    setEditParticipants((current) => {
      if (count > current.length) {
        return [
          ...current,
          ...Array.from(
            {
              length:
                count - current.length,
            },
            () => ({
              fullName: "",
              age: 18,
            })
          ),
        ];
      }

      if (count < current.length) {
        return current.slice(0, count);
      }

      return current;
    });
  }

  function updateParticipant(index: number, field: "fullName" | "age", value: string | number) {
    setEditParticipants(current =>
      current.map((person, i) => i === index ? { ...person, [field]: value } : person)
    );
  }

  async function saveBookingChanges(booking: Booking) {
    setEditError(null);

    const requestedCount = Number(editParticipantCount);
    const maxCount =
      booking.departure.spotsLeft +
      booking.participants;

    if (
      !Number.isInteger(requestedCount) ||
      requestedCount < 1 ||
      requestedCount > maxCount ||
      requestedCount !== editParticipants.length
    ) {
      setEditError(
        `Broj učesnika mora biti između 1 i ${maxCount}.`
      );
      return;
    }

    for (let i = 0; i < editParticipants.length; i++) {
      if (editParticipants[i].fullName.trim().length < 3) {
        setEditError(`Unesite ime i prezime za učesnika ${i + 1}.`);
        return;
      }
      if (!editParticipants[i].age || editParticipants[i].age < 1 || editParticipants[i].age > 120) {
        setEditError(`Unesite ispravnu starost za učesnika ${i + 1}.`);
        return;
      }
    }
    setEditSaving(true);
    try {
      const res = await fetch(`/api/bookings/${booking.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          participants: editParticipants.length,
          participantsInfo: editParticipants.map(p => ({ fullName: p.fullName.trim(), age: Number(p.age) })),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setEditError(data.error || "Izmjena rezervacije nije uspjela.");
        return;
      }
      setBookings(current => current.map(item =>
        item.id === booking.id
          ? { ...item, participants: data.booking.participants, totalPrice: data.booking.totalPrice,
              participantsInfo: data.booking.participantsInfo, departure: data.booking.departure }
          : item
      ));
      setEditingBookingId(null);
      setEditParticipants([]);
      setEditParticipantCount("");
    } catch (error) {
      console.error("Booking update error:", error);
      setEditError("Došlo je do greške prilikom izmjene rezervacije.");
    } finally {
      setEditSaving(false);
    }
  }

  async function cancelBooking(booking: Booking) {
    const confirmed = window.confirm(
      `Da li ste sigurni da želite otkazati rezervaciju za ${booking.participants} ${
        booking.participants === 1 ? "osobu" : "osobe"
      }? Rezervisana mjesta će ponovo biti dostupna.`
    );

    if (!confirmed) return;

    setCancelError(null);
    setCancellingBookingId(booking.id);

    try {
      const res = await fetch(`/api/bookings/${booking.id}`, {
        method: "DELETE",
      });

      const data = await res.json();

      if (!res.ok) {
        setCancelError(
          data.error || "Otkazivanje rezervacije nije uspjelo."
        );
        return;
      }

      setBookings((current) =>
        current.map((item) =>
          item.id === booking.id
            ? {
                ...item,
                status: data.booking.status,
                departure: data.booking.departure,
                participantsInfo:
                  data.booking.participantsInfo ?? item.participantsInfo,
              }
            : item
        )
      );

      if (editingBookingId === booking.id) {
        setEditingBookingId(null);
        setEditParticipants([]);
        setEditParticipantCount("");
        setEditError(null);
      }
    } catch (error) {
      console.error("Booking cancel error:", error);
      setCancelError(
        "Došlo je do greške prilikom otkazivanja rezervacije."
      );
    } finally {
      setCancellingBookingId(null);
    }
  }

  async function openGroupConversation(departureId: string) {
    setGroupMessageError(null);
    setGroupOpeningDepartureId(departureId);

    try {
      const res = await fetch("/api/messages/group", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ departureId }),
      });

      const data = await res.json();

      if (!res.ok) {
        setGroupMessageError(
          data.error || "Otvaranje grupnog razgovora nije uspjelo."
        );
        return;
      }

      router.push(`/messages/${data.conversationId}`);
    } catch (error) {
      console.error("Group conversation error:", error);
      setGroupMessageError("Došlo je do greške pri otvaranju grupnog razgovora.");
    } finally {
      setGroupOpeningDepartureId(null);
    }
  }

async function startTracking(booking: Booking) {
  setTrackingError(null);
  setTrackingStartingBookingId(booking.id);

  try {
    const res = await fetch("/api/tracking/start", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        departureId: booking.departure.id,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      setTrackingError(
        data.error || "Pokretanje ture nije uspjelo."
      );
      return;
    }

    if (!data.session?.id) {
      setTrackingError(
        "Tracking sesija nije pronađena."
      );
      return;
    }

    router.push(`/tracking/${data.session.id}`);
  } catch (error) {
    console.error("Tracking start error:", error);

    setTrackingError(
      "Došlo je do greške pri pokretanju ture."
    );
  } finally {
    setTrackingStartingBookingId(null);
  }
}
  
  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  const STATUS: Record<string, string> = {
    PENDING: "⏳ Na čekanju",
    CONFIRMED: "✅ Potvrđena",
    CANCELLED: "❌ Otkazana",
    COMPLETED: "🏁 Završena",
  };

  function formatDate(date: string) {
    return new Date(date).toLocaleDateString("sr-Latn", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  }

  function formatDateTime(date: string) {
    return new Date(date).toLocaleString("sr-Latn", {
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center text-foreground/40">
        Učitavanje...
      </div>
    );
  }

  const isGuide = user.role === "GUIDE";

  return (
    <div className="min-h-screen pb-20">
      <Navbar />

      <div className="bg-brand px-4 pb-6 pt-5 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-white/25 text-2xl font-medium text-white">
          {user.fullName.charAt(0)}
        </div>

        <h1 className="mt-2 text-lg font-medium text-white">
          {user.fullName}
        </h1>

        <p className="text-xs text-white/70">
          {user.role === "TOURIST"
            ? "Turista"
            : user.role === "GUIDE"
            ? "Vodič"
            : "Administrator"}{" "}
          · {user.country ?? ""}
        </p>

        {isGuide && (
          <p className="mt-1 text-xs text-white/60">
            {user.guideStatus === "APPROVED"
              ? "✓ Odobreni vodič"
              : user.guideStatus === "PENDING"
              ? "⏳ Čeka odobrenje"
              : "❌ Odbijen"}
          </p>
        )}
      </div>

      <div className="flex border-b border-black/8">
        <button
          onClick={() => setTab("main")}
          className={`flex-1 py-3 text-sm ${
            tab === "main"
              ? "border-b-2 border-brand font-medium text-brand"
              : "text-foreground/50"
          }`}
        >
          {isGuide
            ? `Moje ture (${guideTours.length})`
            : `Rezervacije (${bookings.length})`}
        </button>

        <button
          onClick={() => setTab("settings")}
          className={`flex-1 py-3 text-sm ${
            tab === "settings"
              ? "border-b-2 border-brand font-medium text-brand"
              : "text-foreground/50"
          }`}
        >
          Podešavanja
        </button>
      </div>

      <div className="p-4">
        {tab === "main" && !isGuide && (
          <>
            {bookings.length === 0 && (
              <p className="py-8 text-center text-sm text-foreground/40">
                Nemate rezervacija.
              </p>
            )}

            {bookings.map((b) => {
              const editing = editingBookingId === b.id;
              const editable = canEditBooking(b);
              const deadline = b.departure.bookingDeadline ? formatDateTime(b.departure.bookingDeadline) : null;
              const availableForThisBooking = b.departure.spotsLeft + b.participants;

              return (
                <div key={b.id} className="mb-3 rounded-xl border border-black/8 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium">{b.tour.title}</p>
                      <p className="mt-0.5 text-xs text-foreground/50">
                        {b.tour.activityType.name} · {b.participants} osoba
                      </p>
                    </div>
                    <span className="shrink-0 text-xs">{STATUS[b.status] ?? b.status}</span>
                  </div>

                  <div className="mt-2 flex items-center justify-between text-xs text-foreground/50">
                    <span>📅 {formatDate(b.departure.startsAt)}</span>
                    <span className="font-medium text-brand-dark">€{b.totalPrice.toFixed(2)}</span>
                  </div>

                  {deadline && <p className="mt-2 text-xs text-foreground/50">⏰ Izmjene moguće do: {deadline}</p>}
                  {!editable && (b.status === "PENDING" || b.status === "CONFIRMED") && (
                    <p className="mt-2 rounded-lg bg-black/5 px-3 py-2 text-xs text-foreground/50">
                      🔒 Rok za izmjene je istekao.
                    </p>
                  )}

                  {b.participantsInfo?.length > 0 && !editing && (
                    <div className="mt-3 rounded-lg bg-black/[0.025] p-3">
                      <p className="mb-2 text-xs font-medium text-foreground/60">Učesnici</p>
                      {b.participantsInfo.map(person => (
                        <p key={person.id} className="text-xs text-foreground/60">
                          • {person.fullName} · {person.age} god.
                        </p>
                      ))}
                    </div>
                  )}

                  {editing && (
                    <div className="mt-4 rounded-xl border border-brand/20 bg-brand-light/30 p-3">
                      <label className="mb-1 block text-xs font-medium text-foreground/60">Broj učesnika</label>
                      <input
                        type="number" min={1} max={availableForThisBooking}
                        value={editParticipantCount}
                        onChange={(e) =>
                          changeParticipantCount(
                            e.target.value,
                            availableForThisBooking
                          )
                        }
                        className="w-full rounded-lg border border-black/10 bg-white px-3 py-2.5 text-sm"
                      />
                      <p className="mt-1 text-[11px] text-foreground/45">
                        Trenutno možete rezervisati najviše {availableForThisBooking} mjesta za ovaj termin.
                      </p>

                      <div className="mt-3 flex flex-col gap-3">
                        {editParticipants.map((person, index) => (
                          <div key={index} className="rounded-lg border border-black/8 bg-white p-3">
                            <p className="mb-2 text-xs font-medium">Učesnik {index + 1}</p>
                            <label className="mb-1 block text-xs text-foreground/60">Ime i prezime</label>
                            <input
                              type="text" value={person.fullName}
                              onChange={e => updateParticipant(index, "fullName", e.target.value)}
                              placeholder="Ime i prezime"
                              className="w-full rounded-lg border border-black/10 px-3 py-2.5 text-sm"
                            />
                            <label className="mb-1 mt-2 block text-xs text-foreground/60">Starost</label>
                            <input
                              type="number" min={1} max={120} value={person.age}
                              onChange={e => updateParticipant(index, "age", Number(e.target.value))}
                              className="w-full rounded-lg border border-black/10 px-3 py-2.5 text-sm"
                            />
                          </div>
                        ))}
                      </div>

                      <div className="mt-3 flex items-center justify-between border-t border-black/8 pt-3">
                        <span className="text-sm text-foreground/60">Nova cijena:</span>
                        <span className="font-medium text-brand-dark">
                          €{((b.totalPrice / b.participants) * editParticipants.length).toFixed(2)}
                        </span>
                      </div>

                      {editError && <p className="mt-2 text-sm text-red-600">{editError}</p>}

                      <div className="mt-3 flex gap-2">
                        <button
                          type="button" disabled={editSaving}
                          onClick={() => {
                            setEditingBookingId(null);
                            setEditParticipants([]);
                            setEditParticipantCount("");
                            setEditError(null);
                          }}
                          className="flex-1 rounded-lg border border-black/10 py-2.5 text-sm text-foreground/60 disabled:opacity-50"
                        >
                          Odustani
                        </button>
                        <button
                          type="button" disabled={editSaving}
                          onClick={() => saveBookingChanges(b)}
                          className="flex-1 rounded-lg bg-brand py-2.5 text-sm font-medium text-white disabled:opacity-60"
                        >
                          {editSaving ? "Čuvanje..." : "Sačuvaj izmjene"}
                        </button>
                      </div>
                    </div>
                  )}

                  {cancelError && cancellingBookingId !== b.id && editable && (
                    <p className="mt-2 text-sm text-red-600">{cancelError}</p>
                  )}

{trackingError && trackingStartingBookingId === null && (
  <p className="mt-2 text-sm text-red-600">
    {trackingError}
  </p>
)}
                  
                  {!editing && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Link
                        href={`/tours/${b.tour.id}`}
                        className="flex-1 rounded-lg border border-black/10 py-2 text-center text-xs text-foreground/60"
                      >
                        {["PENDING", "CONFIRMED"].includes(b.status) && (
  <button
    type="button"
    disabled={trackingStartingBookingId === b.id}
    onClick={() => startTracking(b)}
    className="w-full rounded-lg bg-brand py-2.5 text-xs font-medium text-white disabled:opacity-50"
  >
    {trackingStartingBookingId === b.id
      ? "Pokretanje..."
      : "▶ Započni turu"}
  </button>
)}
                        
                        Pogledaj turu
                      </Link>
                      <Link
                        href={`/messages/new?recipientId=${b.tour.guide.id}`}
                        className="flex-1 rounded-lg border border-brand/20 bg-brand-light/40 py-2 text-center text-xs font-medium text-brand-dark"
                      >
                        💬 Kontaktiraj vodiča
                      </Link>
                      {editable && (
                        <button
                          type="button" onClick={() => startEditBooking(b)}
                          className="flex-1 rounded-lg bg-brand-light py-2 text-xs font-medium text-brand-dark"
                        >
                          ✏️ Izmijeni rezervaciju
                        </button>
                      )}
                      {editable && (
                        <button
                          type="button"
                          disabled={cancellingBookingId === b.id}
                          onClick={() => cancelBooking(b)}
                          className="flex-1 rounded-lg border border-red-200 py-2 text-xs font-medium text-red-500 disabled:opacity-50"
                        >
                          {cancellingBookingId === b.id
                            ? "Otkazivanje..."
                            : "🗑 Otkaži rezervaciju"}
                        </button>
                      )}
                      {b.status === "COMPLETED" && !b.review && (
                        <Link
                          href={`/tours/${b.tour.id}#review`}
                          className="flex-1 rounded-lg bg-brand-light py-2 text-center text-xs text-brand-dark"
                        >
                          ⭐ Ostavi recenziju
                        </Link>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </>
        )}

        {tab === "main" && isGuide && (
          <>
            {guideTours.length === 0 && (
              <div className="py-8 text-center">
                <p className="text-sm text-foreground/40">
                  Još nemate kreiranih tura.
                </p>

                {user.guideStatus === "APPROVED" && (
                  <Link
                    href="/tours/new"
                    className="mt-4 inline-block rounded-xl bg-brand px-5 py-3 text-sm font-medium text-white"
                  >
                    ➕ Kreiraj prvu turu
                  </Link>
                )}
              </div>
            )}

            {guideTours.map((tour) => (
              <div
                key={tour.id}
                className="mb-5 rounded-xl border border-black/8 p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-base font-medium">{tour.title}</p>

                    <p className="mt-0.5 text-xs text-foreground/50">
                      {tour.activityType.name}
                    </p>
                  </div>

                  <span
                    className={`rounded-full px-2 py-1 text-xs ${
                      tour.active
                        ? "bg-brand-light text-brand-dark"
                        : "bg-black/5 text-foreground/50"
                    }`}
                  >
                    {tour.active ? "Aktivna" : "Neaktivna"}
                  </span>
                </div>

                {tour.departures.length === 0 && (
                  <p className="mt-4 rounded-lg bg-black/5 p-3 text-sm text-foreground/50">
                    Ova tura nema termina.
                  </p>
                )}

                {tour.departures.map((departure) => {
                  const registered = departure.bookings.reduce(
                    (sum, booking) => sum + booking.participants,
                    0
                  );

                  return (
                    <div
                      key={departure.id}
                      className="mt-4 rounded-xl bg-black/[0.025] p-3"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <p className="text-sm font-medium">
                            📅 {formatDateTime(departure.startsAt)}
                          </p>

                          <p className="mt-1 text-xs text-foreground/50">
                            Slobodno: {departure.spotsLeft} mjesta
                          </p>
                        </div>

                        <div className="rounded-lg bg-brand-light px-3 py-2 text-sm font-medium text-brand-dark">
                          👥 {registered} / {tour.maxParticipants}
                        </div>
                      </div>

                      <div className="mt-4 border-t border-black/8 pt-3">
                        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                          <p className="text-xs font-medium uppercase tracking-wide text-foreground/50">
                            Prijavljeni učesnici
                          </p>

                          {departure.bookings.length > 0 && (
                            <button
                              type="button"
                              onClick={() => openGroupConversation(departure.id)}
                              disabled={groupOpeningDepartureId === departure.id}
                              className="rounded-lg bg-brand px-3 py-2 text-xs font-medium text-white disabled:opacity-50"
                            >
                              {groupOpeningDepartureId === departure.id
                                ? "Otvaranje..."
                                : `💬 Poruka svima (${departure.bookings.length})`}
                            </button>
                          )}
                        </div>

                        {departure.bookings.length === 0 ? (
                          <p className="py-3 text-sm text-foreground/40">
                            Još nema prijavljenih učesnika.
                          </p>
                        ) : (
                          <div className="flex flex-col gap-2">
                            {departure.bookings.map((booking) => (
                              <div
                                key={booking.id}
                                className="rounded-lg border border-black/8 bg-white p-3"
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <div>
                                    <p className="text-sm font-medium">
                                      {booking.user.fullName}
                                    </p>

                                    <p className="mt-0.5 text-xs text-foreground/50">
                                      {booking.user.email}
                                    </p>

                                    {booking.user.phone && (
                                      <p className="mt-0.5 text-xs text-foreground/50">
                                        📞 {booking.user.phone}
                                      </p>
                                    )}

                                    {booking.user.country && (
                                      <p className="mt-0.5 text-xs text-foreground/50">
                                        {booking.user.country}
                                      </p>
                                    )}
                                  </div>

                                  <div className="text-right">
                                    <p className="text-sm font-medium">
                                      {booking.participants}{" "}
                                      {booking.participants === 1
                                        ? "osoba"
                                        : "osobe"}
                                    </p>

                                    <p className="mt-1 text-xs text-foreground/50">
                                      {STATUS[booking.status] ??
                                        booking.status}
                                    </p>

                                    <Link
                                      href={`/messages/new?recipientId=${booking.user.id}`}
                                      className="mt-2 inline-block rounded-lg border border-brand/20 bg-brand-light/40 px-3 py-2 text-xs font-medium text-brand-dark"
                                    >
                                      💬 Poruka
                                    </Link>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {groupMessageError && (
                          <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
                            {groupMessageError}
                          </p>
                        )}

                        <div className="mt-3 flex items-center justify-between border-t border-black/8 pt-3 text-sm">
                          <span className="text-foreground/60">
                            Ukupno prijavljeno
                          </span>

                          <span className="font-medium">
                            {registered}{" "}
                            {registered === 1 ? "osoba" : "osobe"}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}

                <Link
                  href={`/tours/${tour.id}`}
                  className="mt-4 block w-full rounded-lg border border-black/10 py-2.5 text-center text-sm text-foreground/60"
                >
                  Pogledaj turu
                </Link>
              </div>
            ))}

            {user.guideStatus === "APPROVED" &&
              guideTours.length > 0 && (
                <Link
                  href="/tours/new"
                  className="block w-full rounded-xl bg-brand py-3 text-center text-sm font-medium text-white"
                >
                  ➕ Dodaj novu turu
                </Link>
              )}
          </>
        )}

        {tab === "settings" && (
          <div className="flex flex-col gap-1">
            {[
              { label: "Ime i prezime", value: user.fullName },
              { label: "Email", value: user.email },
              { label: "Zemlja", value: user.country ?? "-" },
              {
                label: "Jezik",
                value: user.language === "sr" ? "Srpski" : "English",
              },
            ].map((r) => (
              <div
                key={r.label}
                className="flex items-center justify-between border-b border-black/8 py-3"
              >
                <span className="text-sm text-foreground/60">
                  {r.label}
                </span>

                <span className="text-sm font-medium">{r.value}</span>
              </div>
            ))}

            <Link
              href="/profile/change-password"
              className="mt-4 block w-full rounded-xl border border-black/10 py-3 text-center text-sm font-medium"
            >
              🔐 Promijeni lozinku
            </Link>

            {user.role === "ADMIN" && (
              <Link
                href="/admin"
                className="mt-4 block w-full rounded-xl bg-black/5 py-3 text-center text-sm font-medium"
              >
                ⚙️ Admin panel
              </Link>
            )}

            {isGuide && user.guideStatus === "APPROVED" && (
              <Link
                href="/tours/new"
                className="mt-4 block w-full rounded-xl bg-brand-light py-3 text-center text-sm font-medium text-brand-dark"
              >
                ➕ Dodaj novu turu
              </Link>
            )}

            <button
              onClick={logout}
              className="mt-3 w-full rounded-xl border border-red-200 py-3 text-sm text-red-500"
            >
              Odjavi se
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
