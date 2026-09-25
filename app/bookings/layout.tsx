import Navbar from "@/app/components/Navbar";
export default function Layout({ children }: { children: React.ReactNode }) {
  return <><main className="pb-20">{children}</main><Navbar /></>;
}
