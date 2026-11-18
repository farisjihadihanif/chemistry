// Chesty: maskot buku dengan kacamata lab di kepala dan labu kecil di tangan.
export function ChestyArt({ className = "" }) {
  return (
    <svg viewBox="0 0 120 140" className={className} role="img" aria-label="Chesty">
      {/* bayangan */}
      <ellipse cx="60" cy="133" rx="30" ry="4.5" fill="rgb(0 0 0 / 0.15)" />
      {/* kaki */}
      <path d="M48 118v10h-7M72 118v10h7" fill="none" stroke="#1F2A36" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
      {/* halaman buku (sisi kanan) */}
      <path d="M33 22h52a6 6 0 0 1 6 6v86a6 6 0 0 1-6 6H33z" fill="#F5F1E6" stroke="#1F2A36" strokeWidth="3" />
      <path d="M86 30v80M82 30v80" stroke="#D9D2BF" strokeWidth="1.6" />
      {/* sampul */}
      <rect x="25" y="18" width="58" height="100" rx="8" fill="#2F6FD0" stroke="#1F2A36" strokeWidth="3" />
      <rect x="25" y="18" width="11" height="100" rx="6" fill="#2459AD" stroke="#1F2A36" strokeWidth="3" />
      {/* kacamata lab di atas kepala */}
      <path d="M27 31c14-6 40-6 54 0" fill="none" stroke="#1F2A36" strokeWidth="3" />
      <rect x="38" y="24" width="16" height="12" rx="5" fill="#BFE6F2" stroke="#1F2A36" strokeWidth="2.6" />
      <rect x="57" y="24" width="16" height="12" rx="5" fill="#BFE6F2" stroke="#1F2A36" strokeWidth="2.6" />
      <path d="M54 30h3" stroke="#1F2A36" strokeWidth="2.6" />
      {/* wajah */}
      <path d="M43 50q4-3 8 0M60 50q4-3 8 0" fill="none" stroke="#1F2A36" strokeWidth="2.4" strokeLinecap="round" />
      <ellipse cx="47" cy="59" rx="4.2" ry="5.4" fill="#1F2A36" />
      <ellipse cx="64" cy="59" rx="4.2" ry="5.4" fill="#1F2A36" />
      <circle cx="48.4" cy="57.2" r="1.5" fill="#fff" />
      <circle cx="65.4" cy="57.2" r="1.5" fill="#fff" />
      <path d="M48 71q7.5 7 15 0" fill="none" stroke="#1F2A36" strokeWidth="2.8" strokeLinecap="round" />
      <circle cx="40" cy="69" r="3.2" fill="#F08AA6" opacity=".7" />
      <circle cx="71" cy="69" r="3.2" fill="#F08AA6" opacity=".7" />
      {/* lengan kiri melambai */}
      <path d="M26 78q-12-4-14-18" fill="none" stroke="#1F2A36" strokeWidth="4" strokeLinecap="round" />
      <circle cx="12" cy="57" r="5" fill="#fff" stroke="#1F2A36" strokeWidth="2.6" />
      {/* lengan kanan memegang labu */}
      <path d="M90 82q10 2 12 12" fill="none" stroke="#1F2A36" strokeWidth="4" strokeLinecap="round" />
      <path d="M99 92h7M100.5 92v5l-6 10a3 3 0 0 0 2.6 4.5h12a3 3 0 0 0 2.6-4.5l-6-10v-5" fill="#fff" stroke="#1F2A36" strokeWidth="2.4" strokeLinejoin="round" />
      <path d="M97 104.5h16.6l2.2 3.8a1.6 1.6 0 0 1-1.4 2.4H96.2a1.6 1.6 0 0 1-1.4-2.4z" fill="#4FB58A" />
      <circle cx="103" cy="99" r="1.3" fill="#4FB58A" />
      <circle cx="106" cy="95.5" r="1" fill="#4FB58A" />
    </svg>
  );
}
