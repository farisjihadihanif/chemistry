import { useEffect, useRef } from "react";
import { Atom, Droplets, Flame, FlaskConical, Hexagon, Microscope, TestTube, TestTubes, Thermometer, Weight } from "lucide-react";

// Lintasan elektron di sekitar judul hero: lingkaran konsentris seperti model atom Bohr,
// berisi ubin unsur (gaya tabel periodik) dan ikon sifat yang ikut berputar.
const TONE = {
  C: "border-ink/50 text-ink",
  H: "border-ink-mute/50 text-ink-soft",
  O: "border-danger/60 text-danger",
  N: "border-cobalt/60 text-cobalt",
  S: "border-[#C9A227]/70 text-[#B38B12] dark:text-[#E2B33C]",
  Cl: "border-ind-high/60 text-ind-high",
  F: "border-ind-high/60 text-ind-high",
  P: "border-[#D9822B]/70 text-[#C0701F]",
  Br: "border-[#A0522D]/70 text-[#A0522D] dark:text-[#D98C5F]",
  Si: "border-ink-mute/60 text-ink-soft",
};

function Element({ sym, num }) {
  return (
    <span className={`relative grid h-12 w-12 place-items-center rounded-md border-[1.5px] bg-surface/80 shadow-sm backdrop-blur-sm ${TONE[sym] || TONE.C}`}>
      <span className="num absolute left-1 top-0.5 text-[9px] leading-none opacity-70">{num}</span>
      <span className="pt-1 text-lg font-semibold leading-none">{sym}</span>
    </span>
  );
}

function Icon({ as: I, tone = "text-ink-soft" }) {
  return (
    <span className={`grid h-11 w-11 place-items-center rounded-full border border-line bg-surface/80 shadow-sm backdrop-blur-sm ${tone}`}>
      <I size={22} strokeWidth={1.7} />
    </span>
  );
}

const RINGS = [
  { r: 120, dur: 22, items: [<Element key="c" sym="C" num={6} />, <Icon key="a" as={Atom} tone="text-cobalt" />] },
  { r: 200, dur: 30, reverse: true, items: [<Element key="o" sym="O" num={8} />, <Icon key="t" as={Thermometer} tone="text-danger" />, <Element key="n" sym="N" num={7} />] },
  { r: 285, dur: 38, items: [<Icon key="f" as={FlaskConical} tone="text-ind-mid" />, <Element key="h" sym="H" num={1} />, <Icon key="d" as={Droplets} tone="text-cobalt" />, <Element key="s" sym="S" num={16} />] },
  { r: 370, dur: 48, reverse: true, items: [<Element key="cl" sym="Cl" num={17} />, <Icon key="fl" as={Flame} tone="text-[#D9822B]" />, <Icon key="hx" as={Hexagon} />, <Element key="p" sym="P" num={15} />, <Icon key="tt" as={TestTube} tone="text-ind-mid" />] },
  { r: 460, dur: 60, items: [<Element key="f" sym="F" num={9} />, <Icon key="w" as={Weight} />, <Element key="br" sym="Br" num={35} />, <Icon key="m" as={Microscope} tone="text-cobalt" />, <Element key="si" sym="Si" num={14} />, <Icon key="ts" as={TestTubes} />] },
];

export default function AtomOrbits({ className = "" }) {
  const ref = useRef(null);
  // Sedikit paralaks mengikuti kursor supaya sistemnya terasa hidup.
  useEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return undefined;
    let raf = 0;
    const move = (e) => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const x = (e.clientX / window.innerWidth - 0.5) * 2;
        const y = (e.clientY / window.innerHeight - 0.5) * 2;
        el.style.setProperty("--px", `${x * -14}px`);
        el.style.setProperty("--py", `${y * -10}px`);
        el.style.setProperty("--rx", `${y * 6}deg`);
        el.style.setProperty("--ry", `${x * -6}deg`);
      });
    };
    window.addEventListener("pointermove", move);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", move);
    };
  }, []);
  return (
    <div ref={ref} className={`orbit-system pointer-events-none ${className}`} aria-hidden>
      <div className="orbit-tilt">
        {/* inti atom */}
        <span className="orbit-core" />
        {RINGS.map((ring, ri) => (
          <div key={ri} className="orbit-ring" style={{ width: ring.r * 2, height: ring.r * 2 }}>
            <div className="orbit-spin" style={{ animationDuration: `${ring.dur}s`, animationDirection: ring.reverse ? "reverse" : "normal" }}>
              {ring.items.map((item, i) => {
                const angle = (360 / ring.items.length) * i + ri * 23;
                return (
                  <span key={i} className="orbit-item" style={{ transform: `rotate(${angle}deg) translateX(${ring.r}px) rotate(${-angle}deg)` }}>
                    <span className="orbit-counter" style={{ animationDuration: `${ring.dur}s`, animationDirection: ring.reverse ? "normal" : "reverse" }}>
                      {item}
                    </span>
                  </span>
                );
              })}
              {/* elektron kecil yang ikut berputar di setiap lintasan */}
              <span className="orbit-electron" style={{ transform: `rotate(${ri * 71 + 40}deg) translateX(${ring.r}px)` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
