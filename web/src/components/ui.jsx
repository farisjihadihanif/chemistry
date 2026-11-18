import { assetUrl } from "../lib/api";
import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, X } from "lucide-react";

export function Spinner({ className = "" }) {
  return <span className={`inline-block h-5 w-5 animate-spin rounded-full border-2 border-line border-t-cobalt ${className}`} role="status" aria-label="Memuat" />;
}

export function PageLoader() {
  return (
    <div className="grid min-h-[40vh] place-items-center">
      <Spinner className="h-7 w-7" />
    </div>
  );
}

export function Empty({ title, children, action }) {
  return (
    <div className="rounded-lg border border-dashed border-line px-6 py-12 text-center">
      <p className="font-semibold">{title}</p>
      {children && <p className="mx-auto mt-1 max-w-md text-sm text-ink-mute">{children}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function ErrorBox({ children }) {
  if (!children) return null;
  return (
    <p role="alert" className="rounded-md border border-danger/30 bg-danger/5 px-3 py-2 text-sm text-danger">
      {children}
    </p>
  );
}

export function Modal({ open, onClose, title, children, width = "max-w-lg" }) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === "Escape" && onClose?.();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}>
      <div role="dialog" aria-modal="true" aria-label={title} className={`w-full ${width} max-h-[90vh] overflow-y-auto rounded-lg bg-surface p-5 shadow-lift`}>
        <div className="mb-4 flex items-start justify-between gap-4">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button className="rounded p-1 text-ink-mute hover:bg-sunk" onClick={onClose} aria-label="Tutup">
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function ConfirmModal({ open, title, message, confirmLabel = "Hapus", busy, onConfirm, onClose }) {
  return (
    <Modal open={open} onClose={onClose} title={title} width="max-w-md">
      <p className="text-sm text-ink-soft">{message}</p>
      <div className="mt-5 flex justify-end gap-2">
        <button className="btn-ghost" onClick={onClose}>Batal</button>
        <button className="btn bg-danger text-white hover:bg-danger/90" onClick={onConfirm} disabled={busy}>
          {busy ? "Memproses…" : confirmLabel}
        </button>
      </div>
    </Modal>
  );
}

export function Pagination({ page, pages, onChange }) {
  const [input, setInput] = useState(String(page));
  useEffect(() => {
    setInput(String(page));
  }, [page]);
  if (pages <= 1) return null;
  const go = (p) => onChange(Math.min(pages, Math.max(1, p)));
  const btn = "grid h-9 w-9 place-items-center rounded-md border border-line bg-surface text-ink-soft hover:border-ink-mute disabled:opacity-40";
  return (
    <nav className="mt-8 flex items-center justify-center gap-1.5 text-sm" aria-label="Halaman">
      <button className={btn} onClick={() => go(1)} disabled={page === 1} aria-label="Halaman pertama"><ChevronsLeft size={16} /></button>
      <button className={btn} onClick={() => go(page - 1)} disabled={page === 1} aria-label="Sebelumnya"><ChevronLeft size={16} /></button>
      <form
        className="flex items-center gap-1.5 px-2"
        onSubmit={(e) => {
          e.preventDefault();
          const n = parseInt(input, 10);
          if (n) go(n);
        }}
      >
        <input className="field h-9 w-14 px-2 text-center" value={input} onChange={(e) => setInput(e.target.value.replace(/\D/g, ""))} aria-label="Nomor halaman" inputMode="numeric" />
        <span className="text-ink-mute">dari {pages}</span>
      </form>
      <button className={btn} onClick={() => go(page + 1)} disabled={page === pages} aria-label="Berikutnya"><ChevronRight size={16} /></button>
      <button className={btn} onClick={() => go(pages)} disabled={page === pages} aria-label="Halaman terakhir"><ChevronsRight size={16} /></button>
    </nav>
  );
}

// Foto profil, atau inisial nama bila belum ada foto.
export function Avatar({ user, size = 36, className = "" }) {
  const name = user?.namaLengkap || user?.username || "?";
  const style = { width: size, height: size, minWidth: size };
  if (user?.foto) return <img src={assetUrl(user.foto)} alt="" style={style} className={`max-w-none shrink-0 rounded-full object-cover ${className}`} />;
  return (
    <span style={{ ...style, fontSize: size * 0.42 }} className={`grid shrink-0 place-items-center rounded-full bg-cobalt-soft font-semibold text-cobalt ${className}`} aria-hidden>
      {name.slice(0, 1).toUpperCase()}
    </span>
  );
}
