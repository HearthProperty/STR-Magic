import { NextResponse } from "next/server";

/**
 * Reverse geocode via LocationIQ to extract county from coordinates.
 * Env: LOCATIONIQ_KEY
 */
export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const lat = (searchParams.get("lat") || "").trim();
    const lng = (searchParams.get("lng") || "").trim();
    const zoom = (searchParams.get("zoom") || "18").trim(); // building-level detail
    if (!lat || !lng) return NextResponse.json({ error: "Missing lat/lng" }, { status: 400 });

    const key = process.env.LOCATIONIQ_KEY;
    if (!key) return NextResponse.json({ error: "Missing LOCATIONIQ_KEY" }, { status: 500 });

    try {
        const base = (process.env.LOCATIONIQ_BASE || "us1").trim(); // e.g., us1 or eu1
        const params = new URLSearchParams({
            key,
            lat,
            lon: lng,
            format: "json",
            addressdetails: "1",
            namedetails: "1",
            extratags: "1",
            zoom,
        });
        const url = `https://${base}.locationiq.com/v1/reverse?${params.toString()}`;
        const res = await fetch(url);
        if (!res.ok) {
            let bodyText: string | undefined;
            try { bodyText = await res.text(); } catch {}
            return NextResponse.json(
                { error: "LocationIQ upstream error", upstream: { status: res.status, body: bodyText } },
                { status: res.status }
            );
        }
        const json = await res.json();
        if (process.env.NODE_ENV !== "production") {
            console.log("[LocationIQ reverse] response", {
                lat,
                lng,
                address_sample: json?.display_name,
                class: json?.class,
                type: json?.type,
                category: json?.category,
                addresstype: json?.addresstype,
                address: json?.address,
            });
        }
        const county: string | null = json?.address?.county || null;
        // Infer a coarse home type from OSM fields (best-effort)
        const building = (json?.address?.building || "").toString().toLowerCase();
        const addresstype = (json?.addresstype || "").toString().toLowerCase();
        const typeList: string[] = [
            (json?.type || "").toString().toLowerCase(),
            (json?.category || "").toString().toLowerCase(),
            (json?.class || "").toString().toLowerCase(),
            building,
            addresstype,
        ];
        const raw = typeList.join("|");
        let homeType: string | null = null;
        const isApartment = /apartment|apartments|condo|condominium|flats|residential block|residential_block|residence|block|dormitory/.test(raw);
        const isTown = /townhouse|rowhouse|row_house|terrace|terraced/.test(raw);
        const isHouse = /house|detached|semidetached|semi-detached/.test(raw) || (building === "yes" && addresstype === "house");
        if (isApartment) homeType = "Condo/Apartment";
        else if (isTown) homeType = "Townhouse";
        else if (isHouse) homeType = "Single Family";
        else if (/residential/.test(raw)) homeType = "Residential";

        return NextResponse.json({ county, homeType });
    } catch (_err) {
        return NextResponse.json({ county: null, homeType: null }, { status: 200 });
    }
}


