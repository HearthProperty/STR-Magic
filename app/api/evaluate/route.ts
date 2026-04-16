import { NextResponse } from "next/server";
import { buildSeededComps, computeProForma, buildSeededEligibility, simulateNetworkDelay, fetchAirDNAMarketMetrics } from "@/lib/evaluate";
import { EvaluateResponse } from "@/lib/types";
import { lookupEligibility } from "@/lib/strRules";

export async function GET(request: Request) {
	const { searchParams } = new URL(request.url);
	const address = (searchParams.get("address") || "").trim();
	if (!address) {
		return NextResponse.json({ error: "Missing address" }, { status: 400 });
	}

	// Optional locality hints from client (recommended: county normalized without "County")
	const county = (searchParams.get("county") || "").trim() || null;
	const city = (searchParams.get("city") || "").trim() || null;

	// In production: fetch county STR rules, scrape public records, query Airbnb/VRBO APIs or vendors
	const comps = buildSeededComps(address);
	const proForma = computeProForma(comps);
	const market = await fetchAirDNAMarketMetrics(address);

	// Prefer local rules dataset when we have a match; otherwise fall back to seeded heuristic
	const local = lookupEligibility({ state: "CA", county, city });
	const { canOperateSTR, restrictions, confidence } = local
		? { canOperateSTR: local.canOperateSTR, restrictions: local.restrictions, confidence: local.confidence }
		: buildSeededEligibility(address);

	// Simulate realistic latency
	await simulateNetworkDelay(420, 1000);

	const summary = { canOperateSTR, restrictions, confidence } as EvaluateResponse["summary"];

	const body: EvaluateResponse = {
		address,
		summary,
		comps,
		proForma,
		market,
	};

	return NextResponse.json(body);
}


