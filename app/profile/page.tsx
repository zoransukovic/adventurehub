"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Navbar from "@/app/components/Navbar";
type User = { id:string; email:string; fullName:string; role:string; country:string|null; language:string; guideStatus:string|null; guideCertified:boolean } | null;
type Booking = { id:string; status:string; totalPrice:number; participants:number; tour:{id:string;title:string;activityType:{name:string}}; departure:{startsAt:string}; review:{id:string}|null };
export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<User>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [tab, setTab] = useState<"bookings"|"settings">("bookings");
  useEffect(() => {
    Promise.all([fetch("/api/auth/me").then(r=>r.json()), fetch("/api/bookings").then(r=>r.json())])
      .then(([m,b]) => { if(!m.user){router.push("/login");return;} setUser(m.user); setBookings(b.bookings??[]); });
  }, [router]);
  async function logout() { await fetch("/api/auth/logout",{method:"POST"}); router.push("/login"); }
  const STATUS: Record<string,string> = { PENDING:"⏳ Na čekanju", CONFIRMED:"✅ Potvrđena", CANCELLED:"❌ Otkazana", COMPLETED:"🏁 Završena" };
  if (!user) return <div className="flex min-h-screen items-center justify-center text-foreground/40">Učitavanje...</div>;
  return (
    <div className="min-h-screen pb-20">
      <Navbar />
      <div className="bg-brand px-4 pb-6 pt-5 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-white/25 text-2xl font-medium text-white">{user.fullName.charAt(0)}</div>
        <h1 className="mt-2 text-lg font-medium text-white">{user.fullName}</h1>
        <p className="text-xs text-white/70">{user.role==="TOURIST"?"Turista":user.role==="GUIDE"?"Vodič":"Administrator"} · {user.country??""}</p>
        {user.role==="GUIDE"&&<p className="mt-1 text-xs text-white/60">{user.guideStatus==="APPROVED"?"✓ Odobreni vodič":user.guideStatus==="PENDING"?"⏳ Čeka odobrenje":"❌ Odbijen"}</p>}
      </div>
      <div className="flex border-b border-black/8">
        <button onClick={()=>setTab("bookings")} className={`flex-1 py-3 text-sm ${tab==="bookings"?"border-b-2 border-brand font-medium text-brand":"text-foreground/50"}`}>Rezervacije ({bookings.length})</button>
        <button onClick={()=>setTab("settings")} className={`flex-1 py-3 text-sm ${tab==="settings"?"border-b-2 border-brand font-medium text-brand":"text-foreground/50"}`}>Podešavanja</button>
      </div>
      <div className="p-4">
        {tab==="bookings"&&(<>
          {bookings.length===0&&<p className="py-8 text-center text-sm text-foreground/40">Nemate rezervacija.</p>}
          {bookings.map(b=>(
            <div key={b.id} className="mb-3 rounded-xl border border-black/8 p-4">
              <div className="flex items-start justify-between gap-2">
                <div><p className="font-medium text-sm">{b.tour.title}</p><p className="text-xs text-foreground/50 mt-0.5">{b.tour.activityType.name} · {b.participants} osoba</p></div>
                <span className="text-xs shrink-0">{STATUS[b.status]}</span>
              </div>
              <div className="mt-2 flex items-center justify-between text-xs text-foreground/50">
                <span>📅 {new Date(b.departure.startsAt).toLocaleDateString("sr-Latn",{day:"numeric",month:"long",year:"numeric"})}</span>
                <span className="font-medium text-brand-dark">€{b.totalPrice.toFixed(2)}</span>
              </div>
              <div className="mt-3 flex gap-2">
                <Link href={`/tours/${b.tour.id}`} className="flex-1 rounded-lg border border-black/10 py-2 text-center text-xs text-foreground/60">Pogledaj turu</Link>
                {b.status==="COMPLETED"&&!b.review&&<Link href={`/tours/${b.tour.id}#review`} className="flex-1 rounded-lg bg-brand-light py-2 text-center text-xs text-brand-dark">⭐ Ostavi recenziju</Link>}
              </div>
            </div>
          ))}
        </>)}
        {tab==="settings"&&(
          <div className="flex flex-col gap-1">
            {[
              { label:"Ime i prezime", value:user.fullName },
              { label:"Email", value:user.email },
              { label:"Zemlja", value:user.country??"-" },
              { label:"Jezik", value:user.language==="sr"?"Srpski":"English" },
            ].map(r=>(
              <div key={r.label} className="flex items-center justify-between py-3 border-b border-black/8">
                <span className="text-sm text-foreground/60">{r.label}</span>
                <span className="text-sm font-medium">{r.value}</span>
              </div>
            ))}
            {user.role==="ADMIN"&&<Link href="/admin" className="mt-4 block w-full rounded-xl bg-black/5 py-3 text-center text-sm font-medium">⚙️ Admin panel</Link>}
            {user.role==="GUIDE"&&user.guideStatus==="APPROVED"&&<Link href="/tours/new" className="mt-4 block w-full rounded-xl bg-brand-light py-3 text-center text-sm font-medium text-brand-dark">➕ Dodaj novu turu</Link>}
            <button onClick={logout} className="mt-3 w-full rounded-xl border border-red-200 py-3 text-sm text-red-500">Odjavi se</button>
          </div>
        )}
      </div>
    </div>
  );
}
