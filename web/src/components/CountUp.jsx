import { useEffect, useRef } from "react";
import { reducedMotion } from "../lib/reveal";

const id = (n) => n.toLocaleString("id-ID");
const DURATION = 900;

// Angka yang menghitung naik sekali saat terlihat. Pembaca layar selalu mendapat angka akhir.
export default function CountUp({ value, format = id }) {
  const ref = useRef(null);
  const done = useRef(false);
  const text = format(value);
  useEffect(() => {
    const el = ref.current;
    if (done.current || !("IntersectionObserver" in window) || reducedMotion()) return undefined;
    let raf = 0;
    const finish = () => {
      cancelAnimationFrame(raf);
      el.textContent = el.dataset.final;
      el.style.minWidth = "";
    };
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      io.disconnect();
      done.current = true;
      // kunci lebar akhir supaya tata letak tidak bergeser
      el.style.minWidth = `${el.offsetWidth + 1}px`;
      const t0 = performance.now();
      const tick = (now) => {
        const t = Math.min(1, Math.max(0, (now - t0) / DURATION));
        if (t === 1) {
          finish();
          return;
        }
        el.textContent = format(Math.round(value * (1 - (1 - t) ** 3)));
        raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    });
    io.observe(el);
    return () => {
      io.disconnect();
      finish();
    };
    // text sudah mewakili value dan format
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text]);
  return (
    <>
      <span className="sr-only">{text}</span>
      <span ref={ref} data-final={text} aria-hidden className="inline-block">{text}</span>
    </>
  );
}
