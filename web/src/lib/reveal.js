// Animasi muncul saat digulir. Penanda: data-reveal="up" | "left" | "right" (elemen itu sendiri)
// atau "list" (anak-anaknya, bergantian). Judul bagian (h2) ikut otomatis.
// Kelas penyembunyi hanya dipasang lewat JS pada elemen di bawah layar, jadi konten tetap
// terlihat bila skrip gagal, dan yang sudah tampak di layar tidak pernah disembunyikan.
const SELECTOR = "[data-reveal], main section h2, .prose-page h2";
const STEP = 80;
const MAX_SPREAD = 500;

export const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function expand(el) {
  const kind = el.dataset.reveal || "up";
  if (kind === "list") return [...el.children].map((c) => [c, "up", true]);
  return [[el, kind, kind !== "up"]];
}

function targetsIn(node) {
  const found = node.matches(SELECTOR) ? [node] : [];
  found.push(...node.querySelectorAll(SELECTOR));
  const out = found.flatMap(expand);
  if (node.parentElement?.dataset.reveal === "list") out.push([node, "up", true]);
  return out;
}

function clear(el) {
  el.classList.remove("reveal", "reveal-up", "reveal-left", "reveal-right", "reveal-wait", "reveal-in", "reveal-soft");
  el.style.removeProperty("--reveal-delay");
}

function play(els, soft) {
  const step = els.length > 1 ? Math.min(STEP, MAX_SPREAD / (els.length - 1)) : 0;
  els.forEach((el, i) => {
    el.style.setProperty("--reveal-delay", `${Math.round(i * step)}ms`);
    el.classList.remove("reveal-wait");
    el.classList.add(soft ? "reveal-soft" : "reveal-in");
  });
}

export function startReveal(root) {
  if (!("IntersectionObserver" in window) || reducedMotion()) return () => {};
  const seen = new WeakSet();
  // Batas atas sangat besar: elemen yang terlewat karena lompatan gulir tetap dimunculkan.
  const io = new IntersectionObserver(
    (entries) => {
      const hit = entries.filter((e) => e.isIntersecting).map((e) => e.target);
      hit.forEach((el) => io.unobserve(el));
      play(hit, false);
    },
    { rootMargin: "100000px 0px -6% 0px" },
  );

  const scan = (node) => {
    const fresh = targetsIn(node).filter(([el]) => !seen.has(el) && seen.add(el));
    if (!fresh.length) return;
    // baca posisi dulu, baru tulis kelas
    const below = fresh.map(([el]) => el.getBoundingClientRect().top >= window.innerHeight);
    const soft = [];
    fresh.forEach(([el, kind, moves], i) => {
      if (!below[i] && !moves) return;
      el.classList.add("reveal", `reveal-${kind}`);
      if (below[i]) {
        el.classList.add("reveal-wait");
        io.observe(el);
      } else soft.push(el);
    });
    // Sudah di layar (mis. hasil pencarian baru tiba): bergeser saja, tanpa disembunyikan.
    play(soft, true);
  };

  const onEnd = (e) => {
    if (e.animationName.startsWith("reveal-")) clear(e.target);
  };
  const mo = new MutationObserver((records) => {
    const nodes = new Set(records.flatMap((r) => [...r.addedNodes]));
    nodes.forEach((n) => n.nodeType === 1 && n.isConnected && scan(n));
  });
  const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
  const onPref = () => mq.matches && stop();
  const stop = () => {
    mo.disconnect();
    io.disconnect();
    root.removeEventListener("animationend", onEnd);
    mq.removeEventListener("change", onPref);
    root.querySelectorAll(".reveal").forEach(clear);
  };
  root.addEventListener("animationend", onEnd);
  mq.addEventListener("change", onPref);
  mo.observe(root, { childList: true, subtree: true });
  scan(root);
  return stop;
}
