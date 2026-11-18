import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../context/Auth";
import chestyIdle from "../assets/chesty-idle.webp";
import chestyHover from "../assets/chesty-hover.webp";

// Chesty di kanan bawah: animasi melambai terus-menerus, dan melompat girang saat diarahkan kursor
// (dua animasi WebP, seperti LUMA). Diklik: halaman Chesty.
export default function FloatingChesty() {
  const { user } = useAuth();
  const { pathname } = useLocation();
  if (pathname.startsWith("/chesty") || ["/masuk", "/daftar"].includes(pathname)) return null;
  return (
    <Link to={user ? "/chesty" : "/masuk?next=/chesty"} aria-label="Tanya Chesty" className="group fixed bottom-4 right-3 z-40 flex flex-col items-center md:right-8">
      <span className="pointer-events-none mb-1 whitespace-nowrap rounded-md bg-cobalt px-3 py-1 text-sm font-semibold text-cobalt-ink opacity-0 shadow-lift transition-opacity duration-200 group-hover:opacity-100 group-focus-visible:opacity-100">
        Tanya Chesty
      </span>
      <span className="relative block w-20 md:w-24">
        <img src={chestyIdle} alt="" width="176" height="221" className="h-auto w-full drop-shadow-md transition-opacity duration-150 group-hover:opacity-0 group-focus-visible:opacity-0" />
        <img src={chestyHover} alt="" width="176" height="221" className="absolute inset-0 h-auto w-full opacity-0 drop-shadow-md transition-opacity duration-150 group-hover:opacity-100 group-focus-visible:opacity-100" />
      </span>
    </Link>
  );
}
