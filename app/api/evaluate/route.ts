import { NextResponse } from "next/server";
import { buildMockComps, computeProForma } from "@/lib/evaluate";
import { EvaluateResponse } from "@/lib/types";

export async function GET(request: Request) {
	const { searchParams } = new URL(request.url);
	const address = (searchParams.get("address") || "").trim();
	if (!address) {
		return NextResponse.json({ error: "Missing address" }, { status: 400 });
	}

	// In production: fetch county STR rules, scrape public records, query Airbnb/VRBO APIs or vendors
	const comps = buildMockComps();
	const proForma = computeProForma(comps);

	const summary = {
		canOperateSTR: true,
		restrictions: [
			"Registration required with county",
			"Max 8 guests; quiet hours 10pm-7am",
			"Annual renewal; remittance of local lodging tax",
		],
		confidence: 0.68,
	} as EvaluateResponse["summary"];

	const body: EvaluateResponse = {
		address,
		summary,
		comps,
		proForma,
	};

	return NextResponse.json(body);
}


