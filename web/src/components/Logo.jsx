// Logo: cincin heksagon (benzena) dengan inti berwarna indikator, dan wordmark.
export function Logo({ size = 26, wordmark = true }) {
  return (
    <span className="inline-flex items-center gap-2">
      <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden>
        <rect width="32" height="32" rx="7" className="fill-cobalt" />
        <path d="M16 6.5 24.2 11.25v9.5L16 25.5l-8.2-4.75v-9.5z" fill="none" className="stroke-cobalt-ink" strokeWidth="2" strokeLinejoin="round" />
        <circle cx="16" cy="16" r="3.2" fill="#E2B33C" />
      </svg>
      {wordmark && <span className="text-[17px] font-semibold tracking-tight">Chemistry</span>}
    </span>
  );
}
