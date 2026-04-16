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
    if (percentage >= 70) return "Limited";
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
              <div className="mt-3 text-sm sm:text-base opacity-90">
                <p><span className="font-medium">Address:</span> {data.address}</p>
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
                    const values = curve.map(m => m.multiplier);
                    const max = Math.max(...values);
                    const monthLabels = ["J","F","M","A","M","J","J","A","S","O","N","D"];
                    return (
                      <div className="mt-3">
                        <div className="flex items-end gap-2 h-28">
                          {curve.map((m, idx) => {
                            const heightPct = Math.max(6, Math.round((m.multiplier / max) * 100));
                            return (
                              <div key={idx} className="flex flex-col items-center gap-1 flex-1">
                                <div className="w-full rounded-t-md bg-black/80 dark:bg-white/80" style={{ height: `${heightPct}%` }} />
                                <span className="text-[10px] opacity-50">{monthLabels[(m.month - 1) % 12]}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })()}
                </div>

                <div className="rounded-xl border border-apple p-4 bg-surface">
                  <p className="opacity-70 text-sm">Comps Strength (# of close matches + median distance)</p>
                  {(() => {
                    const cs = data.market.compsStrength;
                    if (!cs) return <p className="mt-3 text-sm opacity-70">No data</p>;
                    const rangeMiles = typeof cs.medianDistanceMiles === "number" ? Math.max(1, Math.round(cs.medianDistanceMiles * 2)) : undefined;
                    return (
                      <div className="mt-3">
                        <p className="text-2xl font-semibold">{cs.count.toLocaleString()} <span className="text-sm font-normal opacity-70">similar listings</span></p>
                        {typeof cs.medianDistanceMiles === "number" && (
                          <p className="mt-1 text-sm opacity-70">Median distance ~ {cs.medianDistanceMiles.toFixed(1)} mi</p>
                        )}
                        {typeof rangeMiles === "number" && (
                          <p className="mt-1 text-sm opacity-70">{rangeMiles} mile range</p>
                        )}
                      </div>
                    );
                  })()}
                </div>
              </div>
            </section>

            {/* STR Eligibility Card (moved below Pro Forma) */}
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
                    <div className="mt-4">
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
