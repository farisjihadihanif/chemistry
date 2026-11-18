import { useEffect, useRef } from "react";

// Latar hero: beberapa molekul bola-dan-tongkat yang berputar pelan dalam 3D.
// Digambar di canvas dengan proyeksi perspektif sederhana; warna ikut tema.
const SHAPES = [
  // benzena
  { atoms: [...Array(6)].map((_, i) => [Math.cos((i * Math.PI) / 3) * 1.4, Math.sin((i * Math.PI) / 3) * 1.4, 0, "C"]), bonds: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 0]] },
  // etanol
  { atoms: [[-1.3, 0, 0, "C"], [0, 0.7, 0, "C"], [1.3, 0, 0, "O"], [-1.9, -0.9, 0.6, "H"], [2.1, 0.6, 0.2, "H"]], bonds: [[0, 1], [1, 2], [0, 3], [2, 4]] },
  // air
  { atoms: [[0, 0, 0, "O"], [-0.9, -0.6, 0, "H"], [0.9, -0.6, 0, "H"]], bonds: [[0, 1], [0, 2]] },
  // asam asetat
  { atoms: [[-1.2, 0, 0, "C"], [0, 0, 0, "C"], [0.7, 1.1, 0, "O"], [0.8, -1.1, 0, "O"], [1.7, -1.0, 0.4, "H"]], bonds: [[0, 1], [1, 2], [1, 3], [3, 4]] },
  // amonia
  { atoms: [[0, 0.3, 0, "N"], [-0.9, -0.3, 0.4, "H"], [0.9, -0.3, 0.4, "H"], [0, -0.3, -1, "H"]], bonds: [[0, 1], [0, 2], [0, 3]] },
];
const RADIUS = { C: 0.34, O: 0.34, N: 0.32, H: 0.2 };

function readColors() {
  const css = getComputedStyle(document.documentElement);
  const v = (n) => `rgb(${css.getPropertyValue(n).trim().split(/\s+/).join(",")})`;
  return { C: v("--ink-mute"), O: v("--danger"), N: v("--cobalt"), H: v("--line"), bond: v("--line") };
}

export default function MoleculeField({ className = "" }) {
  const ref = useRef(null);
  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas.getContext("2d");
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let colors = readColors();
    const obs = new MutationObserver(() => (colors = readColors()));
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["class", "data-theme"] });

    // sebar molekul di ruang
    const mols = [...Array(11)].map((_, i) => ({
      shape: SHAPES[i % SHAPES.length],
      x: (Math.random() - 0.5) * 22,
      y: (Math.random() - 0.5) * 10,
      z: 6 + Math.random() * 12,
      ax: Math.random() * 6,
      ay: Math.random() * 6,
      sx: (Math.random() - 0.5) * 0.5,
      sy: 0.15 + Math.random() * 0.35,
      drift: (Math.random() - 0.5) * 0.15,
    }));

    let w = 0, h = 0, raf = 0, last = performance.now();
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    const draw = (now) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      ctx.clearRect(0, 0, w, h);
      const f = Math.min(w, h) * 1.1;
      const items = [];
      for (const m of mols) {
        if (!still) {
          m.ax += m.sx * dt;
          m.ay += m.sy * dt;
          m.x += m.drift * dt;
          if (m.x > 12) m.x = -12;
          if (m.x < -12) m.x = 12;
        }
        const [ca, sa, cb, sb] = [Math.cos(m.ax), Math.sin(m.ax), Math.cos(m.ay), Math.sin(m.ay)];
        const pts = m.shape.atoms.map(([x, y, z, el]) => {
          const y1 = y * ca - z * sa, z1 = y * sa + z * ca;
          const x2 = x * cb + z1 * sb, z2 = -x * sb + z1 * cb;
          const Z = m.z + z2;
          const s = f / Z;
          return { X: w / 2 + (m.x + x2) * s, Y: h / 2 + (m.y + y1) * s, Z, s, el };
        });
        const fade = Math.max(0.12, Math.min(0.55, 1.4 - m.z / 14));
        for (const [a, b] of m.shape.bonds) items.push({ type: "b", a: pts[a], b: pts[b], Z: (pts[a].Z + pts[b].Z) / 2, fade });
        for (const p of pts) items.push({ type: "a", p, Z: p.Z, fade });
      }
      items.sort((p, q) => q.Z - p.Z);
      for (const it of items) {
        ctx.globalAlpha = it.fade;
        if (it.type === "b") {
          ctx.strokeStyle = colors.bond;
          ctx.lineWidth = Math.max(1, it.a.s * 0.09);
          ctx.beginPath();
          ctx.moveTo(it.a.X, it.a.Y);
          ctx.lineTo(it.b.X, it.b.Y);
          ctx.stroke();
        } else {
          const r = RADIUS[it.p.el] * it.p.s;
          ctx.fillStyle = colors[it.p.el];
          ctx.beginPath();
          ctx.arc(it.p.X, it.p.Y, r, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.globalAlpha = 1;
      if (!still) raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      obs.disconnect();
    };
  }, []);
  return <canvas ref={ref} className={className} aria-hidden />;
}
