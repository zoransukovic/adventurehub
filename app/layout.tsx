import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = { title: "AdventureHub", description: "Outdoor ture i turizam u Crnoj Gori" };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="sr"><body>{children}</body></html>;
}
