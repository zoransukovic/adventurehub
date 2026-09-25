"use client";
import { useSearchParams, useRouter } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
function NewMessageInner() {
  const sp = useSearchParams();
  const router = useRouter();
  const recipientId = sp.get("recipientId") ?? "";
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string|null>(null);
  async function send() {
    if (!body.trim() || !recipientId) return;
    setLoading(true);
    const res = await fetch("/api/messages", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({recipientId, body}) });
    const d = await res.json(); setLoading(false);
    if (!res.ok) { setError(d.error); return; }
    router.push(`/messages/${d.conversationId}`);
  }
  return (
    <div className="p-4">
      <h1 className="mb-4 text-lg font-medium">Nova poruka</h1>
      <textarea value={body} onChange={e=>setBody(e.target.value)} rows={5} placeholder="Napišite poruku vodiču..." className="w-full resize-none rounded-xl border border-black/10 p-3 text-sm outline-none focus:border-brand"/>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      <button onClick={send} disabled={loading||!body.trim()} className="mt-3 w-full rounded-xl bg-brand py-3 text-sm font-medium text-white disabled:opacity-60">{loading?"Slanje...":"Pošalji"}</button>
    </div>
  );
}
export default function NewMessagePage() {
  return <Suspense><NewMessageInner/></Suspense>;
}
