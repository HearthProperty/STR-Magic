import { ComparableListing, ProForma } from "./types";

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


