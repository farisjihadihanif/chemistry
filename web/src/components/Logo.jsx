// Logo Chemistry: labu Erlenmeyer berisi cairan dan rantai molekul. Latar transparan;
// garis mengikuti warna tinta (terang/gelap), cairan biru kobalt.
export function LogoMark({ size = 28, className = "" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" className={className} aria-hidden>
      {/* molekul */}
      <path d="M28 12.5 33.5 8.5M35.5 9.5 39 15.5" className="stroke-ink" strokeWidth="2" strokeLinecap="round" fill="none" />
      <circle cx="27" cy="13.5" r="3.2" fill="#E2B33C" className="stroke-ink" strokeWidth="1.8" />
      <circle cx="34.5" cy="7.5" r="3" fill="#E2B33C" className="stroke-ink" strokeWidth="1.8" />
      <circle cx="40" cy="17.5" r="3.6" fill="#4FB58A" className="stroke-ink" strokeWidth="1.8" />
      {/* labu */}
      <path d="M17.5 14h7M18.8 14v9.2L9.6 38.4A3.6 3.6 0 0 0 12.7 44h17.6a3.6 3.6 0 0 0 3.1-5.6L24.2 23.2V14" fill="none" className="stroke-ink" strokeWidth="2.4" strokeLinejoin="round" strokeLinecap="round" />
      <path d="M13.9 31.2h15.2l4.1 7.1a2.3 2.3 0 0 1-2 3.5H11.8a2.3 2.3 0 0 1-2-3.5z" className="fill-cobalt" />
      <circle cx="18" cy="36" r="1.5" className="fill-ink/70" />
      <circle cx="22.5" cy="35" r="1.5" className="fill-ink/70" />
      <circle cx="20.5" cy="38.8" r="1.5" className="fill-ink/70" />
    </svg>
  );
}

export function Logo({ size = 28, wordmark = true }) {
  return (
    <span className="inline-flex items-center gap-2">
      <LogoMark size={size} />
      {wordmark && <span className="text-[17px] font-semibold tracking-tight">Chemistry</span>}
    </span>
  );
}
