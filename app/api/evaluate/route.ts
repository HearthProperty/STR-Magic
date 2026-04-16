import { NextResponse } from "next/server";
import { buildSeededComps, computeProForma, buildSeededEligibility, simulateNetworkDelay, fetchAirDNAMarketMetrics } from "@/lib/evaluate";
import { EvaluateResponse, LeadFormInput } from "@/lib/types";
import { lookupEligibility } from "@/lib/strRules";
import { createLead } from "@/lib/close";
import { sendLeadNotification } from "@/lib/discord";

export async function POST(request: Request) {
	try {
		const body = await request.json();
		const { address, county, city, ownerName, email, phone } = body;
		if (!address) {
			return NextResponse.json({ error: "Missing address" }, { status: 400 });
		}

		// In production: fetch county STR rules, scrape public records, query Airbnb/VRBO APIs or vendors
		const comps = buildSeededComps(address);
		const proForma = computeProForma(comps);
		const market = await fetchAirDNAMarketMetrics(address);

		// Prefer local rules dataset when we have a match; otherwise fall back to seeded heuristic
		const local = lookupEligibility({ state: "CA", county: county || null, city: city || null });
		const { canOperateSTR, restrictions, confidence } = local
			? { canOperateSTR: local.canOperateSTR, restrictions: local.restrictions, confidence: local.confidence }
			: buildSeededEligibility(address);

		// Simulate realistic latency
		await simulateNetworkDelay(420, 1000);

		const summary = { canOperateSTR, restrictions, confidence } as EvaluateResponse["summary"];

		const responseData: EvaluateResponse = {
			address,
			summary,
			comps,
			proForma,
			market,
		};

		const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://strmagic.hearthproperty.com';
		const resultUrl = `${siteUrl}`; // STR-Magic runs on the same page

		// Fire Close + Discord in parallel (both non-blocking)
		if (ownerName && email && phone) {
			await Promise.allSettled([
				createLead({ ownerName, email, phone }, responseData).catch(err => {
					console.error('[Submit] Close CRM failed (non-blocking):', err);
					return undefined;
				}),
				sendLeadNotification({ ownerName, email, phone }, responseData, resultUrl).catch(err => {
					console.error('[Submit] Discord failed (non-blocking):', err);
					return false;
				}),
			]);
		}

		return NextResponse.json(responseData);
	} catch (err) {
		console.error(err);
		return NextResponse.json({ error: "Server Error" }, { status: 500 });
	}
}
