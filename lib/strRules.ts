import rules from "@/lib/data/str_rules.ca.json";

export type RestrictionCode =
	| "PROHIBITED"
	| "MORATORIUM"
	| "HOSTED_ONLY"
	| "NIGHTS_CAP_90"
	| "FINITE_PERMITS"
	| "LOTTERY"
	| "PERMIT_REQUIRED"
	| "TAX_ONLY"
	| "PRIMARY_RESIDENCE"
	| "ZONING_LIMITS";

export interface LocalRule {
	state: "CA";
	county: string; // normalized without trailing "County"
	city: string | null;
	confidencePercent: number; // 10..100
	restrictions: RestrictionCode[];
	notes?: string;
	sources?: string[];
	lastUpdated?: string; // YYYY-MM-DD
}

export interface EligibilityLookupInput {
	state?: string; // default CA
	county?: string | null;
	city?: string | null;
}

export interface EligibilityLookupResult {
	canOperateSTR: boolean;
	confidence: number; // 0..1
	restrictions: string[]; // mapped UI strings
	meta?: {
		matchedLevel: "city" | "county" | "none";
		raw?: LocalRule | null;
	};
}

const CODE_TO_TEXT: Record<RestrictionCode, string> = {
	PROHIBITED: "Short‑term rentals prohibited by ordinance",
	MORATORIUM: "Complete moratorium on STR",
	HOSTED_ONLY: "Hosted STRs only (primary residence)",
	NIGHTS_CAP_90: "Only able to STR 90 days per year",
	FINITE_PERMITS: "Finite number of permits given per year",
	LOTTERY: "Permits extremely limited or subject to lottery",
	PERMIT_REQUIRED: "Permit required; inspections may apply",
	TAX_ONLY: "Register for occupancy tax only",
	PRIMARY_RESIDENCE: "Primary residence requirement",
	ZONING_LIMITS: "Strict zoning/HOA constraints",
};

function normalizeCounty(input: string | null | undefined): string | null {
	if (!input) return null;
	const trimmed = input.trim();
	if (!trimmed) return null;
	return trimmed.replace(/\s*County$/i, "");
}

function normalizeCity(input: string | null | undefined): string | null {
	if (!input) return null;
	const trimmed = input.trim();
	return trimmed || null;
}

function equalsIgnoreCase(a: string | null | undefined, b: string | null | undefined): boolean {
	if (!a || !b) return false;
	return a.localeCompare(b, undefined, { sensitivity: "accent" }) === 0;
}

function mapRestrictionsToText(codes: RestrictionCode[]): string[] {
	return codes.map((c) => CODE_TO_TEXT[c] ?? c);
}

const ALL_RULES: LocalRule[] = (rules as LocalRule[]).map((r) => ({
	...r,
	county: normalizeCounty(r.county) || r.county,
	city: normalizeCity(r.city),
}));

export function lookupEligibility(input: EligibilityLookupInput): EligibilityLookupResult | null {
	const county = normalizeCounty(input.county || null);
	const city = normalizeCity(input.city || null);
	const state = (input.state || "CA").toUpperCase();

	const candidates = ALL_RULES.filter((r) => r.state === state);

	// Priority 1: exact city match within county (if county provided)
	let match: LocalRule | null = null;
	if (city) {
		match = candidates.find((r) => equalsIgnoreCase(r.city, city) && (!county || equalsIgnoreCase(r.county, county))) || null;
	}
	// Priority 2: county-wide match
	if (!match && county) {
		match = candidates.find((r) => r.city === null && equalsIgnoreCase(r.county, county)) || null;
	}
	// Priority 3: city match regardless of county (fallback if county missing)
	if (!match && city) {
		match = candidates.find((r) => equalsIgnoreCase(r.city, city)) || null;
	}
	if (!match) return null;

	const confidence = Math.max(0.1, Math.min(1, Math.round(match.confidencePercent) / 100));
	const restrictions = mapRestrictionsToText(match.restrictions);
	const canOperateSTR = confidence >= 0.5 && !match.restrictions.includes("PROHIBITED") && !match.restrictions.includes("MORATORIUM");

	return {
		canOperateSTR,
		confidence,
		restrictions,
		meta: { matchedLevel: match.city ? "city" : "county", raw: match },
	};
}

export function getRestrictionTextMap() {
	return { ...CODE_TO_TEXT };
}
