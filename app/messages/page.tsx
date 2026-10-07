"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Navbar from "@/app/components/Navbar";

type User = {
  id: string;
  fullName: string;
  role: string;
};

type Conv = {
  id: string;
  type: "DIRECT" | "GROUP";
  tourId: string | null;
  participants: {
    user: User;
  }[];
  messages: {
    body: string;
    createdAt: string;
  }[];
};

type Me = {
  id: string;
} | null;

export default function MessagesPage() {
  const [convs, setConvs] = useState<Conv[]>([]);
  const [me, setMe] = useState<Me>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/messages").then((r) => r.json()),
      fetch("/api/auth/me").then((r) => r.json()),
    ]).then(([c, m]) => {
      setConvs(c.conversations ?? []);
      setMe(m.user);
      setLoading(false);
    });
  }, []);

  function getOtherUser(c: Conv) {
    return c.participants.find(
      (p) => p.user.id !== me?.id
    )?.user;
  }

  function getGuide(c: Conv) {
    return c.participants.find(
      (p) => p.user.role === "GUIDE"
    )?.user;
  }

  return (
    <div className="min-h-screen pb-20">
      <Navbar />

      <div className="bg-brand px-4 pb-4 pt-5">
        <h1 className="text-lg font-medium text-white">
          Poruke
        </h1>
      </div>

      <div className="p-4">
        {loading && (
          <p className="py-8 text-center text-sm text-foreground/40">
            Učitavanje...
          </p>
        )}

        {!loading && convs.length === 0 && (
          <p className="py-8 text-center text-sm text-foreground/40">
            Nema razgovora. Kontaktirajte vodiča s detalja ture.
          </p>
        )}

        {convs.map((c) => {
          const isGroup = c.type === "GROUP";

          const other = getOtherUser(c);
          const guide = getGuide(c);

          const displayUser = isGroup
            ? guide
            : other;

          const last = c.messages[0];

          return (
            <Link
              key={c.id}
              href={`/messages/${c.id}`}
              className="flex items-center gap-3 border-b border-black/8 py-3"
            >
              {/* AVATAR */}
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-light text-sm font-medium text-brand-dark">
                {isGroup
                  ? "👥"
                  : displayUser?.fullName
                      ?.charAt(0)
                      .toUpperCase() ?? "👤"}
              </div>

              {/* PODACI */}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="text-sm font-medium">
                    {displayUser?.fullName ??
                      (isGroup
                        ? "Grupni razgovor"
                        : "Razgovor")}
                  </div>

                  {isGroup ? (
                    <span className="rounded-full bg-brand px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
                      GROUP
                    </span>
                  ) : (
                    <span className="rounded-full bg-black/5 px-2 py-0.5 text-[10px] font-medium text-foreground/50">
                      DIREKTNO
                    </span>
                  )}
                </div>

                {isGroup && (
                  <div className="mt-0.5 text-[11px] text-foreground/45">
                    Grupna poruka vodiča
                  </div>
                )}

                <div className="mt-1 truncate text-xs text-foreground/50">
                  {last?.body ?? "Nema poruka"}
                </div>
              </div>

              {/* DATUM */}
              {last && (
                <div className="shrink-0 text-[11px] text-foreground/40">
                  {new Date(
                    last.createdAt
                  ).toLocaleDateString(
                    "sr-Latn",
                    {
                      day: "numeric",
                      month: "short",
                    }
                  )}
                </div>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
