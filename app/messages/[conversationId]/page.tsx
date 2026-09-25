"use client";
import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Navbar from "@/app/components/Navbar";
type Msg = { id:string; body:string; createdAt:string; sender:{id:string;fullName:string} };
type Conv = { id:string; participants:{user:{id:string;fullName:string;role:string}}[]; messages:Msg[] };
type Me = { id:string; fullName:string } | null;
export default function ConvPage() {
  const { conversationId } = useParams<{conversationId:string}>();
  const [conv, setConv] = useState<Conv|null>(null);
  const [me, setMe] = useState<Me>(null);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const QUICK = ["Hvala na informaciji!","Vidimo se na turi!","Kakvo je predviđeno vrijeme?","Mogu li pozvati prijatelja?","Kada je sljedeći termin?"];

  useEffect(() => {
    Promise.all([fetch(`/api/messages/${conversationId}`).then(r=>r.json()), fetch("/api/auth/me").then(r=>r.json())])
      .then(([c,m]) => { setConv(c.conversation); setMe(m.user); setTimeout(()=>bottomRef.current?.scrollIntoView(),100); });
  }, [conversationId]);

  async function send(text?:string) {
    const msg = text ?? body.trim();
    if (!msg) return;
    setSending(true);
    const res = await fetch(`/api/messages/${conversationId}`, { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({body:msg}) });
    const d = await res.json();
    if (res.ok) { setConv(c=>c ? {...c, messages:[...c.messages, d.message]} : c); setBody(""); setTimeout(()=>bottomRef.current?.scrollIntoView({behavior:"smooth"}),50); }
    setSending(false);
  }

  const other = conv?.participants.find(p=>p.user.id!==me?.id)?.user;

  return (
    <div className="flex min-h-screen flex-col pb-20">
      <Navbar />
      <div className="bg-brand px-4 pb-3 pt-4 flex items-center gap-3">
        <Link href="/messages" className="text-white/80 text-lg">←</Link>
        <div className="h-8 w-8 rounded-full bg-white/25 flex items-center justify-center text-xs font-medium text-white">{other?.fullName?.charAt(0)??""}</div>
        <div><p className="text-sm font-medium text-white">{other?.fullName ?? "Chat"}</p><p className="text-xs text-white/70">{other?.role==="GUIDE"?"Vodič":"Turista"}</p></div>
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-2">
        {conv?.messages.map(m => {
          const mine = m.sender.id === me?.id;
          return (
            <div key={m.id} className={`flex ${mine?"justify-end":"justify-start"}`}>
              <div className={`max-w-[78%] rounded-2xl px-3 py-2 text-sm ${mine?"bg-brand text-white rounded-br-sm":"bg-black/8 text-foreground rounded-bl-sm"}`}>
                {m.body}
                <div className={`mt-0.5 text-[10px] ${mine?"text-white/60":"text-foreground/40"}`}>{new Date(m.createdAt).toLocaleTimeString("sr-Latn",{hour:"2-digit",minute:"2-digit"})}</div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef}/>
      </div>
      <div className="flex gap-2 overflow-x-auto px-4 py-2 border-t border-black/8">
        {QUICK.map(q=><button key={q} type="button" onClick={()=>send(q)} className="shrink-0 rounded-full border border-brand bg-brand-light px-3 py-1.5 text-xs text-brand-dark">{q}</button>)}
      </div>
      <div className="flex gap-2 border-t border-black/8 px-4 py-3">
        <input value={body} onChange={e=>setBody(e.target.value)} onKeyDown={e=>e.key==="Enter"&&!e.shiftKey&&send()} placeholder="Napišite poruku..." className="flex-1 rounded-full border border-black/10 px-4 py-2.5 text-sm outline-none focus:border-brand"/>
        <button onClick={()=>send()} disabled={sending||!body.trim()} className="rounded-full bg-brand px-4 py-2.5 text-sm text-white disabled:opacity-50">→</button>
      </div>
    </div>
  );
}
