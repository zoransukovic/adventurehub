"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Navbar from "@/app/components/Navbar";

type Msg = {
  id: string;
  body: string;
  createdAt: string;
  sender: {
    id: string;
    fullName: string;
  };
};

type Conv = {
  id: string;
  participants: {
    user: {
      id: string;
      fullName: string;
      role: string;
    };
  }[];
  messages: Msg[];
};

type Me = {
  id: string;
  fullName: string;
} | null;

export default function ConvPage() {
  const { conversationId } =
    useParams<{ conversationId: string }>();

  const [conv, setConv] = useState<Conv | null>(null);
  const [me, setMe] = useState<Me>(null);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);

  /*
   * Čuvamo ID posljednje poruke.
   * Tako možemo prepoznati da je stigla nova poruka.
   */
  const lastMessageIdRef = useRef<string | null>(null);

  const QUICK = [
    "Hvala na informaciji!",
    "Vidimo se na turi!",
    "Kakvo je predviđeno vrijeme?",
    "Mogu li pozvati prijatelja?",
    "Kada je sljedeći termin?",
  ];

  /*
   * Učitavanje razgovora.
   *
   * silent = true koristimo kod automatskog
   * osvježavanja da ne remetimo ekran.
   */
  async function loadConversation(
    silent = false
  ) {
    try {
      const res = await fetch(
        `/api/messages/${conversationId}`,
        {
          cache: "no-store",
        }
      );

      if (!res.ok) return;

      const data = await res.json();

      if (!data.conversation) return;

      const newConversation: Conv =
        data.conversation;

      const messages =
        newConversation.messages ?? [];

      const lastMessage =
        messages.length > 0
          ? messages[messages.length - 1]
          : null;

      const previousLastId =
        lastMessageIdRef.current;

      /*
       * Ažuriramo razgovor.
       */
      setConv(newConversation);

      /*
       * Ako je stigla nova poruka,
       * skrolujemo na dno.
       */
      if (
        lastMessage &&
        previousLastId &&
        lastMessage.id !== previousLastId
      ) {
        setTimeout(() => {
          bottomRef.current?.scrollIntoView({
            behavior: "smooth",
          });
        }, 50);
      }

      /*
       * Prilikom prvog učitavanja
       * odmah idemo na posljednju poruku.
       */
      if (!silent && !previousLastId) {
        setTimeout(() => {
          bottomRef.current?.scrollIntoView();
        }, 100);
      }

      lastMessageIdRef.current =
        lastMessage?.id ?? null;
    } catch (error) {
      console.error(
        "Greška pri učitavanju poruka:",
        error
      );
    }
  }

  /*
   * Prvo učitavanje korisnika i razgovora.
   */
  useEffect(() => {
    async function initialLoad() {
      try {
        const [conversationRes, meRes] =
          await Promise.all([
            fetch(
              `/api/messages/${conversationId}`,
              {
                cache: "no-store",
              }
            ),
            fetch("/api/auth/me", {
              cache: "no-store",
            }),
          ]);

        const conversationData =
          await conversationRes.json();

        const meData =
          await meRes.json();

        setConv(
          conversationData.conversation
        );

        setMe(meData.user);

        const messages =
          conversationData.conversation
            ?.messages ?? [];

        if (messages.length > 0) {
          lastMessageIdRef.current =
            messages[messages.length - 1].id;
        }

        setTimeout(() => {
          bottomRef.current?.scrollIntoView();
        }, 100);
      } catch (error) {
        console.error(
          "Greška pri prvom učitavanju:",
          error
        );
      }
    }

    initialLoad();
  }, [conversationId]);

  /*
   * AUTOMATSKO OSVJEŽAVANJE
   *
   * Svake 2 sekunde provjeravamo
   * ima li novih poruka.
   */
  useEffect(() => {
    const interval = window.setInterval(() => {
      /*
       * Ako je tab potpuno skriven,
       * nema potrebe stalno slati zahtjeve.
       */
      if (
        document.visibilityState === "visible"
      ) {
        loadConversation(true);
      }
    }, 2000);

    return () => {
      window.clearInterval(interval);
    };
  }, [conversationId]);

  /*
   * Kada se korisnik vrati na tab,
   * odmah provjeravamo nove poruke.
   */
  useEffect(() => {
    function handleVisibilityChange() {
      if (
        document.visibilityState === "visible"
      ) {
        loadConversation(true);
      }
    }

    document.addEventListener(
      "visibilitychange",
      handleVisibilityChange
    );

    return () => {
      document.removeEventListener(
        "visibilitychange",
        handleVisibilityChange
      );
    };
  }, [conversationId]);

  async function send(text?: string) {
    const msg =
      text ?? body.trim();

    if (!msg) return;

    setSending(true);

    try {
      const res = await fetch(
        `/api/messages/${conversationId}`,
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            body: msg,
          }),
        }
      );

      const data = await res.json();

      if (res.ok) {
        /*
         * Odmah prikazujemo poslatu poruku.
         * Ne čekamo sljedeći polling.
         */
        setConv((current) =>
          current
            ? {
                ...current,

                messages: [
                  ...current.messages,
                  data.message,
                ],
              }
            : current
        );

        lastMessageIdRef.current =
          data.message.id;

        setBody("");

        setTimeout(() => {
          bottomRef.current?.scrollIntoView({
            behavior: "smooth",
          });
        }, 50);
      }
    } catch (error) {
      console.error(
        "Greška pri slanju poruke:",
        error
      );
    } finally {
      setSending(false);
    }
  }

  const other =
    conv?.participants.find(
      (p) => p.user.id !== me?.id
    )?.user;

  return (
    <div className="flex min-h-screen flex-col pb-20">
      <Navbar />

      <div className="flex items-center gap-3 bg-brand px-4 pb-3 pt-4">
        <Link
          href="/messages"
          className="text-lg text-white/80"
        >
          ←
        </Link>

        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/25 text-xs font-medium text-white">
          {other?.fullName?.charAt(0) ?? ""}
        </div>

        <div>
          <p className="text-sm font-medium text-white">
            {other?.fullName ?? "Chat"}
          </p>

          <p className="text-xs text-white/70">
            {other?.role === "GUIDE"
              ? "Vodič"
              : "Turista"}
          </p>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-2 overflow-y-auto px-4 py-3">
        {conv?.messages.map((m) => {
          const mine =
            m.sender.id === me?.id;

          return (
            <div
              key={m.id}
              className={`flex ${
                mine
                  ? "justify-end"
                  : "justify-start"
              }`}
            >
              <div
                className={`max-w-[78%] rounded-2xl px-3 py-2 text-sm ${
                  mine
                    ? "rounded-br-sm bg-brand text-white"
                    : "rounded-bl-sm bg-black/8 text-foreground"
                }`}
              >
                {m.body}

                <div
                  className={`mt-0.5 text-[10px] ${
                    mine
                      ? "text-white/60"
                      : "text-foreground/40"
                  }`}
                >
                  {new Date(
                    m.createdAt
                  ).toLocaleTimeString(
                    "sr-Latn",
                    {
                      hour: "2-digit",
                      minute: "2-digit",
                    }
                  )}
                </div>
              </div>
            </div>
          );
        })}

        <div ref={bottomRef} />
      </div>

      <div className="flex gap-2 overflow-x-auto border-t border-black/8 px-4 py-2">
        {QUICK.map((q) => (
          <button
            key={q}
            type="button"
            onClick={() => send(q)}
            className="shrink-0 rounded-full border border-brand bg-brand-light px-3 py-1.5 text-xs text-brand-dark"
          >
            {q}
          </button>
        ))}
      </div>

      <div className="flex gap-2 border-t border-black/8 px-4 py-3">
        <input
          value={body}
          onChange={(e) =>
            setBody(e.target.value)
          }
          onKeyDown={(e) => {
            if (
              e.key === "Enter" &&
              !e.shiftKey
            ) {
              e.preventDefault();
              send();
            }
          }}
          placeholder="Napišite poruku..."
          className="flex-1 rounded-full border border-black/10 px-4 py-2.5 text-sm outline-none focus:border-brand"
        />

        <button
          onClick={() => send()}
          disabled={
            sending || !body.trim()
          }
          className="rounded-full bg-brand px-4 py-2.5 text-sm text-white disabled:opacity-50"
        >
          {sending ? "..." : "→"}
        </button>
      </div>
    </div>
  );
}
