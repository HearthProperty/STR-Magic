import { NextResponse } from "next/server";
import { buildSeededComps, computeProForma, buildSeededEligibility, simulateNetworkDelay } from "@/lib/evaluate";
import { EvaluateResponse } from "@/lib/types";

export async function GET(request: Request) {
	const { searchParams } = new URL(request.url);
	const address = (searchParams.get("address") || "").trim();
	if (!address) {
		return NextResponse.json({ error: "Missing address" }, { status: 400 });
	}

	// In production: fetch county STR rules, scrape public records, query Airbnb/VRBO APIs or vendors
	const comps = buildSeededComps(address);
	const proForma = computeProForma(comps);
	const { canOperateSTR, restrictions, confidence } = buildSeededEligibility(address);

	// Simulate realistic latency
	await simulateNetworkDelay(420, 1000);

	const summary = { canOperateSTR, restrictions, confidence } as EvaluateResponse["summary"];

	const body: EvaluateResponse = {
		address,
		summary,
		comps,
		proForma,
	};

	return NextResponse.json(body);
}


