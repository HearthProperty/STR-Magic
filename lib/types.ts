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
	market: MarketMetrics;
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
	types?: string[];
}


export type MarketMetricsSource = "airdna" | "estimate";

export interface MarketMetrics {
	source: MarketMetricsSource;
	adr: number; // Average Daily Rate (USD)
	occupancy: number; // 0..1
	projectedAnnualRentRevenue: number; // ADR * occupancy * 365 (exclude cleaning)
	seasonalityIndex?: Array<{ month: number; multiplier: number }>; // 1..12 months
	compsStrength?: { count: number; medianDistanceMiles?: number; freshnessDays?: number; similarityPercent?: number };
}



export interface LeadFormInput {
	ownerName: string;
	email: string;
	phone: string;
	address: string;
}
