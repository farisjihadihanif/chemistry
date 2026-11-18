import { useEffect, useRef } from "react";

// Latar hero: titik-titik berkelip seperti debu partikel, ditambah "elektron" yang melesat
// dengan ekor bercahaya. Warna mengikuti tema (dibaca dari variabel CSS).
const TRAILS = [
  ["#78A8E6", "#2F6FD0"],
  ["#4FB58A", "#2EB9DF"],
  ["#E2B33C", "#F08AA6"],
];

function ink() {
  const v = getComputedStyle(document.documentElement).getPropertyValue("--ink").trim().split(/\s+/).join(",");
  return `rgb(${v}`;
}

export default function ParticleField({ className = "", density = 0.00012 }) {
  const ref = useRef(null);
  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas.getContext("2d");
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let color = ink();
    const obs = new MutationObserver(() => (color = ink()));
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });

    let w = 0, h = 0, dots = [], raf = 0, last = performance.now(), nextShot = 600;
    const shots = [];
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      dots = [...Array(Math.round(w * h * density))].map(() => ({
        x: Math.random() * w,
        y: Math.random() * h,
        r: 0.5 + Math.random() * 1.1,
        a: Math.random() * Math.PI * 2,
        s: 0.6 + Math.random() * 1.6,
        vy: -(0.8 + Math.random() * 3),
      }));
    };
    resize();
    window.addEventListener("resize", resize);

    const spawn = () => {
      const [head, tail] = TRAILS[Math.floor(Math.random() * TRAILS.length)];
      const fromLeft = Math.random() < 0.5;
      const angle = (fromLeft ? 0 : Math.PI) + (Math.random() - 0.5) * 0.9;
      shots.push({
        x: fromLeft ? -20 : w + 20,
        y: Math.random() * h * 0.9,
        vx: Math.cos(angle),
        vy: Math.sin(angle) * 0.6 + 0.15,
        speed: 420 + Math.random() * 420,
        len: 80 + Math.random() * 90,
        head,
        tail,
      });
    };

    const frame = (now) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      ctx.clearRect(0, 0, w, h);
      for (const d of dots) {
        if (!still) {
          d.a += d.s * dt;
          d.y += d.vy * dt;
          if (d.y < -4) d.y = h + 4;
        }
        ctx.globalAlpha = 0.18 + 0.5 * (0.5 + 0.5 * Math.sin(d.a));
        ctx.fillStyle = color + ")";
        ctx.beginPath();
        ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
        ctx.fill();
      }
      if (!still) {
        nextShot -= dt * 1000;
        if (nextShot <= 0) {
          spawn();
          nextShot = 700 + Math.random() * 1600;
        }
        for (let i = shots.length - 1; i >= 0; i--) {
          const s = shots[i];
          s.x += s.vx * s.speed * dt;
          s.y += s.vy * s.speed * dt;
          const tx = s.x - s.vx * s.len, ty = s.y - s.vy * s.len;
          const grad = ctx.createLinearGradient(tx, ty, s.x, s.y);
          grad.addColorStop(0, "rgba(0,0,0,0)");
          grad.addColorStop(1, s.tail);
          ctx.globalAlpha = 0.9;
          ctx.strokeStyle = grad;
          ctx.lineWidth = 2;
          ctx.lineCap = "round";
          ctx.beginPath();
          ctx.moveTo(tx, ty);
          ctx.lineTo(s.x, s.y);
          ctx.stroke();
          ctx.fillStyle = s.head;
          ctx.beginPath();
          ctx.arc(s.x, s.y, 2.4, 0, Math.PI * 2);
          ctx.fill();
          if (s.x < -200 || s.x > w + 200 || s.y > h + 200 || s.y < -200) shots.splice(i, 1);
        }
      }
      ctx.globalAlpha = 1;
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      obs.disconnect();
    };
  }, [density]);
  return <canvas ref={ref} className={className} aria-hidden />;
}
