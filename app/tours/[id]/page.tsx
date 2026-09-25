"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import StarRating from "@/app/components/StarRating";
import Navbar from "@/app/components/Navbar";

type Tour = {
  id:string; title:string; descriptionSr:string; descriptionEn:string|null;
  pricePerPerson:number; maxParticipants:number; durationMinutes:number|null;
  difficulty:string; transportMode:string; meetingPoint:string|null; includesItems:string[];
  activityType:{name:string}; guide:{id:string;fullName:string;guideCertified:boolean;guideBio:string|null};
  route:{distanceKm:number|null;estimatedMins:number|null;elevationGainM:number|null}|null;
  departures:{id:string;startsAt:string;spotsLeft:number}[];
  reviews:{id:string;rating:number;comment:string|null;tags:string[];author:{fullName:string};createdAt:string}[];
  avgRating:number|null; reviewCount:number;
};
type User = { id:string; role:string } | null;

const DIFF = { EASY:"🟢 Lako", MODERATE:"🟡 Umjereno", HARD:"🔴 Teško" } as Record<string,string>;
const TRANSPORT = { FOOT:"🥾 Pješak", BIKE:"🚵 Bicikl", CAR:"🚗 Automobil", ATV:"🏍️ Quad/ATV", KAYAK:"🛶 Kajak", DIVING:"🤿 Ronjenje", OTHER:"🌿 Ostalo" } as Record<string,string>;

export default function TourPage() {
  const { id } = useParams<{id:string}>();
  const router = useRouter();
  const [tour, setTour] = useState<Tour|null>(null);
  const [user, setUser] = useState<User>(null);
  const [selDep, setSelDep] = useState("");
  const [participants, setParticipants] = useState(1);
  const [booking, setBooking] = useState<{loading:boolean;done:boolean;error:string|null}>({loading:false,done:false,error:null});
  const [lang, setLang] = useState<"sr"|"en">("sr");

  useEffect(() => {
    Promise.all([
      fetch(`/api/tours/${id}`).then(r=>r.json()),
      fetch("/api/auth/me").then(r=>r.json()),
    ]).then(([t,m]) => { setTour(t.tour); setUser(m.user); if (t.tour?.departures?.[0]) setSelDep(t.tour.departures[0].id); });
  }, [id]);

  async function book() {
    if (!selDep) return;
    setBooking({loading:true,done:false,error:null});
    const res = await fetch("/api/bookings", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ tourId:id, departureId:selDep, participants }) });
    const d = await res.json();
    if (!res.ok) setBooking({loading:false,done:false,error:d.error});
    else setBooking({loading:false,done:true,error:null});
  }

  async function startTracking() {
    if (!selDep) return;
    const res = await fetch("/api/tracking/start", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ departureId:selDep }) });
    const d = await res.json();
    if (res.ok) router.push(`/tracking/${d.session.id}`);
  }

  if (!tour) return <div className="flex min-h-screen items-center justify-center text-foreground/40">Učitavanje...</div>;

  return (
    <div className="pb-24">
      <Navbar />
      <div className="flex h-48 items-center justify-center bg-brand-light">
        <div className="text-center"><div className="text-6xl">{TRANSPORT[tour.transportMode]?.charAt(0)??""}</div><div className="mt-2 text-sm font-medium text-brand-dark">{tour.activityType.name}</div></div>
      </div>
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <h1 className="text-xl font-medium">{tour.title}</h1>
          <div className="flex gap-1"><button onClick={()=>setLang("sr")} className={`rounded px-2 py-1 text-xs ${lang==="sr"?"bg-brand text-white":"border border-black/10 text-foreground/60"}`}>SRP</button><button onClick={()=>setLang("en")} className={`rounded px-2 py-1 text-xs ${lang==="en"?"bg-brand text-white":"border border-black/10 text-foreground/60"}`}>ENG</button></div>
        </div>

        <div className="mt-1 flex items-center gap-2 text-sm text-foreground/60">
          <span>Vodič: {tour.guide.fullName}{tour.guide.guideCertified?" ✓":""}</span>
          {tour.avgRating && <span className="text-amber-500">★ {tour.avgRating.toFixed(1)} ({tour.reviewCount})</span>}
        </div>

        <div className="mt-3 flex flex-wrap gap-2 text-xs">
          <span className="rounded-full bg-brand-light px-3 py-1 text-brand-dark">{DIFF[tour.difficulty]}</span>
          <span className="rounded-full bg-brand-light px-3 py-1 text-brand-dark">{TRANSPORT[tour.transportMode]}</span>
          {tour.route?.distanceKm && <span className="rounded-full bg-black/5 px-3 py-1">{tour.route.distanceKm} km</span>}
          {tour.route?.elevationGainM && <span className="rounded-full bg-black/5 px-3 py-1">+{tour.route.elevationGainM}m visine</span>}
          {tour.durationMinutes && <span className="rounded-full bg-black/5 px-3 py-1">⏱ {Math.floor(tour.durationMinutes/60)}h {tour.durationMinutes%60}min</span>}
        </div>

        <p className="mt-4 text-sm leading-relaxed text-foreground/70">{lang==="sr" ? tour.descriptionSr : (tour.descriptionEn || tour.descriptionSr)}</p>

        {tour.meetingPoint && <div className="mt-3 rounded-xl bg-black/5 p-3 text-sm"><span className="font-medium">📍 Polazna tačka:</span> {tour.meetingPoint}</div>}

        {tour.includesItems.length > 0 && (
          <div className="mt-3">
            <p className="mb-1 text-sm font-medium">Uključeno:</p>
            <div className="flex flex-wrap gap-1.5">{tour.includesItems.map(i => <span key={i} className="rounded-full bg-brand-light px-2.5 py-1 text-xs text-brand-dark">✓ {i}</span>)}</div>
          </div>
        )}

        {tour.guide.guideBio && <div className="mt-4 rounded-xl bg-black/3 p-3"><p className="text-xs font-medium text-foreground/60">O vodiču</p><p className="mt-1 text-sm text-foreground/70">{tour.guide.guideBio}</p></div>}

        <div className="mt-5 rounded-2xl border border-black/10 p-4">
          <p className="text-sm font-medium">Rezerviši turu</p>
          {tour.departures.length === 0 ? <p className="mt-2 text-sm text-foreground/50">Nema dostupnih termina.</p> : (<>
            <div className="mt-2"><label className="mb-1 block text-xs text-foreground/60">Termin polaska</label>
              <select value={selDep} onChange={e=>setSelDep(e.target.value)} className="w-full rounded-lg border border-black/10 px-3 py-2.5 text-sm">
                {tour.departures.map(d => <option key={d.id} value={d.id}>{new Date(d.startsAt).toLocaleDateString("sr-Latn",{weekday:"short",day:"numeric",month:"long"})} · {d.spotsLeft} mjesta</option>)}
              </select>
            </div>
            <div className="mt-2"><label className="mb-1 block text-xs text-foreground/60">Broj učesnika</label>
              <input type="number" min={1} max={tour.maxParticipants} value={participants} onChange={e=>setParticipants(Number(e.target.value))} className="w-full rounded-lg border border-black/10 px-3 py-2.5 text-sm"/>
            </div>
            <div className="mt-3 flex items-center justify-between"><span className="text-sm text-foreground/60">Ukupno:</span><span className="text-lg font-medium text-brand-dark">€{(tour.pricePerPerson*participants).toFixed(2)}</span></div>
            {booking.error && <p className="mt-2 text-sm text-red-600">{booking.error}</p>}
            {booking.done ? <p className="mt-3 rounded-xl bg-brand-light p-3 text-sm text-brand-dark">✓ Rezervacija potvrđena!</p> : (
              <button onClick={book} disabled={booking.loading} className="mt-3 w-full rounded-xl bg-brand py-3 text-sm font-medium text-white disabled:opacity-60">{booking.loading ? "Rezervisanje..." : "Rezerviši"}</button>
            )}
            <button onClick={startTracking} className="mt-2 w-full rounded-xl border border-brand py-3 text-sm font-medium text-brand">📍 Počni live tracking</button>
          </>)}
        </div>

        <Link href={`/messages/new?recipientId=${tour.guide.id}`} className="mt-2 block w-full rounded-xl border border-black/10 py-3 text-center text-sm text-foreground/70">💬 Kontaktiraj vodiča</Link>

        {tour.reviews.length > 0 && (
          <div className="mt-6">
            <p className="mb-3 font-medium">Recenzije ({tour.reviewCount})</p>
            <div className="flex flex-col gap-3">
              {tour.reviews.map(r => (
                <div key={r.id} className="rounded-xl border border-black/8 p-3">
                  <div className="flex items-center justify-between"><span className="text-sm font-medium">{r.author.fullName}</span><StarRating value={r.rating} size="sm"/></div>
                  {r.comment && <p className="mt-1.5 text-sm text-foreground/65">{r.comment}</p>}
                  {r.tags.length>0 && <div className="mt-1.5 flex flex-wrap gap-1">{r.tags.map(t=><span key={t} className="rounded-full bg-brand-light px-2 py-0.5 text-[11px] text-brand-dark">{t}</span>)}</div>}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
