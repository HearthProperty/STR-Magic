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

    async function onSelectSuggestion(s: PlaceSuggestion) {
        try {
            setShowSuggestions(false);
            setSuggestions([]);
            setHasUserEdited(false);
            const res = await fetch(`/api/places/details?placeId=${encodeURIComponent(s.placeId)}`);
            if (res.ok) {
                const details = (await res.json()) as PlaceDetails;
                setAddress(details.formattedAddress || s.description);
            } else {
                setAddress(s.description);
            }
        } catch {
            setAddress(s.description);
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

    return {
        // state
        address,
        loading,
        data,
        error,
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


