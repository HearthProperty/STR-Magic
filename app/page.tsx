"use client";

import type { ComparableListing } from "@/lib/types";
import ThemeToggle from "@/components/ThemeToggle";
import { useEvaluateViewModel } from "@/lib/viewmodels/useEvaluateViewModel";

export default function Home() {
  const {
    address,
    loading,
    data,
    error,
    placeDetails,
    county,
    city,
    propertyType,
    suggestions,
    showSuggestions,
    onChangeAddress,
    onSearch,
    onSelectSuggestion,
    onFocusInput,
    onBlurInput,
    onSuggestionMouseDown,
    reset,
  } = useEvaluateViewModel();

  function getEligibilityClasses(percentage: number) {
    if (percentage >= 70) {
      return {
        text: "text-green-600",
        badgeBg: "bg-surface border-green-300",
      };
    }
    if (percentage >= 40) {
      return {
        text: "text-amber-600",
        badgeBg: "bg-surface border-amber-300",
      };
    }
    return {
      text: "text-red-600",
      badgeBg: "bg-surface border-red-300",
    };
  }

  function getEligibilityLabel(percentage: number): string {
    if (percentage >= 95) return "Approved";
    if (percentage >= 85) return "Favorable";
    if (percentage >= 70) return "Permitted";
    if (percentage >= 50) return "Conditional";
    if (percentage >= 25) return "Unfavorable";
    return "Prohibited";
  }

  // Local helpers for eligibility badge

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <div className="mx-auto max-w-3xl px-6 py-16">
        <header className="mb-10">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl sm:text-5xl font-semibold tracking-[-0.03em]">
              <button
                type="button"
                onClick={reset}
                className="-ml-2 px-2 py-1 rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
                aria-label="Go to home"
              >
                STR Magic
              </button>
            </h1>
            <ThemeToggle />
          </div>
          <p className="mt-2 text-sm/6 sm:text-base/7 opacity-80">Enter an address. We will fetch comps, project income, and check legality.</p>
        </header>
        <form onSubmit={onSearch} className="sticky top-6 z-10">
          <div className="relative apple-input apple-shadow px-4 py-3 flex items-center gap-3">
            <input
              value={address}
              onChange={onChangeAddress}
              placeholder="Search an address"
              className="w-full bg-transparent outline-none placeholder:opacity-60 text-base sm:text-lg"
              onFocus={onFocusInput}
              onBlur={onBlurInput}
            />
            <button
              type="submit"
              disabled={!address || loading}
              className="rounded-xl px-4 py-2 bg-black text-white dark:bg-white dark:text-black text-sm font-medium disabled:opacity-50"
            >
              {loading ? "Searching…" : "Search"}
            </button>

            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute left-0 right-0 top-[calc(100%+8px)] apple-card apple-shadow overflow-hidden">
                <ul className="py-2">
                  {suggestions.map((s) => (
                    <li key={s.placeId}>
                      <button
                        type="button"
                        className="w-full text-left px-4 py-2 text-sm sm:text-base hover:bg-black/[.04]"
                        onMouseDown={onSuggestionMouseDown}
                        onClick={() => onSelectSuggestion(s)}
                      >
                        {s.description}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </form>

        {error && (
          <p className="mt-6 text-red-600 dark:text-red-400 text-sm">{error}</p>
        )}

        {data && (
          <div className="mt-10 grid gap-6">
            <section className="apple-card apple-shadow p-6">
              <h2 className="text-xl font-semibold tracking-[-0.02em]">Summary</h2>
              <div className="mt-3 grid grid-cols-1 gap-2 text-sm sm:text-base opacity-90">
                <p><span className="font-medium">Address:</span> {placeDetails?.formattedAddress || data.address}</p>
                <p><span className="font-medium">County:</span> {county || "N/A"}</p>
                <p><span className="font-medium">City:</span> {city || "N/A"}</p>
                <p><span className="font-medium">Property type:</span> {propertyType || "—"}</p>
              </div>
            </section>

            <section className="apple-card apple-shadow p-6">
              <h2 className="text-xl font-semibold tracking-[-0.02em]">Pro Forma</h2>
              <div className="mt-3 grid grid-cols-1 sm:grid-cols-4 gap-3 text-sm sm:text-base">
                <div className="rounded-xl border border-apple p-4 bg-surface">
                  <p className="opacity-70">Gross Revenue</p>
                  <p className="mt-1 text-2xl font-semibold">${Math.round(data.market.projectedAnnualRentRevenue).toLocaleString()}</p>
                </div>
                <div className="rounded-xl border border-apple p-4 bg-surface">
                  <p className="opacity-70">ADR</p>
                  <p className="mt-1 text-2xl font-semibold">${Math.round(data.market.adr).toLocaleString()} <span className="text-sm font-normal opacity-70">/night</span></p>
                </div>
                <div className="rounded-xl border border-apple p-4 bg-surface">
                  <p className="opacity-70">Occupancy</p>
                  <p className="mt-1 text-2xl font-semibold">{Math.round(data.market.occupancy * 100)}%</p>
                </div>
                <div className="rounded-xl border border-apple p-4 bg-surface">
                  <p className="opacity-70">RevPAR</p>
                  <p className="mt-1 text-2xl font-semibold">${Math.round(data.market.adr * data.market.occupancy).toLocaleString()} <span className="text-sm font-normal opacity-70">/room</span></p>
                </div>
              </div>

              <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="rounded-xl border border-apple p-4 bg-surface">
                  <p className="opacity-70 text-sm">Seasonality Index (peak vs avg)</p>
                  {(() => {
                    const curve = data.market.seasonalityIndex;
                    if (!curve || curve.length === 0) return <p className="mt-3 text-sm opacity-70">No data</p>;
                    // Build a clean, responsive SVG line chart (no month letters)
                    const values = curve.map(m => m.multiplier);
                    const minVal = Math.min(...values);
                    const maxVal = Math.max(...values);
                    const width = 360; // viewBox width
                    const height = 112; // viewBox height (matches ~h-28)
                    const padding = 10;
                    const innerW = width - padding * 2;
                    const innerH = height - padding * 2;
                    const n = curve.length;
                    const stepX = innerW / Math.max(1, n - 1);
                    const norm = (v: number) => {
                      if (maxVal === minVal) return 0.5; // flat line fallback
                      return (v - minVal) / (maxVal - minVal);
                    };
                    const points = values.map((v, i) => {
                      const x = padding + i * stepX;
                      const y = padding + (1 - norm(v)) * innerH;
                      return { x, y };
                    });
                    const pathD = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
                    const areaD = `${pathD} L ${padding + (n - 1) * stepX} ${height - padding} L ${padding} ${height - padding} Z`;
                    // Baseline at 1.0 multiplier if within range
                    const hasBaseline = minVal <= 1 && maxVal >= 1;
                    const baseY = padding + (1 - norm(1)) * innerH;
                    return (
                      <div className="mt-3">
                        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-28">
                          <defs>
                            <linearGradient id="seasonalityGradient" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="currentColor" stopOpacity="0.18" />
                              <stop offset="100%" stopColor="currentColor" stopOpacity="0.02" />
                            </linearGradient>
                          </defs>
                          {hasBaseline && (
                            <line x1={padding} x2={width - padding} y1={baseY} y2={baseY} className="stroke-black/10 dark:stroke-white/10" strokeWidth={1} />
                          )}
                          <path d={areaD} fill="url(#seasonalityGradient)" />
                          <path d={pathD} className="stroke-black/70 dark:stroke-white/70" strokeWidth={2.5} strokeLinecap="round" fill="none" />
                        </svg>
                      </div>
                    );
                  })()}
                </div>

                <div className="rounded-xl border border-apple p-4 bg-surface">
                  {(() => {
                    const cs = data.market.compsStrength;
                    const count = cs?.count ?? 0;
                    const median = typeof cs?.medianDistanceMiles === "number" ? cs!.medianDistanceMiles : undefined;
                    const radius = typeof median === "number" ? Math.max(1, Math.round(median)) : 3;
                    // score heuristic: scaled count minus radius penalty
                    const raw = Math.min(100, (count / 30) * 100);
                    const penalty = Math.min(30, Math.max(0, (radius - 1) * 10));
                    const score = Math.max(0, Math.min(100, Math.round(raw - penalty)));
                    const label = score < 34 ? "Low" : score < 67 ? "Medium" : "High";
                    const pos = score; // 0..100
                    const similarity = typeof cs?.similarityPercent === "number" ? Math.round(cs!.similarityPercent) : undefined;
                    return (
                      <div>
                        <div className="flex items-start justify-between">
                          <p className="text-sm opacity-70">Comps Strength</p>
                          <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-sm font-medium bg-black/[.06] text-black/80 dark:bg-white/10 dark:text-white/90 border border-apple">{label}</span>
                        </div>
                        <div className="mt-3">
                          <div className="relative h-2 rounded-full overflow-hidden bg-black/10 dark:bg-white/10">
                            <div className="absolute inset-0" style={{ background: "linear-gradient(90deg, rgba(244,63,94,0.6) 0%, rgba(245,158,11,0.6) 40%, rgba(34,197,94,0.6) 100%)" }} />
                            <div className="absolute -top-1 h-4 w-4 rounded-full bg-white border border-black/10 dark:bg-black dark:border-white/20 shadow" style={{ left: `${pos}%`, transform: "translateX(-50%)" }} />
                          </div>
                          <div className="sr-only" aria-live="polite">Comps strength {label} (score {score})</div>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <span className="inline-flex items-center rounded-full border border-apple px-3 py-1 text-sm bg-surface">{count.toLocaleString()} comps</span>
                          <span className="inline-flex items-center rounded-full border border-apple px-3 py-1 text-sm bg-surface">{radius} mi radius</span>
                          {typeof similarity === "number" && (
                            <span className="inline-flex items-center rounded-full border border-apple px-3 py-1 text-sm bg-surface">{similarity}% similarity</span>
                          )}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>
            </section>

            {/* STR Eligibility Card */}
            <section className="apple-card apple-shadow p-6">
              {(() => {
                const percent = Math.round(data.summary.confidence * 100);
                const label = getEligibilityLabel(percent);
                const styles = getEligibilityClasses(percent);
                return (
                  <>
                    <div className="flex items-start justify-between">
                      <h2 className="text-xl font-semibold tracking-[-0.02em]">STR Eligibility</h2>
                      <span className={`inline-flex items-center rounded-full border px-3.5 py-1.5 text-base font-medium ${styles.badgeBg} ${styles.text}`}>
                        {label}
                      </span>
                    </div>
                    <div className="mt-1">
                      <p className={`text-4xl sm:text-5xl font-semibold ${styles.text}`}>{percent}%</p>
                      <p className="mt-1 text-sm sm:text-base opacity-80">Confidence</p>
                    </div>
                    {data.summary.restrictions.length > 0 && (
                      <div className="mt-3">
                        <h3 className="text-sm font-medium opacity-70">Restrictions</h3>
                        <ul className="mt-2 list-disc list-inside text-sm">
                          {data.summary.restrictions.map((r: string, i: number) => (
                            <li key={i} className="text-muted">{r}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </>
                );
              })()}
            </section>

            <section className="apple-card apple-shadow p-6">
              <h2 className="text-xl font-semibold tracking-[-0.02em]">Comparable Listings</h2>
              <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                {data.comps.map((c: ComparableListing, i: number) => (
                  <div key={i} className="rounded-xl border border-apple p-4 bg-surface">
                    <p className="text-sm opacity-70 capitalize">{c.platform}</p>
                    <p className="mt-1 text-lg font-medium">${c.nightlyRate}/night · {Math.round(c.occupancy * 100)}% occ</p>
                    <p className="text-sm opacity-70">Cleaning fee ${c.cleaningFee}</p>
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}
        </div>
    </div>
  );
}
