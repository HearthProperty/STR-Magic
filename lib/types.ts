export type CompPlatform = "airbnb" | "vrbo";

export interface ComparableListing {
	platform: CompPlatform;
	nightlyRate: number; // USD per night
	occupancy: number; // 0..1 average occupancy rate
	cleaningFee: number; // USD per turnover
}

export interface ProForma {
	grossRevenue: number;
	operatingExpenses: number;
	netOperatingIncome: number;
	capRateEstimate?: number;
	// Details for UI breakdown
	averageNightlyRate: number;
	averageOccupancy: number;
	averageCleaningFee: number;
	nights: number;
	averageStayNights: number;
	turnovers: number;
	roomRevenue: number;
	cleaningRevenue: number;
}

export interface EvaluateSummary {
	canOperateSTR: boolean;
	restrictions: string[];
	confidence: number; // 0..1
}

export interface EvaluateResponse {
	address: string;
	summary: EvaluateSummary;
	comps: ComparableListing[];
	proForma: ProForma;
}

export interface PlaceSuggestion {
	placeId: string;
	description: string;
	types?: string[];
	matchedSubstrings?: Array<{ offset: number; length: number }>;
}

export interface PlaceDetailsAddressComponent {
	longName: string;
	shortName: string;
	types: string[];
}

export interface PlaceDetails {
	placeId: string;
	formattedAddress: string;
	location: { lat: number; lng: number };
	addressComponents: PlaceDetailsAddressComponent[];
}


