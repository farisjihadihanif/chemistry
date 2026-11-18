import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { toast } from "react-toastify";
import { Plus, Send, Trash2, X } from "lucide-react";
import { api } from "../lib/api";
import { timeAgo } from "../lib/format";
import { Structure } from "../components/chem";
import { Spinner } from "../components/ui";
import { ChestyArt } from "../components/Chesty";

const STARTERS = [
  "Kenapa ester rantai panjang cocok sebagai plasticizer?",
  "Apa beda titik nyala dan suhu penyalaan sendiri?",
  "Bagaimana gugus hidroksil memengaruhi viskositas?",
];

export default function Assistant() {
  const [params, setParams] = useSearchParams();
  const smiles = params.get("smiles") || "";
  const [sessions, setSessions] = useState([]);
  const [sessionId, setSessionId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [quota, setQuota] = useState(null);
  const end = useRef(null);

  const loadSessions = useCallback(() => api.get("/chat").then((r) => setSessions(r.items)).catch(() => {}), []);
  const loadQuota = useCallback(() => api.get("/users/me/summary").then((r) => setQuota(r.quota)).catch(() => {}), []);
  useEffect(() => {
    loadSessions();
    loadQuota();
  }, [loadSessions, loadQuota]);
  useEffect(() => {
    end.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, busy]);

  const open = async (id) => {
    const r = await api.get(`/chat/${id}`);
    setSessionId(id);
    setMessages(r.session.messages);
  };
  const reset = () => {
    setSessionId(null);
    setMessages([]);
  };
  const send = async (text) => {
    const msg = text.trim();
    if (!msg || busy) return;
    setInput("");
    setMessages((m) => [...m, { role: "user", content: msg, smiles }]);
    setBusy(true);
    try {
      const r = await api.post("/chat", { sessionId, message: msg, smiles: smiles || undefined });
      setSessionId(r.sessionId);
      setMessages((m) => [...m, { role: "model", content: r.reply }]);
      loadSessions();
    } catch (e) {
      setMessages((m) => m.slice(0, -1));
      setInput(msg);
      toast.error(e.message);
    } finally {
      setBusy(false);
      loadQuota();
    }
  };

  return (
    <div className="container-page grid gap-6 py-8 lg:grid-cols-[240px_minmax(0,1fr)]">
      <aside className="order-2 lg:order-1">
        <button className="btn-outline btn-sm w-full" onClick={reset}><Plus size={14} /> Percakapan baru</button>
        <ul className="mt-3 space-y-0.5">
          {sessions.map((s) => (
            <li key={s._id} className="group flex items-center">
              <button onClick={() => open(s._id)} className={`min-w-0 flex-1 rounded-md px-2.5 py-2 text-left text-sm ${s._id === sessionId ? "bg-sunk font-medium" : "text-ink-soft hover:bg-sunk/60"}`}>
                <span className="block truncate">{s.judul}</span>
                <span className="block text-xs text-ink-mute">{timeAgo(s.updatedAt)}</span>
              </button>
              <button
                className="rounded p-1.5 text-ink-mute opacity-0 hover:text-danger group-hover:opacity-100 focus:opacity-100"
                aria-label={`Hapus percakapan ${s.judul}`}
                onClick={async () => {
                  await api.del(`/chat/${s._id}`);
                  if (s._id === sessionId) reset();
                  loadSessions();
                }}
              >
                <Trash2 size={14} />
              </button>
            </li>
          ))}
        </ul>
      </aside>

      <section className="order-1 flex min-h-[70vh] min-w-0 flex-col rounded-lg border border-line bg-surface lg:order-2">
        <div className="flex-1 space-y-5 overflow-y-auto p-4 sm:p-6">
          {messages.length === 0 && (
            <div className="mx-auto max-w-lg py-10 text-center">
              <ChestyArt className="mx-auto h-auto w-24" />
              <h1 className="mt-3 text-2xl font-semibold">Halo, aku Chesty.</h1>
              <p className="mt-2 text-sm text-ink-soft">Tanya soal sifat, struktur, keselamatan, atau cara menguji senyawa. Kalau datang dari halaman senyawa, data senyawanya ikut kubaca.</p>
              <div className="mt-5 flex flex-col gap-2">
                {STARTERS.map((s) => (
                  <button key={s} onClick={() => send(s)} className="rounded-md border border-line px-3 py-2 text-left text-sm text-ink-soft hover:border-cobalt hover:text-ink">
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}
          {messages.map((m, i) =>
            m.role === "user" ? (
              <div key={i} className="ml-auto max-w-[85%] rounded-lg bg-cobalt px-4 py-2.5 text-[15px] text-cobalt-ink">
                {m.content}
                {m.smiles && <p className="mt-1 break-all font-mono text-[11px] opacity-80">{m.smiles}</p>}
              </div>
            ) : (
              <div key={i} className="flex max-w-[95%] gap-3">
                <ChestyArt className="mt-1 h-auto w-8 shrink-0" />
                <div className="prose-chem min-w-0">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.content}</ReactMarkdown>
                </div>
              </div>
            ),
          )}
          {busy && <Spinner />}
          <div ref={end} />
        </div>
        <div className="border-t border-line p-3 sm:p-4">
          {smiles && (
            <div className="mb-2 flex items-center gap-3 rounded-md bg-sunk px-2 py-1.5">
              <div className="structure h-12 w-16 shrink-0"><Structure smiles={smiles} w={128} h={96} /></div>
              <p className="min-w-0 flex-1 truncate font-mono text-xs text-ink-soft">Membahas {smiles}</p>
              <button className="rounded p-1 text-ink-mute hover:text-ink" onClick={() => setParams({})} aria-label="Lepas senyawa"><X size={14} /></button>
            </div>
          )}
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
          >
            <textarea
              className="field min-h-[44px] flex-1 resize-none"
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send(input);
                }
              }}
              placeholder="Tanya Chesty"
              aria-label="Pertanyaan"
            />
            <button className="btn-primary" disabled={busy || !input.trim()} aria-label="Kirim"><Send size={16} /></button>
          </form>
          <p className="mt-2 text-[11px] text-ink-mute">
            {quota?.remaining != null && <>Sisa <span className="num">{quota.remaining}</span> permintaan hari ini. </>}
            Chesty bisa keliru; cek ulang angka penting ke literatur atau SDS.
          </p>
        </div>
      </section>
    </div>
  );
}
