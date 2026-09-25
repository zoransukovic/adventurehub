import { getSession, Payload } from "./auth";
import { NextResponse } from "next/server";
export async function guard(role?: "GUIDE"|"ADMIN") {
  const s = await getSession();
  if (!s) return { error: NextResponse.json({ error: "Niste prijavljeni" }, { status: 401 }), session: null };
  if (role === "ADMIN" && s.role !== "ADMIN") return { error: NextResponse.json({ error: "Zabranjen pristup" }, { status: 403 }), session: null };
  if (role === "GUIDE" && s.role !== "GUIDE" && s.role !== "ADMIN") return { error: NextResponse.json({ error: "Samo vodiči" }, { status: 403 }), session: null };
  return { error: null, session: s };
}
