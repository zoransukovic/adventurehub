"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import Navbar from "@/app/components/Navbar";
type Booking = { id:string; status:string; totalPrice:number; participants:number; createdAt:string; tour:{id:string;title:string;activityType:{name:string}}; departure:{startsAt:string}; review:{id:string}|null };
const STATUS: Record<string,{label:string;cls:string}> = {
  PENDING:{label:"Na čekanju",cls:"bg-amber-50 text-amber-700"},
  CONFIRMED:{label:"Potvrđena",cls:"bg-brand-light text-brand-dark"},
  CANCELLED:{label:"Otkazana",cls:"bg-red-50 text-red-600"},
  COMPLETED:{label:"Završena",cls:"bg-black/5 text-foreground/60"},
};
export default function BookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { fetch("/api/bookings").then(r=>r.json()).then(d=>{setBookings(d.bookings??[]);setLoading(false);}); }, []);
  if (loading) return <div className="flex min-h-screen items-center justify-center text-foreground/40">Učitavanje...</div>;
  return (
    <div className="min-h-screen pb-20">
      <Navbar />
      <div className="bg-brand px-4 pb-4 pt-5"><h1 className="text-lg font-medium text-white">Moje rezervacije</h1></div>
      <div className="p-4">
        {bookings.length===0&&<p className="py-8 text-center text-sm text-foreground/40">Nemate rezervacija. <Link href="/dashboard" className="text-brand-dark underline">Pronađite turu</Link></p>}
        {bookings.map(b=>(
          <div key={b.id} className="mb-3 rounded-2xl border border-black/8 p-4 shadow-sm">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0"><p className="font-medium truncate">{b.tour.title}</p><p className="text-xs text-foreground/50 mt-0.5">{b.tour.activityType.name}</p></div>
              <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium ${STATUS[b.status]?.cls}`}>{STATUS[b.status]?.label}</span>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2 text-center">
              <div className="rounded-lg bg-black/3 p-2"><p className="text-[11px] text-foreground/50">Datum</p><p className="text-xs font-medium mt-0.5">{new Date(b.departure.startsAt).toLocaleDateString("sr-Latn",{day:"numeric",month:"short"})}</p></div>
              <div className="rounded-lg bg-black/3 p-2"><p className="text-[11px] text-foreground/50">Osoba</p><p className="text-xs font-medium mt-0.5">{b.participants}</p></div>
              <div className="rounded-lg bg-black/3 p-2"><p className="text-[11px] text-foreground/50">Ukupno</p><p className="text-xs font-medium mt-0.5 text-brand-dark">€{b.totalPrice}</p></div>
            </div>
            <div className="mt-3 flex gap-2">
              <Link href={`/tours/${b.tour.id}`} className="flex-1 rounded-xl border border-black/10 py-2.5 text-center text-xs text-foreground/60">Detalji ture</Link>
              {b.status==="COMPLETED"&&!b.review&&<Link href={`/tours/${b.tour.id}#review`} className="flex-1 rounded-xl bg-brand-light py-2.5 text-center text-xs font-medium text-brand-dark">⭐ Ostavi recenziju</Link>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
