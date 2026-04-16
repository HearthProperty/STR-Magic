import React from "react";

type Props = {
  /** 0–100 overall score */
  score?: number;
  comps?: number;
  radiusMi?: number;
  hint?: string;
  className?: string;
};

const LABELS = ["Very Low", "Low", "Medium", "High", "Very High"] as const;

const toneClass = (idx: number) =>
  idx <= 1
    ? "text-amber-500 dark:text-amber-300"
    : idx === 2
    ? "text-lime-600 dark:text-lime-300"
    : idx === 3
    ? "text-emerald-600 dark:text-emerald-300"
    : "text-emerald-700 dark:text-emerald-400";

export default function CompStrength({
  score = 38,
  comps = 4,
  radiusMi = 3,
  hint = "Low sample size — widen radius to 5–8 mi",
  className = "",
}: Props) {
  const clamped = Math.max(0, Math.min(100, score));
  // floor bucketing: 0–19 VL, 20–39 L, 40–59 M, 60–79 H, 80–100 VH
  const idx = Math.min(4, Math.floor(clamped / 20));
  const label = LABELS[idx];

  return (
    <div className={`rounded-2xl border border-black/10 dark:border-white/10 bg-black/[.04] dark:bg-white/5 p-4 ${className}`}>
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="text-sm opacity-70">Comps Strength</div>
        <div className={`text-lg font-semibold tracking-tight ${toneClass(idx)}`}>{label}</div>
      </div>

      {/* Meter + pointer */}
      <div className="mt-3 relative">
        {/* pointer */}
        <svg
          viewBox="0 0 12 8"
          className="absolute -top-2 h-3 w-3 fill-black/80 dark:fill-white/90"
          style={{ left: `${(idx / 4) * 100}%`, transform: "translateX(-50%)" }}
          aria-hidden
        >
          <path d="M6 8L0 0h12L6 8z" />
        </svg>

        <div className="flex items-center justify-between gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <span
              key={i}
              className={`h-2.5 w-2.5 rounded-full transition-colors ${i <= idx ? "bg-black/80 dark:bg-white/90" : "bg-black/20 dark:bg-white/20"}`}
              aria-hidden
            />
          ))}
        </div>

        <div className="sr-only" aria-live="polite">
          Comps strength {label} (score {Math.round(clamped)})
        </div>
      </div>

      {/* Chips */}
      <div className="mt-3 flex flex-wrap gap-2">
        <span className="inline-flex items-center text-xs opacity-80 bg-black/[.04] dark:bg-white/10 border border-black/10 dark:border-white/10 px-2.5 py-1 rounded-full">
          {comps} comps
        </span>
        <span className="inline-flex items-center text-xs opacity-80 bg-black/[.04] dark:bg-white/10 border border-black/10 dark:border-white/10 px-2.5 py-1 rounded-full">
          {radiusMi} mi radius
        </span>
      </div>

      {/* Tiny caption */}
      <p className="mt-2 text-[11px] leading-4 opacity-60">{hint}</p>
    </div>
  );
}


