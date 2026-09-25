"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
type User = { id:string; role:string; fullName:string } | null;
export default function Navbar() {
  const path = usePathname();
  const [user, setUser] = useState<User>(null);
  const [unread, setUnread] = useState(0);
  useEffect(() => {
    fetch("/api/auth/me").then(r=>r.json()).then(d => {
      setUser(d.user);
      if (d.user) fetch("/api/notifications").then(r=>r.json()).then(n => setUnread((n.notifications??[]).filter((x:{read:boolean})=>!x.read).length));
    });
  }, [path]);
  if (!user) return null;
  const links = [
    { href:"/dashboard", icon:"🏠", label:"Početna" },
    { href:"/map", icon:"🗺️", label:"Mapa" },
    { href:"/messages", icon:"💬", label:"Poruke" },
    { href:"/notifications", icon:"🔔", label:"Alarmi", badge:unread },
    { href:"/profile", icon:"👤", label:"Profil" },
  ];
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 flex justify-around border-t border-black/10 bg-white pt-2 pb-3">
      {links.map(l => (
        <Link key={l.href} href={l.href} className={`relative flex flex-col items-center gap-0.5 px-2 text-[10px] ${path.startsWith(l.href)?"text-brand font-medium":"text-foreground/45"}`}>
          <span className="text-xl leading-none">{l.icon}</span>
          {l.label}
          {l.badge>0 && <span className="absolute -top-1 right-0 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] text-white">{l.badge>9?"9+":l.badge}</span>}
        </Link>
      ))}
    </nav>
  );
}
