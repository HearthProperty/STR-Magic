import { NextResponse } from "next/server";
import type { PlaceDetails } from "@/lib/types";

export async function GET(request: Request) {
	const { searchParams } = new URL(request.url);
	const placeId = (searchParams.get("placeId") || "").trim();
	if (!placeId) return NextResponse.json({ error: "Missing placeId" }, { status: 400 });

	const key = process.env.GOOGLE_PLACES_API_KEY;
	if (!key) return NextResponse.json({ error: "Missing GOOGLE_PLACES_API_KEY" }, { status: 500 });

	const params = new URLSearchParams({ place_id: placeId, key, fields: "place_id,formatted_address,geometry,address_component,types" });
	const url = `https://maps.googleapis.com/maps/api/place/details/json?${params.toString()}`;
	const res = await fetch(url);
	if (!res.ok) return NextResponse.json({ error: `Upstream error: ${res.status}` }, { status: 502 });
	const json = await res.json();
	const r = json.result;
	const body: PlaceDetails = {
		placeId: r.place_id,
		formattedAddress: r.formatted_address,
		location: { lat: r.geometry?.location?.lat ?? 0, lng: r.geometry?.location?.lng ?? 0 },
		addressComponents: (r.address_components || []).map((c: any) => ({ longName: c.long_name, shortName: c.short_name, types: c.types })),
		types: r.types || [],
	};
	return NextResponse.json(body);
}


