import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../context/Auth";
import { ChestyArt } from "./Chesty";

// Chesty melompat-lompat di kanan bawah. Diarahkan kursor: "Tanya Chesty". Diklik: halaman Chesty.
export default function FloatingChesty() {
  const { user } = useAuth();
  const { pathname } = useLocation();
  if (pathname.startsWith("/chesty") || ["/masuk", "/daftar"].includes(pathname)) return null;
  return (
    <Link to={user ? "/chesty" : "/masuk?next=/chesty"} aria-label="Tanya Chesty" className="group fixed bottom-5 right-3 z-40 flex flex-col items-center md:right-8">
      <span className="pointer-events-none mb-1 whitespace-nowrap rounded-md bg-cobalt px-3 py-1 text-sm font-semibold text-cobalt-ink opacity-0 shadow-lift transition-opacity duration-200 group-hover:opacity-100 group-focus-visible:opacity-100">
        Tanya Chesty
      </span>
      <span className="chesty-hop block">
        <ChestyArt className="h-auto w-16 drop-shadow-md transition-transform duration-300 group-hover:scale-110 md:w-20" />
      </span>
    </Link>
  );
}
