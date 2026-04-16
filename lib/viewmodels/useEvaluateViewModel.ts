import { useEffect, useRef, useState, type ChangeEvent, type FormEvent, type MouseEvent } from "react";
import type { EvaluateResponse, PlaceSuggestion, PlaceDetails } from "@/lib/types";

/**
 * ViewModel: Encapsulates input state, async side-effects, and UI actions
 * for the evaluation flow. Keeps UI (View) simple and declarative.
 */
export function useEvaluateViewModel() {
    // Query and results state
    const [address, setAddress] = useState("");
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState<EvaluateResponse | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [placeDetails, setPlaceDetails] = useState<PlaceDetails | null>(null);
    const [county, setCounty] = useState<string | null>(null);
    const [city, setCity] = useState<string | null>(null);
    const [propertyType, setPropertyType] = useState<string | null>(null);
    const [propertyExcerpt, setPropertyExcerpt] = useState<string | null>(null);

    // Autocomplete state
    const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [hasUserEdited, setHasUserEdited] = useState(false);

    // Debounce and cancellation
    const debounceRef = useRef<number | undefined>(undefined);
    const abortRef = useRef<AbortController | null>(null);

    // Actions
    function onChangeAddress(e: ChangeEvent<HTMLInputElement>) {
        setHasUserEdited(true);
        setAddress(e.target.value);
    }

    async function onSearch(e: FormEvent) {
        e.preventDefault();
        setError(null);
        setLoading(true);
        setData(null);
        try {
            const params = new URLSearchParams({ address });
            if (county) params.set("county", county);
            if (city) params.set("city", city);
            const res = await fetch(`/api/evaluate?${params.toString()}`);
            if (!res.ok) throw new Error("Failed to fetch evaluation");
            const json = (await res.json()) as EvaluateResponse;
            setData(json);
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "Something went wrong");
        } finally {
            setLoading(false);
        }
    }

    async function onSelectSuggestion(s: PlaceSuggestion) {
        try {
            setShowSuggestions(false);
            setSuggestions([]);
            setHasUserEdited(false);
            setPropertyExcerpt(null);
            const res = await fetch(`/api/places/details?placeId=${encodeURIComponent(s.placeId)}`);
            if (res.ok) {
                const details = (await res.json()) as PlaceDetails;
                setAddress(details.formattedAddress || s.description);
                setPlaceDetails(details);
                // derive county and city using LocationIQ first (prefer external canonical labels)
                let nextPropertyType: string | null = null;
                let nextCity: string | null = null;
                try {
                    const { lat, lng } = details.location;
                    const liq = await fetch(`/api/locationiq/reverse?lat=${encodeURIComponent(String(lat))}&lng=${encodeURIComponent(String(lng))}`);
                    if (liq.ok) {
                        const lj = await liq.json();
                        try { console.log('[VM] LocationIQ reverse', lj); } catch {}
                        if (lj?.county) setCounty(String(lj.county).replace(/\s*County$/i, ""));
                        if (lj?.homeType) nextPropertyType = lj.homeType;
                        // Try to pull a normalized city/locality field when available
                        const liqAddr = lj?.address || {};
                        const liqCity = liqAddr.city || liqAddr.town || liqAddr.village || liqAddr.hamlet || liqAddr.municipality || null;
                        if (liqCity) nextCity = String(liqCity);
                        if (!nextCity) {
                            // fallback to Google address components for city
                            const cityComp = details.addressComponents.find((c) => c.types.includes("locality"))
                                || details.addressComponents.find((c) => c.types.includes("postal_town"))
                                || details.addressComponents.find((c) => c.types.includes("administrative_area_level_3"));
                            const rawCity = cityComp?.longName || cityComp?.shortName || null;
                            nextCity = rawCity;
                        }
                        if (!nextCity && liqAddr?.state_district) nextCity = String(liqAddr.state_district);
                    } else {
                        const countyComp = details.addressComponents.find((c) => c.types.includes("administrative_area_level_2"));
                        const rawCounty = countyComp?.longName || countyComp?.shortName || null;
                        setCounty(rawCounty ? rawCounty.replace(/\s*County$/i, "") : null);
                        const cityComp = details.addressComponents.find((c) => c.types.includes("locality"))
                            || details.addressComponents.find((c) => c.types.includes("postal_town"))
                            || details.addressComponents.find((c) => c.types.includes("administrative_area_level_3"));
                        const rawCity = cityComp?.longName || cityComp?.shortName || null;
                        nextCity = rawCity;
                    }
                } catch {
                    const countyComp = details.addressComponents.find((c) => c.types.includes("administrative_area_level_2"));
                    const rawCounty = countyComp?.longName || countyComp?.shortName || null;
                    setCounty(rawCounty ? rawCounty.replace(/\s*County$/i, "") : null);
                    const cityComp = details.addressComponents.find((c) => c.types.includes("locality"))
                        || details.addressComponents.find((c) => c.types.includes("postal_town"))
                        || details.addressComponents.find((c) => c.types.includes("administrative_area_level_3"));
                    const rawCity = cityComp?.longName || cityComp?.shortName || null;
                    nextCity = rawCity;
                }
                setCity(nextCity || null);
                // If we still lack propertyType, try LocationIQ forward search with full address
                if (!nextPropertyType) {
                    try {
                        const q = encodeURIComponent(details.formattedAddress || s.description);
                        const resp = await fetch(`/api/locationiq/search?q=${q}`);
                        if (resp.ok) {
                            const sj = await resp.json();
                            try { console.log('[VM] LocationIQ search', sj); } catch {}
                            const cls = (sj?.result?.class || "").toString().toLowerCase();
                            const typ = (sj?.result?.type || "").toString().toLowerCase();
                            const osmType = (sj?.result?.osm_type || "").toString().toUpperCase();
                            const osmId = sj?.result?.osm_id ? String(sj.result.osm_id) : "";
                            const raw = `${cls}|${typ}`;
                            if (/apartment|apartments|condo|condominium|flats/.test(raw)) nextPropertyType = "Condo/Apartment";
                            else if (/townhouse|rowhouse|terrace|terraced/.test(raw)) nextPropertyType = "Townhouse";
                            else if (/house|detached|semidetached|semi-detached|residential/.test(raw)) nextPropertyType = "Single Family";
                            // If still ambiguous and we have OSM IDs, fetch details
                            if (!nextPropertyType && osmType && osmId) {
                                try {
                                    const dj = await fetch(`/api/locationiq/details?osm_type=${encodeURIComponent(osmType)}&osm_id=${encodeURIComponent(osmId)}`).then(r => r.json());
                                    try { console.log('[VM] LocationIQ details', dj); } catch {}
                                    const ht = dj?.result?.homeType;
                                    if (ht) nextPropertyType = ht;
                                } catch {}
                            }
                        }
                    } catch {}
                }
                // Final fallback: Google types heuristic
                if (!nextPropertyType && Array.isArray(details.types) && details.types.length > 0) {
                    const gtypes = details.types.map((t) => t.toLowerCase());
                    if (gtypes.some(t => t.includes("premise") || t.includes("subpremise") || t.includes("apartment"))) nextPropertyType = "Condo/Apartment";
                    else if (gtypes.some(t => t.includes("route") || t.includes("street_address"))) nextPropertyType = "Single Family";
                }
                setPropertyType(nextPropertyType);
                // property type now relies on LocationIQ hint only; if not provided, leave null
            } else {
                setAddress(s.description);
                setPlaceDetails(null);
                setCounty(null);
                setCity(null);
                setPropertyType(null);
                setPropertyExcerpt(null);
            }
        } catch {
            setAddress(s.description);
            setPlaceDetails(null);
            setCounty(null);
            setCity(null);
            setPropertyType(null);
            setPropertyExcerpt(null);
        }
    }

    function onFocusInput() {
        if (hasUserEdited && suggestions.length > 0) setShowSuggestions(true);
    }

    function onBlurInput() {
        // Delay to allow click on suggestion
        setTimeout(() => setShowSuggestions(false), 120);
    }

    function onSuggestionMouseDown(e: MouseEvent<HTMLButtonElement>) {
        e.preventDefault();
    }

    function reset() {
        setAddress("");
        setData(null);
        setError(null);
        setPlaceDetails(null);
        setCounty(null);
        setCity(null);
        setPropertyType(null);
        setPropertyExcerpt(null);
        setSuggestions([]);
        setShowSuggestions(false);
        setHasUserEdited(false);
    }

    // Side effects: debounced autocomplete
    useEffect(() => {
        if (debounceRef.current) window.clearTimeout(debounceRef.current);
        if (!hasUserEdited) {
            setSuggestions([]);
            setShowSuggestions(false);
            return;
        }
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
                // noop: ignore aborts/network blips
            }
        }, 250);
        return () => {
            if (debounceRef.current) window.clearTimeout(debounceRef.current);
        };
    }, [address, hasUserEdited]);

    // Fetch a short GPT-generated property excerpt when we have enough context
    useEffect(() => {
        const shouldFetch = Boolean((placeDetails?.formattedAddress || address) && (propertyType || city || county));
        if (!shouldFetch) return;
        let cancelled = false;
        const run = async () => {
            try {
                const payload = {
                    address: placeDetails?.formattedAddress || address,
                    propertyType: propertyType || undefined,
                    city: city || undefined,
                    county: county || undefined,
                };
                const res = await fetch('/api/describe', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload),
                });
                if (!res.ok) return;
                const j = await res.json();
                if (!cancelled) setPropertyExcerpt(typeof j?.excerpt === 'string' ? j.excerpt : null);
            } catch {
                // swallow errors; description is non-critical
            }
        };
        run();
        return () => { cancelled = true; };
    }, [address, placeDetails?.formattedAddress, propertyType, city, county]);

    return {
        // state
        address,
        loading,
        data,
        error,
        placeDetails,
        county,
        city,
        propertyType,
        propertyExcerpt,
        suggestions,
        showSuggestions,
        hasUserEdited,
        // actions
        onChangeAddress,
        onSearch,
        onSelectSuggestion,
        onFocusInput,
        onBlurInput,
        onSuggestionMouseDown,
        reset,
    };
}


