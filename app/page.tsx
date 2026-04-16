"use client";

import { useEffect, useRef, useState } from "react";
import type { EvaluateResponse, PlaceSuggestion } from "@/lib/types";

export default function Home() {
  const [address, setAddress] = useState("");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<EvaluateResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const debounceRef = useRef<number | undefined>(undefined);
  const abortRef = useRef<AbortController | null>(null);

  async function onSearch(e: React.FormEvent) {
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
          <h1 className="text-3xl sm:text-5xl font-semibold tracking-[-0.03em]">STR Magic</h1>
          <p className="mt-2 text-sm/6 sm:text-base/7 opacity-80">Enter an address. We will fetch comps, project income, and check legality.</p>
        </header>
        <form onSubmit={onSearch} className="sticky top-6 z-10">
          <div className="relative rounded-2xl border border-black/10 dark:border-white/15 bg-white/70 dark:bg-white/5 backdrop-blur px-4 py-3 flex items-center gap-3 shadow-[0_1px_0_#0001,0_8px_30px_rgba(0,0,0,0.06)]">
            <input
              value={address}
              onChange={(e) => setAddress(e.target.value)}
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
              <div className="absolute left-0 right-0 top-[calc(100%+8px)] rounded-2xl border border-black/10 dark:border-white/15 bg-white/85 dark:bg-neutral-900/85 backdrop-blur shadow-[0_1px_0_#0001,0_20px_60px_rgba(0,0,0,0.12)] overflow-hidden">
                <ul className="py-2">
                  {suggestions.map((s) => (
                    <li key={s.placeId}>
                      <button
                        type="button"
                        className="w-full text-left px-4 py-2 text-sm sm:text-base hover:bg-black/[.04] dark:hover:bg-white/[.06]"
                        onMouseDown={(e) => e.preventDefault()}
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
            <section className="rounded-2xl border border-black/10 dark:border-white/15 p-6 bg-white/70 dark:bg-white/5 backdrop-blur">
              <h2 className="text-xl font-semibold tracking-[-0.02em]">Summary</h2>
              <div className="mt-3 text-sm sm:text-base opacity-90">
                <p><span className="font-medium">Address:</span> {data.address}</p>
                <p className="mt-1"><span className="font-medium">STR Eligible:</span> {data.summary.canOperateSTR ? "Likely Yes" : "Likely No"} ({Math.round(data.summary.confidence * 100)}% confidence)</p>
                {data.summary.restrictions.length > 0 && (
                  <ul className="mt-2 list-disc list-inside opacity-80">
                    {data.summary.restrictions.map((r, i) => (
                      <li key={i}>{r}</li>
                    ))}
                  </ul>
                )}
              </div>
            </section>

            <section className="rounded-2xl border border-black/10 dark:border-white/15 p-6 bg-white/70 dark:bg-white/5 backdrop-blur">
              <h2 className="text-xl font-semibold tracking-[-0.02em]">Pro Forma</h2>
              <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm sm:text-base">
                <div className="rounded-xl border border-black/10 dark:border-white/15 p-4">
                  <p className="opacity-70">Gross Revenue</p>
                  <p className="mt-1 text-2xl font-semibold">${data.proForma.grossRevenue.toLocaleString()}</p>
                </div>
                <div className="rounded-xl border border-black/10 dark:border-white/15 p-4">
                  <p className="opacity-70">Operating Expenses</p>
                  <p className="mt-1 text-2xl font-semibold">${data.proForma.operatingExpenses.toLocaleString()}</p>
                </div>
                <div className="rounded-xl border border-black/10 dark:border-white/15 p-4">
                  <p className="opacity-70">NOI</p>
                  <p className="mt-1 text-2xl font-semibold">${data.proForma.netOperatingIncome.toLocaleString()}</p>
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-black/10 dark:border-white/15 p-6 bg-white/70 dark:bg-white/5 backdrop-blur">
              <h2 className="text-xl font-semibold tracking-[-0.02em]">Comparable Listings</h2>
              <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                {data.comps.map((c, i) => (
                  <div key={i} className="rounded-xl border border-black/10 dark:border-white/15 p-4">
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
