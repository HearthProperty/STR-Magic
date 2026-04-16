import { NextResponse } from "next/server";

/**
 * Forward geocode via LocationIQ to retrieve OSM class/type and ids.
 * Env: LOCATIONIQ_KEY, optional LOCATIONIQ_BASE (us1/eu1)
 */
export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const q = (searchParams.get("q") || "").trim();
    if (!q) return NextResponse.json({ error: "Missing q" }, { status: 400 });

    const key = process.env.LOCATIONIQ_KEY;
    if (!key) return NextResponse.json({ error: "Missing LOCATIONIQ_KEY" }, { status: 500 });
    const base = (process.env.LOCATIONIQ_BASE || "us1").trim();
    const params = new URLSearchParams({ key, q, format: "json", addressdetails: "1", limit: "1", normalizecity: "1" });
    const url = `https://${base}.locationiq.com/v1/search?${params.toString()}`;
    try {
        const res = await fetch(url);
        if (!res.ok) {
            let bodyText: string | undefined;
            try { bodyText = await res.text(); } catch {}
            return NextResponse.json({ error: "LocationIQ upstream error", upstream: { status: res.status, body: bodyText } }, { status: res.status });
        }
        const json = await res.json();
        const first = Array.isArray(json) ? json[0] : null;
        if (process.env.NODE_ENV !== "production") {
            console.log("[LocationIQ search] response", first);
        }
        if (!first) return NextResponse.json({ result: null });
        const payload = {
            class: first.class || null,
            type: first.type || null,
            osm_type: first.osm_type || null,
            osm_id: first.osm_id || null,
            lat: first.lat || null,
            lon: first.lon || null,
            address: first.address || null,
            display_name: first.display_name || null,
        };
        return NextResponse.json({ result: payload });
    } catch (_err) {
        return NextResponse.json({ result: null });
    }
}


