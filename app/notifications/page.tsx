"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/app/components/Navbar";
type Notif = { id:string; type:string; title:string; body:string|null; linkUrl:string|null; read:boolean; createdAt:string };
const ICONS: Record<string,string> = { MESSAGE:"💬", BOOKING_CONFIRMED:"✅", REMINDER:"📅", REVIEW_REQUEST:"⭐", PROMO:"🎁", SYSTEM:"🔔" };
export default function NotificationsPage() {
  const router = useRouter();
  const [notifs, setNotifs] = useState<Notif[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { fetch("/api/notifications").then(r=>r.json()).then(d=>{ setNotifs(d.notifications??[]); setLoading(false); }); }, []);
  async function markAll() {
    await fetch("/api/notifications", { method:"PATCH", headers:{"Content-Type":"application/json"}, body:JSON.stringify({}) });
    setNotifs(n=>n.map(x=>({...x, read:true})));
  }
  async function open(n: Notif) {
    if (!n.read) {
      await fetch("/api/notifications", { method:"PATCH", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ids:[n.id]}) });
      setNotifs(ns=>ns.map(x=>x.id===n.id?{...x,read:true}:x));
    }
    if (n.linkUrl) router.push(n.linkUrl);
  }
  const unread = notifs.filter(n=>!n.read).length;
  const today = notifs.filter(n=>new Date(n.createdAt).toDateString()===new Date().toDateString());
  const older = notifs.filter(n=>new Date(n.createdAt).toDateString()!==new Date().toDateString());
  return (
    <div className="min-h-screen pb-20">
      <Navbar />
      <div className="bg-brand px-4 pb-4 pt-5 flex items-center justify-between">
        <div><h1 className="text-lg font-medium text-white">Obavještenja</h1>{unread>0&&<p className="text-xs text-white/70">{unread} nepročitanih</p>}</div>
        {unread>0&&<button onClick={markAll} className="text-xs text-white/80 border border-white/30 rounded-lg px-3 py-1.5">Označi sve</button>}
      </div>
      <div className="p-4">
        {loading&&<p className="text-center text-sm text-foreground/40 py-8">Učitavanje...</p>}
        {!loading&&notifs.length===0&&<p className="text-center text-sm text-foreground/40 py-8">Nema obavještenja.</p>}
        {today.length>0&&<><p className="text-xs font-medium text-foreground/50 mb-2 uppercase tracking-wide">Danas</p>{today.map(n=>(
          <div key={n.id} onClick={()=>open(n)} className={`flex gap-3 py-3 border-b border-black/8 cursor-pointer ${!n.read?"bg-brand-light/30 -mx-4 px-4":""}`}>
            <div className={`h-10 w-10 rounded-full flex items-center justify-center text-lg shrink-0 ${!n.read?"bg-brand-light":"bg-black/5"}`}>{ICONS[n.type]??"🔔"}</div>
            <div className="flex-1 min-w-0">
              <p className={`text-sm ${!n.read?"font-medium":""}`}>{n.title}</p>
              {n.body&&<p className="text-xs text-foreground/55 mt-0.5 truncate">{n.body}</p>}
              <p className="text-[11px] text-foreground/40 mt-1">{new Date(n.createdAt).toLocaleTimeString("sr-Latn",{hour:"2-digit",minute:"2-digit"})}</p>
            </div>
            {!n.read&&<div className="h-2 w-2 rounded-full bg-brand mt-2 shrink-0"/>}
          </div>
        ))}</>}
        {older.length>0&&<><p className="text-xs font-medium text-foreground/50 mb-2 mt-4 uppercase tracking-wide">Ranije</p>{older.map(n=>(
          <div key={n.id} onClick={()=>open(n)} className={`flex gap-3 py-3 border-b border-black/8 cursor-pointer`}>
            <div className="h-10 w-10 rounded-full flex items-center justify-center text-lg shrink-0 bg-black/5">{ICONS[n.type]??"🔔"}</div>
            <div className="flex-1 min-w-0">
              <p className={`text-sm ${!n.read?"font-medium":""}`}>{n.title}</p>
              {n.body&&<p className="text-xs text-foreground/55 mt-0.5 truncate">{n.body}</p>}
              <p className="text-[11px] text-foreground/40 mt-1">{new Date(n.createdAt).toLocaleDateString("sr-Latn",{day:"numeric",month:"short"})}</p>
            </div>
            {!n.read&&<div className="h-2 w-2 rounded-full bg-brand mt-2 shrink-0"/>}
          </div>
        ))}</>}
      </div>
    </div>
  );
}
