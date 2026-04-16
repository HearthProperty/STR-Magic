import { NextResponse } from "next/server";

/**
 * Fetch OSM feature details from LocationIQ to infer property type.
 * Inputs: osm_type (N|W|R), osm_id
 * Env: LOCATIONIQ_KEY, optional LOCATIONIQ_BASE
 */
export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const osm_type = (searchParams.get("osm_type") || "").trim().toUpperCase();
    const osm_id = (searchParams.get("osm_id") || "").trim();
    if (!osm_type || !osm_id) return NextResponse.json({ error: "Missing osm_type/osm_id" }, { status: 400 });

    const key = process.env.LOCATIONIQ_KEY;
    if (!key) return NextResponse.json({ error: "Missing LOCATIONIQ_KEY" }, { status: 500 });
    const base = (process.env.LOCATIONIQ_BASE || "us1").trim();

    try {
        const params = new URLSearchParams({ key, osmtype: osm_type, osmid: osm_id, format: "json", addressdetails: "1", extratags: "1" });
        const url = `https://${base}.locationiq.com/v1/details?${params.toString()}`;
        const res = await fetch(url);
        if (!res.ok) {
            let bodyText: string | undefined;
            try { bodyText = await res.text(); } catch {}
            return NextResponse.json({ error: "LocationIQ upstream error", upstream: { status: res.status, body: bodyText } }, { status: res.status });
        }
        const json = await res.json();
        if (process.env.NODE_ENV !== "production") {
            console.log("[LocationIQ details] response", json);
        }
        const category = json?.category || null;
        const type = json?.type || null;
        const addresstype = json?.addresstype || null;
        const address = json?.address || null;
        const extratags = json?.extratags || null;

        const raw = `${(category || "").toString().toLowerCase()}|${(type || "").toString().toLowerCase()}|${(addresstype || "").toString().toLowerCase()}|${JSON.stringify(extratags || {})}`;
        let homeType: string | null = null;
        if (/apartment|apartments|condo|condominium|flats|residential block|block/.test(raw)) homeType = "Condo/Apartment";
        else if (/townhouse|rowhouse|terrace|terraced/.test(raw)) homeType = "Townhouse";
        else if (/house|detached|semidetached|semi-detached/.test(raw)) homeType = "Single Family";
        else if (/residential/.test(raw)) homeType = "Residential";

        return NextResponse.json({ result: { category, type, addresstype, address, extratags, homeType } });
    } catch (_err) {
        return NextResponse.json({ result: null });
    }
}


