"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import Navbar from "@/app/components/Navbar";
type Conv = { id:string; type:string; tourId:string|null; participants:{user:{id:string;fullName:string;role:string}}[]; messages:{body:string;createdAt:string}[] };
type Me = { id:string } | null;
export default function MessagesPage() {
  const [convs, setConvs] = useState<Conv[]>([]);
  const [me, setMe] = useState<Me>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    Promise.all([fetch("/api/messages").then(r=>r.json()), fetch("/api/auth/me").then(r=>r.json())])
      .then(([c,m]) => { setConvs(c.conversations??[]); setMe(m.user); setLoading(false); });
  }, []);
  const other = (c:Conv) => c.participants.find(p=>p.user.id!==me?.id)?.user;
  return (
    <div className="min-h-screen pb-20">
      <Navbar />
      <div className="bg-brand px-4 pb-4 pt-5"><h1 className="text-lg font-medium text-white">Poruke</h1></div>
      <div className="p-4">
        {loading && <p className="text-center text-sm text-foreground/40 py-8">Učitavanje...</p>}
        {!loading && convs.length===0 && <p className="text-center text-sm text-foreground/40 py-8">Nema razgovora. Kontaktirajte vodiča s detalja ture.</p>}
        {convs.map(c => {
          const o = other(c);
          const last = c.messages[0];
          return (
            <Link key={c.id} href={`/messages/${c.id}`} className="flex items-center gap-3 py-3 border-b border-black/8">
              <div className="h-11 w-11 rounded-full bg-brand-light flex items-center justify-center text-sm font-medium text-brand-dark">{o?.fullName?.charAt(0)??""}</div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium">{o?.fullName ?? "Grupni chat"}</div>
                <div className="text-xs text-foreground/50 truncate">{last?.body ?? "Nema poruka"}</div>
              </div>
              {last && <div className="text-[11px] text-foreground/40 shrink-0">{new Date(last.createdAt).toLocaleDateString("sr-Latn",{day:"numeric",month:"short"})}</div>}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
