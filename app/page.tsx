"use client";

import { useEffect, useRef, useState, type FormEvent, type MouseEvent, type ChangeEvent } from "react";
import type { EvaluateResponse, PlaceSuggestion, ComparableListing } from "@/lib/types";
import ThemeToggle from "@/components/ThemeToggle";

export default function Home() {
  const [address, setAddress] = useState("");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<EvaluateResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const debounceRef = useRef<number | undefined>(undefined);
  const abortRef = useRef<AbortController | null>(null);

  function getEligibilityClasses(percentage: number) {
    if (percentage >= 70) {
      return {
        text: "text-green-600 dark:text-green-400",
        badgeBg:
          "bg-green-50 dark:bg-green-950/40 border-green-200/60 dark:border-green-900/60",
      };
    }
    if (percentage >= 40) {
      return {
        text: "text-amber-600 dark:text-amber-400",
        badgeBg:
          "bg-amber-50 dark:bg-amber-950/40 border-amber-200/60 dark:border-amber-900/60",
      };
    }
    return {
      text: "text-red-600 dark:text-red-400",
      badgeBg:
        "bg-red-50 dark:bg-red-950/40 border-red-200/60 dark:border-red-900/60",
    };
  }

  async function onSearch(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    setData(null);
    try {
      const res = await fetch(`/api/evaluate?address=${encodeURIComponent(address)}`);
      if (!res.ok) throw new Error("Failed to fetch evaluation");
      const json = (await res.json()) as EvaluateResponse;
      setData(json);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  function onSelectSuggestion(s: PlaceSuggestion) {
    setAddress(s.description);
    setShowSuggestions(false);
    setSuggestions([]);
  }

  function resetHome() {
    setAddress("");
    setData(null);
    setError(null);
    setSuggestions([]);
    setShowSuggestions(false);
  }

  useEffect(() => {
    // Debounced autocomplete
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    if (!address || address.trim().length < 3) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    debounceRef.current = window.setTimeout(async () => {
      try {
        if (abortRef.current) abortRef.current.abort();
        const controller = new AbortController();
        abortRef.current = controller;
        const res = await fetch(`/api/places/autocomplete?input=${encodeURIComponent(address)}`, {
          signal: controller.signal,
        });
        if (!res.ok) throw new Error("Autocomplete failed");
        const json = (await res.json()) as { predictions: PlaceSuggestion[] };
        setSuggestions(json.predictions?.slice(0, 6) || []);
        setShowSuggestions(true);
      } catch (_err) {
        // Ignore abort errors or network blips; keep UX smooth
      }
    }, 250);
    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, [address]);

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <div className="mx-auto max-w-3xl px-6 py-16">
        <header className="mb-10">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl sm:text-5xl font-semibold tracking-[-0.03em]">
              <button
                type="button"
                onClick={resetHome}
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
          <div className="relative rounded-2xl border border-black/5 bg-white px-4 py-3 flex items-center gap-3 shadow-sm">
            <input
              value={address}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setAddress(e.target.value)}
              placeholder="Search an address"
              className="w-full bg-transparent outline-none placeholder:opacity-60 text-base sm:text-lg"
              onFocus={() => {
                if (suggestions.length > 0) setShowSuggestions(true);
              }}
              onBlur={() => {
                // Delay to allow click on suggestion
                setTimeout(() => setShowSuggestions(false), 120);
              }}
            />
            <button
              type="submit"
              disabled={!address || loading}
              className="rounded-xl px-4 py-2 bg-black text-white dark:bg-white dark:text-black text-sm font-medium disabled:opacity-50"
            >
              {loading ? "Searching…" : "Search"}
            </button>

            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute left-0 right-0 top-[calc(100%+8px)] rounded-2xl border border-black/5 bg-white shadow-lg overflow-hidden">
                <ul className="py-2">
                  {suggestions.map((s) => (
                    <li key={s.placeId}>
                      <button
                        type="button"
                        className="w-full text-left px-4 py-2 text-sm sm:text-base hover:bg-black/[.04]"
                        onMouseDown={(e: MouseEvent<HTMLButtonElement>) => e.preventDefault()}
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
            <section className="rounded-2xl border border-black/5 p-6 bg-white">
              <h2 className="text-xl font-semibold tracking-[-0.02em]">Summary</h2>
              <div className="mt-3 text-sm sm:text-base opacity-90">
                <p><span className="font-medium">Address:</span> {data.address}</p>
              </div>
            </section>

            <section className="rounded-2xl border border-black/5 p-6 bg-white">
              <h2 className="text-xl font-semibold tracking-[-0.02em]">Pro Forma</h2>
              <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm sm:text-base">
                <div className="rounded-xl border border-black/5 p-4 bg-white/80">
                  <p className="opacity-70">Gross Revenue</p>
                  <p className="mt-1 text-2xl font-semibold">${data.proForma.grossRevenue.toLocaleString()}</p>
                </div>
                <div className="rounded-xl border border-black/5 p-4 bg-white/80">
                  <p className="opacity-70">Operating Expenses</p>
                  <p className="mt-1 text-2xl font-semibold">${data.proForma.operatingExpenses.toLocaleString()}</p>
                </div>
                <div className="rounded-xl border border-black/5 p-4 bg-white/80">
                  <p className="opacity-70">NOI</p>
                  <p className="mt-1 text-2xl font-semibold">${data.proForma.netOperatingIncome.toLocaleString()}</p>
                </div>
              </div>

              <div className="mt-6">
                <h3 className="text-sm font-medium opacity-70">Breakdown</h3>
                <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                  <div className="rounded-xl border border-black/5 p-3">
                    <p className="opacity-60 text-xs">Avg Nightly Rate</p>
                    <p className="mt-1 font-medium">${data.proForma.averageNightlyRate.toFixed(0)}</p>
                  </div>
                  <div className="rounded-xl border border-black/5 p-3">
                    <p className="opacity-60 text-xs">Avg Occupancy</p>
                    <p className="mt-1 font-medium">{Math.round(data.proForma.averageOccupancy * 100)}%</p>
                  </div>
                  <div className="rounded-xl border border-black/5 p-3">
                    <p className="opacity-60 text-xs">Nights</p>
                    <p className="mt-1 font-medium">{Math.round(data.proForma.nights).toLocaleString()}</p>
                  </div>
                  <div className="rounded-xl border border-black/5 p-3">
                    <p className="opacity-60 text-xs">Avg Stay (nights)</p>
                    <p className="mt-1 font-medium">{data.proForma.averageStayNights}</p>
                  </div>
                  <div className="rounded-xl border border-black/5 p-3">
                    <p className="opacity-60 text-xs">Turnovers</p>
                    <p className="mt-1 font-medium">{Math.round(data.proForma.turnovers).toLocaleString()}</p>
                  </div>
                  <div className="rounded-xl border border-black/5 p-3">
                    <p className="opacity-60 text-xs">Room Revenue</p>
                    <p className="mt-1 font-medium">${Math.round(data.proForma.roomRevenue).toLocaleString()}</p>
                  </div>
                  <div className="rounded-xl border border-black/5 p-3">
                    <p className="opacity-60 text-xs">Cleaning Revenue</p>
                    <p className="mt-1 font-medium">${Math.round(data.proForma.cleaningRevenue).toLocaleString()}</p>
                  </div>
                  <div className="rounded-xl border border-black/5 p-3">
                    <p className="opacity-60 text-xs">Expense Assumption</p>
                    <p className="mt-1 font-medium">35% of Gross</p>
                  </div>
                </div>
              </div>
            </section>

            {/* STR Eligibility Card (moved below Pro Forma) */}
            <section className="rounded-2xl border border-black/5 p-6 bg-white">
              <h2 className="text-xl font-semibold tracking-[-0.02em]">STR Eligibility</h2>
              {(() => {
                const percent = Math.round(data.summary.confidence * 100);
                const label = data.summary.canOperateSTR ? "Likely Yes" : "Likely No";
                const styles = getEligibilityClasses(percent);
                return (
                  <>
                    <div className="mt-4 flex items-center justify-between">
                      <div>
                        <p className={`text-4xl sm:text-5xl font-semibold ${styles.text}`}>{percent}%</p>
                        <p className="mt-1 text-sm sm:text-base opacity-80">Confidence</p>
                      </div>
                      <span className={`inline-flex items-center rounded-full border px-3 py-1 text-sm font-medium ${styles.badgeBg} ${styles.text}`}>
                        {label}
                      </span>
                    </div>
                    {data.summary.restrictions.length > 0 && (
                      <div className="mt-6">
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

            <section className="rounded-2xl border border-black/5 p-6 bg-white">
              <h2 className="text-xl font-semibold tracking-[-0.02em]">Comparable Listings</h2>
              <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                {data.comps.map((c: ComparableListing, i: number) => (
                  <div key={i} className="rounded-xl border border-black/5 p-4 bg-white/80">
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
