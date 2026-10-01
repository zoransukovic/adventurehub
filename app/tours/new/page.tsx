"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/app/components/Navbar";

import dynamic from "next/dynamic";

const RouteEditorMap = dynamic(
  () =>
    import(
      "@/app/components/RouteEditorMap"
    ),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[420px] items-center justify-center rounded-2xl bg-brand-light text-sm text-foreground/50">
        Učitavanje mape...
      </div>
    ),
  }
);

type Activity = {
  id: string;
  name: string;
};

type Departure = {
  startsAt: string;
  bookingDeadline: string;
  spotsLeft: number;
};

export default function NewTourPage() {
  const router = useRouter();

  const [step, setStep] = useState(1);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    title: "",
    descriptionSr: "",
    descriptionEn: "",
    activityTypeId: "",
    pricePerPerson: 0,
    maxParticipants: 8,
    durationMinutes: 240,
    difficulty: "MODERATE" as "EASY" | "MODERATE" | "HARD",
    transportMode: "FOOT" as
      | "FOOT"
      | "BIKE"
      | "CAR"
      | "ATV"
      | "KAYAK"
      | "DIVING"
      | "OTHER",
    meetingPoint: "",
    includesItems: [] as string[],
  });

  const [route, setRoute] = useState({
    creationMode: "auto" as "auto" | "manual",
    startLabel: "",
    endLabel: "",
    startLat: 42.44,
    startLng: 18.87,
    endLat: 43.14,
    endLng: 19.01,
    points: [] as { lat: number; lng: number }[],
    distanceKm: 0,
    elevationGainM: 0,
    estimatedMins: 0,
  });

  const [departures, setDepartures] = useState<Departure[]>([]);

  useEffect(() => {
    fetch("/api/activities")
      .then((r) => r.json())
      .then((d) => setActivities(d.activities ?? []))
      .catch(() => {
        setErrors(["Nije moguće učitati vrste aktivnosti."]);
      });
  }, []);

  const INCLUDES = [
    "Oprema",
    "Vodič",
    "Obrok",
    "Prijevoz",
    "Osiguranje",
    "Foto/video",
  ];

  const toggleInclude = (item: string) => {
    setForm((f) => ({
      ...f,
      includesItems: f.includesItems.includes(item)
        ? f.includesItems.filter((x) => x !== item)
        : [...f.includesItems, item],
    }));
  };

  const addDeparture = () => {
    setDepartures((d) => [
      ...d,
      {
        startsAt: "",
        bookingDeadline: "",
        spotsLeft: form.maxParticipants,
      },
    ]);
  };

  const removeDeparture = (index: number) => {
    setDepartures((d) => d.filter((_, i) => i !== index));
  };

  /*
   * VALIDACIJA KORAKA 1
   */
  function validateStep1() {
    const e: string[] = [];



    if (!form.title.trim()) {
      e.push("Unesite naziv ture.");
    } else if (form.title.trim().length < 3) {
      e.push("Naziv ture mora imati najmanje 3 karaktera.");
    }

    if (!form.activityTypeId) {
      e.push("Izaberite vrstu aktivnosti.");
    }

    if (form.pricePerPerson <= 0) {
      e.push("Unesite cijenu po osobi veću od 0 €.");
    }

    if (
      !Number.isInteger(form.maxParticipants) ||
      form.maxParticipants < 1
    ) {
      e.push("Maksimalan broj učesnika mora biti najmanje 1.");
    }

    if (!form.descriptionSr.trim()) {
      e.push("Unesite opis ture na srpskom.");
    } else if (form.descriptionSr.trim().length < 10) {
      e.push("Opis ture mora imati najmanje 10 karaktera.");
    }

    setErrors(e);

    return e.length === 0;
  }

  /*
   * VALIDACIJA KORAKA 2
   */
  function validateStep2() {
    const e: string[] = [];

if (route.points.length < 2) {
  e.push(
    route.creationMode === "manual"
      ? "Nacrtajte rutu na mapi sa najmanje dvije tačke."
      : "Izaberite početak i cilj na mapi."
  );
}
    
    if (
      !Number.isFinite(route.startLat) ||
      route.startLat < -90 ||
      route.startLat > 90
    ) {
      e.push("Početna geografska širina nije ispravna.");
    }

    if (
      !Number.isFinite(route.startLng) ||
      route.startLng < -180 ||
      route.startLng > 180
    ) {
      e.push("Početna geografska dužina nije ispravna.");
    }

    if (
      !Number.isFinite(route.endLat) ||
      route.endLat < -90 ||
      route.endLat > 90
    ) {
      e.push("Krajnja geografska širina nije ispravna.");
    }

    if (
      !Number.isFinite(route.endLng) ||
      route.endLng < -180 ||
      route.endLng > 180
    ) {
      e.push("Krajnja geografska dužina nije ispravna.");
    }

    if (route.distanceKm < 0) {
      e.push("Dužina rute ne može biti negativna.");
    }

    if (route.elevationGainM < 0) {
      e.push("Visinska razlika ne može biti negativna.");
    }

    if (route.estimatedMins < 0) {
      e.push("Trajanje rute ne može biti negativno.");
    }

    setErrors(e);

    return e.length === 0;
  }

  /*
   * VALIDACIJA KORAKA 3
   */
  function validateStep3() {
    const e: string[] = [];

    if (departures.length === 0) {
      e.push("Dodajte najmanje jedan termin polaska.");
      setErrors(e);
      return false;
    }

    departures.forEach((departure, index) => {
      const n = index + 1;

      if (!departure.startsAt) {
        e.push(`Termin ${n}: unesite datum i vrijeme polaska.`);
      }

      if (!departure.bookingDeadline) {
        e.push(
          `Termin ${n}: unesite rok za rezervacije i izmjene.`
        );
      }

      if (departure.startsAt && departure.bookingDeadline) {
        const start = new Date(departure.startsAt);
        const deadline = new Date(departure.bookingDeadline);

        if (
          Number.isNaN(start.getTime()) ||
          Number.isNaN(deadline.getTime())
        ) {
          e.push(`Termin ${n}: datum ili vrijeme nije ispravno.`);
        } else if (deadline >= start) {
          e.push(
            `Termin ${n}: rok za rezervacije mora biti prije vremena polaska.`
          );
        }
      }

      if (
        !Number.isInteger(departure.spotsLeft) ||
        departure.spotsLeft < 1
      ) {
        e.push(
          `Termin ${n}: broj slobodnih mjesta mora biti najmanje 1.`
        );
      }

      if (departure.spotsLeft > form.maxParticipants) {
        e.push(
          `Termin ${n}: broj slobodnih mjesta ne može biti veći od maksimalnog broja učesnika (${form.maxParticipants}).`
        );
      }
    });

    setErrors(e);

    return e.length === 0;
  }

  function goToStep2() {
    if (!validateStep1()) return;

    setErrors([]);
    setStep(2);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function goToStep3() {
    if (!validateStep2()) return;

    setErrors([]);
    setStep(3);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function goBack(stepNumber: number) {
    setErrors([]);
    setStep(stepNumber);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

function cancel() {
  const confirmed = window.confirm(
    "Da li ste sigurni da želite odustati od kreiranja ture? Uneseni podaci neće biti sačuvani."
  );

  if (confirmed) {
    router.push("/profile");
  }
}
  
  async function submit() {
    setErrors([]);

    if (!validateStep3()) {
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/tours", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...form,
          route,
          departureDates: departures,
        }),
      });

      let data: any = null;

      try {
        data = await res.json();
      } catch {
        setLoading(false);
        setErrors([
          `Server je vratio neispravan odgovor (HTTP ${res.status}).`,
        ]);
        return;
      }

      if (!res.ok) {
        setLoading(false);

        setErrors([
          data?.error ||
            `Objavljivanje ture nije uspjelo (HTTP ${res.status}).`,
        ]);

        return;
      }

      setLoading(false);
      router.push(`/tours/${data.tour.id}`);
    } catch (err) {
      console.error(err);

      setLoading(false);

      setErrors([
        "Nije moguće povezati se sa serverom. Pokušajte ponovo.",
      ]);
    }
  }

  function ErrorBox() {
    if (errors.length === 0) return null;

    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-3">
        <p className="text-sm font-medium text-red-700">
          ⚠ Potrebno je ispraviti:
        </p>

        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-red-600">
          {errors.map((error, index) => (
            <li key={`${error}-${index}`}>{error}</li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <div className="pb-24">
      <Navbar />

      <div className="sticky top-0 z-10 bg-brand px-4 pb-3 pt-4">
        <h1 className="text-lg font-medium text-white">
          Nova tura
        </h1>

        <div className="mt-2 flex gap-1">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`h-1 flex-1 rounded-full ${
                step >= s ? "bg-white" : "bg-white/30"
              }`}
            />
          ))}
        </div>

        <p className="mt-1 text-xs text-white/70">
          {
            ["Osnovni podaci", "Ruta", "Termini i objava"][
              step - 1
            ]
          }
        </p>
      </div>

      <div className="p-4">
        {step === 1 && (
          <div className="flex flex-col gap-3">
            <div>
              <label className="mb-1 block text-xs text-foreground/60">
                Naziv ture *
              </label>

              <input
                value={form.title}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    title: e.target.value,
                  }))
                }
                placeholder="npr. Planinarenje na Lovćen"
                className="w-full rounded-lg border border-black/10 px-3 py-2.5 text-sm outline-none focus:border-brand"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs text-foreground/60">
                Vrsta aktivnosti *
              </label>

              <select
                value={form.activityTypeId}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    activityTypeId: e.target.value,
                  }))
                }
                className="w-full rounded-lg border border-black/10 px-3 py-2.5 text-sm outline-none focus:border-brand"
              >
                <option value="">
                  Izaberite aktivnost
                </option>

                {activities.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs text-foreground/60">
                Način kretanja *
              </label>

              <div className="grid grid-cols-3 gap-2">
                {(
                  [
                    ["FOOT", "🥾", "Pješak"],
                    ["BIKE", "🚵", "Bicikl"],
                    ["CAR", "🚗", "Auto"],
                    ["ATV", "🏍️", "Quad"],
                    ["KAYAK", "🛶", "Kajak"],
                    ["DIVING", "🤿", "Ronjenje"],
                  ] as const
                ).map(([value, icon, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() =>
                      setForm((f) => ({
                        ...f,
                        transportMode: value,
                      }))
                    }
                    className={`rounded-lg border p-2 text-center text-xs ${
                      form.transportMode === value
                        ? "border-brand bg-brand-light text-brand-dark"
                        : "border-black/10"
                    }`}
                  >
                    <div className="text-xl">{icon}</div>
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="mb-1 block text-xs text-foreground/60">
                  Cijena (€/osobi) *
                </label>

                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={form.pricePerPerson || ""}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      pricePerPerson: Number(e.target.value),
                    }))
                  }
                  className="w-full rounded-lg border border-black/10 px-3 py-2.5 text-sm outline-none focus:border-brand"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs text-foreground/60">
                  Max učesnika *
                </label>

                <input
                  type="number"
                  min={1}
                  value={form.maxParticipants}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      maxParticipants: Number(e.target.value),
                    }))
                  }
                  className="w-full rounded-lg border border-black/10 px-3 py-2.5 text-sm outline-none focus:border-brand"
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs text-foreground/60">
                Težina *
              </label>

              <div className="flex gap-2">
                {(
                  [
                    ["EASY", "🟢 Lako"],
                    ["MODERATE", "🟡 Umjereno"],
                    ["HARD", "🔴 Teško"],
                  ] as const
                ).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() =>
                      setForm((f) => ({
                        ...f,
                        difficulty: value,
                      }))
                    }
                    className={`flex-1 rounded-lg border py-2 text-xs ${
                      form.difficulty === value
                        ? "border-brand bg-brand-light text-brand-dark"
                        : "border-black/10"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs text-foreground/60">
                Opis (srpski) *
              </label>

              <textarea
                value={form.descriptionSr}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    descriptionSr: e.target.value,
                  }))
                }
                rows={4}
                placeholder="Najmanje 10 karaktera"
                className="w-full resize-none rounded-lg border border-black/10 px-3 py-2.5 text-sm outline-none focus:border-brand"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs text-foreground/60">
                Description (English)
              </label>

              <textarea
                value={form.descriptionEn}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    descriptionEn: e.target.value,
                  }))
                }
                rows={3}
                className="w-full resize-none rounded-lg border border-black/10 px-3 py-2.5 text-sm outline-none focus:border-brand"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs text-foreground/60">
                Uključeno u cijenu
              </label>

              <div className="flex flex-wrap gap-1.5">
                {INCLUDES.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => toggleInclude(item)}
                    className={`rounded-full border px-3 py-1 text-xs ${
                      form.includesItems.includes(item)
                        ? "border-brand bg-brand-light text-brand-dark"
                        : "border-black/10 text-foreground/60"
                    }`}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs text-foreground/60">
                Polazna tačka / Meeting point
              </label>

              <input
                value={form.meetingPoint}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    meetingPoint: e.target.value,
                  }))
                }
                placeholder="npr. Parking Crno jezero"
                className="w-full rounded-lg border border-black/10 px-3 py-2.5 text-sm outline-none focus:border-brand"
              />
            </div>

            <ErrorBox />

            <div className="mt-2 flex gap-2">
              <button type="button" onClick={cancel} className="flex-1 rounded-xl border border-red-200 py-3 text-sm text-red-500">✕ Odustani</button>
              <button type="button" onClick={goToStep2} className="flex-1 rounded-xl bg-brand py-3 text-sm font-medium text-white">Dalje: Ruta →</button>
            </div>

            <p className="text-center text-[11px] text-foreground/40">
              * Obavezna polja
            </p>
          </div>
        )}

        {step === 2 && (
          <div className="flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-2">
              {(["auto", "manual"] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() =>
                    setRoute((r) => ({
                      ...r,
                      creationMode: mode,
                    }))
                  }
                  className={`rounded-xl border p-3 text-center text-sm ${
                    route.creationMode === mode
                      ? "border-brand bg-brand-light text-brand-dark"
                      : "border-black/10"
                  }`}
                >
                  <div className="text-2xl">
                    {mode === "auto" ? "🗺️" : "✏️"}
                  </div>

                  <div className="mt-1 font-medium">
                    {mode === "auto" ? "Automatski" : "Ručno"}
                  </div>

                  <div className="text-xs text-foreground/50">
                    {mode === "auto"
                      ? "Start + cilj"
                      : "Klik po klik"}
                  </div>
                </button>
              ))}
            </div>

           <RouteEditorMap
  mode={route.creationMode}
  points={route.points}
  startLat={route.startLat}
  startLng={route.startLng}
  endLat={route.endLat}
  endLng={route.endLng}
  onChange={(data) =>
    setRoute((r) => ({
      ...r,

      points: data.points,

      startLat: data.startLat,
      startLng: data.startLng,

      endLat: data.endLat,
      endLng: data.endLng,

      distanceKm:
        data.distanceKm,
    }))
  }
/>
            <div>
              <label className="mb-1 block text-xs text-foreground/60">
                Naziv polazišta
              </label>

              <input
                value={route.startLabel}
                onChange={(e) =>
                  setRoute((r) => ({
                    ...r,
                    startLabel: e.target.value,
                  }))
                }
                placeholder="npr. Parking Crno jezero"
                className="w-full rounded-lg border border-black/10 px-3 py-2.5 text-sm outline-none focus:border-brand"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs text-foreground/60">
                Naziv cilja
              </label>

              <input
                value={route.endLabel}
                onChange={(e) =>
                  setRoute((r) => ({
                    ...r,
                    endLabel: e.target.value,
                  }))
                }
                placeholder="npr. Bobotov kuk"
                className="w-full rounded-lg border border-black/10 px-3 py-2.5 text-sm outline-none focus:border-brand"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="mb-1 block text-xs text-foreground/60">
                  Start lat
                </label>

                <input
                  type="number"
                  step="any"
                  value={route.startLat}
                  onChange={(e) =>
                    setRoute((r) => ({
                      ...r,
                      startLat: Number(e.target.value),
                    }))
                  }
                  className="w-full rounded-lg border border-black/10 px-3 py-2.5 text-sm"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs text-foreground/60">
                  Start lng
                </label>

                <input
                  type="number"
                  step="any"
                  value={route.startLng}
                  onChange={(e) =>
                    setRoute((r) => ({
                      ...r,
                      startLng: Number(e.target.value),
                    }))
                  }
                  className="w-full rounded-lg border border-black/10 px-3 py-2.5 text-sm"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs text-foreground/60">
                  Kraj lat
                </label>

                <input
                  type="number"
                  step="any"
                  value={route.endLat}
                  onChange={(e) =>
                    setRoute((r) => ({
                      ...r,
                      endLat: Number(e.target.value),
                    }))
                  }
                  className="w-full rounded-lg border border-black/10 px-3 py-2.5 text-sm"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs text-foreground/60">
                  Kraj lng
                </label>

                <input
                  type="number"
                  step="any"
                  value={route.endLng}
                  onChange={(e) =>
                    setRoute((r) => ({
                      ...r,
                      endLng: Number(e.target.value),
                    }))
                  }
                  className="w-full rounded-lg border border-black/10 px-3 py-2.5 text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="mb-1 block text-xs text-foreground/60">
                  Dužina (km)
                </label>

                <input
                  type="number"
                  min={0}
                  step="0.1"
                  value={route.distanceKm || ""}
                  onChange={(e) =>
                    setRoute((r) => ({
                      ...r,
                      distanceKm: Number(e.target.value),
                    }))
                  }
                  className="w-full rounded-lg border border-black/10 px-3 py-2.5 text-sm"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs text-foreground/60">
                  Visinska raz. (m)
                </label>

                <input
                  type="number"
                  min={0}
                  value={route.elevationGainM || ""}
                  onChange={(e) =>
                    setRoute((r) => ({
                      ...r,
                      elevationGainM: Number(e.target.value),
                    }))
                  }
                  className="w-full rounded-lg border border-black/10 px-3 py-2.5 text-sm"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs text-foreground/60">
                  Trajanje (min)
                </label>

                <input
                  type="number"
                  min={0}
                  value={route.estimatedMins || ""}
                  onChange={(e) =>
                    setRoute((r) => ({
                      ...r,
                      estimatedMins: Number(e.target.value),
                    }))
                  }
                  className="w-full rounded-lg border border-black/10 px-3 py-2.5 text-sm"
                />
              </div>
            </div>

            <ErrorBox />

            <div className="flex gap-2">
              <button type="button" onClick={cancel} className="rounded-xl border border-red-200 px-4 py-3 text-sm text-red-500">✕ Odustani</button>
              <button type="button" onClick={() => goBack(1)} className="flex-1 rounded-xl border border-black/10 py-3 text-sm text-foreground/70">← Nazad</button>
              <button type="button" onClick={goToStep3} className="flex-1 rounded-xl bg-brand py-3 text-sm font-medium text-white">Dalje →</button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <p className="font-medium">Termini polaska</p>

              <button
                type="button"
                onClick={addDeparture}
                className="rounded-lg bg-brand px-3 py-1.5 text-xs text-white"
              >
                + Dodaj termin
              </button>
            </div>

            {departures.length === 0 && (
              <div className="rounded-xl border border-dashed border-black/15 p-5 text-center">
                <p className="text-sm text-foreground/50">
                  Još nijeste dodali termin.
                </p>

                <button
                  type="button"
                  onClick={addDeparture}
                  className="mt-3 rounded-lg bg-brand-light px-4 py-2 text-sm font-medium text-brand-dark"
                >
                  + Dodaj prvi termin
                </button>
              </div>
            )}

            {departures.map((departure, index) => (
              <div
                key={index}
                className="rounded-xl border border-black/10 p-3"
              >
                <p className="mb-3 text-sm font-medium">
                  Termin {index + 1}
                </p>

                <div className="flex flex-col gap-3">
                  <div>
                    <label className="mb-1 block text-xs text-foreground/60">
                      Datum i vrijeme polaska *
                    </label>

                    <input
                      type="datetime-local"
                      value={departure.startsAt}
                      onChange={(e) =>
                        setDepartures((items) =>
                          items.map((item, i) =>
                            i === index
                              ? {
                                  ...item,
                                  startsAt: e.target.value,
                                }
                              : item
                          )
                        )
                      }
                      className="w-full rounded-lg border border-black/10 px-3 py-2.5 text-sm outline-none focus:border-brand"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs text-foreground/60">
                      Rezervacije i izmjene moguće do *
                    </label>

                    <input
                      type="datetime-local"
                      value={departure.bookingDeadline}
                      onChange={(e) =>
                        setDepartures((items) =>
                          items.map((item, i) =>
                            i === index
                              ? {
                                  ...item,
                                  bookingDeadline: e.target.value,
                                }
                              : item
                          )
                        )
                      }
                      className="w-full rounded-lg border border-black/10 px-3 py-2.5 text-sm outline-none focus:border-brand"
                    />

                    <p className="mt-1 text-[11px] text-foreground/45">
                      Poslije ovog vremena turista neće moći
                      napraviti novu niti izmijeniti postojeću
                      rezervaciju.
                    </p>
                  </div>

                  <div>
                    <label className="mb-1 block text-xs text-foreground/60">
                      Slobodna mjesta *
                    </label>

                    <input
                      type="number"
                      min={1}
                      max={form.maxParticipants}
                      value={departure.spotsLeft}
                      onChange={(e) =>
                        setDepartures((items) =>
                          items.map((item, i) =>
                            i === index
                              ? {
                                  ...item,
                                  spotsLeft: Number(
                                    e.target.value
                                  ),
                                }
                              : item
                          )
                        )
                      }
                      className="w-full rounded-lg border border-black/10 px-3 py-2.5 text-sm outline-none focus:border-brand"
                    />

                    <p className="mt-1 text-[11px] text-foreground/45">
                      Maksimalno: {form.maxParticipants}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => removeDeparture(index)}
                  className="mt-3 text-xs text-red-500"
                >
                  Ukloni termin
                </button>
              </div>
            ))}

            <ErrorBox />

            <div className="mt-2 flex gap-2">
              <button type="button" onClick={cancel} disabled={loading} className="rounded-xl border border-red-200 px-4 py-3 text-sm text-red-500 disabled:opacity-50">✕ Odustani</button>
              <button type="button" onClick={() => goBack(2)} disabled={loading} className="flex-1 rounded-xl border border-black/10 py-3 text-sm text-foreground/70 disabled:opacity-50">← Nazad</button>
              <button type="button" onClick={submit} disabled={loading} className="flex-1 rounded-xl bg-brand py-3 text-sm font-medium text-white disabled:opacity-60">{loading ? "Objavljivanje..." : "✓ Objavi turu"}</button>
            </div>

            <p className="text-center text-[11px] text-foreground/40">
              * Obavezna polja
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
