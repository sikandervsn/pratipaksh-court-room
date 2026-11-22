"use client";

import { useEffect, useRef, useState } from "react";

function useAnimatedNumber(target: number, from: number) {
  const [v, setV] = useState(from);
  const raf = useRef(0);
  useEffect(() => {
    const start = performance.now();
    const dur = 1600;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / dur);
      const e = 1 - Math.pow(1 - p, 3);
      setV(Math.round(from + (target - from) * e));
      if (p < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [target, from]);
  return v;
}

export function WinGauge({ value, previous, side }: { value: number; previous?: number; side: string }) {
  const v = useAnimatedNumber(value, previous ?? 0);
  const color = v >= 65 ? "#127a48" : v >= 40 ? "#b25e09" : "#b42318";
  // semicircle arc
  const r = 80;
  const c = Math.PI * r;
  const dash = (v / 100) * c;
  return (
    <div className="flex flex-col items-center">
      <svg viewBox="0 0 200 118" className="w-full max-w-[260px]" role="img" aria-label={`Win probability ${value}%`}>
        <path d="M20 100 A80 80 0 0 1 180 100" fill="none" stroke="#e7e1d2" strokeWidth="16" strokeLinecap="round" />
        <path
          d="M20 100 A80 80 0 0 1 180 100"
          fill="none"
          stroke={color}
          strokeWidth="16"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${c}`}
        />
        <text x="100" y="88" textAnchor="middle" className="font-serif" fontSize="40" fontWeight="700" fill={color}>
          {v}%
        </text>
        <text x="100" y="110" textAnchor="middle" fontSize="10" fill="#0f1a33" opacity="0.6" letterSpacing="1.5">
          {side.toUpperCase()} WINS
        </text>
      </svg>
      {previous != null && (
        <div className="mt-1 rounded-full bg-ally-soft px-3 py-1 text-sm font-semibold text-ally">
          {previous}% → {value}% <span className="opacity-70">(+{value - previous} pts after redraft)</span>
        </div>
      )}
    </div>
  );
}
