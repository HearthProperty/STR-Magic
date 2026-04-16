import { NextResponse } from "next/server";
import type { PlaceSuggestion } from "@/lib/types";

export async function GET(request: Request) {
	const { searchParams } = new URL(request.url);
	const input = (searchParams.get("input") || "").trim();
	if (!input) return NextResponse.json({ predictions: [] });

	const key = process.env.GOOGLE_MAPS_API_KEY;
	if (!key) {
		return NextResponse.json(
			{ error: "Missing GOOGLE_MAPS_API_KEY" },
			{ status: 500 }
		);
	}

	const params = new URLSearchParams({
		input,
		key,
		// Restrict to address-like predictions for better UX
		types: "address",
		// Optional: region/country biasing
		// components: "country:us",
	});

	const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?${params.toString()}`;
	const res = await fetch(url);
	if (!res.ok) {
		return NextResponse.json(
			{ error: `Upstream error: ${res.status}` },
			{ status: 502 }
		);
	}
	const json = await res.json();
	const predictions = (json.predictions || []).map((p: any): PlaceSuggestion => ({
		placeId: p.place_id,
		description: p.description,
		types: p.types,
		matchedSubstrings: p.matched_substrings?.map((m: any) => ({ offset: m.offset, length: m.length })) || [],
	}));
	return NextResponse.json({ predictions });
}


