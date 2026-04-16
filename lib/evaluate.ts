import { ComparableListing, ProForma, MarketMetrics } from "./types";

/**
 * Compute averaged comp metrics used by downstream calculations.
 */
export function computeAverages(comps: ComparableListing[]) {
	const count = comps.length || 1;
	const totals = comps.reduce(
		(acc, c) => {
			acc.nightlyRate += c.nightlyRate;
			acc.occupancy += c.occupancy;
			acc.cleaningFee += c.cleaningFee;
			return acc;
		},
		{ nightlyRate: 0, occupancy: 0, cleaningFee: 0 }
	);
	return {
		averageNightlyRate: totals.nightlyRate / count,
		averageOccupancy: totals.occupancy / count,
		averageCleaningFee: totals.cleaningFee / count,
	};
}

/**
 * Naive pro forma: revenue = nights * avgRate + turnovers * cleaningFee
 * - nights = 365 * avgOccupancy
 * - turnovers assume average stay length of 3 nights
 * - operating expenses fixed at 35% of gross
 */
/**
 * Compute a simple pro forma from comps.
 * - nights = 365 * avgOccupancy
 * - turnovers = nights / averageStayNights
 * - roomRevenue = nights * averageNightlyRate
 * - cleaningRevenue = turnovers * averageCleaningFee
 * - operatingExpenses = 35% of gross
 */
export function computeProForma(comps: ComparableListing[]): ProForma {
	const { averageNightlyRate, averageOccupancy, averageCleaningFee } = computeAverages(comps);
	const nights = 365 * averageOccupancy;
	const averageStayNights = 3;
	const turnovers = nights / averageStayNights;
	const roomRevenue = nights * averageNightlyRate;
	const cleaningRevenue = turnovers * averageCleaningFee;
	const grossRevenue = Math.max(0, Math.round(roomRevenue + cleaningRevenue));
	const operatingExpenses = Math.round(grossRevenue * 0.35);
	const netOperatingIncome = Math.max(0, grossRevenue - operatingExpenses);
	return {
		grossRevenue,
		operatingExpenses,
		netOperatingIncome,
		averageNightlyRate,
		averageOccupancy,
		averageCleaningFee,
		nights,
		averageStayNights,
		turnovers,
		roomRevenue,
		cleaningRevenue,
	};
}

export function buildMockComps(): ComparableListing[] {
    return [
        { platform: "airbnb", nightlyRate: 225, occupancy: 0.62, cleaningFee: 140 },
        { platform: "airbnb", nightlyRate: 210, occupancy: 0.58, cleaningFee: 125 },
        { platform: "vrbo", nightlyRate: 235, occupancy: 0.64, cleaningFee: 150 },
        { platform: "vrbo", nightlyRate: 195, occupancy: 0.55, cleaningFee: 120 },
    ];
}

// Deterministic PRNG (Mulberry32)
function mulberry32(seed: number) {
    return function () {
        let t = (seed += 0x6d2b79f5);
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

function hashStringToSeed(input: string): number {
    let h = 2166136261;
    for (let i = 0; i < input.length; i++) {
        h ^= input.charCodeAt(i);
        h += (h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24);
    }
    return h >>> 0;
}

/**
 * Return deterministic comps based on address seed. Useful for demos or fallback.
 */
export function buildSeededComps(address: string): ComparableListing[] {
    const seed = hashStringToSeed(address.toLowerCase());
    const rnd = mulberry32(seed);
    const base = buildMockComps();
    return base.map((c, idx) => {
        const rateJitter = (rnd() - 0.5) * 40; // ±20
        const occJitter = (rnd() - 0.5) * 0.12; // ±6%
        const cleanJitter = (rnd() - 0.5) * 30; // ±15
        return {
            ...c,
            nightlyRate: Math.max(80, Math.round(c.nightlyRate + rateJitter)),
            occupancy: Math.min(0.9, Math.max(0.3, parseFloat((c.occupancy + occJitter).toFixed(2)))) ,
            cleaningFee: Math.max(60, Math.round(c.cleaningFee + cleanJitter)),
        };
    });
}

/**
 * Build a seeded eligibility score with sample restrictions.
 */
export function buildSeededEligibility(address: string) {
    const seed = hashStringToSeed(address);
    const rnd = mulberry32(seed + 42);
    // 5%..100% range to exercise all bands while seeded
    const confidence = Math.max(0.05, Math.min(1, rnd()));
    const percent = Math.round(confidence * 100);

    function pick<T>(arr: T[], n: number): T[] {
        const clone = arr.slice();
        const out: T[] = [];
        for (let i = 0; i < n && clone.length > 0; i++) {
            const idx = Math.floor(rnd() * clone.length);
            out.push(clone.splice(idx, 1)[0]);
        }
        return out;
    }

    let restrictions: string[] = [];
    if (percent >= 95) {
        restrictions = pick([
            "No permit required for STR in this jurisdiction",
            "Register for occupancy tax remittance only",
            "Follow standard noise and parking rules",
        ], 2 + Math.floor(rnd() * 1));
    } else if (percent >= 85) {
        restrictions = pick([
            "Permit required; streamlined online approval",
            "Basic safety checklist (smoke/CO detectors, fire extinguisher)",
            "Transient occupancy tax registration/remittance",
        ], 2 + Math.floor(rnd() * 1));
    } else if (percent >= 70) {
        restrictions = pick([
            "Capped annual nights (e.g., 90–180 days)",
            "Hosted rental or primary residence requirement",
            "Permit required; inspections may apply",
        ], 2 + Math.floor(rnd() * 1));
    } else if (percent >= 50) {
        restrictions = pick([
            "Hosted rental and capped nights required",
            "Neighborhood notification and parking plan",
            "Additional conditions or zoning overlays apply",
        ], 2 + Math.floor(rnd() * 1));
    } else if (percent >= 25) {
        restrictions = pick([
            "Permits extremely limited or subject to lottery",
            "Moratoriums common; approvals rarely granted",
            "Strict zoning or HOA constraints",
        ], 2 + Math.floor(rnd() * 1));
    } else {
        restrictions = pick([
            "Short‑term rentals prohibited by ordinance",
            "Minimum stay 30+ days enforced",
            "Significant fines for violations",
        ], 2 + Math.floor(rnd() * 1));
    }

    const canOperateSTR = percent >= 50; // treat Conditional and above as operable
    return { canOperateSTR, confidence, restrictions };
}

/**
 * Utility to simulate realistic latency for UX.
 */
export async function simulateNetworkDelay(minMs = 350, maxMs = 900) {
    const span = Math.max(0, maxMs - minMs);
    const delay = minMs + Math.floor(Math.random() * span);
    await new Promise((r) => setTimeout(r, delay));
}


// AirDNA client shim with env-based configuration and seeded fallback
export interface AirDNAConfig {
    apiKey?: string;
    baseUrl?: string;
}

/**
 * Fetch market metrics from AirDNA; fallback to seeded estimate when key is absent or call fails.
 */
export async function fetchAirDNAMarketMetrics(address: string, cfg: AirDNAConfig = {}): Promise<MarketMetrics> {
    const apiKey = cfg.apiKey || process.env.AIRDNA_API_KEY;
    const baseUrl = cfg.baseUrl || process.env.AIRDNA_API_BASE_URL || "https://api.airdna.co";

    // If we don't have a key, estimate from comps as a fallback using seeded comps
    if (!apiKey) {
        const comps = buildSeededComps(address);
        const avg = computeAverages(comps);
        const projectedAnnualRentRevenue = Math.round(avg.averageNightlyRate * avg.averageOccupancy * 365);
        // create a simple seasonality curve centered in summer
        const seasonalityIndex = Array.from({ length: 12 }, (_, i) => {
            const month = i + 1;
            // peak in July (7), trough in Jan (1)
            const distanceFromPeak = Math.abs(7 - month);
            const multiplier = parseFloat((1.0 + 0.18 * Math.cos((Math.PI * distanceFromPeak) / 6)).toFixed(2));
            return { month, multiplier };
        });
        return {
            source: "estimate",
            adr: avg.averageNightlyRate,
            occupancy: avg.averageOccupancy,
            projectedAnnualRentRevenue,
            seasonalityIndex,
            compsStrength: { count: comps.length, freshnessDays: 30 },
        };
    }

    // With a key, call AirDNA. Endpoint details can vary by plan; we'll try a generic pattern.
    // This code is resilient: if the call fails, we fall back to seeded estimate above.
    try {
        const url = `${baseUrl}/v1/rentalizer/estimate?address=${encodeURIComponent(address)}`;
        const res = await fetch(url, {
            headers: {
                Authorization: `Bearer ${apiKey}`,
                Accept: "application/json",
            },
            // Give generous timeout via race with delay if needed by runtime
        } as RequestInit);
        if (!res.ok) throw new Error(`AirDNA error ${res.status}`);
        const json = await res.json();

        // Attempt to map typical fields; safely fallback when missing
        const adr = Number(json?.metrics?.adr ?? json?.adr ?? 0);
        const occupancy = Number(json?.metrics?.occupancy ?? json?.occupancy ?? 0) / (json?.metrics?.occupancy > 1 ? 100 : 1);
        const projectedAnnualRentRevenue = Math.round((adr || 0) * (occupancy || 0) * 365);

        const monthly = Array.isArray(json?.seasonality || json?.monthly)
            ? (json?.seasonality || json?.monthly)
            : [];
        const seasonalityIndex = monthly
            .map((m: any, idx: number) => {
                const month = Number(m?.month ?? idx + 1);
                const multiplier = Number(m?.multiplier ?? m?.index ?? 1);
                return { month, multiplier };
            })
            .filter((m: any) => Number.isFinite(m.month) && Number.isFinite(m.multiplier));

        const compsStrength = json?.comps
            ? {
                  count: Array.isArray(json.comps) ? json.comps.length : Number(json?.comps?.count ?? 0),
                  medianDistanceMiles: Number(json?.comps?.median_distance_miles ?? json?.comps?.medianDistanceMiles ?? undefined),
                  freshnessDays: Number(json?.comps?.freshness_days ?? json?.comps?.freshnessDays ?? 30),
              }
            : undefined;

        if (!adr || !occupancy) throw new Error("Missing core metrics");

        return {
            source: "airdna",
            adr,
            occupancy,
            projectedAnnualRentRevenue,
            seasonalityIndex: seasonalityIndex.length ? seasonalityIndex : undefined,
            compsStrength,
        };
    } catch (_err) {
        const comps = buildSeededComps(address);
        const avg = computeAverages(comps);
        const projectedAnnualRentRevenue = Math.round(avg.averageNightlyRate * avg.averageOccupancy * 365);
        const seasonalityIndex = Array.from({ length: 12 }, (_, i) => {
            const month = i + 1;
            const distanceFromPeak = Math.abs(7 - month);
            const multiplier = parseFloat((1.0 + 0.18 * Math.cos((Math.PI * distanceFromPeak) / 6)).toFixed(2));
            return { month, multiplier };
        });
        return {
            source: "estimate",
            adr: avg.averageNightlyRate,
            occupancy: avg.averageOccupancy,
            projectedAnnualRentRevenue,
            seasonalityIndex,
            compsStrength: { count: comps.length, freshnessDays: 30 },
        };
    }
}


